param(
  [Parameter(Mandatory=$true, Position=0)]
  [ValidateSet("status", "probe", "search", "recall", "refresh")]
  [string]$Command,

  [string]$Query,
  [int]$Limit = 5,
  [switch]$DryRun,
  [switch]$Json,

  [string]$DataBaseRoot = $env:DATABASE_MEMORY_REPO_ROOT,
  [string]$ExperienceRoot = $env:DATABASE_MEMORY_EXPERIENCE_ROOT,
  [string]$QmdRoot = $env:DATABASE_MEMORY_QMD_ROOT,
  [string]$QmdIndexPath = $env:DATABASE_MEMORY_QMD_INDEX_PATH
)

$ErrorActionPreference = "Stop"

if (-not $DataBaseRoot) {
  $DataBaseRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
}
$DataBaseRoot = [string](Resolve-Path $DataBaseRoot)

if (-not $ExperienceRoot) {
  $ExperienceRoot = Join-Path $DataBaseRoot "services\experience-manager"
}
$ExperienceRoot = [string](Resolve-Path $ExperienceRoot)

if (-not $QmdRoot) {
  $QmdRoot = "E:\My Project\my-project-qmd"
}
$QmdRoot = [string](Resolve-Path $QmdRoot)

if ($QmdIndexPath) {
  $env:EXPERIENCE_QMD_INDEX_PATH = $QmdIndexPath
  $env:INDEX_PATH = $QmdIndexPath
}

$env:EXPERIENCE_QMD_ROOT = $QmdRoot
$env:QMD_EXPERIENCE_COLLECTION_DIR = Join-Path $QmdRoot "collections\experience-manager"
$QmdCliArgs = @("exec", "tsx", "src/cli/qmd.ts")

function Invoke-At {
  param(
    [string]$WorkingDirectory,
    [string]$FilePath,
    [string[]]$Arguments
  )

  Push-Location $WorkingDirectory
  try {
    & $FilePath @Arguments
  } finally {
    Pop-Location
  }
}

function Write-ServiceEnvelope {
  param(
    [string]$Action,
    [hashtable]$Data
  )

  if ($Json) {
    [ordered]@{
      service = "DataBase Memory Service"
      action = $Action
      data = $Data
    } | ConvertTo-Json -Depth 8
  } else {
    Write-Output "DataBase Memory Service :: $Action"
    foreach ($key in $Data.Keys) {
      Write-Output ("{0}: {1}" -f $key, $Data[$key])
    }
  }
}

switch ($Command) {
  "status" {
    Invoke-At -WorkingDirectory $ExperienceRoot -FilePath "npm" -Arguments @("run", "health:local")
    Invoke-At -WorkingDirectory $QmdRoot -FilePath "pnpm" -Arguments ($QmdCliArgs + @("status"))
    break
  }

  "probe" {
    Invoke-At -WorkingDirectory $ExperienceRoot -FilePath "npm" -Arguments @("run", "probe:readonly:local")
    break
  }

  "search" {
    if (-not $Query) {
      throw "database-memory search requires -Query"
    }
    Invoke-At -WorkingDirectory $QmdRoot -FilePath "pnpm" -Arguments ($QmdCliArgs + @("search", $Query, "-c", "experience-manager", "-n", [string]$Limit, "--json"))
    break
  }

  "recall" {
    if (-not $Query) {
      throw "database-memory recall requires -Query"
    }
    $env:QMD_VSEARCH_EXPAND = "false"
    Invoke-At -WorkingDirectory $QmdRoot -FilePath "pnpm" -Arguments ($QmdCliArgs + @("vsearch", $Query, "-c", "experience-manager", "-n", [string]$Limit, "--json"))
    break
  }

  "refresh" {
    $previousLimit = $env:EXPERIENCE_QMD_SYNC_LIMIT
    $env:EXPERIENCE_QMD_SYNC_LIMIT = [string]$Limit
    try {
      if ($DryRun) {
        Invoke-At -WorkingDirectory $ExperienceRoot -FilePath "npm" -Arguments @("run", "sync:qmd:dry:local")
      } else {
        Invoke-At -WorkingDirectory $ExperienceRoot -FilePath "npm" -Arguments @("run", "sync:qmd:local")
        Invoke-At -WorkingDirectory $QmdRoot -FilePath "pnpm" -Arguments ($QmdCliArgs + @("update"))
      }
    } finally {
      $env:EXPERIENCE_QMD_SYNC_LIMIT = $previousLimit
    }
    break
  }
}
