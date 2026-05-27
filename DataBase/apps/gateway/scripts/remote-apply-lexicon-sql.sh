#!/usr/bin/env bash
set -euo pipefail
SQL_FILE="${1:-/tmp/004_ming_maritime_lexicon.sql}"
set -a
# shellcheck disable=SC1091
source /srv/database-gateway/.env
set +a
mysql -h "$MYSQL_HOST" -u "$MYSQL_WRITE_USER" -p"$MYSQL_WRITE_PASSWORD" "$MYSQL_DATABASE" < "$SQL_FILE"
echo "applied:${SQL_FILE}"
