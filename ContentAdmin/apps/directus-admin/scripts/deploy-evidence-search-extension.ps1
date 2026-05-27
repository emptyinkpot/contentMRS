param(
  [string]$RemoteHost = "ubuntu@124.220.233.126",
  [string]$RemoteExtensionsRoot = "/srv/directus/extensions/evidence-search"
)

$ErrorActionPreference = "Stop"
$DirectusAdminRoot = Split-Path $PSScriptRoot -Parent
$RepoRoot = Split-Path $DirectusAdminRoot -Parent
$ExtensionRoot = Join-Path $DirectusAdminRoot "extensions\evidence-search"

Write-Host "Building evidence-search extension..."
Push-Location $RepoRoot
pnpm --filter @emptyinkpot/content-admin-database-sdk-adapter build | Out-Host
pnpm --filter directus-extension-endpoint-evidence-search build | Out-Host
Pop-Location

$Staging = Join-Path $env:TEMP "evidence-search-extension-deploy"
if (Test-Path $Staging) { Remove-Item -Recurse -Force $Staging }
New-Item -ItemType Directory -Path $Staging | Out-Null
Copy-Item (Join-Path $ExtensionRoot "package.json") $Staging
Copy-Item (Join-Path $ExtensionRoot "dist") (Join-Path $Staging "dist") -Recurse

Write-Host "Uploading to ${RemoteHost}:${RemoteExtensionsRoot} ..."
ssh $RemoteHost "mkdir -p $RemoteExtensionsRoot"
scp -r "$Staging/*" "${RemoteHost}:${RemoteExtensionsRoot}/"

Write-Host "Restarting Directus..."
ssh $RemoteHost "sudo docker restart database-directus"
Write-Host "Done. Verify: curl -sS http://127.0.0.1:8055/evidence-search/sources?limit=1"
