param(
  [Parameter(Position = 0)]
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path -LiteralPath $Root).Path
$failures = New-Object System.Collections.Generic.List[string]

function Test-RequiredPath {
  param([string]$RelativePath)
  if (-not (Test-Path -LiteralPath (Join-Path $rootPath $RelativePath))) {
    $failures.Add("missing:$RelativePath")
  }
}

function Test-ForbiddenPath {
  param([string]$RelativePath)
  $absolutePath = Join-Path $rootPath $RelativePath
  if ((Test-Path -LiteralPath $absolutePath) -and (Get-ChildItem -LiteralPath $absolutePath -Recurse -Force -File -ErrorAction SilentlyContinue | Select-Object -First 1)) {
    $failures.Add("forbidden:$RelativePath")
  }
}

$required = @(
  "README.md",
  "project.json",
  "package.json",
  "pnpm-workspace.yaml",
  "server.mjs",
  "product\novel\README.md",
  "product\novel\package.json",
  "product\novel\tsconfig.json",
  "product\novel\app\article\context-engine.ts",
  "product\novel\tools\evidence-pack-smoke.mjs",
  "product\novel\tools\generate-article-mvp.mjs",
  "vendor\database-artifacts\database-artifacts.manifest.json",
  "vendor\database-artifacts\emptyinkpot-database-gateway-generated-client-0.1.0.tgz"
)

foreach ($path in $required) {
  Test-RequiredPath $path
}

$forbidden = @(
  "apps",
  "docs",
  "infrastructure",
  "shared",
  "interfaces",
  "services",
  "gateway.mjs",
  "plugins",
  "skills",
  "product\README.md",
  "product\novel\core",
  "product\novel\config",
  "product\novel\frontend",
  "product\novel\integrations",
  "product\novel\tests",
  "product\novel\evals",
  "product\novel\index.ts",
  "product\novel\module.json",
  "product\novel\module.topology.json",
  "product\novel\app\index.ts",
  "product\novel\app\routes",
  "product\novel\app\services",
  "product\novel\app\runtime-job-store.ts",
  "product\novel\app\article\runtime.ts",
  "product\novel\app\article\pressure-runtime.ts",
  "product\novel\app\article\syntax-reviewer.ts",
  "product\novel\app\article\style-profile-guard.ts",
  "product\novel\app\article\topic-preset.ts",
  "product\novel\app\article\category-register.ts",
  "vendor\database-artifacts\emptyinkpot-database-content-contracts-0.1.0.tgz",
  "vendor\database-artifacts\emptyinkpot-database-creative-contracts-0.1.0.tgz",
  "vendor\database-artifacts\emptyinkpot-database-semantic-contracts-0.1.0.tgz"
)

foreach ($path in $forbidden) {
  Test-ForbiddenPath $path
}

$allowedNovelFiles = @(
  "README.md",
  "package.json",
  "tsconfig.json",
  "app/article/context-engine.ts",
  "tools/evidence-pack-smoke.mjs",
  "tools/generate-article-mvp.mjs"
)

$novelRoot = Join-Path $rootPath "product\novel"
if (Test-Path -LiteralPath $novelRoot) {
  Get-ChildItem -LiteralPath $novelRoot -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($novelRoot.Length + 1).Replace("\", "/")
    if ($relative -match "^(dist|node_modules)/") {
      return
    }
    if ($allowedNovelFiles -notcontains $relative) {
      $failures.Add("forbidden-novel-file:$relative")
    }
  }
}

$projectJsonPath = Join-Path $rootPath "project.json"
if (Test-Path -LiteralPath $projectJsonPath) {
  $project = Get-Content -Raw -LiteralPath $projectJsonPath | ConvertFrom-Json
  if ($project.localSourceRoot -ne $rootPath) {
    $failures.Add("project.localSourceRoot")
  }
  if ($project.PSObject.Properties.Name -contains "capabilityRoots") {
    $failures.Add("project.capabilityRoots")
  }
}

$artifactManifestPath = Join-Path $rootPath "vendor\database-artifacts\database-artifacts.manifest.json"
if (Test-Path -LiteralPath $artifactManifestPath) {
  $artifactManifest = Get-Content -Raw -LiteralPath $artifactManifestPath | ConvertFrom-Json
  $packageNames = @($artifactManifest.packages | ForEach-Object { $_.name })
  if ($packageNames.Count -ne 1 -or $packageNames[0] -ne "@emptyinkpot/database-gateway-generated-client") {
    $failures.Add("database-artifact-manifest.packages")
  }
}

$livePaths = @("server.mjs", "product\novel\app\article", "product\novel\tools")
$forbiddenPatterns = "StylePack|stylePack|materialScreening|runtime\.jobs|readback|rewrite|polish|revision loop|notebook|topic-corpus|category-register|isWeakRealityMaterial|semantic/literary/experience side packs"
foreach ($path in $livePaths) {
  $absolute = Join-Path $rootPath $path
  if (-not (Test-Path -LiteralPath $absolute)) {
    continue
  }
  rg -n $forbiddenPatterns $absolute -S | ForEach-Object {
    $failures.Add("forbidden-live-pattern:$_")
  }
}

if ($failures.Count -gt 0) {
  Write-Host "product structure check failed"
  $failures | Sort-Object -Unique | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host "product structure check ok"
