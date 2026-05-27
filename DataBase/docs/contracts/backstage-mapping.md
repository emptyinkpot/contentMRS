# Backstage Mapping

This repository uses `project.json` as the canonical manifest and can project it
into Backstage software catalog entities.

## Why This Exists

Backstage already solves the project catalog problem:

- entity identity
- ownership
- lifecycle
- relations
- catalog ingestion
- developer portal browsing

DataBase keeps its own manifest and directory table as truth, then exports a
Backstage-compatible projection for ecosystem reuse.

## Source of Truth

- `project.json` is canonical
- `inventories/` provide supporting snapshots
- `scripts/project/sync-project-directory.ps1` syncs MySQL
- `scripts/catalog/export-backstage-entity.ps1` emits a catalog entity

## Mapping Rules

| DataBase field | Backstage field |
| --- | --- |
| `projectName` | `metadata.name` |
| `githubRepo` | `metadata.annotations.backstage.io/source-location` |
| `owner` | `spec.owner` |
| `type` | `kind` or `spec.type` depending on the project role |
| `status` | `spec.lifecycle` |
| `sourceOfTruth` | annotation |
| `runtimeLocation` | annotation |
| `deploymentTarget` | annotation |
| `consumerInterfaces` | annotation |
| `documentation` | annotation |

## Default Kind Strategy

- `service` projects map to `kind: Component` with `spec.type: service`
- `client` projects map to `kind: Component` with `spec.type: library`
- `package` projects map to `kind: Component` with `spec.type: library`
- `adapter` projects map to `kind: Component` with `spec.type: library`
- `script` projects map to `kind: Component` with `spec.type: tool`
- `data-infrastructure-map` stays as a cataloged documentation artifact and can
  be represented as `kind: Component` with `spec.type: documentation`

## Repository Usage

The generated `catalog-info.yaml` should live beside `project.json` or in a
documented export directory and should never drift from the manifest without a
regeneration step.

