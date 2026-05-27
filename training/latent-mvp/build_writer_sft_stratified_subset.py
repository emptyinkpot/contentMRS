#!/usr/bin/env python3
"""Build a reproducible stratified subset from writer SFT JSONL files."""
from __future__ import annotations

import argparse
import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List


LITERARY_SOURCES = {
    "book_kawabata_collection_raw",
    "book_kinkakuji_raw",
    "book_mishima_collection_raw",
    "book_ishiguro_collection_raw",
    "book_fortress_besieged_raw",
    "book_luxun_complete_raw",
    "book_natsume_soseki_raw",
    "book_sakaguchi_ango_raw",
    "book_dazai_osamu_raw",
}

ARGUMENT_SOURCES = {
    "book_xingwang_world_history_21",
    "book_oracle_chinese_history_raw",
    "book_european_history_selection_raw",
    "book_capital_raw",
    "book_marx_engels_vol32_raw",
    "book_naito_konan_raw",
    "book_miyazaki_history_raw",
    "book_saiwai_shidi_raw",
    "book_dongying_wenren_raw",
    "book_korea_general_history_raw",
    "book_japanese_empire_observation_raw",
    "book_shina_revolution_gaishi_raw",
    "book_kita_ikki_raw",
    "book_puyi_memoir_raw",
}

CLASSICAL_SOURCES = {
    "book_quan_tangshi_raw",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-file", required=True)
    parser.add_argument("--val-file", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--train-size", type=int, default=14000)
    parser.add_argument("--val-size", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=20260522)
    parser.add_argument("--literary-ratio", type=float, default=0.465)
    parser.add_argument("--argument-ratio", type=float, default=0.355)
    parser.add_argument("--mixed-ratio", type=float, default=0.145)
    parser.add_argument("--classical-ratio", type=float, default=0.035)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    train_rows = list(read_jsonl(Path(args.train_file)))
    val_rows = list(read_jsonl(Path(args.val_file)))

    train = build_subset(
        train_rows,
        quotas=make_quotas(args.train_size, args),
        rng=rng,
    )
    if len(train) != args.train_size:
        raise SystemExit(f"expected {args.train_size} train rows, got {len(train)}")

    val = build_subset(
        val_rows,
        quotas=make_quotas(args.val_size, args),
        rng=rng,
    )
    if len(val) != args.val_size:
        raise SystemExit(f"expected {args.val_size} val rows, got {len(val)}")

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rng.shuffle(train)
    rng.shuffle(val)
    write_jsonl(out_dir / "train.jsonl", train)
    write_jsonl(out_dir / "val.jsonl", val)
    write_jsonl(out_dir / "samples.jsonl", train + val)
    summary = summarize(train, val, args)
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print_json(summary)


def make_quotas(total: int, args) -> Dict[str, int]:
    raw = {
        "literary": max(0.0, args.literary_ratio),
        "argument": max(0.0, args.argument_ratio),
        "mixed": max(0.0, args.mixed_ratio),
        "classical": max(0.0, args.classical_ratio),
    }
    ratio_sum = sum(raw.values())
    if ratio_sum <= 0:
        raise SystemExit("at least one ratio must be positive")
    quotas = {key: int(total * value / ratio_sum) for key, value in raw.items()}
    missing = total - sum(quotas.values())
    order = sorted(raw, key=raw.get, reverse=True)
    for index in range(missing):
        quotas[order[index % len(order)]] += 1
    return quotas


def read_jsonl(path: Path) -> Iterable[Dict]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                yield json.loads(line)


def build_subset(rows: List[Dict], quotas: Dict[str, int], rng: random.Random) -> List[Dict]:
    buckets: Dict[str, List[Dict]] = defaultdict(list)
    for row in rows:
        buckets[classify(row)].append(row)

    selected: List[Dict] = []
    selected_ids = set()
    for bucket_name, quota in quotas.items():
        picked = take_balanced_by_source(buckets[bucket_name], quota, rng, selected_ids)
        selected.extend(picked)
        selected_ids.update(row_key(row) for row in picked)

    missing = sum(quotas.values()) - len(selected)
    if missing > 0:
        fallback = [row for row in rows if row_key(row) not in selected_ids]
        selected.extend(take_balanced_by_source(fallback, missing, rng, selected_ids))
    return selected


def classify(row: Dict) -> str:
    source_id = str(row.get("sourceId") or "")
    task_kind = str(row.get("taskKind") or "")
    if source_id in CLASSICAL_SOURCES:
        return "classical"
    if task_kind.endswith("_window_positive"):
        return "mixed"
    if source_id in LITERARY_SOURCES:
        return "literary"
    if source_id in ARGUMENT_SOURCES:
        return "argument"
    return "mixed"


def take_balanced_by_source(rows: List[Dict], count: int, rng: random.Random, excluded: set[str]) -> List[Dict]:
    available = [row for row in rows if row_key(row) not in excluded]
    by_source: Dict[str, List[Dict]] = defaultdict(list)
    for row in available:
        by_source[str(row.get("sourceId") or "unknown")].append(row)
    for group in by_source.values():
        rng.shuffle(group)

    out: List[Dict] = []
    sources = sorted(by_source, key=lambda item: len(by_source[item]), reverse=True)
    while len(out) < count and sources:
        progressed = False
        for source in list(sources):
            group = by_source[source]
            if not group:
                sources.remove(source)
                continue
            row = group.pop()
            key = row_key(row)
            if key in excluded:
                continue
            out.append(row)
            excluded.add(key)
            progressed = True
            if len(out) >= count:
                break
        if not progressed:
            break
    return out


def row_key(row: Dict) -> str:
    return "|".join(
        [
            str(row.get("sourceId") or ""),
            str(row.get("contextSampleId") or ""),
            str(row.get("targetSampleId") or ""),
            str(row.get("windowStart") or ""),
            str(row.get("taskKind") or ""),
        ]
    )


def summarize(train: List[Dict], val: List[Dict], args) -> Dict:
    rows = train + val
    outputs = [len(row["messages"][1]["content"]) for row in rows]
    return {
        "version": "contentmrs-writer-sft-stratified-subset.v1",
        "seed": args.seed,
        "train": len(train),
        "val": len(val),
        "samples": len(rows),
        "quotas": {
            "train": make_quotas(len(train), args),
            "val": make_quotas(len(val), args),
        },
        "sources": dict(Counter(row.get("sourceId", "unknown") for row in rows)),
        "taskKinds": dict(Counter(row.get("taskKind", "unknown") for row in rows)),
        "buckets": dict(Counter(classify(row) for row in rows)),
        "outputChars": {
            "min": min(outputs) if outputs else 0,
            "max": max(outputs) if outputs else 0,
            "avg": round(sum(outputs) / max(1, len(outputs)), 2),
        },
    }


def write_jsonl(path: Path, rows: List[Dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def print_json(payload: Dict) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    try:
        print(text)
    except UnicodeEncodeError:
        sys.stdout.buffer.write((text + "\n").encode("utf-8"))


if __name__ == "__main__":
    main()
