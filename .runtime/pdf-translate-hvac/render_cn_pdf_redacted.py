import json
import os
import re

import fitz

SRC = r"E:\ASUS-KL\Documents\xwechat_files\wxid_8g0c5l0t215q22_9144\msg\file\2026-05\Development of a Bias Comp...a Multi-Zone HVAC Facility_Syed Ali Asad Rizvi.pdf"
ROOT = os.path.dirname(__file__)
BLOCKS_PATH = os.path.join(ROOT, "blocks.json")
TRANS_PATH = os.path.join(ROOT, "translations.json")
OUT = os.path.join(ROOT, "Development_of_a_Bias_Compensating_Q-Learning_Controller_CN_redacted.pdf")
FONT = r"C:\Windows\Fonts\simsun.ttc"


def clean(text):
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    text = text.replace("Abstract—", "摘要——")
    text = text.replace("Index Terms—", "索引词——")
    return text


def fontsize_for(rect, text):
    area = rect.width * rect.height
    length = max(1, len(text))
    density = area / length
    if rect.height <= 14:
        return 5.4
    if density > 75:
        return 8.2
    if density > 52:
        return 7.2
    if density > 38:
        return 6.4
    if density > 28:
        return 5.7
    return 5.0


def main():
    with open(BLOCKS_PATH, "r", encoding="utf-8") as handle:
        blocks = json.load(handle)
    with open(TRANS_PATH, "r", encoding="utf-8") as handle:
        translations = json.load(handle)

    doc = fitz.open(SRC)
    blocks_by_page = {}
    for item in blocks:
        if item.get("translate") and translations.get(str(item["id"]), "").strip():
            blocks_by_page.setdefault(item["page"], []).append(item)

    for page_index, page_blocks in blocks_by_page.items():
        page = doc[page_index]
        for item in page_blocks:
            rect = fitz.Rect(item["bbox"])
            cover = fitz.Rect(rect.x0 - 0.7, rect.y0 - 0.7, rect.x1 + 0.7, rect.y1 + 0.7)
            page.add_redact_annot(cover, fill=(1, 1, 1))
        page.apply_redactions(images=0)
        page.insert_font(fontname="CNFONT", fontfile=FONT)
        for item in page_blocks:
            rect = fitz.Rect(item["bbox"])
            zh = clean(translations.get(str(item["id"]), ""))
            fs = fontsize_for(rect, zh)
            rc = page.insert_textbox(
                rect,
                zh,
                fontname="CNFONT",
                fontsize=fs,
                color=(0, 0, 0),
                align=fitz.TEXT_ALIGN_LEFT,
                lineheight=1.06,
                overlay=True,
            )
            if rc < 0:
                page.insert_textbox(
                    rect,
                    zh,
                    fontname="CNFONT",
                    fontsize=max(4.3, fs - 0.8),
                    color=(0, 0, 0),
                    align=fitz.TEXT_ALIGN_LEFT,
                    lineheight=1.0,
                    overlay=True,
                )

    doc.save(OUT, deflate=True, garbage=4)
    print(OUT)


if __name__ == "__main__":
    main()
