param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("start-seaweedfs", "stop-seaweedfs", "status", "configure-rclone-seaweedfs")]
  [string]$Command
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$composeFile = Join-Path $repoRoot "scripts\ops\object-storage-lab\docker-compose.seaweedfs.yml"
$labRoot = Join-Path $repoRoot ".runtime\object-storage-lab\seaweedfs"
$rcloneConfig = Join-Path $repoRoot ".runtime\object-storage-lab\rclone.conf"

function Require-Docker {
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $docker) {
    throw "docker command not found"
  }

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not reachable. Start Docker Desktop or Docker Engine, then retry."
  }
}

function Require-Rclone {
  $rclone = Get-Command rclone -ErrorAction SilentlyContinue
  if (-not $rclone) {
    throw "rclone command not found. Install rclone before configuring benchmark remotes."
  }
}

function Start-SeaweedFs {
  Require-Docker
  New-Item -ItemType Directory -Force -Path $labRoot | Out-Null
  docker compose -f $composeFile up -d
}

function Stop-SeaweedFs {
  Require-Docker
  docker compose -f $composeFile down
}

function Show-Status {
  Require-Docker
  docker compose -f $composeFile ps
}

function Configure-RcloneSeaweedFs {
  Require-Rclone
  $accessKey = $env:DATABASE_OBJECT_LAB_S3_ACCESS_KEY
  $secretKey = $env:DATABASE_OBJECT_LAB_S3_SECRET_KEY
  if (-not $accessKey -or -not $secretKey) {
    throw "DATABASE_OBJECT_LAB_S3_ACCESS_KEY and DATABASE_OBJECT_LAB_S3_SECRET_KEY are required"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $rcloneConfig) | Out-Null

  $content = @"
[seaweedfs-lab]
type = s3
provider = Other
access_key_id = $accessKey
secret_access_key = $secretKey
endpoint = http://127.0.0.1:8333
acl = private
no_check_bucket = true
"@

  Set-Content -LiteralPath $rcloneConfig -Value $content -Encoding UTF8
  Write-Host "wrote local rclone config: $rcloneConfig"
  Write-Host "Use with:"
  Write-Host "`$env:RCLONE_CONFIG='$rcloneConfig'"
  Write-Host ".\scripts\storage\object-storage-benchmark.ps1 benchmark -Backend seaweedfs-lab -Bucket database-lab-artifacts"
}

switch ($Command) {
  "start-seaweedfs" {
    Start-SeaweedFs
    break
  }
  "stop-seaweedfs" {
    Stop-SeaweedFs
    break
  }
  "status" {
    Show-Status
    break
  }
  "configure-rclone-seaweedfs" {
    Configure-RcloneSeaweedFs
    break
  }
}
