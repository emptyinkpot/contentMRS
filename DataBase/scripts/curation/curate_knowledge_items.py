#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime
from urllib import request


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


def ensure_tables(mysql_command):
    sql = """
CREATE TABLE IF NOT EXISTS data_curation_runs (
  id varchar(96) NOT NULL PRIMARY KEY,
  worker varchar(64) NOT NULL,
  model varchar(128) NOT NULL,
  base_url text NOT NULL,
  source_table varchar(96) NOT NULL,
  mode varchar(32) NOT NULL,
  item_limit int NOT NULL,
  status varchar(32) NOT NULL,
  metadata_json json NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS data_curation_labels (
  id varchar(128) NOT NULL PRIMARY KEY,
  run_id varchar(96) NOT NULL,
  source_table varchar(96) NOT NULL,
  source_id varchar(128) NOT NULL,
  model varchar(128) NOT NULL,
  label_json json NOT NULL,
  content_kind varchar(64) NULL,
  value_level varchar(32) NULL,
  privacy_level varchar(32) NULL,
  action varchar(64) NULL,
  confidence decimal(5,4) NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_data_curation_source_model (source_table, source_id, model),
  KEY idx_data_curation_run (run_id),
  KEY idx_data_curation_action (action),
  KEY idx_data_curation_privacy (privacy_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS data_curation_decisions (
  id varchar(128) NOT NULL PRIMARY KEY,
  label_id varchar(128) NOT NULL,
  decision varchar(64) NOT NULL,
  decided_by varchar(96) NOT NULL,
  note text NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_data_curation_decision_label (label_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""
    run_mysql(mysql_command, sql)


def stable_id(prefix, text):
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:40]
    return f"{prefix}-{digest}"


def get_candidates(mysql_command, model, limit, include_tiny):
    where = "source IN ('xiaomi-notes','notion-local')" if include_tiny else "import_quality IN ('readable-body','notion-readable-page')"
    inner = f"""
SELECT id, source, title, LEFT(content, 6000) AS content, import_quality
FROM knowledge_import_items k
WHERE {where}
  AND NOT EXISTS (
    SELECT 1 FROM data_curation_labels l
    WHERE l.source_table = 'knowledge_import_items'
      AND l.source_id = k.id
      AND l.model = {sql_string(model)}
  )
ORDER BY imported_at ASC
LIMIT {int(limit)}
"""
    sql = (
        "SELECT JSON_ARRAYAGG(JSON_OBJECT("
        "'id', id, 'source', source, 'title', title, 'content', content, 'import_quality', import_quality"
        f")) FROM ({inner}) q;"
    )
    raw = run_mysql(mysql_command, sql, capture=True)
    if not raw or raw == "NULL":
        return []
    return json.loads(raw)


def call_model(base_url, api_key, model, item):
    prompt = "\n".join(
        [
            "You are a data curation worker for a personal database.",
            "Return JSON only. Do not include markdown.",
            "Allowed fields:",
            "content_kind: note|story|prompt|project_doc|school_doc|account_secret_candidate|runtime_log|reference|trash|unknown",
            "value_level: high|medium|low|archive_only|trash",
            "privacy_level: public|private|sensitive|secret",
            "action: keep_searchable|keep_archived|route_to_secret_table|deduplicate|review_manually|discard_candidate",
            "tags: short string array",
            "summary: short Chinese summary",
            "normalized_title: optional cleaned title",
            "duplicate_hint: string or null",
            "confidence: number from 0 to 1",
            "rationale: short reason",
            "Rules:",
            "- Passwords, API keys, cookies, account exports, or login credentials must be content_kind=account_secret_candidate, privacy_level=secret, action=route_to_secret_table.",
            "- Useful personal writing or knowledge should be keep_searchable.",
            "- Damaged, tiny, or archival evidence should be keep_archived or review_manually.",
            "Item:",
            f"source: {item.get('source')}",
            f"import_quality: {item.get('import_quality')}",
            f"title: {item.get('title')}",
            "content:",
            item.get("content") or "",
        ]
    )
    body = json.dumps(
        {
            "model": model,
            "temperature": 0.1,
            "messages": [
                {"role": "system", "content": "You are a strict JSON data labeling worker."},
                {"role": "user", "content": prompt},
            ],
        },
        ensure_ascii=False,
    ).encode("utf-8")
    req = request.Request(
        base_url.rstrip("/") + "/chat/completions",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = content.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(content)


def insert_run(mysql_command, run_id, model, base_url, limit, include_tiny):
    metadata = json.dumps({"include_tiny": bool(include_tiny)}, ensure_ascii=False)
    values = [
        sql_string(run_id),
        "'glm-sub2api-worker'",
        sql_string(model),
        sql_string(base_url),
        "'knowledge_import_items'",
        "'apply'",
        str(int(limit)),
        "'running'",
        sql_string(metadata),
    ]
    sql = "INSERT INTO data_curation_runs (id, worker, model, base_url, source_table, mode, item_limit, status, metadata_json) VALUES (" + ",".join(values) + ");"
    run_mysql(mysql_command, sql)


def insert_label(mysql_command, run_id, model, item, label):
    label_id = stable_id("dcl", f"knowledge_import_items|{item['id']}|{model}")
    label_json = json.dumps(label, ensure_ascii=False, separators=(",", ":"))
    confidence = label.get("confidence")
    values = [
        sql_string(label_id),
        sql_string(run_id),
        "'knowledge_import_items'",
        sql_string(item["id"]),
        sql_string(model),
        sql_string(label_json),
        sql_string(label.get("content_kind")),
        sql_string(label.get("value_level")),
        sql_string(label.get("privacy_level")),
        sql_string(label.get("action")),
        "NULL" if confidence is None else str(float(confidence)),
    ]
    sql = """
INSERT INTO data_curation_labels
(id, run_id, source_table, source_id, model, label_json, content_kind, value_level, privacy_level, action, confidence)
VALUES ({values})
ON DUPLICATE KEY UPDATE
  run_id = VALUES(run_id),
  label_json = VALUES(label_json),
  content_kind = VALUES(content_kind),
  value_level = VALUES(value_level),
  privacy_level = VALUES(privacy_level),
  action = VALUES(action),
  confidence = VALUES(confidence);
""".format(values=",".join(values))
    run_mysql(mysql_command, sql)


def main():
    parser = argparse.ArgumentParser(description="Curate knowledge_import_items through Sub2API/OpenAI-compatible chat completions.")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--model", default=os.getenv("DATA_CURATION_MODEL", "glm-4-flash"))
    parser.add_argument("--base-url", default=os.getenv("DATA_CURATION_OPENAI_BASE_URL", "https://sub2api.tengokukk.com/v1"))
    parser.add_argument("--api-key", default=os.getenv("DATA_CURATION_OPENAI_API_KEY"))
    parser.add_argument("--mysql-command", default=os.path.join(os.path.expanduser("~"), ".codex-runtime", "bin", "mysql-myblog.cmd"))
    parser.add_argument("--include-tiny", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    ensure_tables(args.mysql_command)
    candidates = get_candidates(args.mysql_command, args.model, args.limit, args.include_tiny)
    run_id = "curation-" + datetime.now().strftime("%Y%m%d-%H%M%S")

    if not args.apply:
        print(json.dumps(
            {
                "mode": "dry-run",
                "runId": run_id,
                "baseUrl": args.base_url,
                "model": args.model,
                "candidates": len(candidates),
                "candidateIds": [item["id"] for item in candidates],
            },
            ensure_ascii=False,
            indent=2,
        ))
        return 0

    if not args.api_key:
        raise SystemExit("DATA_CURATION_OPENAI_API_KEY or --api-key is required for --apply")

    insert_run(args.mysql_command, run_id, args.model, args.base_url, args.limit, args.include_tiny)
    processed = 0
    for item in candidates:
        label = call_model(args.base_url, args.api_key, args.model, item)
        insert_label(args.mysql_command, run_id, args.model, item, label)
        processed += 1
    run_mysql(args.mysql_command, "UPDATE data_curation_runs SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE id=" + sql_string(run_id) + ";")
    print(json.dumps(
        {
            "mode": "applied",
            "runId": run_id,
            "baseUrl": args.base_url,
            "model": args.model,
            "processed": processed,
        },
        ensure_ascii=False,
        indent=2,
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
