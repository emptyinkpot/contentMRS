#!/usr/bin/env python3
"""Convert verified self-authored message exports into personal-style rows.

Input rows must already identify the sender. This script refuses rows that do
not prove the message was sent by the requested self UIN.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional


TEXT_KEYS = ("text", "content", "message", "msg")
SENDER_KEYS = ("senderUin", "fromUin", "sender", "uin", "peerUin")
SELF_FLAGS = ("isSelf", "self", "isSend", "fromSelf")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="JSONL export with original message rows.")
    parser.add_argument("--output", default="training/latent-mvp/external/personal-style/qq-self/qq-self-style.jsonl")
    parser.add_argument("--summary", default="training/latent-mvp/external/personal-style/qq-self/summary.json")
    parser.add_argument("--self-uin", required=True)
    parser.add_argument("--min-chars", type=int, default=2)
    parser.add_argument("--max-chars", type=int, default=600)
    args = parser.parse_args()

    source = Path(args.input)
    rows = list(read_jsonl(source))
    accepted: List[Dict] = []
    rejected = 0
    for index, row in enumerate(rows):
        text = extract_text(row)
        if not is_self_row(row, args.self_uin) or not text:
            rejected += 1
            continue
        text = text.strip()
        if len(text) < args.min_chars or len(text) > args.max_chars:
            rejected += 1
            continue
        accepted.append(to_training_row(row, text, args.self_uin, source, index))

    accepted = dedupe(accepted)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    write_jsonl(output, accepted)
    summary = {
        "version": "personal-style-qq-self.v1",
        "source": str(source.resolve()),
        "output": str(output.resolve()),
        "selfUin": args.self_uin,
        "inputRows": len(rows),
        "acceptedRows": len(accepted),
        "rejectedRows": rejected,
        "sourceId": "personal_style_qq_self",
        "policy": {
            "speaker": "self only",
            "preserveVerbatim": True,
            "rewritten": False,
            "synthetic": False,
        },
    }
    Path(args.summary).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def read_jsonl(path: Path) -> Iterable[Dict]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                yield json.loads(line)


def extract_text(row: Dict) -> str:
    for key in TEXT_KEYS:
        value = row.get(key)
        if isinstance(value, str):
            return value
    return ""


def is_self_row(row: Dict, self_uin: str) -> bool:
    for key in SENDER_KEYS:
        value = row.get(key)
        if value is not None and str(value) == str(self_uin):
            return True
    for key in SELF_FLAGS:
        value = row.get(key)
        if value is True or value == 1 or str(value).lower() in {"1", "true", "yes"}:
            return True
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    sender = metadata.get("senderUin") or metadata.get("fromUin") or metadata.get("selfUin")
    if sender is not None and str(sender) == str(self_uin):
        return True
    return metadata.get("speaker") == "self" and str(metadata.get("selfUin")) == str(self_uin)


def to_training_row(row: Dict, text: str, self_uin: str, source: Path, index: int) -> Dict:
    source_message_id = row.get("id") or row.get("msgId") or row.get("messageId") or f"row-{index}"
    digest = sha256(f"{self_uin}:{source_message_id}:{text}")
    created_at = row.get("createdAt") or row.get("time") or row.get("timestamp") or row.get("msgTime")
    return {
        "sampleId": f"personal_qq_self_{digest[:24]}",
        "sourceFile": str(source),
        "sourceId": "personal_style_qq_self",
        "topic": "personal-style:qq-self-message",
        "profile": "personal_style_raw",
        "provider": "local.qq_export",
        "taskKind": "personal_style_qq_self_positive",
        "text": text,
        "features": {
            "personalStyleSignal": 1.0,
            "styleSignal": 1.0,
            "factSignal": 0.05,
            "rewritten": False,
            "synthetic": False,
        },
        "metadata": {
            "speaker": "self",
            "selfUin": str(self_uin),
            "sourceMessageId": str(source_message_id),
            "createdAt": created_at,
            "preserveVerbatim": True,
        },
        "label": 1,
    }


def dedupe(rows: Iterable[Dict]) -> List[Dict]:
    seen = set()
    output = []
    for row in rows:
        key = sha256(row["text"])
        if key in seen:
            continue
        seen.add(key)
        output.append(row)
    return output


def write_jsonl(path: Path, rows: List[Dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    main()
