param(
  [string]$SshTarget = "server-124",
  [string]$RainYunHost = "10.100.0.2",
  [string]$RainYunUser = "root",
  [string]$RainYunSshpass = $env:RAINYUN_SSHPASS,
  [string]$RagflowBackupPath = "/srv/backups/ragflow/20260604-162629-cold",
  [string]$ExpectedEsIndexPrefix = "ragflow_12dbc",
  [string]$LiteraryKnowledgeBaseName = "contentmrs-literary-corpus"
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

function Invoke-Server124Bash {
  param([Parameter(Mandatory = $true)][string]$Script)
  $output = ($Script -replace "`r`n", "`n") | ssh $SshTarget "bash -s"
  if ($LASTEXITCODE -ne 0) {
    throw "server-124 RAGFlow probe failed with exit code $LASTEXITCODE"
  }
  return $output
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
    throw "RainYun RAGFlow probe failed with exit code $LASTEXITCODE"
  }
  return $output
}

function New-RagflowProbeScript {
  param([bool]$CheckBackup)

  $script = @'
set -eu

echo "HOST	$(hostname)"

for name in ragflow-ragflow-cpu-1 ragflow-mysql-1 ragflow-es01-1 ragflow-minio-1 ragflow-redis-1; do
  status=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}' "$name" 2>/dev/null || true)
  echo "CONTAINER	$name	$status"
done

ES_PASSWORD=$(docker exec ragflow-es01-1 sh -lc 'printf "%s" "${ELASTIC_PASSWORD:-}"' 2>/dev/null || true)
if [ -n "$ES_PASSWORD" ]; then
  curl -sS -u "elastic:$ES_PASSWORD" "http://127.0.0.1:1200/_cat/indices/ragflow*?h=index,health,docs.count,store.size"
else
  curl -sS "http://127.0.0.1:1200/_cat/indices/ragflow*?h=index,health,docs.count,store.size"
fi |
  awk '$1 ~ /^__EXPECTED_ES_INDEX_PREFIX__/ && $1 !~ /doc_meta/ {print "ES\t"$1"\t"$2"\t"$3"\t"$4}'

MYSQL_PASSWORD=$(grep -E '^MYSQL_PASSWORD=' /srv/ragflow/.env | tail -1 | cut -d= -f2-)
if [ -z "$MYSQL_PASSWORD" ]; then
  echo "MYSQL_PASSWORD	missing	/srv/ragflow/.env"
  exit 14
fi

mysql_exec() {
  docker exec -e MYSQL_PWD="$MYSQL_PASSWORD" ragflow-mysql-1 sh -lc "mysql -uroot -N -B -r -e \"$1\""
}

kb_count=$(mysql_exec 'SELECT COUNT(*) FROM rag_flow.knowledgebase;')
doc_count=$(mysql_exec 'SELECT COUNT(*) FROM rag_flow.document;')
task_count=$(mysql_exec 'SELECT COUNT(*) FROM rag_flow.task;')
literary=$(mysql_exec "SELECT name, doc_num, chunk_num, token_num, status FROM rag_flow.knowledgebase WHERE name='__LITERARY_KB_NAME__' LIMIT 1;")

echo "MYSQL_COUNT	knowledgebase	$kb_count"
echo "MYSQL_COUNT	document	$doc_count"
echo "MYSQL_COUNT	task	$task_count"
echo "MYSQL_KB	$literary"

minio_count=$(find /var/lib/docker/volumes/ragflow_minio_data/_data -not -path '*/.minio.sys/*' -type f | wc -l | tr -d ' ')
echo "MINIO_USER_OBJECTS	$minio_count"

if [ "__CHECK_BACKUP__" = "1" ]; then
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
else
  echo "BACKUP_SHA	not_checked"
fi
'@

  $script = $script.Replace("__EXPECTED_ES_INDEX_PREFIX__", $ExpectedEsIndexPrefix)
  $script = $script.Replace("__LITERARY_KB_NAME__", $LiteraryKnowledgeBaseName.Replace("'", "''"))
  $script = $script.Replace("__RAGFLOW_BACKUP_PATH__", $RagflowBackupPath)
  $script = $script.Replace("__CHECK_BACKUP__", $(if ($CheckBackup) { "1" } else { "0" }))
  return $script
}

function Convert-ProbeOutput {
  param(
    [Parameter(Mandatory = $true)][object[]]$Raw,
    [Parameter(Mandatory = $true)][string]$Label
  )

  $containers = @{}
  $mysqlCounts = @{}
  $es = $null
  $literary = $null
  $minioUserObjects = $null
  $backupSha = $null
  $hostName = $null

  foreach ($line in $Raw) {
    $parts = [string]$line -split "`t"
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
        if ($parts.Count -ge 6 -and $parts[1]) {
          $literary = [ordered]@{
            name = $parts[1]
            documents = [int64]$parts[2]
            chunks = [int64]$parts[3]
            tokens = [int64]$parts[4]
            status = $parts[5]
          }
        }
      }
      "MINIO_USER_OBJECTS" {
        $minioUserObjects = [int64]$parts[1]
      }
      "BACKUP_SHA" {
        $backupSha = [ordered]@{
          status = $parts[1]
          path = if ($parts.Count -ge 3) { $parts[2] } else { $null }
        }
      }
    }
  }

  foreach ($name in @("ragflow-ragflow-cpu-1", "ragflow-mysql-1", "ragflow-es01-1", "ragflow-minio-1", "ragflow-redis-1")) {
    Assert-True $containers.ContainsKey($name) "$Label missing container status for $name"
    Assert-True ($containers[$name] -match "^running\b") "$Label $name is not running: $($containers[$name])"
    Assert-True ($containers[$name] -notmatch "\bunhealthy\b") "$Label $name is unhealthy: $($containers[$name])"
  }
  Assert-True ($null -ne $es) "$Label missing ES index matching prefix $ExpectedEsIndexPrefix"
  Assert-True ($es.health -eq "green") "$Label ES index $($es.index) is not green: $($es.health)"
  Assert-True ($mysqlCounts.ContainsKey("knowledgebase")) "$Label missing MySQL knowledgebase count"
  Assert-True ($mysqlCounts.ContainsKey("document")) "$Label missing MySQL document count"
  Assert-True ($mysqlCounts.ContainsKey("task")) "$Label missing MySQL task count"
  Assert-True ($null -ne $literary) "$Label missing knowledgebase $LiteraryKnowledgeBaseName"
  Assert-True ($null -ne $minioUserObjects) "$Label missing MinIO user object count"

  return [ordered]@{
    label = $Label
    host = $hostName
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
  }
}

$source = Convert-ProbeOutput -Label "server-124-standby" -Raw @(Invoke-Server124Bash (New-RagflowProbeScript -CheckBackup:$false))
$target = Convert-ProbeOutput -Label "rainyun-primary" -Raw @(Invoke-RainYunBash (New-RagflowProbeScript -CheckBackup:$true))

Assert-True ($target.backup.status -eq "ok") "RainYun cold backup SHA256 check did not pass"
Assert-True ($target.elasticsearch.docs -ge $source.elasticsearch.docs) "RainYun ES docs below server-124 standby: $($target.elasticsearch.docs) < $($source.elasticsearch.docs)"
Assert-True ($target.mysql.knowledgeBases -ge $source.mysql.knowledgeBases) "RainYun knowledgebase count below server-124 standby"
Assert-True ($target.mysql.documents -ge $source.mysql.documents) "RainYun document count below server-124 standby"
Assert-True ($target.mysql.tasks -ge $source.mysql.tasks) "RainYun task count below server-124 standby"
Assert-True ($target.mysql.literaryKnowledgeBase.documents -ge $source.mysql.literaryKnowledgeBase.documents) "RainYun literary KB document count below server-124 standby"
Assert-True ($target.mysql.literaryKnowledgeBase.chunks -ge $source.mysql.literaryKnowledgeBase.chunks) "RainYun literary KB chunk count below server-124 standby"
Assert-True ($target.mysql.literaryKnowledgeBase.tokens -ge $source.mysql.literaryKnowledgeBase.tokens) "RainYun literary KB token count below server-124 standby"
Assert-True ($target.minio.userObjects -ge $source.minio.userObjects) "RainYun MinIO user objects below server-124 standby"

[ordered]@{
  ok = $true
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  source = $source
  target = $target
  comparison = [ordered]@{
    esDocsDelta = $target.elasticsearch.docs - $source.elasticsearch.docs
    knowledgeBasesDelta = $target.mysql.knowledgeBases - $source.mysql.knowledgeBases
    documentsDelta = $target.mysql.documents - $source.mysql.documents
    tasksDelta = $target.mysql.tasks - $source.mysql.tasks
    literaryDocumentsDelta = $target.mysql.literaryKnowledgeBase.documents - $source.mysql.literaryKnowledgeBase.documents
    literaryChunksDelta = $target.mysql.literaryKnowledgeBase.chunks - $source.mysql.literaryKnowledgeBase.chunks
    literaryTokensDelta = $target.mysql.literaryKnowledgeBase.tokens - $source.mysql.literaryKnowledgeBase.tokens
    minioUserObjectsDelta = $target.minio.userObjects - $source.minio.userObjects
  }
  cleanupGate = "PASS means RainYun is at least as complete as server-124 standby for ES/MySQL/MinIO. It still does not authorize deletion; explicit operator approval is required."
} | ConvertTo-Json -Depth 10
