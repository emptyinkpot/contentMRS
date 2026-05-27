#!/usr/bin/env python3
"""Build writer SFT JSONL from ordered book-original positive rows.

The target task is continuation, not judgment:

    previous original-text chunk -> next original-text chunk

Assistant outputs are copied from source rows. This script does not rewrite,
paraphrase, synthesize, or style-transfer book text.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Ordered reranker/source JSONL with book positive rows")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--train-ratio", type=float, default=0.96)
    parser.add_argument("--val-ratio", type=float, default=0.02)
    parser.add_argument("--mode", choices=["adjacent", "raw-window", "both"], default="adjacent")
    parser.add_argument("--max-context-chars", type=int, default=1400)
    parser.add_argument("--max-output-chars", type=int, default=0, help="0 keeps full target chunk")
    parser.add_argument("--min-context-chars", type=int, default=80)
    parser.add_argument("--min-output-chars", type=int, default=80)
    parser.add_argument("--window-context-chars", type=int, default=260)
    parser.add_argument("--window-output-chars", type=int, default=260)
    parser.add_argument("--window-stride-chars", type=int, default=160)
    parser.add_argument("--quality-filter", choices=["off", "clean-writer", "clean-writer-strict"], default="off")
    parser.add_argument("--include-hc3", action="store_true", help="Off by default; HC3 is not author-flow data")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    source_rows = list(read_jsonl(Path(args.input)))
    rows: List[Dict] = []
    if args.mode in ("adjacent", "both"):
        rows.extend(
            build_continuation_rows(
                source_rows,
                min_context_chars=args.min_context_chars,
                min_output_chars=args.min_output_chars,
                max_context_chars=args.max_context_chars,
                max_output_chars=args.max_output_chars,
                include_hc3=args.include_hc3,
            )
        )
    if args.mode in ("raw-window", "both"):
        rows.extend(
            build_raw_window_rows(
                source_rows,
                min_context_chars=args.min_context_chars,
                min_output_chars=args.min_output_chars,
                context_chars=args.window_context_chars,
                output_chars=args.window_output_chars,
                stride_chars=args.window_stride_chars,
                include_hc3=args.include_hc3,
            )
        )
    rows = dedupe(rows)
    before_quality_filter = len(rows)
    if args.quality_filter in {"clean-writer", "clean-writer-strict"}:
        apply_clean_writer_filter.strict = args.quality_filter == "clean-writer-strict"
        rows = apply_clean_writer_filter(rows)
    rng = random.Random(args.seed)
    rng.shuffle(rows)

    train, val, test = split_rows(rows, args.train_ratio, args.val_ratio)
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(out_dir / "train.jsonl", train)
    write_jsonl(out_dir / "val.jsonl", val)
    write_jsonl(out_dir / "test.jsonl", test)
    write_jsonl(out_dir / "samples.jsonl", rows)
    summary = summarize(rows, train, val, test, args, before_quality_filter)
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print_json(summary)


def read_jsonl(path: Path) -> Iterable[Dict]:
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            row["_inputLine"] = line_number
            yield row


def build_continuation_rows(
    rows: List[Dict],
    min_context_chars: int,
    min_output_chars: int,
    max_context_chars: int,
    max_output_chars: int,
    include_hc3: bool,
) -> List[Dict]:
    groups: Dict[tuple[str, str], List[Dict]] = defaultdict(list)
    for row in rows:
        if not is_allowed_source(row, include_hc3):
            continue
        text = source_text(row)
        if len(text) < min(min_context_chars, min_output_chars):
            continue
        key = (str(row.get("sourceId") or ""), str(row.get("sourceFile") or ""))
        groups[key].append(row)

    out: List[Dict] = []
    for (source_id, source_file), group in groups.items():
        # Preserve input order. The input must come from an ordered source export,
        # not from a shuffled training split.
        group = sorted(group, key=lambda item: int(item.get("_inputLine") or 0))
        for index in range(1, len(group)):
            previous = group[index - 1]
            current = group[index]
            context = trim_context(source_text(previous), max_context_chars)
            output = trim_output(source_text(current), max_output_chars)
            if len(context) < min_context_chars or len(output) < min_output_chars:
                continue
            out.append(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": (
                                "根据下面的原文前文，续写下一段正文。"
                                "只输出续写正文，不解释，不总结，不改写前文。\n\n"
                                f"前文：\n{context}"
                            ),
                        },
                        {"role": "assistant", "content": output},
                    ],
                    "sourceId": source_id,
                    "sourceFile": source_file,
                    "taskKind": "writer_continuation_raw_positive",
                    "topic": str(current.get("topic") or ""),
                    "contextSampleId": str(previous.get("sampleId") or ""),
                    "targetSampleId": str(current.get("sampleId") or ""),
                    "sourceOrdinal": index,
                }
            )
    return out


def build_raw_window_rows(
    rows: List[Dict],
    min_context_chars: int,
    min_output_chars: int,
    context_chars: int,
    output_chars: int,
    stride_chars: int,
    include_hc3: bool,
) -> List[Dict]:
    out: List[Dict] = []
    context_chars = max(min_context_chars, context_chars)
    output_chars = max(min_output_chars, output_chars)
    stride_chars = max(1, stride_chars)
    for row in rows:
        if not is_allowed_source(row, include_hc3):
            continue
        text = source_text(row)
        if len(text) < context_chars + min_output_chars:
            continue
        source_id = str(row.get("sourceId") or "")
        source_file = str(row.get("sourceFile") or "")
        sample_id = str(row.get("sampleId") or "")
        stop = len(text) - min_output_chars
        for start in range(0, stop, stride_chars):
            context = text[start : start + context_chars].strip()
            output_start = start + context_chars
            output = trim_output(text[output_start : output_start + output_chars], output_chars)
            if len(context) < min_context_chars or len(output) < min_output_chars:
                continue
            out.append(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": (
                                "根据下面的原文前文，续写下一段正文。"
                                "只输出续写正文，不解释，不总结，不改写前文。\n\n"
                                f"前文：\n{context}"
                            ),
                        },
                        {"role": "assistant", "content": output},
                    ],
                    "sourceId": source_id,
                    "sourceFile": source_file,
                    "taskKind": "writer_continuation_raw_window_positive",
                    "topic": str(row.get("topic") or ""),
                    "contextSampleId": sample_id,
                    "targetSampleId": sample_id,
                    "sourceOrdinal": int(row.get("_inputLine") or 0),
                    "windowStart": start,
                    "windowContextChars": context_chars,
                    "windowOutputChars": output_chars,
                }
            )
    return out


def is_allowed_source(row: Dict, include_hc3: bool) -> bool:
    source_id = str(row.get("sourceId") or "")
    if int(row.get("label", 0)) != 1:
        return False
    if source_id.startswith("book_"):
        return True
    if include_hc3 and source_id == "Hello-SimpleAI/HC3-Chinese":
        return True
    return False


def source_text(row: Dict) -> str:
    return str(row.get("text") or "").replace("\ufeff", "").strip()


def trim_context(text: str, max_chars: int) -> str:
    text = text.strip()
    if max_chars <= 0 or len(text) <= max_chars:
        return text
    return text[-max_chars:].strip()


def trim_output(text: str, max_chars: int) -> str:
    text = text.strip()
    if max_chars <= 0 or len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    for mark in ("\n\n", "。", "！", "？", "\n"):
        pos = cut.rfind(mark)
        if pos >= max_chars * 0.55:
            return cut[: pos + len(mark)].strip()
    return cut.strip()


def dedupe(rows: List[Dict]) -> List[Dict]:
    seen = set()
    out = []
    for row in rows:
        output = row["messages"][1]["content"]
        key = hashlib.sha256(
            f"{row.get('sourceId')}:{row.get('sourceFile')}:{normalize_for_dedupe(output)}".encode("utf-8")
        ).hexdigest()
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def apply_clean_writer_filter(rows: List[Dict]) -> List[Dict]:
    out: List[Dict] = []
    reject_counts: Counter[str] = Counter()
    for row in rows:
        context = user_context(row)
        output = row["messages"][1]["content"]
        reason = clean_writer_reject_reason(context, output, row)
        if reason:
            reject_counts[reason] += 1
            continue
        out.append(row)
    for row in out:
        row["qualityView"] = "clean-writer"
    apply_clean_writer_filter.reject_counts = reject_counts
    return out


def user_context(row: Dict) -> str:
    content = str(row["messages"][0].get("content") or "")
    marker = "前文：\n"
    if marker in content:
        return content.split(marker, 1)[1].strip()
    return content.strip()


def clean_writer_reject_reason(context: str, output: str, row: Dict) -> str:
    combined = f"{context}\n{output}".strip()
    source_id = str(row.get("sourceId") or "")
    source_file = str(row.get("sourceFile") or "").lower()
    if source_id in {"book_quan_tangshi_raw", "book_korea_general_history_raw"}:
        return "excluded_source_for_clean_writer"
    if "ocr" in source_file and source_id not in {"book_marx_engels_vol32_raw"}:
        return "ocr_source_for_clean_writer"
    if len(output.strip()) < 120:
        return "short_output"
    if has_forbidden_layout_noise(combined):
        return "layout_or_metadata_noise"
    if is_strict_clean_filter(row) and has_strict_annotation_noise(combined):
        return "strict_annotation_noise"
    if has_footnote_shape(output) or has_footnote_shape(context):
        return "footnote_or_annotation_shape"
    if is_strict_clean_filter(row) and has_any_inline_footnote_ref(combined):
        return "strict_inline_footnote_ref"
    if looks_like_reference_or_catalog(output):
        return "reference_catalog_shape"
    if is_strict_clean_filter(row) and looks_like_academic_citation_block(combined):
        return "strict_academic_citation_shape"
    if is_strict_clean_filter(row) and looks_like_mojibake_or_ocr_fragment(combined):
        return "strict_ocr_or_mojibake_shape"
    if looks_like_chronology_or_table(output):
        return "chronology_or_table_shape"
    if punctuation_density(output) < 0.012:
        return "low_punctuation_density"
    if ascii_ratio(output) > 0.18:
        return "high_ascii_ratio"
    if japanese_kana_ratio(output) > 0.02:
        return "high_japanese_kana_ratio"
    if year_density(output) > 0.035:
        return "high_year_density"
    if digit_density(output) > 0.12:
        return "high_digit_density"
    return ""


def is_strict_clean_filter(row: Dict) -> bool:
    return str(row.get("qualityFilter") or "") == "clean-writer-strict" or getattr(
        apply_clean_writer_filter, "strict", False
    )


def has_forbidden_layout_noise(text: str) -> bool:
    patterns = [
        r"Document generated by Anna.?s Archive",
        r"pdg_main_pages_found",
        r"pdf_generation_missing_pages",
        r"losslessly embedded",
        r"z-library\.sk|1lib\.sk|z-lib\.sk",
        r"插图\s*\d{3,}",
        r"备注：原书插图",
        r"^\s*版权信息\s*$",
        r"ISBN|DNA-BN|BookDNA",
        r"https?://|www\.",
        r"目录|总目录|作者简介|内容简介|译者序|译后记",
        r"参考文献|注释|附录|索引",
    ]
    return any(re.search(pattern, text, re.IGNORECASE | re.MULTILINE) for pattern in patterns)


def has_strict_annotation_noise(text: str) -> bool:
    patterns = [
        r"@《",
        r"《[^》]{1,80}》[,，、]?\s*(第?\d{1,4}\s*[页頁]|[上中下]?\s*\d{1,4}\s*[页頁])",
        r"全集[人第]?\s*\d{1,3}\s*[,，]\s*\d{1,4}\s*[页頁]",
        r"书简\s*\d{1,4}",
        r"filepos\d+|part\d+\.html",
        r"^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s*",
        r"^\s*[＊*]\s*译注",
        r"^\s*注[:：]",
    ]
    return any(re.search(pattern, text, re.IGNORECASE | re.MULTILINE) for pattern in patterns)


def has_any_inline_footnote_ref(text: str) -> bool:
    return bool(re.search(r"\[\d{1,3}\]", text))


def has_footnote_shape(text: str) -> bool:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if re.search(r"^\s*\[\d{1,3}\]\s*", text, re.MULTILINE):
        return True
    bracket_refs = len(re.findall(r"\[\d{1,3}\]", text))
    if bracket_refs >= 2:
        return True
    numbered_lines = sum(1 for line in lines if re.match(r"^(\[\d{1,3}\]|\d{1,3}[.、])\s*", line))
    return bool(lines) and numbered_lines / len(lines) > 0.25


def looks_like_academic_citation_block(text: str) -> bool:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return True
    cite_hits = sum(
        1
        for line in lines
        if re.search(r"(参见|见|载|页|卷|册|全集|文集|书简|出版社|Journal|Press)", line, re.IGNORECASE)
    )
    quote_title_hits = len(re.findall(r"《[^》]{1,80}》", text))
    return cite_hits >= 3 or quote_title_hits >= 4


def looks_like_mojibake_or_ocr_fragment(text: str) -> bool:
    if re.search(r"[�□■◆◇●○]{2,}|[╔╗╚╝╠╣╦╩╬═║]{1,}", text):
        return True
    if re.search(r"[`~^_]{2,}", text):
        return True
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return True
    odd_spacing = sum(1 for line in lines if re.search(r"[\u4e00-\u9fff]\s+[\u4e00-\u9fff]\s+[\u4e00-\u9fff]", line))
    return odd_spacing / len(lines) > 0.25


def looks_like_reference_or_catalog(text: str) -> bool:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return True
    heading_words = sum(
        1
        for line in lines
        if re.search(r"(第[一二三四五六七八九十百千万\d]+[章节卷部]|part\d+|filepos|目录|索引|参考文献)", line, re.IGNORECASE)
    )
    return heading_words >= 2 or heading_words / len(lines) > 0.2


def looks_like_chronology_or_table(text: str) -> bool:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) < 3:
        return False
    year_start = sum(1 for line in lines if re.match(r"^(公元前)?\d{3,4}[年—\-~至\s]", line))
    delimiter_rows = sum(1 for line in lines if line.count("|") >= 2 or line.count("\t") >= 2)
    return year_start / len(lines) > 0.35 or delimiter_rows / len(lines) > 0.25


def punctuation_density(text: str) -> float:
    return len(re.findall(r"[。！？；，、：]", text)) / max(1, len(text))


def ascii_ratio(text: str) -> float:
    return len(re.findall(r"[A-Za-z]", text)) / max(1, len(text))


def japanese_kana_ratio(text: str) -> float:
    return len(re.findall(r"[\u3040-\u30ff]", text)) / max(1, len(text))


def year_density(text: str) -> float:
    return len(re.findall(r"(?:公元前)?\d{3,4}年", text)) / max(1, len(text))


def digit_density(text: str) -> float:
    return len(re.findall(r"\d", text)) / max(1, len(text))


def split_rows(rows: List[Dict], train_ratio: float, val_ratio: float):
    train_end = int(len(rows) * train_ratio)
    val_end = train_end + int(len(rows) * val_ratio)
    return rows[:train_end], rows[train_end:val_end], rows[val_end:]


def summarize(rows: List[Dict], train: List[Dict], val: List[Dict], test: List[Dict], args, before_quality_filter: int) -> Dict:
    sources = Counter(row.get("sourceId", "unknown") for row in rows)
    source_files = Counter(row.get("sourceFile", "unknown") for row in rows)
    lengths = [len(row["messages"][1]["content"]) for row in rows]
    context_lengths = [len(row["messages"][0]["content"]) for row in rows]
    return {
        "version": "contentmrs-writer-continuation-sft.v2",
        "samples": len(rows),
        "train": len(train),
        "val": len(val),
        "test": len(test),
        "includeHc3": bool(args.include_hc3),
        "mode": args.mode,
        "qualityFilter": args.quality_filter,
        "beforeQualityFilter": before_quality_filter,
        "qualityRejected": before_quality_filter - len(rows),
        "qualityRejectCounts": dict(getattr(apply_clean_writer_filter, "reject_counts", Counter())),
        "taskKinds": dict(Counter(row.get("taskKind", "unknown") for row in rows)),
        "sources": dict(sources),
        "sourceFiles": dict(source_files),
        "outputChars": describe_lengths(lengths),
        "contextPromptChars": describe_lengths(context_lengths),
    }


def describe_lengths(lengths: List[int]) -> Dict:
    return {
        "min": min(lengths) if lengths else 0,
        "max": max(lengths) if lengths else 0,
        "avg": round(sum(lengths) / max(1, len(lengths)), 2),
    }


def write_jsonl(path: Path, rows: List[Dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalize_for_dedupe(value: str) -> str:
    return " ".join(value.split())


def print_json(payload: Dict) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    try:
        print(text)
    except UnicodeEncodeError:
        sys.stdout.buffer.write((text + "\n").encode("utf-8"))


if __name__ == "__main__":
    main()
