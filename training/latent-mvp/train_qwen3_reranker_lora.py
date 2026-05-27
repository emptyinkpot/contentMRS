#!/usr/bin/env python3
"""QLoRA train Qwen3-Reranker from ContentMRS latent JSONL."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any, Dict, Iterable, List

import torch
import torch.nn.functional as F
from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


SYSTEM_PROMPT = (
    'Judge whether the Document meets the requirements based on the Query and the Instruct provided. '
    'Note that the answer can only be "yes" or "no".'
)
INSTRUCT = (
    "Given a writing task or central claim, retrieve passages that are useful for latent generation: "
    "historical reasoning, grounded evidence, style signal, or useful negative contrast."
)


def load_jsonl(path: Path, limit: int = 0) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            query = str(
                obj.get("topic")
                or obj.get("centralClaim")
                or obj.get("profile")
                or obj.get("sourceFile")
                or "latent writing preference"
            ).strip()
            text = str(obj.get("text") or "").strip()
            if not text:
                continue
            rows.append({
                "query": query,
                "text": text,
                "label": 1 if int(obj.get("label", 0)) == 1 else 0,
                "sourceId": str(obj.get("sourceId") or ""),
            })
            if limit > 0 and len(rows) >= limit:
                break
    return rows


def build_prompt(query: str, document: str) -> str:
    return (
        f"<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n"
        f"<|im_start|>user\n"
        f"<Instruct>: {INSTRUCT}\n"
        f"<Query>: {query}\n"
        f"<Document>: {document}<|im_end|>\n"
        f"<|im_start|>assistant\n<think>\n\n</think>\n\n"
    )


class RerankerDataset(Dataset):
    def __init__(self, rows: List[Dict[str, Any]], tokenizer: Any, max_length: int) -> None:
        self.rows = rows
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int) -> Dict[str, Any]:
        row = self.rows[index]
        encoded = self.tokenizer(
            build_prompt(row["query"], row["text"]),
            truncation=True,
            max_length=self.max_length,
            padding=False,
            return_tensors=None,
        )
        return {
            "input_ids": encoded["input_ids"],
            "attention_mask": encoded["attention_mask"],
            "label": row["label"],
        }


def collate(batch: List[Dict[str, Any]], tokenizer: Any) -> Dict[str, torch.Tensor]:
    encoded = tokenizer.pad(
        [{"input_ids": item["input_ids"], "attention_mask": item["attention_mask"]} for item in batch],
        padding=True,
        return_tensors="pt",
    )
    encoded["labels"] = torch.tensor([int(item["label"]) for item in batch], dtype=torch.long)
    return encoded


def resolve_token_id(tokenizer: Any, value: str) -> int:
    ids = tokenizer.encode(value, add_special_tokens=False)
    if len(ids) != 1:
        ids = tokenizer.encode(f" {value}", add_special_tokens=False)
    if len(ids) != 1:
        raise ValueError(f"{value!r} must map to one token, got {ids}")
    return int(ids[0])


def class_weights(rows: List[Dict[str, Any]]) -> torch.Tensor:
    pos = sum(1 for row in rows if row["label"] == 1)
    neg = max(1, len(rows) - pos)
    pos = max(1, pos)
    total = pos + neg
    return torch.tensor([total / (2 * neg), total / (2 * pos)], dtype=torch.float32)


def make_sampler(rows: List[Dict[str, Any]], book_sample_ratio: float = 0.0) -> WeightedRandomSampler:
    weights = class_weights(rows)
    sample_weights = []
    book_ratio = min(max(float(book_sample_ratio or 0.0), 0.0), 0.95)
    book_rows = [row for row in rows if is_book_row(row)]
    non_book_rows = [row for row in rows if not is_book_row(row)]
    book_factor = (book_ratio / max(1, len(book_rows))) if book_ratio and book_rows else 0.0
    non_book_factor = ((1 - book_ratio) / max(1, len(non_book_rows))) if book_ratio and non_book_rows else 0.0
    for row in rows:
        class_factor = float(weights[int(row["label"])])
        source_factor = 1.0
        if book_ratio and book_rows and non_book_rows:
            source_factor = book_factor if is_book_row(row) else non_book_factor
        sample_weights.append(class_factor * source_factor)
    return WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)


def is_book_row(row: Dict[str, Any]) -> bool:
    return str(row.get("sourceId") or "").startswith("book_")


@torch.no_grad()
def evaluate(model: Any, loader: DataLoader, yes_id: int, no_id: int, device: torch.device) -> Dict[str, float]:
    model.eval()
    scores: List[float] = []
    labels: List[int] = []
    losses: List[float] = []
    for batch in loader:
        batch = {key: value.to(device) for key, value in batch.items()}
        out = model(input_ids=batch["input_ids"], attention_mask=batch["attention_mask"])
        logits = out.logits[:, -1, :]
        pair_logits = torch.stack([logits[:, no_id], logits[:, yes_id]], dim=1)
        loss = F.cross_entropy(pair_logits, batch["labels"])
        prob = torch.softmax(pair_logits, dim=1)[:, 1]
        losses.append(float(loss.detach().cpu()))
        scores.extend(float(item) for item in prob.detach().cpu())
        labels.extend(int(item) for item in batch["labels"].detach().cpu())
    pos_scores = [score for score, label in zip(scores, labels) if label == 1]
    neg_scores = [score for score, label in zip(scores, labels) if label == 0]
    auc = 0.0
    if pos_scores and neg_scores:
        wins = 0
        total = 0
        for pos in pos_scores:
            for neg in neg_scores:
                wins += 1 if pos > neg else 0
                total += 1
        auc = wins / max(1, total)
    model.train()
    return {
        "count": float(len(labels)),
        "loss": float(sum(losses) / max(1, len(losses))),
        "auc": float(auc),
        "avgPosScore": float(sum(pos_scores) / max(1, len(pos_scores))),
        "avgNegScore": float(sum(neg_scores) / max(1, len(neg_scores))),
    }


def train(args: argparse.Namespace) -> None:
    torch.backends.cuda.matmul.allow_tf32 = True
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    yes_id = resolve_token_id(tokenizer, "yes")
    no_id = resolve_token_id(tokenizer, "no")

    quantization = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        trust_remote_code=True,
        quantization_config=quantization,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_rank,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    model.train()

    train_rows = load_jsonl(Path(args.train), args.max_train)
    val_rows = load_jsonl(Path(args.val), args.max_val)
    train_loader = DataLoader(
        RerankerDataset(train_rows, tokenizer, args.max_length),
        batch_size=args.batch_size,
        sampler=make_sampler(train_rows, args.book_sample_ratio),
        collate_fn=lambda batch: collate(batch, tokenizer),
    )
    val_loader = DataLoader(
        RerankerDataset(val_rows, tokenizer, args.max_length),
        batch_size=args.eval_batch_size,
        shuffle=False,
        collate_fn=lambda batch: collate(batch, tokenizer),
    )
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)
    class_weight = class_weights(train_rows).to(device)
    global_step = 0
    optimizer.zero_grad(set_to_none=True)

    for epoch in range(args.epochs):
        running = 0.0
        for step, batch in enumerate(train_loader, start=1):
            batch = {key: value.to(device) for key, value in batch.items()}
            out = model(input_ids=batch["input_ids"], attention_mask=batch["attention_mask"])
            logits = out.logits[:, -1, :]
            pair_logits = torch.stack([logits[:, no_id], logits[:, yes_id]], dim=1)
            loss = F.cross_entropy(pair_logits, batch["labels"], weight=class_weight)
            (loss / args.grad_accum).backward()
            running += float(loss.detach().cpu())
            if step % args.grad_accum == 0 or step == len(train_loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), args.max_grad_norm)
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)
                global_step += 1
            if step % args.log_steps == 0:
                print(json.dumps({
                    "epoch": epoch + 1,
                    "step": step,
                    "globalStep": global_step,
                    "loss": running / args.log_steps,
                }), flush=True)
                running = 0.0
        metrics = evaluate(model, val_loader, yes_id, no_id, device)
        print(json.dumps({"epoch": epoch + 1, "val": metrics}), flush=True)

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output)
    tokenizer.save_pretrained(output)
    summary = {
        "version": "qwen3-reranker-lora.v1",
        "model": args.model,
        "train": len(train_rows),
        "val": len(val_rows),
        "epochs": args.epochs,
        "maxLength": args.max_length,
        "batchSize": args.batch_size,
        "gradAccum": args.grad_accum,
        "loraRank": args.lora_rank,
        "loraAlpha": args.lora_alpha,
        "bookSampleRatio": args.book_sample_ratio,
    }
    (output / "train-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3-Reranker-8B")
    parser.add_argument("--train", required=True)
    parser.add_argument("--val", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--eval-batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=1024)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--lora-rank", type=int, default=8)
    parser.add_argument("--lora-alpha", type=int, default=16)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--max-grad-norm", type=float, default=1.0)
    parser.add_argument("--log-steps", type=int, default=10)
    parser.add_argument("--max-train", type=int, default=0)
    parser.add_argument("--max-val", type=int, default=0)
    parser.add_argument("--book-sample-ratio", type=float, default=0.8)
    train(parser.parse_args())


if __name__ == "__main__":
    main()
