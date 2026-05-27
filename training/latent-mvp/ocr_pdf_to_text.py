#!/usr/bin/env python3
"""OCR a scanned PDF into a UTF-8 text file.

This script preserves OCR output as-is. It does not rewrite, correct, or
summarize book text.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="PDF path")
    parser.add_argument("--output", required=True, help="UTF-8 text output path")
    parser.add_argument("--dpi", type=int, default=260)
    parser.add_argument("--lang", default="chi_sim+chi_tra+eng")
    parser.add_argument("--tessdata", default=str(Path(__file__).parent / "external" / "tessdata"))
    parser.add_argument("--tesseract", default="")
    parser.add_argument("--pdftoppm", default="")
    parser.add_argument("--tmp-dir", default=str(Path(__file__).parent / "external" / "ocr-cache"))
    parser.add_argument("--first-page", type=int, default=0)
    parser.add_argument("--last-page", type=int, default=0)
    parser.add_argument("--progress-every", type=int, default=10)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--psm", default="6", help="Tesseract page segmentation mode")
    args = parser.parse_args()

    pdf_path = Path(args.input)
    out_path = Path(args.output)
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    pdftoppm = resolve_tool(args.pdftoppm, "pdftoppm")
    tesseract = resolve_tesseract(args.tesseract)
    tessdata = Path(args.tessdata)
    if not tessdata.exists():
        raise FileNotFoundError(f"tessdata not found: {tessdata}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_root = Path(args.tmp_dir)
    tmp_root.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=f"{pdf_path.stem[:32]}-", dir=tmp_root) as work:
        work_path = Path(work)
        image_prefix = work_path / "page"
        render_cmd = [pdftoppm, "-r", str(args.dpi), "-png"]
        if args.first_page > 0:
            render_cmd += ["-f", str(args.first_page)]
        if args.last_page > 0:
            render_cmd += ["-l", str(args.last_page)]
        render_cmd += [str(pdf_path), str(image_prefix)]
        run(render_cmd)

        images = sorted(work_path.glob("page-*.png"))
        if not images:
            raise RuntimeError(f"pdftoppm produced no pages for {pdf_path}")

        env = os.environ.copy()
        env["TESSDATA_PREFIX"] = str(tessdata)
        completed_pages = 0
        page_texts: dict[int, str] = {}
        workers = max(1, int(args.workers or 1))
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(ocr_page, tesseract, image_path, work_path / f"ocr-{index:05d}", args.lang, args.psm, env): index
                for index, image_path in enumerate(images, start=1)
            }
            for future in as_completed(futures):
                index = futures[future]
                page_texts[index] = future.result()
                completed_pages += 1
                if args.progress_every > 0 and (
                    completed_pages == 1 or completed_pages == len(images) or completed_pages % args.progress_every == 0
                ):
                    print(f"OCR page {completed_pages}/{len(images)}", flush=True)

    parts = [page_texts[index].strip() for index in sorted(page_texts) if page_texts[index].strip()]
    out_path.write_text("\n\n".join(parts).strip() + "\n", encoding="utf-8")
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")
    return 0


def resolve_tool(explicit: str, name: str) -> str:
    if explicit:
        path = Path(explicit)
        if path.exists():
            return str(path)
        raise FileNotFoundError(explicit)
    found = shutil.which(name)
    if found:
        return found
    raise FileNotFoundError(f"{name} not found on PATH")


def resolve_tesseract(explicit: str) -> str:
    if explicit:
        return resolve_tool(explicit, "tesseract")
    found = shutil.which("tesseract")
    if found:
        return found
    windows_default = Path("C:/Program Files/Tesseract-OCR/tesseract.exe")
    if windows_default.exists():
        return str(windows_default)
    raise FileNotFoundError("tesseract not found")


def ocr_page(tesseract: str, image_path: Path, txt_base: Path, lang: str, psm: str, env: dict[str, str]) -> str:
    run(
        [
            tesseract,
            str(image_path),
            str(txt_base),
            "-l",
            lang,
            "--psm",
            psm,
        ],
        env=env,
    )
    return txt_base.with_suffix(".txt").read_text(encoding="utf-8", errors="replace")


def run(cmd: list[str], env: dict[str, str] | None = None) -> None:
    completed = subprocess.run(cmd, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if completed.returncode != 0:
        sys.stderr.write(completed.stdout)
        raise subprocess.CalledProcessError(completed.returncode, cmd, output=completed.stdout)


if __name__ == "__main__":
    raise SystemExit(main())
