#!/usr/bin/env python3
"""Train a lightweight latent reranker from exported JSONL corpus."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import torch
from sentence_transformers import CrossEncoder


def load_jsonl(path: Path) -> List[Dict]:
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
            if not text:
                continue
            rows.append({
                "topic": topic,
                "text": text,
                "label": int(obj.get("label", 0)),
            })
    return rows


def predict_scores(model: CrossEncoder, pairs: List[List[str]], batch_size: int) -> np.ndarray:
    chunks: List[np.ndarray] = []
    for start in range(0, len(pairs), max(1, batch_size)):
        batch = pairs[start:start + max(1, batch_size)]
        chunks.append(np.array(model.predict(batch), dtype=np.float32))
    return np.concatenate(chunks) if chunks else np.zeros((0,), dtype=np.float32)


def evaluate(model: CrossEncoder, rows: List[Dict], batch_size: int) -> Dict[str, float]:
    if not rows:
        return {"count": 0.0, "auc": 0.0, "avgPosScore": 0.0, "avgNegScore": 0.0}
    pairs = [[row["topic"], row["text"]] for row in rows]
    labels = np.array([row["label"] for row in rows], dtype=np.int32)
    scores = predict_scores(model, pairs, batch_size)
    positives = scores[labels == 1]
    negatives = scores[labels == 0]
    auc = 0.0
    if positives.size and negatives.size:
        auc = float((positives[:, None] > negatives[None, :]).mean())
    return {
        "count": float(len(rows)),
        "auc": auc,
        "avgPosScore": float(positives.mean()) if positives.size else 0.0,
        "avgNegScore": float(negatives.mean()) if negatives.size else 0.0,
    }


def train_manual(model: CrossEncoder, rows: List[Dict], epochs: int, batch_size: int, lr: float) -> None:
    device = next(model.model.parameters()).device
    optimizer = torch.optim.AdamW(model.model.parameters(), lr=lr)
    loss_fn = torch.nn.BCEWithLogitsLoss()
    rng = np.random.default_rng(42)

    model.model.train()
    for epoch in range(max(1, epochs)):
        order = rng.permutation(len(rows))
        total_loss = 0.0
        step_count = 0
        for start in range(0, len(order), max(1, batch_size)):
            batch_indexes = order[start:start + max(1, batch_size)]
            batch = [rows[int(index)] for index in batch_indexes]
            features = model.tokenizer(
                [row["topic"] for row in batch],
                [row["text"] for row in batch],
                padding=True,
                truncation=True,
                return_tensors="pt",
            )
            features = {key: value.to(device) for key, value in features.items()}
            labels = torch.tensor([float(row["label"]) for row in batch], dtype=torch.float32, device=device)

            optimizer.zero_grad(set_to_none=True)
            output = model.model(**features)
            logits = output.logits.reshape(-1)
            loss = loss_fn(logits, labels)
            loss.backward()
            optimizer.step()

            total_loss += float(loss.detach().cpu())
            step_count += 1
        print(json.dumps({
            "epoch": epoch + 1,
            "loss": total_loss / max(1, step_count),
        }))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True)
    parser.add_argument("--val", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--base-model", default="cross-encoder/ms-marco-MiniLM-L-6-v2")
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--max-train", type=int, default=0)
    parser.add_argument("--max-val", type=int, default=0)
    args = parser.parse_args()

    train_rows = load_jsonl(Path(args.train))
    val_rows = load_jsonl(Path(args.val))
    if args.max_train > 0:
        train_rows = train_rows[:args.max_train]
    if args.max_val > 0:
        val_rows = val_rows[:args.max_val]
    if not train_rows:
        raise SystemExit("empty train set")

    model = CrossEncoder(
        args.base_model,
        num_labels=1,
        device="cuda" if torch.cuda.is_available() else "cpu",
    )

    train_manual(model, train_rows, args.epochs, args.batch_size, args.lr)

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    model.save(str(output))

    summary = {
        "version": "latent-reranker.v1",
        "baseModel": args.base_model,
        "epochs": args.epochs,
        "batchSize": args.batch_size,
        "lr": args.lr,
        "train": evaluate(model, train_rows, args.batch_size),
        "val": evaluate(model, val_rows, args.batch_size),
    }
    (output / "eval-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
