# Project Creation Standard

This standard defines how new projects should be created in the operator
ecosystem.

## Machine-Readable Identity

```json
{
  "schemaVersion": 1,
  "name": "project-creation-standard",
  "purpose": "Define the minimum contract for creating reusable projects in the operator ecosystem.",
  "scaffoldType": "script",
  "status": "active",
  "scaffoldCommand": ".\\scripts\\init-project.ps1 -Name MyProject -Root \"E:\\My Project\\MyProject\"",
  "validationCommand": ".\\scripts\\check-project-standard.ps1 -Root \"E:\\My Project\\MyProject\""
}
```

## Why This Exists

Package-style encapsulation is not decoration. It is a normal path from scripts
to stable products:

```text
script
  -> module
  -> client
  -> adapter
  -> package
  -> service boundary
```

This standard exists so future projects start with clear ownership, runtime
boundaries, documentation, and reusable access layers.

## Minimum Project Shape

Every serious project should define:

- identity
- source of truth
- runtime location
- deployment location
- consumer interfaces
- configuration surfaces
- secret surfaces
- docs/read order
- verification commands
- package or adapter boundaries

## Required Files

Recommended baseline:

```text
README.md
project.json
CONTRIBUTING.md
SECURITY.md
SUPPORT.md
docs/
schemas/
services/
scripts/
```

Use fewer files only for genuinely small one-off tools.

## Required Boundaries

### Source Boundary

Document where canonical source lives:

```text
local clone
remote development workspace
GitHub repository
deployment target
```

### Runtime Boundary

Document what runs where:

```text
service name
systemd/docker/pm2
bind address
health endpoint
log command
restart command
```

### Consumer Boundary

Do not let downstream apps call raw internals. Provide:

- API
- client
- adapter
- package
- documented import path

## Productization Ladder

Use this ladder to decide the next engineering step:

| Stage | Shape | Next Step |
| --- | --- | --- |
| Script | one command works | add docs and env example |
| Module | functions are reusable | add typed inputs/outputs |
| Client | remote API wrapper exists | add errors/request id |
| Adapter | consumer-specific wrapper exists | add verification |
| Package | stable exports exist | add versioning and changelog |
| Service | runtime deployed | add health, logs, operations docs |

## Acceptance Checklist

A project is considered stable enough for reuse when:

- `README.md` explains what it is
- `project.json` records machine-readable identity
- docs say where to edit and where to deploy
- secrets are not guessed
- a smoke or verify command exists
- external consumers use a client/adapter/API, not raw internals
- package boundaries exist when code is reused by more than one consumer

## Repository Rules

- `README.md` is the first human entry point.
- `project.json` is the first machine entry point.
- `docs/contracts/project-creation-standard.md` is the canonical prose policy.
- `packages/schemas/project/creation-standard.schema.json` is the machine schema.
- `scripts/project/init-project.ps1` is the scaffold generator.
- `scripts/project/check-project-standard.ps1` is the validation gate.
- `scripts/project/project-standards.ps1` persists the standard into MySQL.
- New projects must not invent a parallel identity format unless they also
  define a migration path back to this standard.

## DataBase Record

This standard is also stored in MySQL through:

```text
scripts/project/project-standards.ps1
```

The database copy is for query and retrieval. The markdown file remains the
human-readable canonical policy text.

## Scaffold Command

Use the project initializer to create a new project skeleton that follows this
standard:

```powershell
.\scripts\project\init-project.ps1 -Name MyProject -Root "E:\My Project\MyProject"
```

Supported project types:

- `script`
- `package`
- `client`
- `adapter`
- `service`

Example:

```powershell
.\scripts\project\init-project.ps1 -Name MyService -Root "E:\My Project\MyService" -Type service
```

Generated baseline files:

- `README.md`
- `project.json`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `.gitignore`
- `docs/`
- `schemas/`
- `services/`
- `scripts/`

Type-specific extras:

- `package` adds `src/` and `tests/`
- `client` adds `src/` and `examples/`
- `adapter` adds `src/`
- `service` adds `src/` and `ops/`

Validation command:

```powershell
.\scripts\project\check-project-standard.ps1 -Root "E:\My Project\MyProject"
```

Manifest validation command:

```powershell
python .\scripts\project\validate-project-manifest.py .\packages\schemas\project\project-manifest.schema.json .\project.json
```

## Default Project JSON Shape

New projects should at minimum carry these fields in `project.json`:

```json
{
  "name": "MyProject",
  "projectName": "MyProject",
  "canonicalDoc": "README.md",
  "machineReadableEntry": "project.json",
  "githubRepo": "https://github.com/emptyinkpot/MyProject",
  "visibility": "private",
  "type": "project",
  "status": "active",
  "canonicalPurpose": "Describe the canonical purpose here.",
  "readOrder": [
    "README.md",
    "project.json",
    "docs/",
    "schemas/"
  ]
}
```
