"""
OCR scanned PDFs and update literature table content.
Uses pymupdf to render pages + rapidocr-onnxruntime to extract text.
Run: python scripts/ocr-scanned-pdfs.py [--apply]
"""
import json, os, sys, time
import numpy as np
import fitz
import pymysql

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(SCRIPT_DIR, "import-manifest.json")
LOG_PATH = os.path.join(SCRIPT_DIR, "ocr-scanned-pdfs.log")

DPI = 200
MIN_PAGE_CHARS = 20


def load_env_file(path):
    if not path or not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or line.startswith("[") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def load_runtime_env():
    home = os.environ.get("USERPROFILE") or os.environ.get("HOME") or ""
    load_env_file(os.path.join(home, ".codex-secrets", "mysql", "database_service_users.env"))
    load_env_file(os.path.join(home, ".codex-secrets", "mysql", "myblog.cnf"))
    load_env_file(os.path.join(home, ".codex-secrets", "database-gateway", "database_gateway.env"))


def read_mysql_config(apply):
    default_user = os.environ.get("DATABASE_CONTENT_RW_USER") if apply else os.environ.get("DATABASE_READONLY_USER")
    default_password = os.environ.get("DATABASE_CONTENT_RW_PASSWORD") if apply else os.environ.get("DATABASE_READONLY_PASSWORD")
    return {
        "host": os.environ.get("MYSQL_HOST") or os.environ.get("host") or "127.0.0.1",
        "port": int(os.environ.get("MYSQL_PORT") or os.environ.get("port") or "3306"),
        "user": os.environ.get("MYSQL_USER") or default_user or os.environ.get("user") or "",
        "password": os.environ.get("MYSQL_PASSWORD") or default_password or os.environ.get("password") or "",
        "database": os.environ.get("MYSQL_DATABASE") or os.environ.get("database") or "",
        "charset": "utf8mb4",
    }


def ocr_pdf(pdf_path, ocr_engine):
    doc = fitz.open(pdf_path)
    all_text = []
    for i in range(len(doc)):
        page = doc[i]
        text = page.get_text().strip()
        if len(text) > MIN_PAGE_CHARS:
            all_text.append(text)
            continue
        pix = page.get_pixmap(dpi=DPI)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
        if pix.n == 4:
            img = img[:, :, :3]
        result, _ = ocr_engine(img)
        if result:
            page_text = "\n".join([line[1] for line in result])
            all_text.append(page_text)
    doc.close()
    return "\n\n".join(all_text)


def main():
    apply = "--apply" in sys.argv
    load_runtime_env()
    mysql_config = read_mysql_config(apply)
    log = open(LOG_PATH, "w", encoding="utf-8")

    def out(msg):
        print(msg, flush=True)
        log.write(msg + "\n")
        log.flush()

    out(f"[ocr] Start apply={apply} {time.strftime('%Y-%m-%d %H:%M:%S')}")

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    pdf_items = [item for item in manifest if item.get("path", "").endswith(".pdf")]
    out(f"[ocr] {len(pdf_items)} PDF items in manifest")

    conn = pymysql.connect(**mysql_config)
    cur = conn.cursor(pymysql.cursors.DictCursor)

    scanned = []
    for item in pdf_items:
        title = item.get("title", "")
        cur.execute(
            "SELECT id, CHAR_LENGTH(content) as chars FROM literature WHERE title = %s",
            (title,)
        )
        row = cur.fetchone()
        if row and row["chars"] and row["chars"] > 5000:
            out(f"  SKIP {title[:40]} — already has {row['chars']} chars")
            continue
        if not os.path.exists(item["path"]):
            out(f"  SKIP {title[:40]} — file not found")
            continue
        scanned.append({**item, "lit_id": row["id"] if row else None, "existing_chars": row["chars"] if row else 0})

    out(f"[ocr] {len(scanned)} PDFs need OCR")

    if not scanned:
        out("[ocr] Nothing to do")
        conn.close()
        log.close()
        return

    out("[ocr] Loading RapidOCR engine...")
    from rapidocr_onnxruntime import RapidOCR
    ocr_engine = RapidOCR()
    out("[ocr] RapidOCR ready")

    success = 0
    fail = 0

    for item in scanned:
        title = item["title"]
        path = item["path"]
        lit_id = item["lit_id"]
        out(f"\n  [{lit_id or 'NEW'}] {title[:50]}")
        out(f"    File: {path}")

        try:
            t0 = time.time()
            text = ocr_pdf(path, ocr_engine)
            elapsed = time.time() - t0
            out(f"    OCR done: {len(text)} chars in {elapsed:.1f}s")

            if len(text) < 500:
                out(f"    WARN: very short OCR result, skipping")
                fail += 1
                continue

            if not apply:
                success += 1
                continue

            if lit_id:
                cur.execute(
                    "UPDATE literature SET content = %s, updated_at = NOW() WHERE id = %s",
                    (text, lit_id)
                )
            else:
                cur.execute(
                    """INSERT INTO literature (title, author, category, content, created_at, updated_at)
                       VALUES (%s, %s, %s, %s, NOW(), NOW())""",
                    (title, item.get("author", ""), item.get("category", ""), text)
                )
            conn.commit()
            out(f"    DB updated OK")
            success += 1

        except Exception as e:
            out(f"    ERROR: {e}")
            fail += 1

    conn.close()
    out(f"\n[ocr] === DONE === success={success} fail={fail}")
    if not apply:
        out("[ocr] Dry run. Use --apply to write to database.")
    log.close()


if __name__ == "__main__":
    main()
