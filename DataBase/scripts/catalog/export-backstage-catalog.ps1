param(
  [string]$InputPath = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "catalog\ecosystem\repos.json"),
  [string]$OutputDir = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "catalog\backstage"),
  [switch]$IncludeArchived
)

$ErrorActionPreference = "Stop"

$repos = Get-Content -Raw -LiteralPath $InputPath | ConvertFrom-Json

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$repoNameSet = @{}
foreach ($repo in $repos.repositories) {
  $repoNameSet[$repo.name] = $true
}

function Get-BackstageType {
  param([string]$RepoName, [string]$RepoRole)
  switch -Regex ($RepoRole) {
    "operator-runtime" { return "service" }
    "ai-gateway" { return "service" }
    "remote-ide-and-shared-workspace-infra" { return "service" }
    "repository-governance-and-ai-behavior-gates" { return "library" }
    "sanitized-watch-mirror" { return "documentation" }
    default { return "library" }
  }
}

function Escape-YamlSingleQuoted {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return "''" }
  return "'" + $Value.Replace("'", "''") + "'"
}

function To-LowerBoolString {
  param([AllowNull()]$Value)
  if ($null -eq $Value) { return "false" }
  if ($Value -is [bool]) {
    if ($Value) { return "true" } else { return "false" }
  }
  return ([string]$Value).ToLowerInvariant()
}

function Get-RepoNameFromRef {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
  if ($Value -match 'https?://github\.com/[^/]+/([^/#?]+)') {
    return $Matches[1]
  }
  return $Value
}

function Resolve-ComponentRef {
  param(
    [AllowNull()][string]$Value,
    [hashtable]$NameSet
  )

  $candidate = Get-RepoNameFromRef -Value $Value
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    return $null
  }
  if ($NameSet.ContainsKey($candidate)) {
    return "component:default/$candidate"
  }
  return $null
}

function Write-EntityFile {
  param(
    [string]$Path,
    [string]$Yaml
  )
  Set-Content -LiteralPath $Path -Value $Yaml -Encoding UTF8
}

$groupYaml = @"
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: $(Escape-YamlSingleQuoted $repos.owner)
  title: $(Escape-YamlSingleQuoted $repos.owner)
spec:
  type: team
  profile:
    displayName: $(Escape-YamlSingleQuoted $repos.owner)
  children: []
"@
Write-EntityFile -Path (Join-Path $OutputDir "group-$($repos.owner).catalog-info.yaml") -Yaml $groupYaml

$systemYaml = @"
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: emptyinkpot-ecosystem
  title: EmptyInkPot Ecosystem
  description: Canonical registry of repositories, runtime surfaces, and memory material.
spec:
  owner: $(Escape-YamlSingleQuoted $repos.owner)
"@
Write-EntityFile -Path (Join-Path $OutputDir "system-emptyinkpot-ecosystem.catalog-info.yaml") -Yaml $systemYaml

$domainYaml = @"
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: emptyinkpot
  title: EmptyInkPot
  description: Canonical domain for the operator's personal ecosystem.
spec:
  owner: $(Escape-YamlSingleQuoted $repos.owner)
"@
Write-EntityFile -Path (Join-Path $OutputDir "domain-emptyinkpot.catalog-info.yaml") -Yaml $domainYaml

foreach ($repo in $repos.repositories) {
  if (-not $IncludeArchived -and $repo.status -eq "archived") {
    continue
  }

  $name = $repo.name
  $entityType = Get-BackstageType -RepoName $name -RepoRole $repo.repositoryRole
  $owner = "emptyinkpot"
  $sourceLocation = "url:" + $repo.url
  $description = if ($repo.repositoryRole) { $repo.repositoryRole } else { $repo.name }
  $entityPath = Join-Path $OutputDir ($name + ".catalog-info.yaml")
  $systemRef = "emptyinkpot-ecosystem"
  $dependsOn = @()
  if ($repo.consumes) {
    foreach ($dep in $repo.consumes) {
      $ref = Resolve-ComponentRef -Value $dep -NameSet $repoNameSet
      if ($ref) {
        $dependsOn += $ref
      }
    }
  }
  if ($repo.consumedBy) {
    foreach ($consumer in $repo.consumedBy) {
      $ref = Resolve-ComponentRef -Value $consumer -NameSet $repoNameSet
      if ($ref) {
        $dependsOn += $ref
      }
    }
  }

  $yaml = @"
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: $(Escape-YamlSingleQuoted $name)
  title: $(Escape-YamlSingleQuoted $name)
  description: $(Escape-YamlSingleQuoted $description)
  annotations:
    backstage.io/source-location: $(Escape-YamlSingleQuoted $sourceLocation)
    emptyinkpot.io/visibility: $(Escape-YamlSingleQuoted $repo.visibility)
    emptyinkpot.io/repository-role: $(Escape-YamlSingleQuoted $repo.repositoryRole)
    emptyinkpot.io/status: $(Escape-YamlSingleQuoted $repo.status)
    emptyinkpot.io/preferred-source: $(Escape-YamlSingleQuoted (To-LowerBoolString $repo.preferredSource))
    emptyinkpot.io/canonical-doc: $(Escape-YamlSingleQuoted $repo.canonicalDoc)
    emptyinkpot.io/machine-readable-entry: $(Escape-YamlSingleQuoted $repo.machineReadableEntry)
spec:
  type: $(Escape-YamlSingleQuoted $entityType)
  lifecycle: $(Escape-YamlSingleQuoted $repo.status)
  owner: $(Escape-YamlSingleQuoted $owner)
  system: $(Escape-YamlSingleQuoted $systemRef)
"@

  if ($dependsOn.Count -gt 0) {
    $yaml += "`n  dependsOn:"
    foreach ($dep in ($dependsOn | Sort-Object -Unique)) {
      $yaml += "`n    - $(Escape-YamlSingleQuoted $dep)"
    }
  }

  Set-Content -LiteralPath $entityPath -Value $yaml -Encoding UTF8
}

Write-Host "exported backstage catalog to $OutputDir"
