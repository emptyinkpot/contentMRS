# Deploy ContentBase runtime to server-124 (/srv/contentbase).
param(
  [string]$RemoteHost = "ubuntu@124.220.233.126",
  [string]$RuntimeRoot = "/srv/contentbase",
  [int]$Port = 5111,
  [switch]$UseSystemd
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$releaseId = "reality-runtime-$(Get-Date -Format 'yyyyMMddHHmm')"
$remoteRelease = "$RuntimeRoot/releases/$releaseId"
$staging = Join-Path $env:TEMP "contentbase-deploy-$releaseId"

Write-Host "Packaging ContentBase release $releaseId ..."
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

$copyItems = @(
  "server.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "project.json",
  "README.md",
  "ops",
  "product",
  "vendor",
  "scripts"
)
foreach ($item in $copyItems) {
  $source = Join-Path $repoRoot $item
  if (-not (Test-Path $source)) { continue }
  $destination = Join-Path $staging $item
  if (Test-Path $destination) { Remove-Item $destination -Recurse -Force }
  if ((Get-Item $source).PSIsContainer) {
    & robocopy $source $destination /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP `
      /XD node_modules .git .runtime .next dist _artifacts .artifacts .pnpm-store `
      | Out-Null
    if ($LASTEXITCODE -ge 8) {
      throw "robocopy failed for $item with exit code $LASTEXITCODE"
    }
  } else {
    Copy-Item -Path $source -Destination $destination -Force
  }
}

$tgzLocal = Join-Path $env:TEMP "contentbase-deploy-$releaseId.tgz"
if (Test-Path $tgzLocal) { Remove-Item $tgzLocal -Force }
Push-Location $staging
tar -czf $tgzLocal .
Pop-Location

Write-Host "Uploading to ${RemoteHost}:${remoteRelease} ..."
ssh $RemoteHost "mkdir -p $remoteRelease $RuntimeRoot/.backups"
scp $tgzLocal "${RemoteHost}:${remoteRelease}/contentbase-deploy.tgz"

$remoteCommands = @(
  "cd $remoteRelease && tar -xzf contentbase-deploy.tgz && rm -f contentbase-deploy.tgz",
  "cd $remoteRelease && export CI=1 && (command -v pnpm >/dev/null 2>&1 && pnpm install --frozen-lockfile || npm install)",
  "cd $remoteRelease && export CI=1 && npm run ci",
  "ln -sfn $remoteRelease $RuntimeRoot/current",
  "PID=`$(pgrep -f 'server.mjs --port $Port' | head -1); if [ -n `"`$PID`" ]; then kill `$PID; sleep 2; fi"
)
if ($UseSystemd) {
  $remoteCommands += @(
    "sudo install -m 0644 $RuntimeRoot/current/ops/contentbase.service /etc/systemd/system/contentbase.service",
    "sudo systemctl daemon-reload",
    "sudo systemctl enable contentbase >/dev/null",
    "sudo systemctl restart contentbase",
    "sleep 8",
    "systemctl is-active contentbase",
    "curl -fsS http://127.0.0.1:$Port/api/health | head -c 200; echo"
  )
} else {
  $remoteCommands += @(
    "mkdir -p $RuntimeRoot/logs",
    "cd $RuntimeRoot/current && nohup node server.mjs --port $Port > $RuntimeRoot/logs/contentbase-runtime.log 2>&1 &",
    "sleep 3 && curl -fsS http://127.0.0.1:$Port/api/health | head -c 200 && echo && echo DEPLOY_OK"
  )
}
foreach ($command in $remoteCommands) {
  ssh $RemoteHost $command
}
Write-Host "Deploy finished. Release: $releaseId"
