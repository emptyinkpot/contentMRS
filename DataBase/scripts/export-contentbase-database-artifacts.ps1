param(
  [string]$OutputRoot = "E:\My Project\ContentBase\vendor\database-artifacts"
)

$ErrorActionPreference = "Stop"

$scriptPath = $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path (Split-Path -Parent $scriptPath) "..")).Path
$target = Join-Path $repoRoot "scripts\boundary\export-contentbase-database-artifacts.ps1"

if (-not (Test-Path -LiteralPath $target)) {
  throw "missing canonical boundary script: $target"
}

# 根脚本只是稳定入口；正式打包逻辑只在 boundary 脚本里维护，避免导出流程分叉。
& $target -OutputRoot $OutputRoot
exit $LASTEXITCODE
