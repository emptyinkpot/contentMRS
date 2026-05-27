# ContentMRS unified deploy — builds all services locally, uploads to server, restarts.
# Usage: powershell scripts/deploy.ps1 [-Target all|gateway|contentbase|web-evidence]
param(
  [string]$Target = "all",
  [string]$RemoteHost = "ubuntu@124.220.233.126",
  [string]$GatewayRuntime = "/srv/database-gateway",
  [string]$ContentBaseRuntime = "/srv/contentbase/current",
  [string]$WebRuntime = "/srv/web-evidence-provider"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$gatewayRoot = Join-Path $repoRoot "DataBase" "apps" "gateway"
$webRoot = Join-Path $repoRoot "DataBase" "apps" "web-evidence-provider"
$contentbaseRoot = Join-Path $repoRoot "ContentBase"

function Deploy-Gateway {
  Write-Host "`n=== Building DataBase Gateway ===" -ForegroundColor Cyan
  Push-Location $gatewayRoot
  npm run build
  Pop-Location

  $staging = Join-Path $env:TEMP "contentmrs-gateway-deploy"
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Path $staging | Out-Null
  Copy-Item -Recurse (Join-Path $gatewayRoot "dist") (Join-Path $staging "dist")
  Copy-Item -Recurse (Join-Path $gatewayRoot "config") (Join-Path $staging "config")

  Write-Host "Uploading gateway to ${RemoteHost}:${GatewayRuntime} ..."
  ssh $RemoteHost "mkdir -p $GatewayRuntime/.backups && cp -a $GatewayRuntime/dist $GatewayRuntime/.backups/dist-`$(date +%Y%m%d%H%M%S) 2>/dev/null || true"
  scp -r "$staging/dist" "${RemoteHost}:${GatewayRuntime}/"
  scp -r "$staging/config" "${RemoteHost}:${GatewayRuntime}/"

  ssh $RemoteHost "sudo systemctl restart database-gateway"
  Write-Host "Gateway deployed and restarted." -ForegroundColor Green
}

function Deploy-WebEvidence {
  Write-Host "`n=== Building Web Evidence Provider ===" -ForegroundColor Cyan
  Push-Location $webRoot
  if (-not (Test-Path "node_modules")) { pnpm install }
  pnpm run build
  Pop-Location

  $staging = Join-Path $env:TEMP "contentmrs-web-evidence-deploy"
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Path $staging | Out-Null
  Copy-Item -Recurse (Join-Path $webRoot "dist") (Join-Path $staging "dist")
  Copy-Item (Join-Path $webRoot "package.json") (Join-Path $staging "package.json")

  Write-Host "Uploading web-evidence-provider to ${RemoteHost}:${WebRuntime} ..."
  scp -r "$staging/dist" "${RemoteHost}:${WebRuntime}/"
  scp "$staging/package.json" "${RemoteHost}:${WebRuntime}/"
  ssh $RemoteHost "cd $WebRuntime && npm install --omit=dev 2>/dev/null || true"

  ssh $RemoteHost "sudo systemctl restart web-evidence-provider"
  Write-Host "Web Evidence Provider deployed and restarted." -ForegroundColor Green
}

function Deploy-ContentBase {
  Write-Host "`n=== Building ContentBase ===" -ForegroundColor Cyan
  Push-Location (Join-Path $contentbaseRoot "product" "novel")
  pnpm run build
  Pop-Location

  $staging = Join-Path $env:TEMP "contentmrs-contentbase-deploy"
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Path $staging | Out-Null

  # Copy server entry + compiled product
  Copy-Item (Join-Path $contentbaseRoot "server.mjs") (Join-Path $staging "server.mjs")
  Copy-Item (Join-Path $contentbaseRoot "package.json") (Join-Path $staging "package.json")
  New-Item -ItemType Directory -Path (Join-Path $staging "product" "novel") | Out-Null
  Copy-Item -Recurse (Join-Path $contentbaseRoot "product" "novel" "dist") (Join-Path $staging "product" "novel" "dist")
  # Copy vendor artifacts if present
  if (Test-Path (Join-Path $contentbaseRoot "vendor")) {
    Copy-Item -Recurse (Join-Path $contentbaseRoot "vendor") (Join-Path $staging "vendor")
  }

  Write-Host "Uploading ContentBase to ${RemoteHost}:${ContentBaseRuntime} ..."
  ssh $RemoteHost "mkdir -p /srv/contentbase/.backups && cp -a $ContentBaseRuntime/server.mjs /srv/contentbase/.backups/server.mjs.`$(date +%Y%m%d%H%M%S) 2>/dev/null || true"

  scp "$staging/server.mjs" "${RemoteHost}:${ContentBaseRuntime}/"
  scp "$staging/package.json" "${RemoteHost}:${ContentBaseRuntime}/"
  scp -r (Join-Path $staging "product" "novel" "dist") "${RemoteHost}:${ContentBaseRuntime}/product/novel/"
  if (Test-Path (Join-Path $staging "vendor")) {
    scp -r (Join-Path $staging "vendor") "${RemoteHost}:${ContentBaseRuntime}/"
  }

  # Install production deps on server (no ts-node needed in prod)
  ssh $RemoteHost "cd $ContentBaseRuntime && npm install --omit=dev 2>/dev/null || true"

  ssh $RemoteHost "sudo systemctl restart contentbase"
  Write-Host "ContentBase deployed and restarted." -ForegroundColor Green
}

# ─── Execute ───

Write-Host "ContentMRS Deploy — target: $Target" -ForegroundColor Yellow
Write-Host "Remote: $RemoteHost"

switch ($Target) {
  "gateway"       { Deploy-Gateway }
  "web-evidence"  { Deploy-WebEvidence }
  "contentbase"   { Deploy-ContentBase }
  "all" {
    Deploy-Gateway
    Deploy-WebEvidence
    Deploy-ContentBase
  }
  default {
    Write-Host "Unknown target: $Target. Use: all, gateway, contentbase, web-evidence" -ForegroundColor Red
    exit 1
  }
}

# ─── Smoke test ───

Write-Host "`n=== Smoke Test ===" -ForegroundColor Cyan
ssh $RemoteHost "echo 'Gateway:'; curl -sS http://127.0.0.1:18090/ | head -c 100; echo; echo 'ContentBase:'; curl -sS http://127.0.0.1:5111/api/health | head -c 200; echo; echo 'WebEvidence:'; curl -sS http://127.0.0.1:19091/health 2>/dev/null || echo 'no /health endpoint'; echo"

Write-Host "`nDeploy complete." -ForegroundColor Green
