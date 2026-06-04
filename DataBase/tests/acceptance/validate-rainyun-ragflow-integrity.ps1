param(
  [string]$SshTarget = "server-124",
  [string]$RainYunHost = "10.100.0.2",
  [string]$RainYunUser = "root",
  [string]$RainYunSshpass = $env:RAINYUN_SSHPASS,
  [string]$RagflowBackupPath = "/srv/backups/ragflow/20260604-162629-cold",
  [string]$ExpectedEsIndexPrefix = "ragflow_12dbc",
  [int]$MinEsDocs = 158396,
  [int]$MinKnowledgeBases = 5,
  [int]$MinDocuments = 148,
  [int]$MinTasks = 148,
  [int]$MinMinioUserObjects = 271,
  [string]$LiteraryKnowledgeBaseName = "contentmrs-literary-corpus",
  [int]$MinLiteraryDocuments = 137,
  [int]$MinLiteraryChunks = 145105,
  [int]$MinLiteraryTokens = 53346337
)

$ErrorActionPreference = "Stop"

function Assert-True {
  param(
    [Parameter(Mandatory = $true)][bool]$Condition,
    [Parameter(Mandatory = $true)][string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

function Escape-SingleQuotedShell {
  param([Parameter(Mandatory = $true)][string]$Value)
  return $Value -replace "'", "'\''"
}

function Invoke-RainYunBash {
  param([Parameter(Mandatory = $true)][string]$Script)

  if (-not $RainYunSshpass) {
    throw "RainYunSshpass or RAINYUN_SSHPASS is required"
  }

  $escapedPass = Escape-SingleQuotedShell $RainYunSshpass
  $remoteCommand = "export SSHPASS='$escapedPass'; sshpass -e ssh -o StrictHostKeyChecking=no $RainYunUser@$RainYunHost 'bash -s'"
  $output = ($Script -replace "`r`n", "`n") | ssh $SshTarget $remoteCommand
  if ($LASTEXITCODE -ne 0) {
    throw "RainYun integrity probe failed with exit code $LASTEXITCODE"
  }
  return $output
}

$remoteScript = @'
set -eu

echo "HOST	$(hostname)"

for name in ragflow-ragflow-cpu-1 ragflow-mysql-1 ragflow-es01-1 ragflow-minio-1 ragflow-redis-1; do
  status=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "$name" 2>/dev/null || true)
  echo "CONTAINER	$name	$status"
done

es_auth=""
if docker exec ragflow-es01-1 sh -lc 'test -n "$ELASTIC_PASSWORD"' >/dev/null 2>&1; then
  es_auth="-u elastic:$(docker exec ragflow-es01-1 sh -lc 'printf "%s" "$ELASTIC_PASSWORD"')"
fi

curl -sS $es_auth "http://127.0.0.1:1200/_cat/indices/ragflow*?h=index,health,docs.count,store.size" |
  awk '$1 ~ /^__EXPECTED_ES_INDEX_PREFIX__/ && $1 !~ /doc_meta/ {print "ES\t"$1"\t"$2"\t"$3"\t"$4}'

MYSQL_PASSWORD=$(grep -E '^MYSQL_PASSWORD=' /srv/ragflow/.env | tail -1 | cut -d= -f2-)
if [ -z "$MYSQL_PASSWORD" ]; then
  echo "MYSQL_PASSWORD	missing	/srv/ragflow/.env"
  exit 14
fi

kb_count=$(docker exec ragflow-mysql-1 sh -lc "mysql -uroot -p\"\$MYSQL_PASSWORD\" -N -B -e 'SELECT COUNT(*) FROM rag_flow.knowledgebase;'")
doc_count=$(docker exec ragflow-mysql-1 sh -lc "mysql -uroot -p\"\$MYSQL_PASSWORD\" -N -B -e 'SELECT COUNT(*) FROM rag_flow.document;'")
task_count=$(docker exec ragflow-mysql-1 sh -lc "mysql -uroot -p\"\$MYSQL_PASSWORD\" -N -B -e 'SELECT COUNT(*) FROM rag_flow.task;'")
literary=$(docker exec ragflow-mysql-1 sh -lc "mysql -uroot -p\"\$MYSQL_PASSWORD\" -N -B -r -e \"SELECT name, doc_num, chunk_num, token_num, status FROM rag_flow.knowledgebase WHERE name='__LITERARY_KB_NAME__' LIMIT 1;\"")

echo "MYSQL_COUNT	knowledgebase	$kb_count"
echo "MYSQL_COUNT	document	$doc_count"
echo "MYSQL_COUNT	task	$task_count"
echo "MYSQL_KB	$literary"

minio_count=$(find /var/lib/docker/volumes/ragflow_minio_data/_data -not -path '*/.minio.sys/*' -type f | wc -l | tr -d ' ')
echo "MINIO_USER_OBJECTS	$minio_count"

if [ ! -d "__RAGFLOW_BACKUP_PATH__" ]; then
  echo "BACKUP_SHA	missing	__RAGFLOW_BACKUP_PATH__"
  exit 12
fi
if [ ! -f "__RAGFLOW_BACKUP_PATH__/SHA256SUMS" ]; then
  echo "BACKUP_SHA	missing	__RAGFLOW_BACKUP_PATH__/SHA256SUMS"
  exit 13
fi
(cd "__RAGFLOW_BACKUP_PATH__" && sha256sum -c SHA256SUMS >/tmp/ragflow-backup-sha256.out)
echo "BACKUP_SHA	ok	__RAGFLOW_BACKUP_PATH__"
'@

$remoteScript = $remoteScript.Replace("__EXPECTED_ES_INDEX_PREFIX__", $ExpectedEsIndexPrefix)
$remoteScript = $remoteScript.Replace("__LITERARY_KB_NAME__", $LiteraryKnowledgeBaseName.Replace("'", "''"))
$remoteScript = $remoteScript.Replace("__RAGFLOW_BACKUP_PATH__", $RagflowBackupPath)

$raw = @(Invoke-RainYunBash $remoteScript)
$containers = @{}
$mysqlCounts = @{}
$es = $null
$literary = $null
$minioUserObjects = $null
$backupSha = $null
$hostName = $null

foreach ($line in $raw) {
  $parts = $line -split "`t"
  switch ($parts[0]) {
    "HOST" {
      $hostName = $parts[1]
    }
    "CONTAINER" {
      $containers[$parts[1]] = $parts[2]
    }
    "ES" {
      $es = [ordered]@{
        index = $parts[1]
        health = $parts[2]
        docs = [int64]$parts[3]
        store = $parts[4]
      }
    }
    "MYSQL_COUNT" {
      $mysqlCounts[$parts[1]] = [int64]$parts[2]
    }
    "MYSQL_KB" {
      $literary = [ordered]@{
        name = $parts[1]
        documents = [int64]$parts[2]
        chunks = [int64]$parts[3]
        tokens = [int64]$parts[4]
        status = $parts[5]
      }
    }
    "MINIO_USER_OBJECTS" {
      $minioUserObjects = [int64]$parts[1]
    }
    "BACKUP_SHA" {
      $backupSha = [ordered]@{
        status = $parts[1]
        path = $parts[2]
      }
    }
  }
}

foreach ($name in @("ragflow-ragflow-cpu-1", "ragflow-mysql-1", "ragflow-es01-1", "ragflow-minio-1", "ragflow-redis-1")) {
  Assert-True $containers.ContainsKey($name) "missing container status for $name"
  Assert-True ($containers[$name] -match "^running\b") "$name is not running: $($containers[$name])"
  Assert-True ($containers[$name] -notmatch "\bunhealthy\b") "$name is unhealthy: $($containers[$name])"
}

Assert-True ($null -ne $es) "missing ES index matching prefix $ExpectedEsIndexPrefix"
Assert-True ($es.health -eq "green") "ES index $($es.index) is not green: $($es.health)"
Assert-True ($es.docs -ge $MinEsDocs) "ES docs below floor: $($es.docs) < $MinEsDocs"

Assert-True ($mysqlCounts["knowledgebase"] -ge $MinKnowledgeBases) "RAGFlow MySQL knowledgebase count below floor"
Assert-True ($mysqlCounts["document"] -ge $MinDocuments) "RAGFlow MySQL document count below floor"
Assert-True ($mysqlCounts["task"] -ge $MinTasks) "RAGFlow MySQL task count below floor"

Assert-True ($null -ne $literary) "missing knowledgebase $LiteraryKnowledgeBaseName"
Assert-True ($literary.documents -ge $MinLiteraryDocuments) "literary KB document count below floor"
Assert-True ($literary.chunks -ge $MinLiteraryChunks) "literary KB chunk count below floor"
Assert-True ($literary.tokens -ge $MinLiteraryTokens) "literary KB token count below floor"

Assert-True ($minioUserObjects -ge $MinMinioUserObjects) "MinIO user object count below floor: $minioUserObjects < $MinMinioUserObjects"
Assert-True ($backupSha.status -eq "ok") "RAGFlow cold backup SHA256 check failed"

$summary = [ordered]@{
  ok = $true
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  host = $hostName
  rainYunHost = $RainYunHost
  containers = $containers
  elasticsearch = $es
  mysql = [ordered]@{
    knowledgeBases = $mysqlCounts["knowledgebase"]
    documents = $mysqlCounts["document"]
    tasks = $mysqlCounts["task"]
    literaryKnowledgeBase = $literary
  }
  minio = [ordered]@{
    userObjects = $minioUserObjects
  }
  backup = $backupSha
  cleanupGate = "PASS: server-124 RAGFlow cleanup may be considered only after this test passes and the operator explicitly approves deletion."
}

$summary | ConvertTo-Json -Depth 8
