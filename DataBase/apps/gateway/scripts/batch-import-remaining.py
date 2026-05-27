"""Fast batch import for PDF/MOBI/AZW3 files using pymupdf + mysql-connector."""
import json, os, sys
import pymupdf
import mysql.connector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MANIFEST = json.loads(open(os.path.join(SCRIPT_DIR, "import-manifest.json"), encoding="utf-8").read())

def read_mysql_config():
    cnf = os.path.join(os.environ.get("USERPROFILE", os.environ.get("HOME", "")), ".codex-secrets", "mysql", "myblog.cnf")
    config = {}
    for line in open(cnf, encoding="utf-8"):
        line = line.strip()
        if not line or line[0] in ("#", ";", "["):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            config[k.strip()] = v.strip().strip("'\"")
    return {
        "host": os.environ.get("MYSQL_HOST", config.get("host", "127.0.0.1")),
        "port": int(os.environ.get("MYSQL_PORT", config.get("port", "3306"))),
        "user": os.environ.get("MYSQL_USER", config.get("user", "")),
        "password": os.environ.get("MYSQL_PASSWORD", config.get("password", "")),
        "database": os.environ.get("MYSQL_DATABASE", config.get("database", "")),
        "charset": "utf8mb4",
    }

def extract_pdf(path):
    doc = pymupdf.open(path)
    parts = []
    for page in doc:
        text = page.get_text()
        if text.strip():
            parts.append(text.strip())
    doc.close()
    return "\n\n".join(parts)

def extract_mobi_azw3(path):
    # Try using mobi library if available
    try:
        import mobi
        tempdir, filepath = mobi.extract(path)
        # Read the extracted HTML
        import glob
        htmls = glob.glob(os.path.join(tempdir, "**", "*.html"), recursive=True)
        htmls += glob.glob(os.path.join(tempdir, "**", "*.htm"), recursive=True)
        import re
        parts = []
        for h in sorted(htmls):
            raw = open(h, encoding="utf-8", errors="ignore").read()
            text = re.sub(r"<[^>]+>", " ", raw)
            text = re.sub(r"\s+", " ", text).strip()
            if len(text) > 20:
                parts.append(text)
        if parts:
            return "\n\n".join(parts)
    except Exception:
        pass
    # Fallback: try markitdown
    try:
        import subprocess
        r = subprocess.run(["python", "-m", "markitdown", path], capture_output=True, text=True, timeout=120)
        if r.returncode == 0 and len(r.stdout.strip()) > 100:
            return r.stdout.strip()
    except Exception:
        pass
    return ""

def upsert(cursor, conn, title, author, category, content, source):
    cursor.execute("SELECT id FROM literature WHERE title = %s LIMIT 1", (title,))
    row = cursor.fetchone()
    if row:
        cursor.execute(
            "UPDATE literature SET author=%s, category=%s, content=%s, source=%s, updated_at=NOW() WHERE id=%s",
            (author, category, content, source, row[0])
        )
    else:
        cursor.execute(
            "INSERT INTO literature (title, author, category, content, source, created_at, updated_at) VALUES (%s,%s,%s,%s,%s,NOW(),NOW())",
            (title, author, category, content, source)
        )
    conn.commit()

def main():
    apply = "--apply" in sys.argv
    cfg = read_mysql_config()
    conn = mysql.connector.connect(**cfg)
    cursor = conn.cursor()

    items = [i for i in MANIFEST if not i["path"].lower().endswith(".epub")]
    print(f"[py-import] {len(items)} non-EPUB files. apply={apply}")

    success = skip = fail = 0
    for item in items:
        ext = os.path.splitext(item["path"])[1].lower()
        short = item["title"][:40]
        if not os.path.exists(item["path"]):
            print(f"  SKIP  {short} — not found")
            skip += 1
            continue
        size_mb = os.path.getsize(item["path"]) // 1048576
        print(f"  READ  {short} ({ext}, {size_mb}MB)...", flush=True)
        try:
            if ext == ".pdf":
                text = extract_pdf(item["path"])
            elif ext in (".mobi", ".azw3"):
                text = extract_mobi_azw3(item["path"])
            else:
                print(f"  SKIP  {short} — unsupported")
                skip += 1
                continue

            if not text or len(text) < 100:
                print(f"  FAIL  {short} — too short ({len(text)} chars)")
                fail += 1
                continue

            print(f"  OK    {short} — {len(text)} chars")
            if apply:
                upsert(cursor, conn, item["title"], item["author"], item["category"], text, item["path"])
                print(f"  WRITE {short}")
            success += 1
        except Exception as e:
            print(f"  FAIL  {short} — {str(e)[:120]}")
            fail += 1

    print(f"\n[py-import] Done. success={success} skip={skip} fail={fail}")
    if not apply:
        print("[py-import] Dry run. Use --apply to write.")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
