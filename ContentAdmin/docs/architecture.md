# Architecture

ContentAdmin is an experience layer over DataBase and ContentBase.

```text
Public browser
  -> Public Workbench
  -> Directus SDK endpoints
  -> ContentAdmin SDK adapters
  -> DataBase Gateway

Admin browser
  -> Directus Data Studio
  -> ContentAdmin Directus extensions
  -> SDK adapters
  -> DataBase Gateway / ContentBase Runtime
```

## Ownership

```text
DataBase:
  canonical content, source materials, EvidencePack, style contracts,
  semantic units, search chunks, controlled write facades.

ContentBase:
  AI generation workflows, reviewer workflows, publishing workflows,
  runtime traces and model invocation orchestration.

ContentAdmin:
  public read UI, admin UI, topology visualization, editor surfaces,
  SDK-driven actions.
```

## Login Boundary

Public Workbench defaults to no login because it is read-only and only calls the
server-side Directus SDK endpoints. Directus Admin remains authenticated
and should not have its login disabled.

## Source Catalog Boundary

```text
Public Workbench source browser
  -> /evidence-search/sources
  -> @emptyinkpot/content-admin-database-sdk-adapter
  -> DataBase generated SDK listContentSources()
  -> DataBase Gateway /content/sources
```

The UI receives `ContentSourceSummary` records and only uses stable `sourceId`
values to constrain EvidencePack retrieval. It must not depend on
`search_documents`, `search_chunks`, `semantic_units`, MySQL table names,
OpenList mount paths, or Obsidian local paths.

## Write Path

ContentAdmin can display data from SDKs freely, but important writes must remain
controlled.

```text
editor surface
  -> SDK adapter
  -> Gateway write facade
  -> canonical owner
```

Direct database writes are allowed only for Directus-owned metadata or local
admin draft state. Canonical DataBase tables must be mutated through Gateway
contracts.

## Minimal Closed Loop

The current minimum closed loop connects DataBase EvidencePack retrieval with
ContentBase runtime generation without making ContentAdmin a truth owner.

```text
source selection
  -> /evidence-search/sources
  -> DataBase listContentSources

material preview
  -> /evidence-search/search
  -> DataBase searchEvidencePack

generation trigger
  -> /evidence-search/runtime/jobs
  -> ContentBase /api/novel/runtime/jobs
  -> runtime.generate.article

runtime readback
  -> /evidence-search/runtime/jobs/:jobId
  -> job.result.draft.body
  -> job.result.trace.research / trace.review

controlled save
  -> future editor endpoint
  -> SDK adapter
  -> DataBase Gateway write facade
```

The missing pieces are now explicit:

- a draft edit endpoint that writes through DataBase Gateway
- a topology projection endpoint that returns shared `topology-contracts`
- UI panels for ContentBase job status, generated body, reviewer trace, and
  DataBase readback
- read-only smoke checks proving the browser never holds DataBase or
  ContentBase service credentials
