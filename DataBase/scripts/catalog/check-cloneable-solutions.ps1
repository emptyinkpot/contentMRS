param(
  [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$registryPath = Join-Path $repoRoot "catalog\ecosystem\cloneable-solutions.json"

if (-not (Test-Path $registryPath)) {
  throw "Missing cloneable solutions registry: $registryPath"
}

$registry = Get-Content -Raw -Path $registryPath | ConvertFrom-Json
$results = @()

foreach ($solution in @($registry.solutions)) {
  foreach ($path in @($solution.databasePlacement)) {
    $relativePath = [string]$path
    $fullPath = Join-Path $repoRoot $relativePath.TrimEnd("/")
    $exists = Test-Path $fullPath
    $results += [pscustomobject]@{
      solution = $solution.id
      layer = $solution.layer
      status = $solution.status
      placement = $relativePath
      exists = $exists
    }
  }
}

if ($Json) {
  $results | ConvertTo-Json -Depth 5
  exit
}

$results | Sort-Object solution, placement | Format-Table -AutoSize

$missing = @($results | Where-Object { -not $_.exists })
if ($missing.Count -gt 0) {
  throw "Missing cloneable solution placement paths: $($missing.Count)"
}
