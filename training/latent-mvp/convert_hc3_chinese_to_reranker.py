#!/usr/bin/env python3
"""Convert HC3-Chinese into latent MVP AI-flavor detection rows.

HC3-Chinese contains paired human_answers and chatgpt_answers. In this training
path, HC3 is AI-flavor contrast data: ChatGPT answers are negative examples by
default, while human answers are skipped unless explicitly requested. Book/user
corpora are the positive style signal.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path
from typing import Dict, Iterable, List


SOURCE_ID = "Hello-SimpleAI/HC3-Chinese"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--input", help="Optional local HC3 json/jsonl file")
    parser.add_argument("--dataset", default=SOURCE_ID)
    parser.add_argument("--subset", default="all")
    parser.add_argument("--split", default="train")
    parser.add_argument("--cache-dir", default="training/latent-mvp/external/hc3-chinese/cache")
    parser.add_argument("--max-rows", type=int, default=0)
    parser.add_argument("--max-answers-per-question", type=int, default=0)
    parser.add_argument("--min-chars", type=int, default=1)
    parser.add_argument("--max-chars", type=int, default=0)
    parser.add_argument("--include-human", action="store_true", help="Also emit HC3 human answers as positives.")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = list(load_rows(args))
    rng = random.Random(args.seed)
    rng.shuffle(rows)
    if args.max_rows > 0:
        rows = rows[: args.max_rows]

    converted: List[Dict] = []
    for index, row in enumerate(rows):
        question = normalize(row.get("question") or row.get("prompt") or row.get("query"))
        if not question:
            continue
        human_answers = normalize_answers(row.get("human_answers"))
        chatgpt_answers = normalize_answers(row.get("chatgpt_answers"))
        if args.include_human:
            for answer_index, answer in enumerate(limit_answers(human_answers, args.max_answers_per_question)):
                if usable(answer, args.min_chars, args.max_chars):
                    converted.append(build_row(index, answer_index, question, answer, 1, "hc3_human_positive"))
        for answer_index, answer in enumerate(limit_answers(chatgpt_answers, args.max_answers_per_question)):
            if usable(answer, args.min_chars, args.max_chars):
                converted.append(build_row(index, answer_index, question, answer, 0, "hc3_chatgpt_ai_negative"))

    if not converted:
        raise SystemExit("no HC3 rows converted")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for row in converted:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    summary = {
        "sourceId": SOURCE_ID,
        "output": str(output.resolve()),
        "rows": len(rows),
        "converted": len(converted),
        "positive": sum(1 for row in converted if row["label"] == 1),
        "negative": sum(1 for row in converted if row["label"] == 0),
        "license": "cc-by-sa-4.0",
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def load_rows(args: argparse.Namespace) -> Iterable[Dict]:
    if args.input:
        yield from read_local(Path(args.input))
        return
    from datasets import load_dataset

    dataset = load_dataset(args.dataset, args.subset, split=args.split, cache_dir=args.cache_dir)
    for row in dataset:
        if isinstance(row, dict):
            yield row


def read_local(path: Path) -> Iterable[Dict]:
    if not path.exists():
        raise SystemExit(f"input not found: {path}")
    text = path.read_text(encoding="utf-8")
    stripped = text.lstrip()
    if stripped.startswith("["):
        for item in json.loads(text):
            if isinstance(item, dict):
                yield item
        return
    for line in text.splitlines():
        line = line.strip()
        if line:
            item = json.loads(line)
            if isinstance(item, dict):
                yield item


def normalize_answers(value) -> List[str]:
    if isinstance(value, list):
        return [normalize(item) for item in value if normalize(item)]
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("["):
            try:
                payload = json.loads(stripped)
                if isinstance(payload, list):
                    return [normalize(item) for item in payload if normalize(item)]
            except json.JSONDecodeError:
                pass
        return [normalize(stripped)] if stripped else []
    return []


def limit_answers(answers: List[str], max_answers: int) -> List[str]:
    if max_answers <= 0:
        return answers
    return answers[:max_answers]


def build_row(index: int, answer_index: int, question: str, answer: str, label: int, task_kind: str) -> Dict:
    return {
        "sampleId": sha256(f"hc3:{index}:{answer_index}:{label}:{question}:{answer[:160]}"),
        "sourceFile": SOURCE_ID,
        "sourceId": SOURCE_ID,
        "topic": question,
        "profile": "ai_flavor_detection",
        "provider": "local.hc3_chinese",
        "taskKind": task_kind,
        "text": answer,
        "features": {
            "vectorSimilarity": 0.7 if label else 0.08,
            "fusedRelevance": 75 if label else 8,
            "relevanceScore": 75 if label else 8,
            "qualityBlockCount": 0 if label else 1,
            "referenceCoverageScore": 60 if label else 0,
            "humanSignal": 1 if label else 0,
            "aiFlavorSignal": 0 if label else 1,
        },
        "label": label,
    }


def usable(text: str, min_chars: int, max_chars: int) -> bool:
    value = normalize(text)
    if len(value) < min_chars:
        return False
    if max_chars > 0 and len(value) > max_chars:
        return False
    return True


def normalize(value) -> str:
    return " ".join(str(value or "").split())


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    main()
