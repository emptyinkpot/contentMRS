param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("plan", "check-tools", "benchmark", "benchmark-remote")]
  [string]$Command,

  [string]$Backend,
  [string]$Bucket = "database-lab-artifacts",
  [string]$SshTarget = "server-124",
  [string]$RemoteRcloneConfig = "/srv/database-object-store/seaweedfs/rclone.conf",
  [int]$SmallFileCount = 100,
  [int]$SmallFileSizeKb = 4,
  [int]$MediumFileCount = 10,
  [int]$MediumFileSizeKb = 512,
  [int]$LargeFileCount = 1,
  [int]$LargeFileSizeMb = 16,
  [switch]$KeepWorkDir
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$benchmarkRoot = Join-Path $repoRoot "evidence\inventories\object-storage\benchmarks"
$runbookPath = Join-Path $repoRoot "docs\operations\object-storage-benchmark.md"

function Show-Plan {
  Write-Host "Object storage benchmark plan"
  Write-Host "Runbook: $runbookPath"
  Write-Host ""
  Write-Host "1. Configure candidate S3-compatible backends in rclone outside this repo."
  Write-Host "2. Run: .\scripts\storage\object-storage-benchmark.ps1 check-tools"
  Write-Host "3. Run: .\scripts\storage\object-storage-benchmark.ps1 benchmark -Backend <rclone-remote-name> -Bucket database-lab-artifacts"
  Write-Host "4. Review JSON reports under evidence\inventories\object-storage\benchmarks."
  Write-Host "5. Promote only after rclone check, OpenList mount, backup, and restore evidence exists."
}

function Require-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [switch]$Optional
  )

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) {
    return [ordered]@{
      name = $Name
      found = $true
      path = $cmd.Source
      optional = [bool]$Optional
    }
  }

  if (-not $Optional) {
    return [ordered]@{
      name = $Name
      found = $false
      path = $null
      optional = $false
    }
  }

  return [ordered]@{
    name = $Name
    found = $false
    path = $null
    optional = $true
  }
}

function Check-Tools {
  $tools = @(
    (Require-Command -Name "rclone"),
    (Require-Command -Name "restic" -Optional)
  )

  $tools | ForEach-Object {
    if ($_.found) {
      Write-Host "$($_.name): $($_.path)"
    } elseif ($_.optional) {
      Write-Host "$($_.name): missing (optional)"
    } else {
      Write-Host "$($_.name): missing"
    }
  }

  $missingRequired = $tools | Where-Object { -not $_.found -and -not $_.optional }
  if ($missingRequired.Count -gt 0) {
    throw "Missing required tool(s): $($missingRequired.name -join ', ')"
  }

  return $tools
}

function Write-BinaryFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [int]$Bytes
  )

  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($buffer)
    [System.IO.File]::WriteAllBytes($Path, $buffer)
  } finally {
    $rng.Dispose()
  }
}

function New-BenchmarkCorpus {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  $smallDir = Join-Path $Root "many-small-files"
  $mediumDir = Join-Path $Root "medium-assets"
  $largeDir = Join-Path $Root "large-archives"
  New-Item -ItemType Directory -Force -Path $smallDir, $mediumDir, $largeDir | Out-Null

  for ($i = 1; $i -le $SmallFileCount; $i++) {
    $path = Join-Path $smallDir ("small-{0:D5}.bin" -f $i)
    Write-BinaryFile -Path $path -Bytes ($SmallFileSizeKb * 1024)
  }

  for ($i = 1; $i -le $MediumFileCount; $i++) {
    $path = Join-Path $mediumDir ("medium-{0:D4}.bin" -f $i)
    Write-BinaryFile -Path $path -Bytes ($MediumFileSizeKb * 1024)
  }

  for ($i = 1; $i -le $LargeFileCount; $i++) {
    $path = Join-Path $largeDir ("large-{0:D3}.bin" -f $i)
    Write-BinaryFile -Path $path -Bytes ($LargeFileSizeMb * 1024 * 1024)
  }
}

function Invoke-TimedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Step,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Block
  )

  $started = Get-Date
  $success = $true
  $output = @()

  try {
    $output = & $Block 2>&1
  } catch {
    $success = $false
    $output += $_.Exception.Message
  }

  $ended = Get-Date
  return [ordered]@{
    step = $Step
    success = $success
    started_at = $started.ToUniversalTime().ToString("o")
    ended_at = $ended.ToUniversalTime().ToString("o")
    duration_ms = [int][Math]::Round(($ended - $started).TotalMilliseconds)
    output = @($output | ForEach-Object { $_.ToString() })
  }
}

function Run-Benchmark {
  if (-not $Backend) {
    throw "benchmark requires -Backend <rclone-remote-name>"
  }

  $tools = Check-Tools
  New-Item -ItemType Directory -Force -Path $benchmarkRoot | Out-Null

  $runId = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
  $workRoot = Join-Path ([System.IO.Path]::GetTempPath()) "database-object-benchmark-$runId"
  $sourceRoot = Join-Path $workRoot "source"
  $restoreRoot = Join-Path $workRoot "restore"
  New-Item -ItemType Directory -Force -Path $sourceRoot, $restoreRoot | Out-Null

  $remotePrefix = "$Backend`:$Bucket/database-benchmark/$runId"

  try {
    New-BenchmarkCorpus -Root $sourceRoot

    $sourceStats = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Measure-Object -Property Length -Sum
    $steps = @()
    $steps += Invoke-TimedCommand -Step "rclone-copy" -Block {
      rclone copy $sourceRoot $remotePrefix --checksum --transfers 8 --checkers 16 --stats 10s
    }
    $steps += Invoke-TimedCommand -Step "rclone-check" -Block {
      rclone check $sourceRoot $remotePrefix --checksum
    }
    $steps += Invoke-TimedCommand -Step "rclone-lsjson" -Block {
      rclone lsjson $remotePrefix --recursive
    }
    $steps += Invoke-TimedCommand -Step "rclone-copy-restore" -Block {
      rclone copy $remotePrefix $restoreRoot --checksum --transfers 8 --checkers 16 --stats 10s
    }
    $steps += Invoke-TimedCommand -Step "rclone-check-restore" -Block {
      rclone check $sourceRoot $restoreRoot --checksum
    }

    $report = [ordered]@{
      schema_version = 1
      run_id = $runId
      generated_at = (Get-Date).ToUniversalTime().ToString("o")
      backend = $Backend
      bucket = $Bucket
      remote_prefix = $remotePrefix
      workload = [ordered]@{
        small_file_count = $SmallFileCount
        small_file_size_kb = $SmallFileSizeKb
        medium_file_count = $MediumFileCount
        medium_file_size_kb = $MediumFileSizeKb
        large_file_count = $LargeFileCount
        large_file_size_mb = $LargeFileSizeMb
        total_files = $sourceStats.Count
        total_bytes = $sourceStats.Sum
      }
      tools = $tools
      steps = $steps
      success = -not ($steps | Where-Object { -not $_.success })
      notes = "Inventory snapshot only. Object truth remains the selected backend; rclone config and report are not truth."
    }

    $reportPath = Join-Path $benchmarkRoot "$runId-$Backend.json"
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    Write-Host "benchmark report: $reportPath"

    if (-not $report.success) {
      throw "Benchmark completed with failed step(s); see report."
    }
  } finally {
    if (-not $KeepWorkDir -and (Test-Path -LiteralPath $workRoot)) {
      Remove-Item -LiteralPath $workRoot -Recurse -Force
    } elseif ($KeepWorkDir) {
      Write-Host "kept work dir: $workRoot"
    }
  }
}

function Run-RemoteBenchmark {
  if (-not $Backend) {
    throw "benchmark-remote requires -Backend <rclone-remote-name>"
  }

  New-Item -ItemType Directory -Force -Path $benchmarkRoot | Out-Null

  $runId = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
  $remoteScriptTemplate = @'
set -euo pipefail
export RCLONE_CONFIG='__REMOTE_RCLONE_CONFIG__'
run_id='__RUN_ID__'
backend='__BACKEND__'
bucket='__BUCKET__'
source_root="/tmp/database-object-benchmark-${run_id}/source"
restore_root="/tmp/database-object-benchmark-${run_id}/restore"
remote_prefix="${backend}:${bucket}/benchmark/${run_id}"
rm -rf "/tmp/database-object-benchmark-${run_id}"
mkdir -p "$source_root/many-small-files" "$source_root/medium-assets" "$source_root/large-archives" "$restore_root"
for i in $(seq -w 1 __SMALL_FILE_COUNT__); do dd if=/dev/urandom of="$source_root/many-small-files/small-${i}.bin" bs=1024 count=__SMALL_FILE_SIZE_KB__ status=none; done
for i in $(seq -w 1 __MEDIUM_FILE_COUNT__); do dd if=/dev/urandom of="$source_root/medium-assets/medium-${i}.bin" bs=1024 count=__MEDIUM_FILE_SIZE_KB__ status=none; done
for i in $(seq -w 1 __LARGE_FILE_COUNT__); do dd if=/dev/urandom of="$source_root/large-archives/large-${i}.bin" bs=1M count=__LARGE_FILE_SIZE_MB__ status=none; done
total_files=$(find "$source_root" -type f | wc -l)
total_bytes=$(find "$source_root" -type f -printf '%s\n' | awk '{s+=$1} END {print s+0}')
run_step() {
  step="$1"
  shift
  tmp="$(mktemp)"
  start_ms=$(date +%s%3N)
  set +e
  "$@" >"$tmp" 2>&1
  code=$?
  set -e
  end_ms=$(date +%s%3N)
  duration_ms=$((end_ms-start_ms))
  output="$(tr '\n\t' '  ' <"$tmp" | cut -c1-4000)"
  rm -f "$tmp"
  printf 'step\t%s\t%s\t%s\t%s\n' "$step" "$code" "$duration_ms" "$output"
  return 0
}
run_step rclone-copy rclone copy "$source_root" "$remote_prefix" --checksum --transfers 8 --checkers 16 --stats 10s
run_step rclone-check rclone check "$source_root" "$remote_prefix" --checksum
run_step rclone-lsjson rclone lsjson "$remote_prefix" --recursive
run_step rclone-copy-restore rclone copy "$remote_prefix" "$restore_root" --checksum --transfers 8 --checkers 16 --stats 10s
run_step rclone-check-restore rclone check "$source_root" "$restore_root" --checksum
df -hT /mnt/data | tail -1 | sed 's/^/df\t/'
printf 'summary\t%s\t%s\t%s\t%s\n' "$run_id" "$remote_prefix" "$total_files" "$total_bytes"
rm -rf "/tmp/database-object-benchmark-${run_id}"
'@

  $remoteScript = $remoteScriptTemplate.
    Replace("__REMOTE_RCLONE_CONFIG__", $RemoteRcloneConfig).
    Replace("__RUN_ID__", $runId).
    Replace("__BACKEND__", $Backend).
    Replace("__BUCKET__", $Bucket).
    Replace("__SMALL_FILE_COUNT__", [string]$SmallFileCount).
    Replace("__SMALL_FILE_SIZE_KB__", [string]$SmallFileSizeKb).
    Replace("__MEDIUM_FILE_COUNT__", [string]$MediumFileCount).
    Replace("__MEDIUM_FILE_SIZE_KB__", [string]$MediumFileSizeKb).
    Replace("__LARGE_FILE_COUNT__", [string]$LargeFileCount).
    Replace("__LARGE_FILE_SIZE_MB__", [string]$LargeFileSizeMb)

  $raw = $remoteScript | ssh -o BatchMode=yes -o ConnectTimeout=8 $SshTarget "bash -s"
  $steps = @()
  $summary = $null
  $df = $null

  foreach ($line in $raw) {
    if (-not $line) { continue }
    $parts = $line -split "`t", 5
    if ($parts[0] -eq "summary") {
      $summary = $parts
      continue
    }
    if ($parts[0] -eq "df") {
      $df = $parts[1]
      continue
    }
    if ($parts[0] -eq "step" -and $parts.Count -ge 5) {
      $steps += [ordered]@{
        step = $parts[1]
        exit_code = [int]$parts[2]
        success = ([int]$parts[2] -eq 0)
        duration_ms = [int]$parts[3]
        output = $parts[4]
      }
    }
  }

  $report = [ordered]@{
    schema_version = 1
    run_id = $runId
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    mode = "remote"
    ssh_target = $SshTarget
    backend = $Backend
    bucket = $Bucket
    remote_rclone_config_surface = $RemoteRcloneConfig
    remote_prefix = if ($summary) { $summary[2] } else { $null }
    workload = [ordered]@{
      small_file_count = $SmallFileCount
      small_file_size_kb = $SmallFileSizeKb
      medium_file_count = $MediumFileCount
      medium_file_size_kb = $MediumFileSizeKb
      large_file_count = $LargeFileCount
      large_file_size_mb = $LargeFileSizeMb
      total_files = if ($summary) { [int]$summary[3] } else { $null }
      total_bytes = if ($summary) { [int64]$summary[4] } else { $null }
    }
    steps = $steps
    df_after = $df
    success = ($steps.Count -gt 0) -and -not ($steps | Where-Object { -not $_.success })
    notes = "Remote benchmark via SSH using server-local rclone config. Credential values are not stored in this report."
  }

  $reportPath = Join-Path $benchmarkRoot "$runId-$Backend-remote.json"
  $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
  Write-Host "remote benchmark report: $reportPath"

  if (-not $report.success) {
    throw "Remote benchmark completed with failed step(s); see report."
  }
}

switch ($Command) {
  "plan" {
    Show-Plan
    break
  }
  "check-tools" {
    Check-Tools | Out-Null
    break
  }
  "benchmark" {
    Run-Benchmark
    break
  }
  "benchmark-remote" {
    Run-RemoteBenchmark
    break
  }
}
