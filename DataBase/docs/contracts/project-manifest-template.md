# Project Manifest Template

This document defines the canonical `project.json` shape for generated
projects.

## Purpose

The manifest is the machine-readable contract for project identity, ownership,
runtime, and verification.

## Minimum Fields

```json
{
  "name": "MyProject",
  "projectName": "MyProject",
  "canonicalDoc": "README.md",
  "machineReadableEntry": "project.json",
  "githubRepo": "https://github.com/emptyinkpot/MyProject",
  "visibility": "private",
  "type": "script",
  "status": "active",
  "canonicalPurpose": "Describe the canonical purpose here.",
  "owner": "emptyinkpot",
  "sourceOfTruth": "local git repository",
  "runtimeLocation": "workspace or server path",
  "deploymentTarget": "server or cloud target",
  "consumerInterfaces": ["README.md", "docs/"],
  "configurationSurfaces": ["project.json"],
  "secretSurfaces": [],
  "verificationCommands": [],
  "documentation": ["README.md"],
  "readOrder": ["README.md", "project.json", "docs/", "schemas/"]
}
```

## Required Interpretation

- `sourceOfTruth` describes where the editable truth lives.
- `runtimeLocation` describes where the project runs while active.
- `deploymentTarget` describes where the project is deployed.
- `consumerInterfaces` lists the stable surfaces that downstream users should
  rely on.
- `configurationSurfaces` lists the files or endpoints that configure the
  project.
- `secretSurfaces` lists credential locations without guessing values.
- `verificationCommands` lists the commands used to confirm the project is
  healthy.
- `documentation` lists the user-facing docs that define the project.

## Rule

If a project cannot describe these fields yet, it should stay at the smallest
possible type and not pretend to be more mature than it is.

## Repository Exception

This repository uses `data-infrastructure-map` as its own current truth type.
Generated projects should use one of the template types unless they explicitly
define and document a new type.
