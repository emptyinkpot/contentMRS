# ContentAdmin

ContentAdmin is the **primary human-facing** administration and AI writing
workbench for the ContentMRS stack (Tier-1.5 on server-124).

It is not a source of truth. It consumes the DataBase and ContentBase SDKs to
view, edit, trigger, and inspect content workflows. ContentBase `console-web`
no longer hosts a duplicate novel workbench; `/novel` redirects here.

## Role

```text
ContentAdmin
  role: frontend operation console
  owns:
    - admin UI composition
    - topology visualization
    - editor surfaces
    - workflow trigger screens
    - SDK adapters for browser/admin use
  consumes:
    - DataBase Gateway SDK
    - ContentBase Runtime SDK
  must not own:
    - canonical content storage
    - MySQL schema truth
    - Obsidian/OpenList file truth
    - article generation logic
    - EvidencePack construction
```

## Stack

The stack has two user-facing surfaces:

```text
Public browser
  -> Public Workbench
  -> Directus SDK endpoints
  -> ContentAdmin DataBase SDK adapter
  -> DataBase Gateway

Admin browser
  -> Directus Data Studio
  -> ContentAdmin extensions and SDK adapters
  -> DataBase Gateway / ContentBase Runtime
```

Public Workbench is the default no-login read surface. Directus is the
authenticated admin shell, permissions surface, and extension host. Business
writes must still go through the DataBase or ContentBase SDK.

Public Workbench now shows the source catalog, EvidencePack topology, runtime
job status, generated body, and persisted writeback / trace summaries through
the same Directus proxy boundary.

## Boundary

```text
DataBase
  = canonical content, source material, EvidencePack, style contracts

ContentBase
  = AI generation, review, publishing, runtime orchestration

ContentAdmin
  = display, editing surface, topology graph, workflow trigger UI
```

ContentAdmin must not directly write DataBase canonical tables. Draft editing or
controlled mutations go through SDK calls that target the relevant Gateway
write facade.

## Repository Layout

```text
apps/directus-admin
  Directus self-hosted runtime, extension host, local env examples.

apps/public-workbench
  No-login source catalog and EvidencePack topology viewer for local/public read access.

packages/database-sdk-adapter
  Thin typed adapter around @emptyinkpot/database-gateway-generated-client.

packages/contentbase-sdk-adapter
  Thin typed adapter around ContentBase runtime HTTP/SDK contracts.

packages/topology-contracts
  Shared node/edge contracts for content topology views.

packages/ui-shared
  Shared UI helpers for Directus extensions and later standalone workbench UI.

docs
  Architecture, upstreams, SDK boundaries, topology display, and editorial flow.
```

## Upstream Policy

This repository does not fork Directus. It tracks upstreams as dependencies and
documents them in [docs/upstreams.md](./docs/upstreams.md).

Directus updates should be handled by changing the Docker image tag and testing
the extension contract, not by vendoring Directus source code.

## Local Access

Authenticated Directus Admin:

```text
http://127.0.0.1:8055/admin
```

No-login public workbench:

```powershell
pnpm --filter public-workbench dev --host 127.0.0.1 --port 5173
```

```text
http://127.0.0.1:5173
```

## Source Catalog Flow

The public workbench does not inspect MySQL tables, OpenList paths, or Obsidian
files. It asks Directus for `/evidence-search/sources`; the Directus endpoint
calls `packages/database-sdk-adapter`, and that adapter calls the generated
DataBase SDK method `listContentSources`.

```text
browser
  -> /evidence-search/sources
  -> ContentAdmin DataBase SDK adapter
  -> DataBase Gateway /content/sources
  -> DataBase-owned search/source projections
```

Evidence search uses the same boundary. The browser selects stable `sourceId`
values from the catalog, then sends them to `/evidence-search/search` or
`POST /evidence-search/research/query` (mixed corpus + web, returns `pack` + `sessionId`).

## Generation Control Flow

ContentAdmin also exposes a minimal ContentBase runtime proxy through the same
Directus endpoint package. Browser code should call these server-side routes,
not ContentBase directly, so runtime credentials stay on the server side.

```text
browser / Directus module / Public Workbench
  -> /evidence-search/runtime/*
  -> packages/contentbase-sdk-adapter
  -> ContentBase Runtime
  -> DataBase Gateway / model runtime / reviewer trace
```

Current runtime routes:

```text
GET  /evidence-search/runtime/capabilities
POST /evidence-search/runtime/generate/article
POST /evidence-search/runtime/generate/chapter
POST /evidence-search/runtime/jobs
GET  /evidence-search/runtime/jobs/:jobId
POST /evidence-search/runtime/jobs/:jobId/cancel
```

The preferred long-form writing loop is:

```text
1. read source catalog from DataBase
2. preview EvidencePack from DataBase
3. create ContentBase runtime.generate.article job
4. poll job result
5. display draft.body, trace.research, trace.review, quality, acceptance
6. save edits only through DataBase Gateway write facades
```

ContentAdmin owns only the UI state and operation surface. It must not own
article generation logic, EvidencePack construction, style contracts, or
canonical body storage.
