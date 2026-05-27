param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Root
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$schemaPath = Join-Path $repoRoot "packages\schemas\project\creation-standard.schema.json"
$manifestSchemaPath = Join-Path $repoRoot "packages\schemas\project\project-manifest.schema.json"
$standardDocPath = Join-Path $repoRoot "docs\contracts\project-creation-standard.md"

$requiredFiles = @(
  "README.md",
  "project.json",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md"
)

$requiredDirs = @(
  "docs",
  "packages",
  "apps",
  "services",
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
  if (-not $project.readOrder -or $project.readOrder.Count -lt 4) {
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
    $missing += "packages/schemas/project/project-manifest.schema.json"
  }
}

if (-not (Test-Path -LiteralPath $schemaPath)) {
  $missing += "packages/schemas/project/creation-standard.schema.json"
}
if (-not (Test-Path -LiteralPath $standardDocPath)) {
  $missing += "docs/contracts/project-creation-standard.md"
}

if ($missing.Count -gt 0) {
  Write-Host "project standard check failed"
  $missing | Sort-Object -Unique | ForEach-Object { Write-Host "missing: $_" }
  exit 1
}

Write-Host "project standard check ok"
