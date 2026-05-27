$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$mysqlCommand = Join-Path $env:USERPROFILE ".codex-runtime\bin\mysql-myblog.cmd"

if (-not (Test-Path -LiteralPath $mysqlCommand)) {
  throw "mysql-myblog command not found: $mysqlCommand"
}

$tables = & $mysqlCommand --batch --raw --skip-column-names -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME;"

$inventory = [ordered]@{
  generated_at = (Get-Date).ToUniversalTime().ToString("o")
  database = "cloudbase-4glvyyq9f61b19cd"
  host = "124.220.245.121"
  port = 22295
  tables = @()
}

$total = 0
foreach ($table in $tables) {
  if (-not $table) { continue }

  $escaped = $table.Replace([string][char]96, [string][char]96 + [string][char]96)
  $count = [int](& $mysqlCommand --batch --raw --skip-column-names -e "SELECT COUNT(*) FROM ``$escaped``;")
  $colsRaw = & $mysqlCommand --batch --raw --skip-column-names -e "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$table' ORDER BY ORDINAL_POSITION;"

  $columns = @()
  foreach ($line in $colsRaw) {
    $parts = $line -split "`t"
    if ($parts.Length -ge 2) {
      $columns += [ordered]@{
        name = $parts[0]
        type = $parts[1]
      }
    }
  }

  $inventory.tables += [ordered]@{
    name = $table
    rows = $count
    columns = $columns
  }
  $total += $count
}

$inventory.table_count = $inventory.tables.Count
$inventory.total_rows = $total
$inventory | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $repoRoot "evidence\inventories\mysql\table-inventory.json") -Encoding UTF8

$serverPaths = @(
  "/srv/myblog/repo",
  "/srv/myblog/site",
  "/srv/myblog/admin-next",
  "/srv/myblog/source",
  "/srv/myblog/public-data",
  "/srv/multica",
  "/srv/multica/agent-workspaces",
  "/srv/openlist/data"
)

$serverInventory = [ordered]@{
  generated_at = (Get-Date).ToUniversalTime().ToString("o")
  ssh_alias = "server-124"
  host = "124.220.233.126"
  paths = @()
}

foreach ($path in $serverPaths) {
  $line = ssh server-124 "if [ -e '$path' ]; then stat -c '%n|%F|%U|%G|%a' '$path'; else echo '$path|missing|||'; fi"
  $parts = $line -split "\|"
  $serverInventory.paths += [ordered]@{
    path = $parts[0]
    type = $parts[1]
    owner = $parts[2]
    group = $parts[3]
    mode = $parts[4]
  }
}

$serverInventory | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $repoRoot "evidence\inventories\server\path-inventory.json") -Encoding UTF8
