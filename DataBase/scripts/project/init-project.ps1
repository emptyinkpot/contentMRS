param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Name,

  [Parameter(Mandatory = $true, Position = 1)]
  [string]$Root,

  [ValidateSet("script", "package", "client", "adapter", "service")]
  [string]$Type = "script",

  [string]$GitHubRepo = "https://github.com/emptyinkpot/$Name"
)

$ErrorActionPreference = "Stop"

$target = Resolve-Path -LiteralPath $Root -ErrorAction SilentlyContinue
if ($null -eq $target) {
  New-Item -ItemType Directory -Path $Root | Out-Null
  $target = Resolve-Path -LiteralPath $Root
}

function Get-TypeReadme {
  param([Parameter(Mandatory = $true)][string]$ProjectType)

  switch ($ProjectType) {
    "package" {
@"
# $Name

## Identity Card

~~~yaml
projectName: $Name
canonicalDoc: README.md
machineReadableEntry: project.json
githubRepo: $GitHubRepo
projectType: $ProjectType
status: active
~~~

## Purpose

Describe the reusable package and its exported surface.

## Exported Surface

Describe the public modules, functions, or classes.

## Development

- install dependencies
- run tests
- build package

## Read Order

1. README.md
2. project.json
3. docs/
4. schemas/
5. src/
6. tests/
"@
    }
    "client" {
@"
# $Name

## Identity Card

~~~yaml
projectName: $Name
canonicalDoc: README.md
machineReadableEntry: project.json
githubRepo: $GitHubRepo
projectType: $ProjectType
status: active
~~~

## Purpose

Describe the remote API or service this client wraps.

## Authentication

Describe the credential surface and token handling.

## Example Usage

Describe the main calls or flows.

## Read Order

1. README.md
2. project.json
3. docs/
4. schemas/
5. src/
6. examples/
"@
    }
    "adapter" {
@"
# $Name

## Identity Card

~~~yaml
projectName: $Name
canonicalDoc: README.md
machineReadableEntry: project.json
githubRepo: $GitHubRepo
projectType: $ProjectType
status: active
~~~

## Purpose

Describe which consumer boundary this adapter supports.

## Mapping Rules

Describe how upstream concepts map into this consumer.

## Fallback Behavior

Describe what happens when a source capability is missing.

## Read Order

1. README.md
2. project.json
3. docs/
4. schemas/
5. src/
"@
    }
    "service" {
@"
# $Name

## Identity Card

~~~yaml
projectName: $Name
canonicalDoc: README.md
machineReadableEntry: project.json
githubRepo: $GitHubRepo
projectType: $ProjectType
status: active
~~~

## Purpose

Describe the deployed runtime and what it serves.

## Runtime Surface

Describe the bind address, health endpoint, and service manager.

## Operations

- start
- stop
- restart
- health check

## Read Order

1. README.md
2. project.json
3. docs/
4. schemas/
5. src/
6. ops/
"@
    }
    default {
@"
# $Name

## Identity Card

~~~yaml
projectName: $Name
canonicalDoc: README.md
machineReadableEntry: project.json
githubRepo: $GitHubRepo
projectType: $ProjectType
status: active
~~~

## Purpose

Describe the project in one or two sentences.

## Read Order

1. README.md
2. project.json
3. docs/
4. schemas/
5. services/
6. scripts/
"@
    }
  }
}

$readmeBody = Get-TypeReadme -ProjectType $Type

$files = @{
  "README.md" = $readmeBody
  "project.json" = @"
{
  "name": "$Name",
  "projectName": "$Name",
  "canonicalDoc": "README.md",
  "machineReadableEntry": "project.json",
  "githubRepo": "$GitHubRepo",
  "visibility": "private",
  "type": "$Type",
  "status": "active",
  "canonicalPurpose": "Describe the canonical purpose here.",
  "owner": "emptyinkpot",
  "sourceOfTruth": "local git repository",
  "runtimeLocation": "workspace or server path",
  "deploymentTarget": "server or cloud target",
  "consumerInterfaces": [
    "README.md",
    "docs/"
  ],
  "configurationSurfaces": [
    "project.json"
  ],
  "secretSurfaces": [],
  "verificationCommands": [
    "scripts/project/check-project-standard.ps1"
  ],
  "documentation": [
    "README.md"
  ],
  "readOrder": [
    "README.md",
    "project.json",
    "docs/",
    "schemas/",
    "services/",
    "scripts/"
  ]
}
"@
  "CONTRIBUTING.md" = @"
# Contributing

Describe local edit, review, and verification expectations here.

## Rules

- make the smallest change that matches the current type
- update `project.json` when the project boundary changes
- keep README and manifest in sync
"@
  "SECURITY.md" = @"
# Security

Describe vulnerability reporting and secret handling here.

## Secret Surfaces

Document where secrets live, but do not store secret values here.
"@
  "SUPPORT.md" = @"
# Support

Describe support channels here.

## Channels

- issues
- maintainer contact
- operational runbook
"@
  ".gitignore" = @"
.env
.env.*
node_modules/
.venv/
__pycache__/
"@
}

$directories = @("docs", "schemas", "services", "scripts")
switch ($Type) {
  "package" { $directories += "src"; $directories += "tests" }
  "client" { $directories += "src"; $directories += "examples" }
  "adapter" { $directories += "src" }
  "service" { $directories += "src"; $directories += "ops" }
  default { }
}
foreach ($dir in $directories) {
  New-Item -ItemType Directory -Path (Join-Path $target $dir) -Force | Out-Null
}

foreach ($entry in $files.GetEnumerator()) {
  $path = Join-Path $target $entry.Key
  if (-not (Test-Path -LiteralPath $path)) {
    Set-Content -LiteralPath $path -Value $entry.Value -Encoding UTF8
  }
}

if ($Type -eq "service") {
  $opsReadme = Join-Path $target "ops\README.md"
  if (-not (Test-Path -LiteralPath $opsReadme)) {
@"
# Operations

Describe how to start, inspect, and recover the service.

## Checklist

- start command
- health check
- restart command
- log location
"@ | Set-Content -LiteralPath $opsReadme -Encoding UTF8
  }
}

Write-Host "Initialized project scaffold at $target"
