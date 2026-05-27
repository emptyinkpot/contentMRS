# Start local DataBase Gateway + web-evidence-provider with merged secrets.
param(
  [switch]$GatewayOnly,
  [switch]$WebOnly
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path (Split-Path -Parent $root) "web-evidence-provider"
$gatewaySecrets = "C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env"
$mysqlSecrets = "C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env"
$gatewayExample = Join-Path $root ".env.example"

function Import-DotEnvFile([string]$path) {
  if (-not (Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      if ($name) { Set-Item -Path "Env:$name" -Value $value }
    }
  }
}

function Stop-ListenerPort([int]$port) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $connections) {
    $procId = $conn.OwningProcess
    if ($procId -and $procId -gt 0) {
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

Import-DotEnvFile $gatewayExample
Import-DotEnvFile $mysqlSecrets
Import-DotEnvFile $gatewaySecrets

if (-not $env:MYSQL_PASSWORD) {
  $env:MYSQL_PASSWORD = $env:DATABASE_READONLY_PASSWORD
}
if (-not $env:MYSQL_USER) {
  $env:MYSQL_USER = $env:DATABASE_READONLY_USER
}
if (-not $env:DATABASE_GATEWAY_HOST) { $env:DATABASE_GATEWAY_HOST = "127.0.0.1" }
if (-not $env:DATABASE_GATEWAY_PORT) { $env:DATABASE_GATEWAY_PORT = "18090" }
if (-not $env:DATABASE_EVIDENCE_WEB_SEARCH_URL) {
  $env:DATABASE_EVIDENCE_WEB_SEARCH_URL = "http://127.0.0.1:19091/search"
}

if (-not $GatewayOnly) {
  Stop-ListenerPort 19091
  Write-Host "Starting web-evidence-provider on http://127.0.0.1:19091 ..."
  Start-Process -WorkingDirectory $webRoot -FilePath "pnpm" -ArgumentList "run","dev" -WindowStyle Minimized
  Start-Sleep -Seconds 2
}

if (-not $WebOnly) {
  Stop-ListenerPort 18090
  Write-Host "Building gateway..."
  Push-Location $root
  npm run build | Out-Host
  Pop-Location
  Write-Host "Starting database-gateway on http://127.0.0.1:$($env:DATABASE_GATEWAY_PORT) ..."
  Start-Process -WorkingDirectory $root -FilePath "npm" -ArgumentList "run","dev" -WindowStyle Minimized
}

Write-Host "Done. Verify:"
Write-Host "  Invoke-RestMethod http://127.0.0.1:19091/health"
Write-Host "  Invoke-RestMethod `"http://127.0.0.1:18090/evidence/search?q=test&includeWeb=true&limit=3`""
