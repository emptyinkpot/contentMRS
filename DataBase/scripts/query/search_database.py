#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import tempfile


def sql_string(value):
    if value is None:
        return "NULL"
    text = str(value)
    text = text.replace("\x00", "")
    text = text.replace("\\", "\\\\")
    text = text.replace("'", "''")
    text = text.replace("\r", "\\r").replace("\n", "\\n").replace("\t", "\\t")
    return "'" + text + "'"


def run_mysql(mysql_command, sql):
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".sql", delete=False) as f:
        f.write(sql)
        path = f.name
    try:
        command = f'"{mysql_command}" --batch --raw --skip-column-names --default-character-set=utf8mb4 --binary-mode=1 < "{path}"'
        result = subprocess.run(
            command,
            check=True,
            shell=True,
            text=True,
            encoding="utf-8",
            stdout=subprocess.PIPE,
        )
        return result.stdout.strip()
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


def main():
    parser = argparse.ArgumentParser(description="Search DataBase MySQL search projection.")
    parser.add_argument("query")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--mysql-command", default=os.path.join(os.path.expanduser("~"), ".codex-runtime", "bin", "mysql-myblog.cmd"))
    args = parser.parse_args()

    like = "%" + args.query + "%"
    sql = f"""
SELECT JSON_ARRAYAGG(JSON_OBJECT(
  'documentId', d.id,
  'sourceTable', d.source_table,
  'sourceId', d.source_id,
  'source', d.source,
  'title', d.title,
  'privacyLevel', d.privacy_level,
  'chunkIndex', c.chunk_index,
  'snippet', LEFT(c.chunk_text, 300)
))
FROM (
  SELECT c.*
  FROM search_chunks c
  JOIN search_documents d ON d.id = c.document_id
  WHERE c.privacy_level IN ('public','private')
    AND (c.chunk_text LIKE {sql_string(like)})
  ORDER BY c.updated_at DESC
  LIMIT {int(args.limit)}
) c
JOIN search_documents d ON d.id = c.document_id;
"""
    raw = run_mysql(args.mysql_command, sql)
    results = [] if not raw or raw == "NULL" else json.loads(raw)
    print(json.dumps({
        "query": args.query,
        "results": results,
        "count": len(results),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
