# Component Placement Map

This document maps the recommended mature components onto DataBase-owned
directories and service boundaries.

## Placement Rules

1. Keep truth and governance in DataBase docs, JSON, and contracts.
2. Keep runtime engines in their own upstream or dedicated service roots.
3. Prefer wrapper, adapter, or contract layers inside DataBase.
4. Do not vendor a whole external platform unless the repo is explicitly the
   upstream fork or private runtime source.

## Current Placement

| Need | Component | DataBase Placement | Notes |
| --- | --- | --- | --- |
| Table administration | NocoDB | `docs/operations/nocodb-deployment.md`, `docs/storage/`, `services/` references | Already deployed; treat as practical admin surface |
| General admin API | Directus | `docs/operations/directus-deployment.md`, `docs/gateway/` notes | Keep as fallback, not primary path until MySQL fits cleanly |
| Catalog and governance | OpenMetadata | `docs/reference-architecture/openmetadata.md`, `ECOSYSTEM_MAP.md`, `ecosystem/` | Record catalog concepts, not the whole platform |
| Source sync | Airbyte | `docs/operations/` + future sync runbooks | Add only when an actual source-to-target sync is required |
| Workflow glue | n8n | `docs/automation/n8n.md`, `docs/automation/n8n-workflows.md` | Use for orchestration and integrations |
| Keyword search | Meilisearch | `docs/runtime/search-and-classification-runtime.md`, future search projections | Search projection, not truth source |
| Vector recall | Qdrant | `docs/runtime/database-memory-service.md`, `services/memory/` | Semantic retrieval layer only |
| Analytics | Superset | `docs/operations/` reports and dashboards | Add when reporting becomes a repeated operator need |
| REST facade | DreamFactory | `docs/gateway/dreamfactory.md`, `docs/gateway/database-api-service-plan.md` | Only if the MySQL service type matches requirements |

## Suggested Directory Ownership

| Directory | Purpose |
| --- | --- |
| `docs/reference-architecture/` | Mature component inspiration and difference notes |
| `docs/operations/` | Deployment, rollout, and operator steps |
| `docs/runtime/` | Runtime behavior, health, and callable surfaces |
| `docs/gateway/` | API and facade boundaries |
| `ecosystem/` | Machine-readable registry of components and relationships |
| `services/` | DataBase-owned adapters and facades |
| `schemas/` | Validation for runtime contracts and indexes |
| `scripts/` | Callable entrypoints and automation |

## What Not To Do

- Do not copy the full upstream engine into DataBase unless DataBase is the
  private runtime source for that engine.
- Do not let NocoDB, Directus, OpenMetadata, Airbyte, Meilisearch, Qdrant, or
  Superset become hidden truth sources.
- Do not make `ecosystem/` a dump; keep it structured and reviewable.

