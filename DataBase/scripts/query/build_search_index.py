#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
from datetime import datetime


def sql_string(value):
    if value is None:
        return "NULL"
    text = str(value)
    text = text.replace("\x00", "")
    text = text.replace("\\", "\\\\")
    text = text.replace("'", "''")
    text = text.replace("\r", "\\r").replace("\n", "\\n").replace("\t", "\\t")
    return "'" + text + "'"


def run_mysql(mysql_command, sql, capture=False):
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".sql", delete=False) as f:
        f.write(sql)
        path = f.name
    try:
        flags = "--default-character-set=utf8mb4 --binary-mode=1"
        if capture:
            command = f'"{mysql_command}" --batch --raw --skip-column-names {flags} < "{path}"'
            result = subprocess.run(
                command,
                check=True,
                shell=True,
                text=True,
                encoding="utf-8",
                stdout=subprocess.PIPE,
            )
            return result.stdout.strip()
        command = f'"{mysql_command}" {flags} < "{path}"'
        subprocess.run(command, check=True, shell=True)
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


def stable_id(prefix, text):
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:40]
    return f"{prefix}-{digest}"


def content_hash(text):
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def ensure_tables(mysql_command):
    sql = """
CREATE TABLE IF NOT EXISTS search_documents (
  id varchar(128) NOT NULL PRIMARY KEY,
  source_table varchar(96) NOT NULL,
  source_id varchar(128) NOT NULL,
  source varchar(96) NULL,
  title text NULL,
  content_hash varchar(64) NOT NULL,
  content_kind varchar(64) NULL,
  value_level varchar(32) NULL,
  privacy_level varchar(32) NOT NULL,
  search_status varchar(32) NOT NULL,
  metadata_json json NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_search_document_source (source_table, source_id),
  KEY idx_search_documents_privacy (privacy_level),
  KEY idx_search_documents_status (search_status),
  KEY idx_search_documents_kind (content_kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS search_chunks (
  id varchar(128) NOT NULL PRIMARY KEY,
  document_id varchar(128) NOT NULL,
  chunk_index int NOT NULL,
  chunk_text mediumtext NOT NULL,
  token_estimate int NOT NULL,
  content_hash varchar(64) NOT NULL,
  privacy_level varchar(32) NOT NULL,
  index_status varchar(32) NOT NULL,
  metadata_json json NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_search_chunk_doc_index (document_id, chunk_index),
  KEY idx_search_chunks_document (document_id),
  KEY idx_search_chunks_privacy (privacy_level),
  KEY idx_search_chunks_status (index_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS search_index_jobs (
  id varchar(128) NOT NULL PRIMARY KEY,
  target varchar(64) NOT NULL,
  mode varchar(32) NOT NULL,
  status varchar(32) NOT NULL,
  item_limit int NOT NULL,
  metadata_json json NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp NULL,
  KEY idx_search_index_jobs_status (status),
  KEY idx_search_index_jobs_target (target)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""
    run_mysql(mysql_command, sql)


def get_candidates(mysql_command, limit, include_private):
    privacy_filter = "" if include_private else "AND COALESCE(l.privacy_level, 'private') IN ('public','private')"
    sql = f"""
SELECT JSON_ARRAYAGG(JSON_OBJECT(
  'id', id,
  'source', source,
  'title', title,
  'content', content,
  'import_quality', import_quality,
  'content_kind', content_kind,
  'value_level', value_level,
  'privacy_level', privacy_level,
  'action', action
))
FROM (
  SELECT
    k.id,
    k.source,
    k.title,
    k.content,
    k.import_quality,
    l.content_kind,
    l.value_level,
    COALESCE(l.privacy_level, 'private') AS privacy_level,
    l.action
  FROM knowledge_import_items k
  LEFT JOIN data_curation_labels l
    ON l.source_table = 'knowledge_import_items'
   AND l.source_id = k.id
  WHERE k.import_quality IN ('readable-body','notion-readable-page')
    AND k.content IS NOT NULL
    AND k.content <> ''
    AND COALESCE(l.action, 'keep_searchable') NOT IN ('route_to_secret_table','discard_candidate')
    {privacy_filter}
  ORDER BY k.imported_at ASC
  LIMIT {int(limit)}
) q;
"""
    raw = run_mysql(mysql_command, sql, capture=True)
    if not raw or raw == "NULL":
        return []
    return json.loads(raw)


def chunk_text(text, max_chars):
    cleaned = re.sub(r"\n{3,}", "\n\n", text or "").strip()
    if not cleaned:
        return []
    paragraphs = re.split(r"\n\s*\n", cleaned)
    chunks = []
    current = ""
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if len(paragraph) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            for i in range(0, len(paragraph), max_chars):
                chunks.append(paragraph[i:i + max_chars].strip())
            continue
        candidate = (current + "\n\n" + paragraph).strip() if current else paragraph
        if len(candidate) > max_chars and current:
            chunks.append(current.strip())
            current = paragraph
        else:
            current = candidate
    if current:
        chunks.append(current.strip())
    return chunks


def upsert_document(mysql_command, item):
    doc_id = stable_id("sd", f"knowledge_import_items|{item['id']}")
    metadata = {
        "source": item.get("source"),
        "import_quality": item.get("import_quality"),
        "action": item.get("action"),
    }
    values = [
        sql_string(doc_id),
        "'knowledge_import_items'",
        sql_string(item["id"]),
        sql_string(item.get("source")),
        sql_string(item.get("title")),
        sql_string(content_hash(item.get("content"))),
        sql_string(item.get("content_kind")),
        sql_string(item.get("value_level")),
        sql_string(item.get("privacy_level") or "private"),
        "'ready'",
        sql_string(json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))),
    ]
    sql = """
INSERT INTO search_documents
(id, source_table, source_id, source, title, content_hash, content_kind, value_level, privacy_level, search_status, metadata_json)
VALUES ({values})
ON DUPLICATE KEY UPDATE
  source = VALUES(source),
  title = VALUES(title),
  content_hash = VALUES(content_hash),
  content_kind = VALUES(content_kind),
  value_level = VALUES(value_level),
  privacy_level = VALUES(privacy_level),
  search_status = VALUES(search_status),
  metadata_json = VALUES(metadata_json);
""".format(values=",".join(values))
    run_mysql(mysql_command, sql)
    return doc_id


def replace_chunks(mysql_command, doc_id, item, chunks):
    delete_sql = "DELETE FROM search_chunks WHERE document_id=" + sql_string(doc_id) + ";"
    statements = [delete_sql]
    for index, chunk in enumerate(chunks):
        chunk_id = stable_id("sc", f"{doc_id}|{index}|{content_hash(chunk)}")
        metadata = {
            "source_table": "knowledge_import_items",
            "source_id": item["id"],
            "source": item.get("source"),
            "title": item.get("title"),
        }
        values = [
            sql_string(chunk_id),
            sql_string(doc_id),
            str(index),
            sql_string(chunk),
            str(max(1, len(chunk) // 4)),
            sql_string(content_hash(chunk)),
            sql_string(item.get("privacy_level") or "private"),
            "'pending_external_index'",
            sql_string(json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))),
        ]
        statements.append(
            "INSERT INTO search_chunks "
            "(id, document_id, chunk_index, chunk_text, token_estimate, content_hash, privacy_level, index_status, metadata_json) "
            "VALUES (" + ",".join(values) + ");"
        )
    run_mysql(mysql_command, "\n".join(statements))


def insert_job(mysql_command, job_id, target, mode, status, limit, metadata):
    sql = """
INSERT INTO search_index_jobs (id, target, mode, status, item_limit, metadata_json, completed_at)
VALUES ({job_id}, {target}, {mode}, {status}, {item_limit}, {metadata}, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  metadata_json = VALUES(metadata_json),
  completed_at = VALUES(completed_at);
""".format(
        job_id=sql_string(job_id),
        target=sql_string(target),
        mode=sql_string(mode),
        status=sql_string(status),
        item_limit=int(limit),
        metadata=sql_string(json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))),
    )
    run_mysql(mysql_command, sql)


def main():
    parser = argparse.ArgumentParser(description="Build MySQL search projection rows from knowledge_import_items.")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--chunk-chars", type=int, default=1800)
    parser.add_argument("--mysql-command", default=os.path.join(os.path.expanduser("~"), ".codex-runtime", "bin", "mysql-myblog.cmd"))
    parser.add_argument("--include-private", action="store_true", default=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    ensure_tables(args.mysql_command)
    candidates = get_candidates(args.mysql_command, args.limit, args.include_private)
    prepared = []
    total_chunks = 0
    for item in candidates:
        chunks = chunk_text(item.get("content") or "", args.chunk_chars)
        total_chunks += len(chunks)
        prepared.append({
            "id": item["id"],
            "source": item.get("source"),
            "title": item.get("title"),
            "privacyLevel": item.get("privacy_level") or "private",
            "chunks": len(chunks),
        })

    job_id = "search-index-" + datetime.now().strftime("%Y%m%d-%H%M%S")
    if not args.apply:
        print(json.dumps({
            "mode": "dry-run",
            "jobId": job_id,
            "candidates": len(candidates),
            "chunks": total_chunks,
            "items": prepared,
        }, ensure_ascii=False, indent=2))
        return 0

    for item in candidates:
        chunks = chunk_text(item.get("content") or "", args.chunk_chars)
        doc_id = upsert_document(args.mysql_command, item)
        replace_chunks(args.mysql_command, doc_id, item, chunks)
    insert_job(args.mysql_command, job_id, "mysql-search-projection", "apply", "completed", args.limit, {
        "documents": len(candidates),
        "chunks": total_chunks,
        "chunk_chars": args.chunk_chars,
    })
    print(json.dumps({
        "mode": "applied",
        "jobId": job_id,
        "documents": len(candidates),
        "chunks": total_chunks,
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
