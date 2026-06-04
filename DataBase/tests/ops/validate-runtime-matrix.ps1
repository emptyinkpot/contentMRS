param(
  [string]$SshTarget = "server-124",
  [string]$RainYunSshpass = $env:RAINYUN_SSHPASS,
  [string]$RainYunHost = "10.100.0.2",
  [string]$RagflowBackupPath = "/srv/backups/ragflow/20260604-162629-cold"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$openListAdapterRoot = Join-Path $repoRoot "services\openlist-adapter"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Block
  )

  $started = Get-Date
  try {
    $output = & $Block 2>&1
    [ordered]@{
      name = $Name
      ok = $true
      elapsedMs = [int]((Get-Date) - $started).TotalMilliseconds
      output = ($output -join "`n")
    }
  } catch {
    [ordered]@{
      name = $Name
      ok = $false
      elapsedMs = [int]((Get-Date) - $started).TotalMilliseconds
      output = ($_ | Out-String).Trim()
    }
  }
}

function Invoke-Ssh {
  param([Parameter(Mandatory = $true)][string]$Command)
  ssh $SshTarget $Command
}

function Invoke-SshScript {
  param([Parameter(Mandatory = $true)][string]$Script)
  $normalized = $Script -replace "`r`n", "`n"
  $normalized | ssh $SshTarget "tr -d '\r' | bash -s"
}

$steps = @()

$steps += Invoke-Step "gateway-health" {
  Invoke-Ssh "curl -sS --max-time 10 http://127.0.0.1:18090/health"
}

$steps += Invoke-Step "gateway-openlist-smoke" {
  Invoke-Ssh "sudo -n docker exec contentmrs-docker-database-gateway-1 sh -lc 'DATABASE_OPENLIST_EXPECT_MOUNT=/cos-myblog-media node scripts/smoke-openlist.mjs'"
}

$steps += Invoke-Step "openlist-adapter-smoke" {
  Push-Location $openListAdapterRoot
  try {
    npm run smoke
  } finally {
    Pop-Location
  }
}

$steps += Invoke-Step "openlist-cos-list" {
  Invoke-SshScript @'
set -eu
TOKEN=$(sudo -n docker exec openlist sh -lc './openlist admin token --data /opt/openlist/data --config /opt/openlist/data/config.json' 2>/dev/null | sed -n 's/^Admin token: //p')
curl -sS --max-time 20 \
  -H "Authorization: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"path":"/cos-myblog-media","page":1,"per_page":20,"refresh":false}' \
  http://127.0.0.1:5244/api/fs/list
'@
}

$steps += Invoke-Step "rainyun-ragflow-backup-sha256" {
  if (-not $RainYunSshpass) {
    throw "RainYunSshpass or RAINYUN_SSHPASS is required for RainYun backup verification"
  }
  Invoke-Ssh "export SSHPASS='$RainYunSshpass'; sshpass -e ssh -o StrictHostKeyChecking=no root@$RainYunHost 'cd $RagflowBackupPath && sha256sum -c SHA256SUMS'"
}

$failed = @($steps | Where-Object { -not $_.ok })
$summary = [ordered]@{
  ok = $failed.Count -eq 0
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  steps = $steps
}

$summary | ConvertTo-Json -Depth 8

if ($failed.Count -gt 0) {
  exit 1
}
