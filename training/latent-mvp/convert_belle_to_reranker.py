#!/usr/bin/env python3
"""Convert local BELLE instruction data into latent MVP reranker JSONL.

The script intentionally does not download BELLE. Point --input at an existing
BELLE json/jsonl file, such as Belle_open_source_0.5M.json.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path
from typing import Dict, Iterable, List


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Local BELLE json/jsonl file")
    parser.add_argument("--output", required=True, help="Output reranker jsonl")
    parser.add_argument("--max-samples", type=int, default=20000)
    parser.add_argument("--negative-ratio", type=float, default=1.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--min-output-chars", type=int, default=20)
    parser.add_argument("--max-output-chars", type=int, default=1600)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    records = list(read_belle_records(Path(args.input)))
    positives = [
        build_positive(record, index)
        for index, record in enumerate(records)
        if is_usable_record(record, args.min_output_chars, args.max_output_chars)
    ]
    if args.max_samples > 0:
        positives = positives[: args.max_samples]
    if not positives:
        raise SystemExit("no usable BELLE records")

    negatives = build_mismatch_negatives(positives, args.negative_ratio, rng)
    rows = positives + negatives
    rng.shuffle(rows)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    summary = {
        "input": str(Path(args.input).resolve()),
        "output": str(output.resolve()),
        "positive": len(positives),
        "negative": len(negatives),
        "total": len(rows),
        "negativeRatio": args.negative_ratio,
        "sourceId": "BelleGroup/train_0.5M_CN",
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def read_belle_records(path: Path) -> Iterable[Dict]:
    if not path.exists():
        raise SystemExit(f"input not found: {path}")
    text = path.read_text(encoding="utf-8")
    stripped = text.lstrip()
    if stripped.startswith("["):
        payload = json.loads(text)
        if not isinstance(payload, list):
            raise SystemExit("top-level JSON must be a list for .json BELLE files")
        for item in payload:
            if isinstance(item, dict):
                yield item
        return
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        item = json.loads(line)
        if isinstance(item, dict):
            yield item


def is_usable_record(record: Dict, min_output_chars: int, max_output_chars: int) -> bool:
    instruction = normalize_text(record.get("instruction"))
    output = normalize_text(record.get("output"))
    if len(instruction) < 4:
        return False
    if len(output) < min_output_chars or len(output) > max_output_chars:
        return False
    if looks_like_realtime_or_private(instruction) or looks_like_realtime_or_private(output):
        return False
    return True


def build_positive(record: Dict, index: int) -> Dict:
    topic = build_topic(record)
    text = normalize_text(record.get("output"))
    return {
        "sampleId": sha256(f"belle-positive:{index}:{topic}:{text[:120]}"),
        "sourceFile": "Belle_open_source_0.5M.json",
        "sourceId": "BelleGroup/train_0.5M_CN",
        "topic": topic,
        "profile": "instruction_following",
        "provider": "local.belle",
        "taskKind": "belle_instruction_positive",
        "text": text,
        "features": {
            "vectorSimilarity": 0.74,
            "fusedRelevance": 78,
            "relevanceScore": 78,
            "qualityBlockCount": 0,
            "referenceCoverageScore": 60,
            "instructionSignal": 0.9,
        },
        "label": 1,
    }


def build_topic(record: Dict) -> str:
    instruction = normalize_text(record.get("instruction"))
    input_text = normalize_text(record.get("input"))
    if input_text:
        return f"{instruction}\n{input_text}"
    return instruction


def build_mismatch_negatives(positives: List[Dict], negative_ratio: float, rng: random.Random) -> List[Dict]:
    target = max(0, int(len(positives) * max(0.0, negative_ratio)))
    if len(positives) < 2 or target <= 0:
        return []
    negatives: List[Dict] = []
    for index in range(target):
        topic_row = positives[index % len(positives)]
        text_row = positives[(index + rng.randrange(1, len(positives))) % len(positives)]
        negatives.append({
            **text_row,
            "sampleId": sha256(f"belle-negative:{index}:{topic_row['topic']}:{text_row['text'][:120]}"),
            "sourceId": "BelleGroup/train_0.5M_CN::mismatch_negative",
            "topic": topic_row["topic"],
            "provider": "synthetic.belle_mismatch",
            "taskKind": "belle_instruction_mismatch_negative",
            "features": {
                **text_row.get("features", {}),
                "vectorSimilarity": 0.05,
                "fusedRelevance": 10,
                "relevanceScore": 10,
                "mismatchNegative": 1,
            },
            "label": 0,
        })
    return negatives


def normalize_text(value) -> str:
    return " ".join(str(value or "").split())


def looks_like_realtime_or_private(text: str) -> bool:
    value = text.lower()
    patterns = [
        "电话号码",
        "身份证",
        "银行卡",
        "email",
        "邮箱",
        "今天的新闻",
        "最新股价",
        "实时",
    ]
    return any(pattern in value for pattern in patterns)


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    main()
