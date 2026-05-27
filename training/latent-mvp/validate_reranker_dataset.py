#!/usr/bin/env python3
"""Validate ContentMRS latent reranker JSONL files."""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", nargs="+", required=True)
    parser.add_argument("--fail-on-hc3-human-positive", action="store_true")
    parser.add_argument("--fail-on-book-negative", action="store_true")
    parser.add_argument("--fail-on-duplicates", action="store_true")
    parser.add_argument("--expect-personal-style-only", action="store_true")
    parser.add_argument("--fail-on-personal-style", action="store_true")
    args = parser.parse_args()

    rows = list(load_rows(args.input))
    text_counts = Counter(normalize_text(row.get("text", "")) for row in rows)
    duplicate_texts = sum(1 for _, count in text_counts.items() if count > 1)
    hc3_human_positive = [
        row for row in rows
        if row.get("sourceId") == "Hello-SimpleAI/HC3-Chinese"
        and int(row.get("label", 0)) == 1
    ]
    book_negative = [
        row for row in rows
        if str(row.get("sourceId") or "").startswith("book_")
        and int(row.get("label", 0)) == 0
    ]
    personal_rows = [row for row in rows if row.get("sourceId") == "personal_style_qq_self"]
    invalid_personal_rows = [row for row in personal_rows if not is_valid_personal_style_row(row)]
    non_personal_rows = [row for row in rows if row.get("sourceId") != "personal_style_qq_self"]

    summary = {
        "version": "reranker-dataset-validation.v1",
        "inputs": [str(Path(item).resolve()) for item in args.input],
        "rows": len(rows),
        "labelCounts": dict(Counter(str(row.get("label")) for row in rows)),
        "sources": dict(Counter(str(row.get("sourceId", "unknown")) for row in rows)),
        "taskKinds": dict(Counter(str(row.get("taskKind", "unknown")) for row in rows)),
        "duplicateTextGroups": duplicate_texts,
        "hc3HumanPositiveRows": len(hc3_human_positive),
        "bookNegativeRows": len(book_negative),
        "personalStyleRows": len(personal_rows),
        "invalidPersonalStyleRows": len(invalid_personal_rows),
        "nonPersonalRows": len(non_personal_rows),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    failures: List[str] = []
    if args.fail_on_hc3_human_positive and hc3_human_positive:
        failures.append(f"HC3 positive rows found: {len(hc3_human_positive)}")
    if args.fail_on_book_negative and book_negative:
        failures.append(f"book negative rows found: {len(book_negative)}")
    if args.fail_on_duplicates and duplicate_texts:
        failures.append(f"duplicate text groups found: {duplicate_texts}")
    if args.fail_on_personal_style and personal_rows:
        failures.append(f"personal style rows found: {len(personal_rows)}")
    if args.expect_personal_style_only:
        if non_personal_rows:
            failures.append(f"non-personal rows found: {len(non_personal_rows)}")
        if invalid_personal_rows:
            failures.append(f"invalid personal style rows found: {len(invalid_personal_rows)}")
    if failures:
        raise SystemExit("; ".join(failures))


def load_rows(paths: List[str]) -> Iterable[Dict]:
    for path_text in paths:
        path = Path(path_text)
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    yield json.loads(line)


def normalize_text(value: str) -> str:
    return hashlib.sha256(" ".join(str(value or "").split()).encode("utf-8")).hexdigest()


def is_valid_personal_style_row(row: Dict) -> bool:
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    features = row.get("features") if isinstance(row.get("features"), dict) else {}
    text = str(row.get("text") or "").strip()
    return (
        row.get("sourceId") == "personal_style_qq_self"
        and row.get("profile") == "personal_style_raw"
        and row.get("taskKind") == "personal_style_qq_self_positive"
        and int(row.get("label", 0)) == 1
        and bool(text)
        and metadata.get("speaker") == "self"
        and metadata.get("selfUin") is not None
        and metadata.get("preserveVerbatim") is True
        and features.get("rewritten") is False
        and features.get("synthetic") is False
    )


if __name__ == "__main__":
    main()
