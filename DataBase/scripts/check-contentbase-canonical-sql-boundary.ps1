param(
  [string]$ContentBaseRoot = "E:\My Project\ContentBase",
  [string[]]$GuardedTables,
  [switch]$ReportAll
)

$ErrorActionPreference = "Stop"

$scriptPath = $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path (Split-Path -Parent $scriptPath) "..")).Path
$target = Join-Path $repoRoot "scripts\boundary\check-contentbase-canonical-sql-boundary.ps1"

if (-not (Test-Path -LiteralPath $target)) {
  throw "missing canonical boundary script: $target"
}

$arguments = @{
  ContentBaseRoot = $ContentBaseRoot
}
if ($PSBoundParameters.ContainsKey("GuardedTables")) {
  $arguments.GuardedTables = $GuardedTables
}
if ($ReportAll) {
  $arguments.ReportAll = $true
}

& $target @arguments
exit $LASTEXITCODE
