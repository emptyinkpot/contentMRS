$ErrorActionPreference = "Stop"

$mysql = Join-Path $HOME ".codex-runtime\bin\mysql-myblog.cmd"
$sql = @"
SELECT JSON_OBJECT(
  'database', DATABASE(),
  'tables', (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
  ),
  'knowledgeImportItems', (
    SELECT COUNT(*) FROM knowledge_import_items
  ),
  'curationLabels', (
    SELECT COUNT(*) FROM data_curation_labels
  ),
  'searchDocuments', (
    SELECT COUNT(*) FROM search_documents
  ),
  'searchChunks', (
    SELECT COUNT(*) FROM search_chunks
  ),
  'searchIndexJobs', (
    SELECT COUNT(*) FROM search_index_jobs
  )
) AS status_json;
"@

$tmp = New-TemporaryFile
try {
  Set-Content -Path $tmp -Value $sql -Encoding UTF8
  Get-Content -Raw -Path $tmp | & $mysql --batch --raw --skip-column-names --default-character-set=utf8mb4 --binary-mode=1
} finally {
  Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
}
