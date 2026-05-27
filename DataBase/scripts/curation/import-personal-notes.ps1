param(
  [ValidateSet("All", "Xiaomi", "Notion")]
  [string]$Source = "All",
  [switch]$Apply,
  [string]$XiaomiMarkdownDir = "E:\My Project\Atramenti box\tools\xiaomi-notes-sync-agent\output\markdown",
  [string]$NotionDbPath = "$env:APPDATA\Notion\notion.db",
  [string]$MysqlCommand = "$env:USERPROFILE\.codex-runtime\bin\mysql-myblog.cmd"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Escape-SqlString {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return "NULL" }
  $escaped = $Value -replace "`0", ""
  $escaped = $escaped -replace "\\", "\\\\"
  $escaped = $escaped -replace "'", "''"
  $escaped = $escaped -replace "`r", "\r"
  $escaped = $escaped -replace "`n", "\n"
  $escaped = $escaped -replace "`t", "\t"
  return "'" + $escaped + "'"
}

function Escape-JsonForSql {
  param($Value)
  $json = $Value | ConvertTo-Json -Depth 12 -Compress
  return Escape-SqlString $json
}

function Invoke-MySqlSql {
  param([string]$Sql)
  $tmp = Join-Path $env:TEMP ("database-import-" + [guid]::NewGuid().ToString("N") + ".sql")
  try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tmp, $Sql, $utf8NoBom)
    & cmd.exe /d /c "`"$MysqlCommand`" --default-character-set=utf8mb4 --binary-mode=1 < `"$tmp`""
  }
  finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}

function Ensure-ImportTables {
  $sql = @"
CREATE TABLE IF NOT EXISTS knowledge_import_runs (
  id varchar(96) NOT NULL PRIMARY KEY,
  source varchar(64) NOT NULL,
  source_root text NULL,
  mode varchar(32) NOT NULL,
  item_count int NOT NULL DEFAULT 0,
  metadata_json json NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS knowledge_import_items (
  id varchar(128) NOT NULL PRIMARY KEY,
  run_id varchar(96) NOT NULL,
  source varchar(64) NOT NULL,
  source_id varchar(512) NOT NULL,
  title varchar(512) NOT NULL,
  content longtext NOT NULL,
  content_format varchar(32) NOT NULL,
  import_quality varchar(64) NULL,
  raw_sha256 varchar(64) NULL,
  raw_bytes int NULL,
  raw_base64 longtext NULL,
  raw_blob longblob NULL,
  metadata_json json NULL,
  source_created_at datetime NULL,
  source_updated_at datetime NULL,
  imported_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_knowledge_import_source_id (source, source_id),
  KEY idx_knowledge_import_source (source),
  KEY idx_knowledge_import_run (run_id),
  FULLTEXT KEY ft_knowledge_import_title_content (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"@
  Invoke-MySqlSql $sql

  $columns = & $MysqlCommand --batch --raw --skip-column-names -e "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'knowledge_import_items' AND COLUMN_NAME IN ('raw_sha256','raw_bytes','raw_base64','raw_blob');"
  $existing = @($columns)
  $alter = New-Object System.Collections.Generic.List[string]
  if ($existing -notcontains "import_quality") { $alter.Add("ADD COLUMN import_quality varchar(64) NULL AFTER content_format") }
  if ($existing -notcontains "raw_sha256") { $alter.Add("ADD COLUMN raw_sha256 varchar(64) NULL AFTER import_quality") }
  if ($existing -notcontains "raw_bytes") { $alter.Add("ADD COLUMN raw_bytes int NULL AFTER raw_sha256") }
  if ($existing -notcontains "raw_base64") { $alter.Add("ADD COLUMN raw_base64 longtext NULL AFTER raw_bytes") }
  if ($existing -notcontains "raw_blob") { $alter.Add("ADD COLUMN raw_blob longblob NULL AFTER raw_base64") }
  if ($alter.Count -gt 0) {
    Invoke-MySqlSql ("ALTER TABLE knowledge_import_items " + ($alter -join ", ") + ";")
  }
}

function Get-StableId {
  param([string]$Prefix, [string]$Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $hash = $sha.ComputeHash($bytes)
    $hex = -join ($hash | ForEach-Object { $_.ToString("x2") })
    return "$Prefix-$($hex.Substring(0, 40))"
  }
  finally {
    $sha.Dispose()
  }
}

function Get-Sha256Hex {
  param([byte[]]$Bytes)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha.ComputeHash($Bytes)
    return -join ($hash | ForEach-Object { $_.ToString("x2") })
  }
  finally {
    $sha.Dispose()
  }
}

function Count-ByteValue {
  param([byte[]]$Bytes, [byte]$Value)
  $count = 0
  foreach ($byte in $Bytes) {
    if ($byte -eq $Value) { $count++ }
  }
  return $count
}

function Get-ImportQuality {
  param(
    [string]$Source,
    [string]$Content,
    [AllowNull()][int]$RawBytes,
    [AllowNull()][int]$NullBytes
  )
  $contentLength = if ($null -ne $Content) { $Content.Length } else { 0 }
  if ($Source -eq "xiaomi-notes") {
    if ($RawBytes -gt 0 -and $NullBytes -eq $RawBytes) { return "title-only-null-body" }
    if ($contentLength -ge 100) { return "readable-body" }
    return "weak-readable-body"
  }
  if ($Source -eq "notion-local") {
    if ($contentLength -ge 100) { return "notion-readable-page" }
    return "notion-tiny-page"
  }
  return "unclassified"
}

function Get-XiaomiItems {
  if (-not (Test-Path -LiteralPath $XiaomiMarkdownDir)) {
    throw "Xiaomi markdown directory not found: $XiaomiMarkdownDir"
  }

  Get-ChildItem -LiteralPath $XiaomiMarkdownDir -File -Filter "*.md" | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $content = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $title = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    $firstHeading = ($content -split "`r?`n" | Where-Object { $_ -match '^#\s+\S' } | Select-Object -First 1)
    if ($firstHeading) {
      $title = ($firstHeading -replace '^#\s+', '').Trim()
    }
    if ($title.Length -gt 500) { $title = $title.Substring(0, 500) }
    $nullBytes = Count-ByteValue $bytes 0
    [pscustomobject]@{
      Source = "xiaomi-notes"
      SourceId = $_.FullName
      Title = if ($title) { $title } else { $_.Name }
      Content = $content
      Format = "markdown"
      ImportQuality = Get-ImportQuality "xiaomi-notes" $content $bytes.Length $nullBytes
      RawSha256 = Get-Sha256Hex $bytes
      RawBytes = $bytes.Length
      RawBase64 = [System.Convert]::ToBase64String($bytes)
      CreatedAt = $_.CreationTime
      UpdatedAt = $_.LastWriteTime
      Metadata = @{
        file_name = $_.Name
        full_path = $_.FullName
      length = $_.Length
        null_bytes = $nullBytes
      }
    }
  }
}

function Convert-NotionRichTextToPlain {
  param($Value)
  if ($null -eq $Value) { return "" }
  if ($Value -is [string]) {
    try { $Value = $Value | ConvertFrom-Json } catch { return $Value }
  }
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($segment in @($Value)) {
    if ($segment -is [array] -and $segment.Count -gt 0) {
      [void]$parts.Add([string]$segment[0])
    }
    elseif ($segment.PSObject.Properties.Name -contains "plain_text") {
      [void]$parts.Add([string]$segment.plain_text)
    }
    elseif ($segment.PSObject.Properties.Name -contains "text") {
      [void]$parts.Add([string]$segment.text)
    }
  }
  return (($parts.ToArray()) -join "")
}

function Get-NotionItems {
  if (-not (Test-Path -LiteralPath $NotionDbPath)) {
    throw "Notion database not found: $NotionDbPath"
  }
  $sqlite = Get-Command sqlite3 -ErrorAction Stop
  $query = "SELECT id,type,properties,content,created_time,last_edited_time,parent_id,parent_table,alive FROM block WHERE alive = 1;"
  $rowsJson = & $sqlite.Source -json $NotionDbPath $query
  if (-not $rowsJson) { return @() }
  $rows = $rowsJson | ConvertFrom-Json
  $byId = @{}
  foreach ($row in $rows) { $byId[$row.id] = $row }

  function Get-BlockTitle([object]$Block) {
    if (-not $Block.properties) { return "" }
    try {
      $props = $Block.properties | ConvertFrom-Json
      if ($props.PSObject.Properties.Name -contains "title") {
        return Convert-NotionRichTextToPlain $props.title
      }
    }
    catch {
      return ""
    }
    return ""
  }

  function Get-ChildIds([object]$Block) {
    if (-not $Block.content) { return @() }
    try { return @($Block.content | ConvertFrom-Json) } catch { return @() }
  }

  function Read-PageContent([object]$Page) {
    $lines = New-Object System.Collections.Generic.List[string]
    $seen = @{}
    function Visit([string]$Id, [int]$Depth) {
      if ($Depth -gt 32 -or $seen.ContainsKey($Id) -or -not $byId.ContainsKey($Id)) { return }
      $seen[$Id] = $true
      $block = $byId[$Id]
      $text = Get-BlockTitle $block
      if ($text) { [void]$lines.Add($text) }
      foreach ($childId in Get-ChildIds $block) {
        Visit ([string]$childId) ($Depth + 1)
      }
    }
    foreach ($childId in Get-ChildIds $Page) {
      Visit ([string]$childId) 0
    }
    return (($lines.ToArray()) -join "`n")
  }

  $pages = @($rows | Where-Object { $_.type -eq "page" -and $_.alive -eq 1 })
  foreach ($page in $pages) {
    $title = Get-BlockTitle $page
    if (-not $title) { $title = "Untitled Notion Page" }
    if ($title.Length -gt 500) { $title = $title.Substring(0, 500) }
    $content = Read-PageContent $page
    if (-not $content) { $content = $title }
    $created = if ($page.created_time) { [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$page.created_time).LocalDateTime } else { $null }
    $updated = if ($page.last_edited_time) { [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$page.last_edited_time).LocalDateTime } else { $null }
    [pscustomobject]@{
      Source = "notion-local"
      SourceId = $page.id
      Title = $title
      Content = $content
      Format = "plain"
      ImportQuality = Get-ImportQuality "notion-local" $content $null $null
      RawSha256 = $null
      RawBytes = $null
      RawBase64 = $null
      CreatedAt = $created
      UpdatedAt = $updated
      Metadata = @{
        block_id = $page.id
        parent_id = $page.parent_id
        parent_table = $page.parent_table
        type = $page.type
      }
    }
  }
}

function Import-Items {
  param([array]$Items, [string]$RunId, [string]$RunSource, [string]$SourceRoot)
  if (-not $Items -or $Items.Count -eq 0) { return }
  Ensure-ImportTables

  $values = New-Object System.Collections.Generic.List[string]
  foreach ($item in $Items) {
    $id = Get-StableId "ki" ($item.Source + "|" + $item.SourceId)
    $created = if ($item.CreatedAt) { Escape-SqlString ([datetime]$item.CreatedAt).ToString("yyyy-MM-dd HH:mm:ss") } else { "NULL" }
    $updated = if ($item.UpdatedAt) { Escape-SqlString ([datetime]$item.UpdatedAt).ToString("yyyy-MM-dd HH:mm:ss") } else { "NULL" }
    $rowValues = @(
      (Escape-SqlString $id)
      (Escape-SqlString $RunId)
      (Escape-SqlString $item.Source)
      (Escape-SqlString $item.SourceId)
      (Escape-SqlString $item.Title)
      (Escape-SqlString $item.Content)
      (Escape-SqlString $item.Format)
      (Escape-SqlString $item.ImportQuality)
      (Escape-SqlString $item.RawSha256)
      $(if ($null -ne $item.RawBytes) { [string]$item.RawBytes } else { "NULL" })
      (Escape-SqlString $item.RawBase64)
      $(if ($item.RawBase64) { "FROM_BASE64(" + (Escape-SqlString $item.RawBase64) + ")" } else { "NULL" })
      (Escape-JsonForSql $item.Metadata)
      $created
      $updated
    )
    $values.Add("(" + ($rowValues -join ",") + ")")
  }

  $runValues = @(
    (Escape-SqlString $RunId)
    (Escape-SqlString $RunSource)
    (Escape-SqlString $SourceRoot)
    "'apply'"
    ([string]$Items.Count)
    (Escape-JsonForSql @{ source = $RunSource })
  )
  $runSql = "INSERT INTO knowledge_import_runs (id, source, source_root, mode, item_count, metadata_json) VALUES (" +
    ($runValues -join ",") +
    ") ON DUPLICATE KEY UPDATE item_count = VALUES(item_count), metadata_json = VALUES(metadata_json);"

  $chunks = [System.Collections.Generic.List[string]]::new()
  for ($i = 0; $i -lt $values.Count; $i += 100) {
    $end = [Math]::Min($i + 99, $values.Count - 1)
    $chunkValues = ($values[$i..$end] -join ",`n")
    $chunks.Add(@"
INSERT INTO knowledge_import_items
(id, run_id, source, source_id, title, content, content_format, import_quality, raw_sha256, raw_bytes, raw_base64, raw_blob, metadata_json, source_created_at, source_updated_at)
VALUES
$chunkValues
ON DUPLICATE KEY UPDATE
  run_id = VALUES(run_id),
  title = VALUES(title),
  content = VALUES(content),
  content_format = VALUES(content_format),
  import_quality = VALUES(import_quality),
  raw_sha256 = VALUES(raw_sha256),
  raw_bytes = VALUES(raw_bytes),
  raw_base64 = VALUES(raw_base64),
  raw_blob = VALUES(raw_blob),
  metadata_json = VALUES(metadata_json),
  source_created_at = VALUES(source_created_at),
  source_updated_at = VALUES(source_updated_at);
"@)
  }

  Invoke-MySqlSql ("START TRANSACTION;`n" + $runSql + "`n" + ($chunks -join "`n") + "`nCOMMIT;")
}

$collected = @()
if ($Source -in @("All", "Xiaomi")) { $collected += @(Get-XiaomiItems) }
if ($Source -in @("All", "Notion")) { $collected += @(Get-NotionItems) }

$summary = $collected | Group-Object Source | ForEach-Object {
  $charCount = 0
  foreach ($item in $_.Group) {
    if ($null -ne $item.Content) { $charCount += $item.Content.Length }
  }
  [pscustomobject]@{
    source = $_.Name
    count = $_.Count
    totalChars = $charCount
  }
}

if (-not $Apply) {
  [pscustomobject]@{
    mode = "dry-run"
    apply = $false
    totalItems = $collected.Count
    bySource = $summary
  } | ConvertTo-Json -Depth 6
  exit 0
}

$runId = "personal-notes-" + (Get-Date -Format "yyyyMMdd-HHmmss")
Import-Items -Items $collected -RunId $runId -RunSource $Source -SourceRoot "xiaomi=$XiaomiMarkdownDir;notion=$NotionDbPath"

[pscustomobject]@{
  mode = "applied"
  runId = $runId
  totalItems = $collected.Count
  bySource = $summary
} | ConvertTo-Json -Depth 6
