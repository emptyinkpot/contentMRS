import json
import os
import re

import fitz

SRC = r"E:\ASUS-KL\Documents\xwechat_files\wxid_8g0c5l0t215q22_9144\msg\file\2026-05\Development of a Bias Comp...a Multi-Zone HVAC Facility_Syed Ali Asad Rizvi.pdf"
ROOT = os.path.dirname(__file__)
BLOCKS_PATH = os.path.join(ROOT, "blocks.json")
TRANS_PATH = os.path.join(ROOT, "translations.json")
OUT = os.path.join(ROOT, "Development_of_a_Bias_Compensating_Q-Learning_Controller_CN.pdf")
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
        return 5.6
    if density > 75:
        return 8.4
    if density > 52:
        return 7.4
    if density > 38:
        return 6.6
    if density > 28:
        return 5.9
    return 5.2


def main():
    with open(BLOCKS_PATH, "r", encoding="utf-8") as handle:
        blocks = json.load(handle)
    with open(TRANS_PATH, "r", encoding="utf-8") as handle:
        translations = json.load(handle)
    doc = fitz.open(SRC)
    fontname = "CNFONT"
    for page in doc:
        page.insert_font(fontname=fontname, fontfile=FONT)

    for item in blocks:
        if not item.get("translate"):
            continue
        zh = clean(translations.get(str(item["id"]), ""))
        if not zh:
            continue
        page = doc[item["page"]]
        rect = fitz.Rect(item["bbox"])
        # Small expansions hide antialiased English edges without touching neighboring formula blocks.
        cover = fitz.Rect(rect.x0 - 0.8, rect.y0 - 0.8, rect.x1 + 0.8, rect.y1 + 0.8)
        page.draw_rect(cover, color=None, fill=(1, 1, 1), overlay=True)
        fs = fontsize_for(rect, zh)
        rc = page.insert_textbox(
            rect,
            zh,
            fontname=fontname,
            fontsize=fs,
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_LEFT,
            lineheight=1.08,
            overlay=True,
        )
        if rc < 0:
            page.insert_textbox(
                rect,
                zh,
                fontname=fontname,
                fontsize=max(4.4, fs - 0.8),
                color=(0, 0, 0),
                align=fitz.TEXT_ALIGN_LEFT,
                lineheight=1.02,
                overlay=True,
            )
    doc.save(OUT, deflate=True, garbage=4)
    print(OUT)


if __name__ == "__main__":
    main()
