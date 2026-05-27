#!/usr/bin/env python3
"""Train a Qwen reranker adapter from latent MVP JSONL rows.

This entrypoint is intentionally separate from train_reranker.py, which trains
SentenceTransformers CrossEncoder models. Here Qwen is trained as a binary
yes/no judge over a query-document pair and the LoRA adapter is saved.
"""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from typing import Dict, Iterable, List

import torch
from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


ANSWER_TOKENS = {
    "yes": ["yes", " Yes", "YES", " yes"],
    "no": ["no", " No", "NO", " no"],
}


def load_rows(path: Path, limit: int = 0) -> List[Dict]:
    rows: List[Dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            topic = str(
                obj.get("topic")
                or obj.get("centralClaim")
                or obj.get("profile")
                or obj.get("sourceFile")
                or "latent writing preference"
            ).strip()
            text = str(obj.get("text", "")).strip()
            if not topic or not text:
                continue
            rows.append({
                "topic": topic,
                "text": text,
                "label": int(obj.get("label", 0)),
                "taskKind": str(obj.get("taskKind", "")),
                "sourceId": str(obj.get("sourceId", "")),
            })
            if limit > 0 and len(rows) >= limit:
                break
    return rows


class RerankerDataset(Dataset):
    def __init__(self, rows: List[Dict], tokenizer: AutoTokenizer, max_length: int) -> None:
        self.rows = rows
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> Dict[str, torch.Tensor]:
        row = self.rows[index]
        prompt = build_prompt(row["topic"], row["text"])
        answer = "yes" if row["label"] == 1 else "no"
        prompt_ids = self.tokenizer(prompt, add_special_tokens=False).input_ids
        answer_ids = self.tokenizer(answer, add_special_tokens=False).input_ids
        input_ids = (prompt_ids + answer_ids + [self.tokenizer.eos_token_id])[-self.max_length:]
        answer_start = max(0, len(input_ids) - len(answer_ids) - 1)
        labels = [-100] * len(input_ids)
        labels[answer_start:] = input_ids[answer_start:]
        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
        }


def build_prompt(topic: str, text: str) -> str:
    return (
        "You are a reranker for Chinese author-conditioned retrieval.\n"
        "Decide whether the document should be used as writing evidence for the query.\n"
        "Answer only yes or no.\n\n"
        f"Query:\n{topic}\n\n"
        f"Document:\n{text}\n\n"
        "Answer:\n"
    )


def collate_batch(tokenizer: AutoTokenizer):
    def collate(items: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
        max_len = max(item["input_ids"].numel() for item in items)
        input_ids = []
        labels = []
        attention_mask = []
        for item in items:
            pad_len = max_len - item["input_ids"].numel()
            input_ids.append(torch.cat([
                torch.full((pad_len,), tokenizer.pad_token_id, dtype=torch.long),
                item["input_ids"],
            ]))
            labels.append(torch.cat([
                torch.full((pad_len,), -100, dtype=torch.long),
                item["labels"],
            ]))
            attention_mask.append(torch.cat([
                torch.zeros((pad_len,), dtype=torch.long),
                torch.ones((item["input_ids"].numel(),), dtype=torch.long),
            ]))
        return {
            "input_ids": torch.stack(input_ids),
            "labels": torch.stack(labels),
            "attention_mask": torch.stack(attention_mask),
        }
    return collate


def resolve_answer_token_id(tokenizer: AutoTokenizer, candidates: Iterable[str]) -> int:
    for candidate in candidates:
        token_ids = tokenizer(candidate, add_special_tokens=False).input_ids
        if len(token_ids) == 1:
            return int(token_ids[0])
    token_ids = tokenizer(next(iter(candidates)), add_special_tokens=False).input_ids
    if not token_ids:
        raise ValueError("empty answer token")
    return int(token_ids[-1])


@torch.no_grad()
def evaluate(model, tokenizer, rows: List[Dict], max_length: int, batch_size: int) -> Dict[str, float]:
    if not rows:
        return {"count": 0.0, "auc": 0.0, "avgPosScore": 0.0, "avgNegScore": 0.0}
    model.eval()
    yes_id = resolve_answer_token_id(tokenizer, ANSWER_TOKENS["yes"])
    no_id = resolve_answer_token_id(tokenizer, ANSWER_TOKENS["no"])
    scores: List[float] = []
    labels: List[int] = []
    for start in range(0, len(rows), max(1, batch_size)):
        batch = rows[start:start + max(1, batch_size)]
        prompts = [build_prompt(row["topic"], row["text"]) for row in batch]
        inputs = tokenizer(
            prompts,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        ).to(model.device)
        logits = model(**inputs).logits[:, -1, :]
        pair_logits = logits[:, [no_id, yes_id]]
        probs = torch.softmax(pair_logits.float(), dim=-1)[:, 1].detach().cpu().tolist()
        scores.extend(float(item) for item in probs)
        labels.extend(int(row["label"]) for row in batch)
    positives = [score for score, label in zip(scores, labels) if label == 1]
    negatives = [score for score, label in zip(scores, labels) if label == 0]
    auc = 0.0
    if positives and negatives:
        wins = sum(1 for pos in positives for neg in negatives if pos > neg)
        auc = wins / float(len(positives) * len(negatives))
    return {
        "count": float(len(rows)),
        "auc": float(auc),
        "avgPosScore": float(sum(positives) / len(positives)) if positives else 0.0,
        "avgNegScore": float(sum(negatives) / len(negatives)) if negatives else 0.0,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True)
    parser.add_argument("--val", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--base-model", default="Qwen/Qwen3-Reranker-8B")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=8)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--max-train", type=int, default=0)
    parser.add_argument("--max-val", type=int, default=0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--load-in-4bit", action="store_true")
    args = parser.parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    train_rows = load_rows(Path(args.train), args.max_train)
    val_rows = load_rows(Path(args.val), args.max_val)
    if not train_rows:
        raise SystemExit("empty train set")

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True, use_fast=True)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token

    quantization_config = None
    if args.load_in_4bit:
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
        )
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        trust_remote_code=True,
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None,
        quantization_config=quantization_config,
    )
    model.config.use_cache = False
    if args.load_in_4bit:
        model = prepare_model_for_kbit_training(model)
    lora = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    dataset = RerankerDataset(train_rows, tokenizer, args.max_length)
    loader = DataLoader(
        dataset,
        batch_size=max(1, args.batch_size),
        shuffle=True,
        collate_fn=collate_batch(tokenizer),
    )
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)
    global_step = 0
    model.train()
    for epoch in range(max(1, args.epochs)):
        total_loss = 0.0
        step_count = 0
        optimizer.zero_grad(set_to_none=True)
        for step, batch in enumerate(loader, start=1):
            batch = {key: value.to(model.device) for key, value in batch.items()}
            output_batch = model(**batch)
            loss = output_batch.loss / max(1, args.grad_accum)
            loss.backward()
            total_loss += float(loss.detach().cpu()) * max(1, args.grad_accum)
            step_count += 1
            if step % max(1, args.grad_accum) == 0 or step == len(loader):
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)
                global_step += 1
                print(json.dumps({
                    "epoch": epoch + 1,
                    "globalStep": global_step,
                    "microStep": step,
                    "loss": total_loss / max(1, step_count),
                    "lr": args.lr,
                }), flush=True)

    model.save_pretrained(output)
    tokenizer.save_pretrained(output)
    summary = {
        "version": "qwen-reranker-lora.v1",
        "baseModel": args.base_model,
        "epochs": args.epochs,
        "batchSize": args.batch_size,
        "gradAccum": args.grad_accum,
        "lr": args.lr,
        "maxLength": args.max_length,
        "maxTrain": args.max_train,
        "maxVal": args.max_val,
        "trainCount": len(train_rows),
        "valCount": len(val_rows),
        "loadIn4bit": bool(args.load_in_4bit),
        "train": evaluate(model, tokenizer, train_rows[: min(len(train_rows), 256)], args.max_length, args.batch_size),
        "val": evaluate(model, tokenizer, val_rows, args.max_length, args.batch_size),
    }
    (output / "eval-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
