#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-124.220.245.121}"
DB_PORT="${DB_PORT:-22295}"
DB_USER="${DB_USER:-openclaw}"
DB_NAME="${DB_NAME:-cloudbase-4glvyyq9f61b19cd}"
export MYSQL_PWD="${DB_PASSWORD:?DB_PASSWORD required}"

mysql_base=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME")

echo "== directus_files date columns =="
"${mysql_base[@]}" -N -e "SHOW COLUMNS FROM directus_files" | awk '{print $1}' | grep -E 'created_on|uploaded_on' || true

has_created="$("${mysql_base[@]}" -N -e "SHOW COLUMNS FROM directus_files LIKE 'created_on'" | wc -l)"
has_uploaded="$("${mysql_base[@]}" -N -e "SHOW COLUMNS FROM directus_files LIKE 'uploaded_on'" | wc -l)"
has_migration="$("${mysql_base[@]}" -N -e "SELECT COUNT(*) FROM directus_migrations WHERE version='20240716A'" | tr -d ' ')

if [[ "$has_created" -gt 0 && "$has_uploaded" -eq 0 ]]; then
  echo "Adding uploaded_on and backfilling from created_on..."
  "${mysql_base[@]}" -e "ALTER TABLE directus_files ADD COLUMN uploaded_on TIMESTAMP NULL DEFAULT NULL;"
  "${mysql_base[@]}" -e "UPDATE directus_files SET uploaded_on = created_on WHERE uploaded_on IS NULL;"
fi

if [[ "$has_migration" -eq 0 ]]; then
  echo "Recording migration 20240716A as applied..."
  "${mysql_base[@]}" -e "INSERT INTO directus_migrations (version, name) VALUES ('20240716A', 'Update Files Date Fields');"
fi

echo "== restart directus =="
sudo docker start database-directus || sudo docker restart database-directus
sleep 8
sudo docker ps --filter name=database-directus --format "{{.Names}} {{.Status}}"
curl -sS -o /dev/null -w 'health_http=%{http_code}\n' http://127.0.0.1:8055/server/health || true
