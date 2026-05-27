param(
  [string]$OutputRoot = "E:\My Project\ContentBase\vendor\database-artifacts"
)

$ErrorActionPreference = "Stop"

$scriptPath = $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path (Split-Path -Parent $scriptPath) "..\..")).Path
$outputPath = if ([System.IO.Path]::IsPathRooted($OutputRoot)) {
  $OutputRoot
} else {
  Join-Path $repoRoot $OutputRoot
}

$packages = @(
  @{
    name = "@emptyinkpot/database-content-contracts"
    path = "packages\schemas\content"
  },
  @{
    name = "@emptyinkpot/database-creative-contracts"
    path = "packages\schemas\creative"
  },
  @{
    name = "@emptyinkpot/database-semantic-contracts"
    path = "packages\schemas\semantic"
  },
  @{
    name = "@emptyinkpot/database-gateway-generated-client"
    path = "packages\database-client"
  }
)

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments,
    [string]$WorkingDirectory
  )

  Write-Host "> $Command $($Arguments -join ' ')"
  Push-Location -LiteralPath $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "command failed: $Command $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

function Read-PackageJson {
  param([string]$PackageRoot)
  $packageJsonPath = Join-Path $PackageRoot "package.json"
  if (-not (Test-Path -LiteralPath $packageJsonPath)) {
    throw "missing package.json: $packageJsonPath"
  }
  Get-Content -Raw -LiteralPath $packageJsonPath | ConvertFrom-Json
}

function ConvertTo-RepoRelativePath {
  param([string]$Path)
  $resolved = (Resolve-Path -LiteralPath $Path).Path
  if (-not $resolved.StartsWith($repoRoot)) {
    throw "path is outside DataBase repo: $resolved"
  }
  $resolved.Substring($repoRoot.Length).TrimStart("\", "/") -replace "\\", "/"
}

function Materialize-Files {
  param([string]$Root)

  if (-not (Test-Path -LiteralPath $Root)) {
    return
  }

  $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
  if (-not $resolvedRoot.StartsWith($repoRoot)) {
    throw "materialize root is outside DataBase repo: $resolvedRoot"
  }

  # npm pack 会保留硬链接；消费者用 pnpm 解包后可能得到空文件，所以打包前把构建产物全部实体化。
  foreach ($file in (Get-ChildItem -LiteralPath $resolvedRoot -Recurse -File)) {
    $tempPath = "$($file.FullName).materialized"
    Copy-Item -LiteralPath $file.FullName -Destination $tempPath -Force
    Remove-Item -LiteralPath $file.FullName -Force
    Move-Item -LiteralPath $tempPath -Destination $file.FullName -Force
  }
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

Invoke-Checked npm @("run", "typecheck") (Join-Path $repoRoot "packages\schemas\content")
Invoke-Checked npm @("run", "build") (Join-Path $repoRoot "packages\schemas\content")
Invoke-Checked npm @("run", "typecheck") (Join-Path $repoRoot "packages\schemas\creative")
Invoke-Checked npm @("run", "build") (Join-Path $repoRoot "packages\schemas\creative")
Invoke-Checked npm @("run", "typecheck") (Join-Path $repoRoot "packages\schemas\semantic")
Invoke-Checked npm @("run", "build") (Join-Path $repoRoot "packages\schemas\semantic")
Invoke-Checked npm @("run", "generate:openapi") (Join-Path $repoRoot "apps\gateway")
Invoke-Checked npm @("run", "generate:client") (Join-Path $repoRoot "apps\gateway")
Invoke-Checked npm @("run", "build") (Join-Path $repoRoot "packages\database-client")
Materialize-Files (Join-Path $repoRoot "packages\database-client\dist")

$artifactRecords = @()
foreach ($package in $packages) {
  $packageRoot = Join-Path $repoRoot $package.path
  $packageJson = Read-PackageJson $packageRoot
  if ($packageJson.name -ne $package.name) {
    throw "unexpected package name at $($package.path): $($packageJson.name)"
  }

  $expectedFileName = (($packageJson.name -replace "^@", "") -replace "/", "-") + "-$($packageJson.version).tgz"
  $targetPath = Join-Path $outputPath $expectedFileName
  if (Test-Path -LiteralPath $targetPath) {
    Remove-Item -LiteralPath $targetPath -Force
  }

  Invoke-Checked npm @("pack", "--pack-destination", $outputPath, "--ignore-scripts") $packageRoot
  if (-not (Test-Path -LiteralPath $targetPath)) {
    throw "expected artifact was not created: $targetPath"
  }

  $item = Get-Item -LiteralPath $targetPath
  $hash = Get-FileHash -LiteralPath $targetPath -Algorithm SHA256
  $artifactRecords += [ordered]@{
    name = $packageJson.name
    version = $packageJson.version
    file = $item.Name
    sha256 = $hash.Hash.ToLowerInvariant()
    bytes = $item.Length
    sourcePath = ConvertTo-RepoRelativePath $packageRoot
  }
}

$commit = (& git -C $repoRoot rev-parse HEAD).Trim()
$dirtyFiles = @(& git -C $repoRoot status --short)
$manifest = [ordered]@{
  schemaVersion = 1
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  producer = [ordered]@{
    repository = "emptyinkpot/DataBase"
    commit = $commit
    dirty = $dirtyFiles.Count -gt 0
    exportCommand = "scripts/boundary/export-contentbase-database-artifacts.ps1"
  }
  consumer = [ordered]@{
    repository = "emptyinkpot/ContentBase"
    expectedPath = "vendor/database-artifacts"
  }
  packages = $artifactRecords
}

$manifestPath = Join-Path $outputPath "database-artifacts.manifest.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8
Write-Host "database artifacts exported: $manifestPath"
