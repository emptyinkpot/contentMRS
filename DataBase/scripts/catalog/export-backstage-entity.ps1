param(
  [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$projectJsonPath = Join-Path $ProjectRoot "project.json"
if (-not (Test-Path -LiteralPath $projectJsonPath)) {
  throw "project.json not found: $projectJsonPath"
}

$project = Get-Content -Raw -LiteralPath $projectJsonPath | ConvertFrom-Json

function Get-BackstageType {
  param([string]$Type)
  switch ($Type) {
    "service" { return "service" }
    "client" { return "library" }
    "package" { return "library" }
    "adapter" { return "library" }
    "script" { return "tool" }
    default { return "documentation" }
  }
}

function Escape-YamlSingleQuoted {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return "''" }
  return "'" + $Value.Replace("'", "''") + "'"
}

$entityKind = "Component"
$entityType = Get-BackstageType -Type $project.type
$sourceLocation = if ($project.githubRepo) { "url:" + $project.githubRepo } else { "url:" + $project.name }

$yaml = @"
apiVersion: backstage.io/v1alpha1
kind: $entityKind
metadata:
  name: $(Escape-YamlSingleQuoted $project.projectName)
  title: $(Escape-YamlSingleQuoted $project.name)
  description: $(Escape-YamlSingleQuoted $project.canonicalPurpose)
  annotations:
    backstage.io/source-location: $(Escape-YamlSingleQuoted $sourceLocation)
    database.emptyinkpot/source-of-truth: $(Escape-YamlSingleQuoted $project.sourceOfTruth)
    database.emptyinkpot/runtime-location: $(Escape-YamlSingleQuoted $project.runtimeLocation)
    database.emptyinkpot/deployment-target: $(Escape-YamlSingleQuoted $project.deploymentTarget)
    database.emptyinkpot/project-json: 'project.json'
spec:
  type: $(Escape-YamlSingleQuoted $entityType)
  lifecycle: $(Escape-YamlSingleQuoted $project.status)
  owner: $(Escape-YamlSingleQuoted $project.owner)
"@

if ($OutputPath) {
  $target = $OutputPath
} else {
  $target = Join-Path $ProjectRoot "catalog-info.yaml"
}

Set-Content -LiteralPath $target -Value $yaml -Encoding UTF8
Write-Host "exported backstage entity to $target"
