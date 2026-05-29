import os
import shutil
import zipfile
from lxml import etree

ROOT = os.path.dirname(__file__)
SRC = os.path.join(ROOT, "hvac_cn_layout_preserved.docx")
OUT = os.path.join(ROOT, "hvac_cn_layout_preserved_clean.docx")
TMP = os.path.join(ROOT, "_docx_unzip")

LABELS = {
    "Air Handling Units",
    "Condensing Loop",
    "Outdoor Air Unit",
    "Zone Simulators",
    "VAV Boxes",
}
NUMBER_LABELS = {str(i) for i in range(1, 8)}

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "v": "urn:schemas-microsoft-com:vml",
}


def unzip_docx():
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP, exist_ok=True)
    with zipfile.ZipFile(SRC) as zf:
        zf.extractall(TMP)


def zip_docx():
    if os.path.exists(OUT):
        os.remove(OUT)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for base, _, files in os.walk(TMP):
            for name in files:
                path = os.path.join(base, name)
                arc = os.path.relpath(path, TMP).replace(os.sep, "/")
                zf.write(path, arc)


def clear_headers_footers():
    word_dir = os.path.join(TMP, "word")
    for name in os.listdir(word_dir):
        if not (name.startswith("header") or name.startswith("footer")) or not name.endswith(".xml"):
            continue
        path = os.path.join(word_dir, name)
        root = etree.parse(path).getroot()
        body = root
        for child in list(body):
            body.remove(child)
        etree.SubElement(body, f"{{{NS['w']}}}p")
        etree.ElementTree(root).write(path, encoding="UTF-8", xml_declaration=True, standalone=True)


def shape_text(shape):
    texts = shape.xpath(".//w:t/text()", namespaces=NS)
    return "".join(texts).strip()


def strip_label_shapes():
    path = os.path.join(TMP, "word", "document.xml")
    tree = etree.parse(path)
    root = tree.getroot()
    removed = 0
    # Remove VML text box shapes that are OCR labels over the figure. They are not part
    # of the image itself, so deleting them restores the underlying figure.
    for shape in list(root.xpath(".//v:shape", namespaces=NS)):
        text = shape_text(shape)
        if text in LABELS or text in NUMBER_LABELS:
            parent = shape.getparent()
            parent.remove(shape)
            removed += 1
    tree.write(path, encoding="UTF-8", xml_declaration=True, standalone=True)
    return removed


def main():
    unzip_docx()
    clear_headers_footers()
    removed = strip_label_shapes()
    zip_docx()
    shutil.rmtree(TMP)
    print(f"saved={OUT}")
    print(f"removed_label_shapes={removed}")


if __name__ == "__main__":
    main()
