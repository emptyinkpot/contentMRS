param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Root
)

$ErrorActionPreference = "Stop"

$manifestSchemaPath = Join-Path $PSScriptRoot "..\schemas\project\project-manifest.schema.json"

$requiredFiles = @(
  "README.md",
  "project.json"
)

$requiredDirs = @(
  "schemas",
  "scripts"
)

$rootPath = Resolve-Path -LiteralPath $Root
$missing = @()

foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $rootPath $file))) {
    $missing += $file
  }
}

foreach ($dir in $requiredDirs) {
  if (-not (Test-Path -LiteralPath (Join-Path $rootPath $dir))) {
    $missing += "$dir/"
  }
}

$projectJsonPath = Join-Path $rootPath "project.json"
if (Test-Path -LiteralPath $projectJsonPath) {
  $project = Get-Content -Raw -LiteralPath $projectJsonPath | ConvertFrom-Json
  if (-not $project.name -or -not $project.projectName -or -not $project.canonicalDoc -or -not $project.machineReadableEntry) {
    $missing += "project.json.identity"
  }
  if (
    -not $project.readOrder -or
    $project.readOrder.Count -lt 2 -or
    $project.readOrder[0] -ne "README.md" -or
    $project.readOrder[1] -ne "project.json"
  ) {
    $missing += "project.json.readOrder"
  }
  if (-not $project.visibility -or -not $project.type -or -not $project.status -or -not $project.canonicalPurpose) {
    $missing += "project.json.coreFields"
  }
  if ($project.canonicalDoc -ne "README.md" -or $project.machineReadableEntry -ne "project.json") {
    $missing += "project.json.canonicalPointers"
  }
  if ($project.type -eq "project" -and -not $project.owner) {
    $missing += "project.json.owner"
  }
  if (Test-Path -LiteralPath $manifestSchemaPath) {
    $python = (Get-Command python).Source
    & $python (Join-Path $PSScriptRoot "validate-project-manifest.py") $manifestSchemaPath $projectJsonPath
    if ($LASTEXITCODE -ne 0) {
      $missing += "project.json.schemaValidation"
    }
  } else {
    $missing += "schemas/project/project-manifest.schema.json"
  }
}

if ($missing.Count -gt 0) {
  Write-Host "project standard check failed"
  $missing | Sort-Object -Unique | ForEach-Object { Write-Host "missing: $_" }
  exit 1
}

Write-Host "project standard check ok"
