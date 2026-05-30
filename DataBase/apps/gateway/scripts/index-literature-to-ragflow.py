"""
Index literature table content into RAGFlow for vector search.
Reads from MySQL directly, chunks text, uploads to RAGFlow dataset as documents.
Run: python scripts/index-literature-to-ragflow.py [--apply]
Log: scripts/index-literature-ragflow.log
"""
import json, os, sys, time, re
import pymysql
import urllib.request

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
MIN_CONTENT_LEN = 500

# Categories from import-manifest.json that are actual writing samples
STYLE_CATEGORIES = {"literary-style-reference"}
# Keywords that indicate biographical/meta content (not actual writing)
META_KEYWORDS = ["译后记", "译者序", "编者按", "生平", "年谱", "评论", "研究", "简介", "出版说明", "前言", "序言", "附录", "注释"]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(SCRIPT_DIR, "index-literature-ragflow.log")


def load_env_file(path):
    if not path or not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def load_runtime_env():
    home = os.environ.get("USERPROFILE") or os.environ.get("HOME") or ""
    load_env_file(os.path.join(home, ".codex-secrets", "database-gateway", "database_gateway.env"))
    load_env_file(os.path.join(home, ".codex-secrets", "mysql", "myblog.cnf"))


def require_env(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def read_config():
    dataset_ids = os.environ.get("DATABASE_LITERARY_RAGFLOW_DATASET_IDS", "").strip()
    if not dataset_ids:
        dataset_ids = os.environ.get("DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS", "").strip()
    dataset_id = dataset_ids.split(",")[0].strip()
    if not dataset_id:
        raise RuntimeError("DATABASE_LITERARY_RAGFLOW_DATASET_IDS or DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS is required")
    return {
        "mysql": {
            "host": require_env("host") if not os.environ.get("MYSQL_HOST") else os.environ["MYSQL_HOST"],
            "port": int(os.environ.get("MYSQL_PORT") or os.environ.get("port") or "3306"),
            "user": os.environ.get("MYSQL_USER") or require_env("user"),
            "password": os.environ.get("MYSQL_PASSWORD") or require_env("password"),
            "database": os.environ.get("MYSQL_DATABASE") or require_env("database"),
        },
        "ragflow_url": require_env("DATABASE_EVIDENCE_RAGFLOW_URL").rstrip("/"),
        "ragflow_key": require_env("DATABASE_EVIDENCE_RAGFLOW_API_KEY"),
        "ragflow_dataset": dataset_id,
    }


def ragflow_api(config, method, path, data=None, timeout=30):
    url = f"{config['ragflow_url']}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers={
        "Authorization": f"Bearer {config['ragflow_key']}",
        "Content-Type": "application/json",
    }, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "body": e.read().decode("utf-8", errors="replace")[:300]}
    except Exception as e:
        return {"error": str(e)}


def ragflow_upload_file(config, dataset_id, filename, content_bytes, timeout=60):
    boundary = b"----PythonBoundary7MA4YWxkTrZu0gW"
    body = (
        b"--" + boundary + b"\r\n"
        b"Content-Disposition: form-data; name=\"file\"; filename=\"" + filename.encode("utf-8") + b"\"\r\n"
        b"Content-Type: text/plain\r\n\r\n"
        + content_bytes + b"\r\n"
        b"--" + boundary + b"--\r\n"
    )
    req = urllib.request.Request(
        f"{config['ragflow_url']}/api/v1/datasets/{dataset_id}/documents",
        data=body,
        headers={
            "Authorization": f"Bearer {config['ragflow_key']}",
            "Content-Type": f"multipart/form-data; boundary={boundary.decode()}",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "body": e.read().decode("utf-8", errors="replace")[:300]}
    except Exception as e:
        return {"error": str(e)}


def chunk_text(text):
    paragraphs = re.split(r'\n{2,}', text)
    chunks = []
    current = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) + 1 <= CHUNK_SIZE:
            current = (current + "\n" + para) if current else para
        else:
            if current:
                chunks.append(current)
            if len(para) > CHUNK_SIZE:
                for i in range(0, len(para), CHUNK_SIZE - CHUNK_OVERLAP):
                    chunks.append(para[i:i + CHUNK_SIZE])
                current = ""
            else:
                current = para
    if current and len(current) > 50:
        chunks.append(current)
    return chunks


def classify_chunk(chunk_text, category, author):
    """Classify a chunk as 原文范本 or 作者研究 based on category and content."""
    # If the source book is a literary-style-reference, default to 原文范本
    is_style_source = category in STYLE_CATEGORIES
    # Check for meta/biographical keywords in the first 100 chars
    head = chunk_text[:100]
    is_meta = any(kw in head for kw in META_KEYWORDS)
    if is_meta:
        return f"[作者研究|{author}]"
    if is_style_source:
        return f"[原文范本|{author}]"
    # Non-style sources (historical docs, theory) get no prefix
    return ""


def main():
    apply = "--apply" in sys.argv
    load_runtime_env()
    config = read_config()
    log = open(LOG_PATH, "w", encoding="utf-8")

    def out(msg):
        print(msg, flush=True)
        log.write(msg + "\n")
        log.flush()

    out(f"[index] Start apply={apply} {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Test RAGFlow connectivity
    test = ragflow_api(config, "GET", "/api/v1/datasets")
    if "error" in test:
        out(f"[index] FATAL RAGFlow unreachable: {test}")
        sys.exit(1)
    out(f"[index] RAGFlow OK")

    # Connect MySQL
    conn = pymysql.connect(
        host=config["mysql"]["host"], port=config["mysql"]["port"], user=config["mysql"]["user"],
        password=config["mysql"]["password"], database=config["mysql"]["database"], charset="utf8mb4"
    )
    cur = conn.cursor(pymysql.cursors.DictCursor)

    # Get literature items with substantial content
    cur.execute("SELECT id, title, author, category, CHAR_LENGTH(content) as chars FROM literature WHERE CHAR_LENGTH(content) > %s ORDER BY CHAR_LENGTH(content) DESC", (MIN_CONTENT_LEN,))
    items = cur.fetchall()
    out(f"[index] {len(items)} literature items with >{MIN_CONTENT_LEN} chars")

    success = 0
    fail = 0
    total_chunks = 0

    for item in items:
        lit_id = item["id"]
        title = (item["title"] or "?")[:60]
        author = item["author"] or ""
        chars = item["chars"]

        out(f"\n  [{lit_id}] {title} ({chars} chars, {author})")

        # Fetch full content
        cur.execute("SELECT content FROM literature WHERE id = %s", (lit_id,))
        row = cur.fetchone()
        if not row or not row["content"]:
            out(f"    SKIP - no content")
            continue

        content = row["content"]
        chunks = chunk_text(content)
        category = item.get("category") or ""

        # Prepend classification prefix to each chunk
        prefixed_chunks = []
        for c in chunks:
            prefix = classify_chunk(c, category, author)
            prefixed_chunks.append(f"{prefix} {c}" if prefix else c)

        out(f"    {len(prefixed_chunks)} chunks (category={category})")
        total_chunks += len(prefixed_chunks)

        if not apply:
            success += 1
            continue

        # Upload as a text file to RAGFlow (RAGFlow will parse and index it)
        # We pre-chunk by inserting double newlines between chunks for RAGFlow's naive parser
        doc_name = f"{title} -- {author}".replace("/", "-").replace("\\", "-")[:120] + ".txt"
        doc_content = "\n\n".join(prefixed_chunks)
        doc_bytes = doc_content.encode("utf-8")

        resp = ragflow_upload_file(config, config["ragflow_dataset"], doc_name, doc_bytes, timeout=120)

        if resp.get("code") == 0 and resp.get("data"):
            doc_data = resp["data"]
            doc_id = doc_data[0]["id"] if isinstance(doc_data, list) else doc_data.get("id")
            out(f"    UPLOADED doc_id={doc_id}")

            # Trigger parsing
            parse_resp = ragflow_api(config, "POST", f"/api/v1/datasets/{config['ragflow_dataset']}/chunks",
                                     {"document_ids": [doc_id]}, timeout=30)
            if parse_resp.get("code") == 0:
                out(f"    PARSE triggered OK")
                success += 1
            else:
                out(f"    PARSE trigger failed: {json.dumps(parse_resp, ensure_ascii=False)[:150]}")
                success += 1  # doc uploaded, parse may run async
        else:
            out(f"    FAIL upload: {json.dumps(resp, ensure_ascii=False)[:200]}")
            fail += 1

        # Rate limit to avoid overwhelming RAGFlow
        time.sleep(1)

    conn.close()
    out(f"\n[index] === DONE === success={success} fail={fail} total_chunks={total_chunks}")
    if not apply:
        out("[index] Dry run complete. Use --apply to upload to RAGFlow.")
    log.close()


if __name__ == "__main__":
    main()
