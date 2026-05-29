from docx import Document
import json
import os
import re

ROOT = os.path.dirname(__file__)
SRC = os.path.join(ROOT, "source.docx")
OUT = os.path.join(ROOT, "paragraphs.json")

math_re = re.compile(r"[=∑∞→≤≥±−×√∫αβγδθλρφψωΩπ]|\\b(lim|sin|cos|diag|min|max|arg|rank|tr)\\b")


def has_drawing_or_math(paragraph):
    xml = paragraph._p.xml
    markers = [
        "<w:drawing",
        "<wp:inline",
        "<wp:anchor",
        "<m:oMath",
        "<m:oMathPara",
        "<w:object",
        "<v:shape",
        "<w:pict",
    ]
    return any(marker in xml for marker in markers)


def classify(text, paragraph):
    stripped = " ".join((text or "").split())
    if not stripped:
        return "empty"
    if has_drawing_or_math(paragraph):
        return "object"
    if re.match(r"^\s*(Fig\.|Figure|TABLE|Table)\b", stripped):
        return "caption"
    if re.match(r"^\s*\[\d+\]", stripped):
        return "reference"
    if len(stripped) < 5:
        return "short"
    mathchars = sum(c in "=+-−*/∑∞→≤≥±×√∫()[]{}" for c in stripped)
    if mathchars > 8 and mathchars / max(1, len(stripped)) > 0.08:
        return "formula"
    if math_re.search(stripped) and len(stripped) < 180 and mathchars > 3:
        return "formula"
    return "text"


def main():
    doc = Document(SRC)
    rows = []
    for index, paragraph in enumerate(doc.paragraphs):
        text = paragraph.text
        style = paragraph.style.name if paragraph.style is not None else ""
        kind = classify(text, paragraph)
        rows.append({
            "id": index,
            "text": " ".join((text or "").split()),
            "style": style,
            "kind": kind,
            "translate": kind in {"text", "caption"},
        })
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(rows, handle, ensure_ascii=False, indent=2)
    print("paragraphs", len(rows), "translate", sum(r["translate"] for r in rows))
    for row in rows[:80]:
        print(row["id"], row["kind"], row["style"], row["text"][:140])


if __name__ == "__main__":
    main()
