param(
  [ValidateSet('readonly', 'content-rw')]
  [string]$Mode = 'readonly',

  [ValidateSet('health', 'readonly-probe', 'sync-qmd-dry', 'sync-qmd')]
  [string]$Command = 'health',

  [string]$MySqlCnfPath = 'C:\Users\ASUS-KL\.codex-secrets\mysql\myblog.cnf',
  [string]$ServiceUsersEnvPath = 'C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env',
  [switch]$NoInstallHint
)

$ErrorActionPreference = 'Stop'

function Read-KeyValueFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Secret surface file not found: $Path"
  }

  $result = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#') -or $trimmed.StartsWith('[')) {
      continue
    }

    $match = [regex]::Match($trimmed, '^\s*([^=\s]+)\s*=\s*(.*)\s*$')
    if ($match.Success) {
      $key = $match.Groups[1].Value.Trim()
      $value = $match.Groups[2].Value.Trim().Trim('"').Trim("'")
      $result[$key] = $value
    }
  }
  return $result
}

function Require-Key {
  param(
    [hashtable]$Map,
    [string]$Key,
    [string]$Surface
  )

  if (-not $Map.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace([string]$Map[$Key])) {
    throw "Required key '$Key' missing from $Surface"
  }
  return [string]$Map[$Key]
}

$mysql = Read-KeyValueFile -Path $MySqlCnfPath
$users = Read-KeyValueFile -Path $ServiceUsersEnvPath

$userKey = if ($Mode -eq 'readonly') { 'DATABASE_READONLY_USER' } else { 'DATABASE_CONTENT_RW_USER' }
$passwordKey = if ($Mode -eq 'readonly') { 'DATABASE_READONLY_PASSWORD' } else { 'DATABASE_CONTENT_RW_PASSWORD' }

$env:EXPERIENCE_DB_HOST = Require-Key -Map $mysql -Key 'host' -Surface $MySqlCnfPath
$env:EXPERIENCE_DB_PORT = Require-Key -Map $mysql -Key 'port' -Surface $MySqlCnfPath
$env:EXPERIENCE_DB_NAME = Require-Key -Map $mysql -Key 'database' -Surface $MySqlCnfPath
$env:EXPERIENCE_DB_USER = Require-Key -Map $users -Key $userKey -Surface $ServiceUsersEnvPath
$env:EXPERIENCE_DB_PASSWORD = Require-Key -Map $users -Key $passwordKey -Surface $ServiceUsersEnvPath

$env:EXPERIENCE_QMD_ROOT = if ($env:EXPERIENCE_QMD_ROOT) { $env:EXPERIENCE_QMD_ROOT } else { 'E:\My Project\my-project-qmd' }
$env:QMD_EXPERIENCE_COLLECTION_DIR = if ($env:QMD_EXPERIENCE_COLLECTION_DIR) { $env:QMD_EXPERIENCE_COLLECTION_DIR } else { 'E:\My Project\my-project-qmd\collections\experience-manager' }

$serviceRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $serviceRoot

Write-Output "Loaded experience-manager environment from approved secret surfaces."
Write-Output "Mode: $Mode"
Write-Output "MySQL secret surface: $MySqlCnfPath"
Write-Output "Service-user secret surface: $ServiceUsersEnvPath"
Write-Output "Secret values are not printed."

if (-not (Test-Path -LiteralPath (Join-Path $serviceRoot 'node_modules')) -and -not $NoInstallHint) {
  Write-Output "Dependency note: node_modules is absent. Run npm install in $serviceRoot if mysql2 is not available."
}

switch ($Command) {
  'readonly-probe' { npm run probe:readonly; break }
  'sync-qmd-dry' { npm run sync:qmd:dry; break }
  'sync-qmd' { npm run sync:qmd; break }
  default { npm run health; break }
}
