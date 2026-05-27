#!/usr/bin/env python3
"""Merge reranker JSONL files and produce train/val/test splits."""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", nargs="+", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = list(dedupe(load_all(args.input)))
    rng = random.Random(args.seed)
    rng.shuffle(rows)

    train, val, test = split_rows(rows, args.train_ratio, args.val_ratio)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(out_dir / "samples.jsonl", rows)
    write_jsonl(out_dir / "train.jsonl", train)
    write_jsonl(out_dir / "val.jsonl", val)
    write_jsonl(out_dir / "test.jsonl", test)

    summary = {
        "version": "latent-mvp-merged-reranker.v1",
        "inputs": [str(Path(item).resolve()) for item in args.input],
        "samples": len(rows),
        "labelCounts": dict(Counter(str(row.get("label")) for row in rows)),
        "taskKinds": dict(Counter(str(row.get("taskKind", "unknown")) for row in rows)),
        "sources": dict(Counter(str(row.get("sourceId", "unknown")) for row in rows)),
        "train": len(train),
        "val": len(val),
        "test": len(test),
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def load_all(paths: List[str]) -> Iterable[Dict]:
    for path_text in paths:
        path = Path(path_text)
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                if row.get("topic") and row.get("text") and row.get("label") in (0, 1):
                    yield row


def dedupe(rows: Iterable[Dict]) -> Iterable[Dict]:
    by_text: Dict[str, Dict] = {}
    for row in rows:
        key = sha256(normalize_text(str(row.get("text", ""))))
        previous = by_text.get(key)
        if previous is None or row_priority(row) > row_priority(previous):
            by_text[key] = row

    return by_text.values()


def normalize_text(value: str) -> str:
    return " ".join(value.split())


def row_priority(row: Dict) -> int:
    source_id = str(row.get("sourceId", ""))
    label = int(row.get("label", 0))
    if source_id.startswith("book_") and label == 1:
        return 100
    if source_id == "Hello-SimpleAI/HC3-Chinese":
        return 50
    if label == 1:
        return 40
    return 10


def split_rows(rows: List[Dict], train_ratio: float, val_ratio: float):
    train_end = int(len(rows) * train_ratio)
    val_end = train_end + int(len(rows) * val_ratio)
    return rows[:train_end], rows[train_end:val_end], rows[val_end:]


def write_jsonl(path: Path, rows: List[Dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    main()
