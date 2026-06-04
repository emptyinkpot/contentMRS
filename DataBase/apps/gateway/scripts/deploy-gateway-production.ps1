# Deploy apps/gateway build + web-evidence-provider to server-124 production runtime.
param(
  [string]$RemoteHost = "ubuntu@124.220.233.126",
  [string]$GatewayRuntime = "/srv/database-gateway",
  [string]$WebRuntime = "/srv/web-evidence-provider",
  [string]$ComposeRoot = "/srv/contentmrs-docker"
)

$ErrorActionPreference = "Stop"
$gatewayRoot = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path (Split-Path -Parent $gatewayRoot) "web-evidence-provider"
$repoRoot = Split-Path -Parent (Split-Path -Parent $gatewayRoot)

Write-Host "Building gateway..."
Push-Location $gatewayRoot
npm run build
Pop-Location

Write-Host "Building web-evidence-provider..."
Push-Location $webRoot
if (-not (Test-Path "node_modules")) { pnpm install }
pnpm run build
Pop-Location

$staging = Join-Path $env:TEMP "database-gateway-deploy"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

Copy-Item -Recurse (Join-Path $gatewayRoot "dist") (Join-Path $staging "dist")
Copy-Item -Recurse (Join-Path $gatewayRoot "config") (Join-Path $staging "config")
$gatewayScriptsStaging = Join-Path $staging "scripts"
New-Item -ItemType Directory -Path $gatewayScriptsStaging | Out-Null
Copy-Item (Join-Path $repoRoot "tests\smoke\smoke*.mjs") $gatewayScriptsStaging

$webStaging = Join-Path $env:TEMP "web-evidence-provider-deploy"
if (Test-Path $webStaging) { Remove-Item $webStaging -Recurse -Force }
New-Item -ItemType Directory -Path $webStaging | Out-Null
Copy-Item -Recurse (Join-Path $webRoot "dist") (Join-Path $webStaging "dist")
Copy-Item (Join-Path $webRoot "package.json") (Join-Path $webStaging "package.json")
Copy-Item (Join-Path $webRoot ".env") (Join-Path $webStaging ".env") -ErrorAction SilentlyContinue

Write-Host "Uploading gateway to ${RemoteHost}:${GatewayRuntime} ..."
ssh $RemoteHost "mkdir -p $GatewayRuntime/.backups && cp -a $GatewayRuntime/dist $GatewayRuntime/.backups/dist-`$(date +%Y%m%d%H%M%S) 2>/dev/null || true"
scp -r "$staging/dist" "${RemoteHost}:${GatewayRuntime}/"
scp -r "$staging/config" "${RemoteHost}:${GatewayRuntime}/"
scp -r "$staging/scripts" "${RemoteHost}:${GatewayRuntime}/"

Write-Host "Uploading web-evidence-provider to ${RemoteHost}:${WebRuntime} ..."
ssh $RemoteHost "sudo mkdir -p $WebRuntime && sudo chown ubuntu:ubuntu $WebRuntime"
scp -r "$webStaging/dist" "${RemoteHost}:${WebRuntime}/"
scp "$webStaging/package.json" "${RemoteHost}:${WebRuntime}/"
if (Test-Path "$webStaging/.env") {
  scp "$webStaging/.env" "${RemoteHost}:${WebRuntime}/.env"
}
ssh $RemoteHost "cd $WebRuntime && npm install --omit=dev 2>/dev/null || pnpm install --prod 2>/dev/null || true"

Write-Host "Patching gateway .env for web search URL (idempotent)..."
ssh $RemoteHost "grep -q '^DATABASE_EVIDENCE_WEB_SEARCH_URL=' $GatewayRuntime/.env 2>/dev/null && sed -i 's|^DATABASE_EVIDENCE_WEB_SEARCH_URL=.*|DATABASE_EVIDENCE_WEB_SEARCH_URL=http://127.0.0.1:19091/search|' $GatewayRuntime/.env || echo 'DATABASE_EVIDENCE_WEB_SEARCH_URL=http://127.0.0.1:19091/search' >> $GatewayRuntime/.env"

Write-Host "Installing web-evidence-provider systemd unit..."
$unit = @"
[Unit]
Description=Web Evidence Provider (Tavily)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$WebRuntime
EnvironmentFile=$WebRuntime/.env
ExecStart=/usr/bin/node $WebRuntime/dist/index.js
Restart=always
RestartSec=5
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
"@
$unit | ssh $RemoteHost "sudo tee /etc/systemd/system/web-evidence-provider.service > /dev/null"
ssh $RemoteHost "sudo systemctl daemon-reload && sudo systemctl enable web-evidence-provider && sudo systemctl restart web-evidence-provider"
ssh $RemoteHost "test -f $ComposeRoot/docker-compose.yml && cd $ComposeRoot && sudo -n docker compose up -d --force-recreate database-gateway"

Write-Host "Smoke on server..."
$smoke = @'
set -eu
curl -sS http://127.0.0.1:19091/health
echo
sudo -n docker exec contentmrs-docker-database-gateway-1 sh -lc '
  set -eu
  node scripts/smoke-gateway-readiness.mjs
  DATABASE_OPENLIST_EXPECT_MOUNT=/cos-myblog-media node scripts/smoke-openlist.mjs
'
echo
'@
$smoke = $smoke -replace "`r`n", "`n"
$smoke | ssh $RemoteHost "tr -d '\r' | bash -s"

Write-Host "Deploy finished."
