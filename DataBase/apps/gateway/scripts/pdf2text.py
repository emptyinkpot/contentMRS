import pymupdf, sys
doc = pymupdf.open(sys.argv[1])
parts = []
for page in doc:
    t = page.get_text()
    if t.strip():
        parts.append(t.strip())
doc.close()
sys.stdout.buffer.write("\n\n".join(parts).encode("utf-8"))
