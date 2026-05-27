#!/usr/bin/env python3
"""Build explicit training views from raw book and HC3 rows."""
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
    parser.add_argument("--books", default="training/latent-mvp/data/samples.jsonl")
    parser.add_argument("--hc3", default="training/latent-mvp/external/hc3-chinese/hc3-reranker.jsonl")
    parser.add_argument("--personal-style", default="training/latent-mvp/external/personal-style/qq-self/qq-self-style.jsonl")
    parser.add_argument("--output-root", default="training/latent-mvp/views")
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    books = [row for row in read_jsonl(Path(args.books)) if is_book_positive(row)]
    hc3 = list(read_jsonl(Path(args.hc3)))
    personal = [row for row in read_jsonl_if_exists(Path(args.personal_style)) if is_personal_style_positive(row)]
    hc3_ai_negative = [row for row in hc3 if row.get("taskKind") == "hc3_chatgpt_ai_negative" and row.get("label") == 0]
    hc3_all = [row for row in hc3 if row.get("sourceId") == "Hello-SimpleAI/HC3-Chinese"]

    out_root = Path(args.output_root)
    summaries = {
        "author-reranker": write_view(
            out_root / "author-reranker",
            books + hc3_ai_negative,
            args.train_ratio,
            args.val_ratio,
            args.seed,
        ),
        "ai-flavor-reviewer": write_view(
            out_root / "ai-flavor-reviewer",
            hc3_all,
            args.train_ratio,
            args.val_ratio,
            args.seed,
        ),
        "books-only-positive": write_view(
            out_root / "books-only-positive",
            books,
            args.train_ratio,
            args.val_ratio,
            args.seed,
        ),
        "personal-style": write_view(
            out_root / "personal-style",
            personal,
            args.train_ratio,
            args.val_ratio,
            args.seed,
        ),
    }
    print(json.dumps(summaries, ensure_ascii=False, indent=2))


def read_jsonl(path: Path) -> Iterable[Dict]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                yield json.loads(line)


def read_jsonl_if_exists(path: Path) -> Iterable[Dict]:
    if not path.exists():
        return []
    return read_jsonl(path)


def is_book_positive(row: Dict) -> bool:
    return str(row.get("sourceId", "")).startswith("book_") and row.get("label") == 1


def is_personal_style_positive(row: Dict) -> bool:
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    features = row.get("features") if isinstance(row.get("features"), dict) else {}
    return (
        row.get("sourceId") == "personal_style_qq_self"
        and row.get("taskKind") == "personal_style_qq_self_positive"
        and row.get("profile") == "personal_style_raw"
        and row.get("label") == 1
        and metadata.get("speaker") == "self"
        and metadata.get("selfUin") is not None
        and metadata.get("preserveVerbatim") is True
        and features.get("rewritten") is False
    )


def write_view(out_dir: Path, rows: List[Dict], train_ratio: float, val_ratio: float, seed: int) -> Dict:
    deduped = dedupe(rows)
    rng = random.Random(seed)
    rng.shuffle(deduped)
    train_end = int(len(deduped) * train_ratio)
    val_end = train_end + int(len(deduped) * val_ratio)
    train = deduped[:train_end]
    val = deduped[train_end:val_end]
    test = deduped[val_end:]
    out_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(out_dir / "samples.jsonl", deduped)
    write_jsonl(out_dir / "train.jsonl", train)
    write_jsonl(out_dir / "val.jsonl", val)
    write_jsonl(out_dir / "test.jsonl", test)
    summary = summarize(deduped, train, val, test)
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def dedupe(rows: Iterable[Dict]) -> List[Dict]:
    by_key: Dict[str, Dict] = {}
    for row in rows:
        key = sha256(f"{row.get('label')}:{row.get('sourceId')}:{normalize(row.get('text', ''))}")
        by_key[key] = row
    return list(by_key.values())


def summarize(rows: List[Dict], train: List[Dict], val: List[Dict], test: List[Dict]) -> Dict:
    return {
        "samples": len(rows),
        "labelCounts": dict(Counter(str(row.get("label")) for row in rows)),
        "profiles": dict(Counter(str(row.get("profile", "unknown")) for row in rows)),
        "taskKinds": dict(Counter(str(row.get("taskKind", "unknown")) for row in rows)),
        "sources": dict(Counter(str(row.get("sourceId", "unknown")) for row in rows)),
        "train": len(train),
        "val": len(val),
        "test": len(test),
    }


def write_jsonl(path: Path, rows: List[Dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalize(value: str) -> str:
    return " ".join(str(value or "").split())


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    main()
