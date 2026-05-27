#!/usr/bin/env python3
"""Train a ContentMRS writer LoRA on a causal Qwen model."""
from __future__ import annotations

import argparse
import inspect
import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import torch
from peft import LoraConfig, PeftModel, TaskType, get_peft_model, prepare_model_for_kbit_training
from torch.utils.data import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    Trainer,
    TrainingArguments,
)


IGNORE_INDEX = -100


def install_torch_compat_shims() -> None:
    if hasattr(torch.nn.Module, "set_submodule"):
        return

    def set_submodule(self, target: str, module: torch.nn.Module) -> None:
        if not target:
            raise ValueError("target must be a non-empty string")
        atoms = target.split(".")
        parent = self
        for item in atoms[:-1]:
            parent = parent.get_submodule(item)
        setattr(parent, atoms[-1], module)

    torch.nn.Module.set_submodule = set_submodule  # type: ignore[attr-defined]


def main() -> None:
    install_torch_compat_shims()
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--train-file", required=True)
    parser.add_argument("--val-file", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--max-length", type=int, default=1024)
    parser.add_argument("--min-label-tokens", type=int, default=128)
    parser.add_argument("--max-label-ratio", type=float, default=0.75)
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=16)
    parser.add_argument("--lora-rank", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--warmup-ratio", type=float, default=0.03)
    parser.add_argument("--eval-steps", type=int, default=500)
    parser.add_argument("--save-steps", type=int, default=500)
    parser.add_argument("--logging-steps", type=int, default=20)
    parser.add_argument("--gradient-checkpointing", choices=["true", "false"], default="true")
    parser.add_argument("--max-train-samples", type=int, default=0)
    parser.add_argument("--max-val-samples", type=int, default=512)
    parser.add_argument("--resume-from-checkpoint", default="")
    parser.add_argument("--adapter-model", default="", help="Existing PEFT adapter path to continue training")
    args = parser.parse_args()

    torch.backends.cuda.matmul.allow_tf32 = True
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        trust_remote_code=True,
        quantization_config=quantization_config,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)
    if args.adapter_model:
        model = PeftModel.from_pretrained(model, args.adapter_model, is_trainable=True)
    else:
        model = get_peft_model(
            model,
            LoraConfig(
                r=args.lora_rank,
                lora_alpha=args.lora_alpha,
                lora_dropout=0.05,
                bias="none",
                task_type=TaskType.CAUSAL_LM,
                target_modules=[
                    "q_proj",
                    "k_proj",
                    "v_proj",
                    "o_proj",
                    "gate_proj",
                    "up_proj",
                    "down_proj",
                ],
            ),
        )
    model.print_trainable_parameters()

    train_dataset = WriterSftDataset(
        args.train_file,
        tokenizer=tokenizer,
        max_length=args.max_length,
        min_label_tokens=args.min_label_tokens,
        max_label_ratio=args.max_label_ratio,
        limit=args.max_train_samples,
    )
    val_dataset = WriterSftDataset(
        args.val_file,
        tokenizer=tokenizer,
        max_length=args.max_length,
        min_label_tokens=args.min_label_tokens,
        max_label_ratio=args.max_label_ratio,
        limit=args.max_val_samples,
    )
    print(json.dumps({
        "train": len(train_dataset),
        "val": len(val_dataset),
        "maxLength": args.max_length,
        "minLabelTokens": args.min_label_tokens,
        "maxLabelRatio": args.max_label_ratio,
        "model": args.model,
        "adapterModel": args.adapter_model,
        "outputDir": args.output_dir,
    }, ensure_ascii=False, indent=2))

    training_args = make_training_args(
        output_dir=args.output_dir,
        overwrite_output_dir=False,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.learning_rate,
        warmup_ratio=args.warmup_ratio,
        lr_scheduler_type="cosine",
        logging_steps=args.logging_steps,
        eval_strategy="steps",
        evaluation_strategy="steps",
        eval_steps=args.eval_steps,
        save_strategy="steps",
        save_steps=args.save_steps,
        save_total_limit=3,
        bf16=True,
        tf32=True,
        optim="paged_adamw_8bit",
        gradient_checkpointing=args.gradient_checkpointing == "true",
        report_to=[],
        dataloader_num_workers=2,
        remove_unused_columns=False,
        max_grad_norm=0.3,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=DataCollator(tokenizer.pad_token_id),
    )
    trainer.train(resume_from_checkpoint=args.resume_from_checkpoint or None)
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)


def make_training_args(**kwargs) -> TrainingArguments:
    supported = set(inspect.signature(TrainingArguments).parameters)
    filtered = {key: value for key, value in kwargs.items() if key in supported}
    return TrainingArguments(**filtered)


class WriterSftDataset(Dataset):
    def __init__(
        self,
        path: str,
        tokenizer,
        max_length: int,
        min_label_tokens: int = 128,
        max_label_ratio: float = 0.75,
        limit: int = 0,
    ) -> None:
        self.rows = []
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.min_label_tokens = max(1, min_label_tokens)
        self.max_label_ratio = min(0.95, max(0.10, max_label_ratio))
        with Path(path).open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                self.rows.append(json.loads(line))
                if limit and len(self.rows) >= limit:
                    break
        if not self.rows:
            raise ValueError(f"no rows loaded from {path}")

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> Dict[str, List[int]]:
        messages = self.rows[index]["messages"]
        prompt_messages = messages[:-1]
        prompt_text = self.tokenizer.apply_chat_template(prompt_messages, tokenize=False, add_generation_prompt=True)
        assistant_text = str(messages[-1].get("content") or "")
        if self.tokenizer.eos_token and not assistant_text.endswith(self.tokenizer.eos_token):
            assistant_text += self.tokenizer.eos_token

        prompt = self.tokenizer(prompt_text, add_special_tokens=False)
        assistant = self.tokenizer(assistant_text, add_special_tokens=False)
        prompt_ids = list(prompt["input_ids"])
        assistant_ids = list(assistant["input_ids"])

        max_label_tokens = max(self.min_label_tokens, int(self.max_length * self.max_label_ratio))
        if len(assistant_ids) > max_label_tokens:
            assistant_ids = assistant_ids[:max_label_tokens]
        if len(assistant_ids) >= self.max_length:
            assistant_ids = assistant_ids[: self.max_length - 1]

        prompt_budget = self.max_length - len(assistant_ids)
        if prompt_budget <= 0:
            prompt_budget = 1
            assistant_ids = assistant_ids[: self.max_length - prompt_budget]
        if len(prompt_ids) > prompt_budget:
            prompt_ids = prompt_ids[-prompt_budget:]

        input_ids = prompt_ids + assistant_ids
        attention_mask = [1] * len(input_ids)
        labels = [IGNORE_INDEX] * len(prompt_ids) + list(assistant_ids)
        return {"input_ids": input_ids, "attention_mask": attention_mask, "labels": labels}


@dataclass
class DataCollator:
    pad_token_id: int

    def __call__(self, features: List[Dict[str, List[int]]]) -> Dict[str, torch.Tensor]:
        max_len = max(len(item["input_ids"]) for item in features)
        batch = {"input_ids": [], "attention_mask": [], "labels": []}
        for item in features:
            pad = max_len - len(item["input_ids"])
            batch["input_ids"].append(item["input_ids"] + [self.pad_token_id] * pad)
            batch["attention_mask"].append(item["attention_mask"] + [0] * pad)
            batch["labels"].append(item["labels"] + [IGNORE_INDEX] * pad)
        return {key: torch.tensor(value, dtype=torch.long) for key, value in batch.items()}


if __name__ == "__main__":
    main()
