# database-runtime-gateway-storage.md

Source root: E:\My Project\ContentMRS\DataBase
Generated for Bailian knowledge base upload.



---

## docs\gateway\api-access.md

```md
# API Access Model

## Main Pattern

```text
Consumer
  -> DataBase Gateway API
  -> MySQL / NocoDB / OpenList
```

Consumers should not connect directly to MySQL unless they are trusted operator tools or maintenance jobs.

## Access Modes

| Mode | Use Case | Recommended For |
| --- | --- | --- |
| DataBase Gateway REST | stable app-facing domain APIs | MyBlog, Mortis, n8n, Telegram workflows |
| NocoDB UI/API | table management and low-code CRUD | operator and narrow automation |
| MySQL CLI | operator maintenance | local admin only |
| MySQL SDK | controlled backend service | trusted server-side apps |
| Directus REST/GraphQL | blocked candidate | revisit after CynosDB timestamp issue is solved |
| DreamFactory API | blocked candidate for MySQL | current runtime lacks MySQL service type |

## Direct MySQL Rule

Direct MySQL access is allowed for:

- schema inspection
- backups
- emergency repair
- operator-maintained scripts

It should not be the default interface for external consumers.

## Current Active Gateway

NocoDB is currently the active MySQL-facing gateway.

The planned long-term app-facing boundary is a thin DataBase Gateway API, documented in:

```text
docs/gateway/database-gateway-p0.md
docs/gateway/database-api-service-plan.md
```

Directus remains blocked until the CynosDB timestamp parameter issue is resolved or Directus metadata is moved to a compatible store.

DreamFactory is installed and initialized, but the current runtime does not expose a MySQL service type.

## Service Accounts

External consumers should use least-privilege MySQL service users where direct MySQL access is required:

```text
database_readonly
database_content_rw
```

See `docs/gateway/service-accounts.md`.

```


---

## docs\gateway\api-surface-governance.md

```md
# DataBase Gateway API Surface Governance

This document defines how the DataBase Gateway API surface is allowed to grow.
The current Gateway is already callable through OpenAPI and a generated
TypeScript SDK, so the next priority is consolidation, not endpoint expansion.

## Authority

DataBase owns the canonical domain contract for:

- canonical content identity and publication-facing content state
- creative style and story memory contracts
- semantic units, tags, relations, and retrieval-facing context
- Gateway OpenAPI and generated SDK output

Consumers must not redefine these domain contracts. Consumers may define local
UI, form, workflow, cache, and runtime state models.

## Stable v1 Surface

Stable v1 APIs are the operations that consumers may build against without
expecting breaking response-shape changes:

| Domain | Stable operations |
| --- | --- |
| Runtime | `getServiceIdentity`, `getHealth`, `getStatus` |
| Canonical content | `listWorks`, `listWorkChapters`, `listWorkCharacters`, `createWork`, `appendChapter`, `upsertWork` |
| Creative contract | `getCreativeStyleContract`, `getAuthorProfile`, `resolveCreativeContext` |
| Story memory | `getStoryMemory`, `getStoryMemoryContext`, `recordStoryMemory` |
| Canonical writes | `recordGenerationOutput`, `recordChapterTransition`, `recordAuditResult`, `replaceWorkStructure`, `upsertVocabularyItem` |
| Search and semantic reads | `searchContent`, `searchVocabulary`, `listSemanticUnits`, `listSemanticTags`, `listSemanticRelations` |

Stable v1 changes must be additive unless a new version is introduced.

`resolveCreativeContext` is the stable AI-ready prompt aggregate. Consumers
should prefer these v1 fields over low-level compatibility fields:

- `narrativeState`: current, previous, and next chapter briefs plus character,
  world-rule, and continuity material.
- `semanticState`: retrieval query, semantic units, and a prompt-ready memory
  brief.
- `styleState`: active author profile, protocol, preferred terms, banned terms,
  quality rules, and technique identifiers.
- `publicationState`: active publication targets and platform constraints.
- `runtimeSnapshot`: context hash, resolution time, and source counts for
  traceability.

The older `parts`, `recentBlocks`, `currentPart`, `semanticContext`,
`publicationTargets`, `snapshot`, and `counts` fields remain compatibility
fields. New ContentBase generation code should consume the aggregate fields
first and treat compatibility fields as debug or migration support.

Allowed additive changes:

- optional response fields
- new enum values when consumers are already required to handle unknown values
- new query filters that preserve existing defaults
- new SDK methods for new operations

Breaking changes require a versioned replacement:

- renaming or removing fields
- changing requiredness or nullability
- changing operation meaning while keeping the same operation id
- changing idempotency semantics
- changing a command from append/event behavior into replacement behavior

## Experimental And Internal Surface

The following operations are useful but are not the stable consumer boundary:

| Category | Operations |
| --- | --- |
| Table-shaped canonical reads | `listCanonicalContentWorks`, `listCanonicalContentParts`, `listCanonicalContentBlocks`, `listCanonicalContentAssets`, `listCanonicalPublicationTargets` |
| Legacy or inventory reads | `getTableInventory`, `listFanqieWorks`, `listLiterature`, `listStateTransitions`, `listNotes`, `getNote` |
| Projection and utility commands | `recordNote`, `recordExperience`, `projectObsidianMarkdown` |

These operations may remain available, but new consumers should prefer stable
domain operations. If one of these becomes product-critical, promote it by
documenting its domain owner, command/query behavior, schema, idempotency rule,
and compatibility promise.

## Domain Layers

New operations must land in one domain layer:

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Canonical Content | Works, chapters, characters, publication-facing content state | `appendChapter`, `upsertWork` |
| Creative Runtime | author profile, style contract, resolved creative context | `resolveCreativeContext` |
| Narrative Memory | story events, character growth, important items, prompt memory context | `recordStoryMemory` |
| Semantic | semantic units, tags, relations, retrieval filters | `listSemanticUnits` |
| Publication And Audit | audit decisions, publication transitions, generation output persistence | `recordAuditResult` |
| Projection And Admin | inventory, Obsidian projection, legacy import visibility | `projectObsidianMarkdown` |

Do not add a new table-shaped `listX`, `getX`, or `upsertX` operation unless the
domain aggregate cannot satisfy the use case.

## Command And Query Split

Query operations:

- must not mutate canonical state
- should be cacheable by request identity when practical
- may return denormalized domain bundles
- should use stable filters instead of exposing raw SQL concerns

Command operations:

- must require `X-DataBase-Idempotency-Key`
- must record or update state through the Gateway mutation ledger where
  applicable
- must fail fast on schema validation
- must return a typed mutation response with enough metadata for audit and
  replay decisions

Command names should express business intent. `record*` is acceptable for event
append commands. New database-language names such as `upsert*` should only be
used when the operation is explicitly an idempotent canonical identity sync.

## Canonical Write Whitelist

Consumers must call the generated SDK or Gateway for these authority-owned
writes:

- work identity and chapter content
- chapter lifecycle state
- generation output
- audit result
- publication target/state
- story memory
- creative vocabulary and style contract material
- semantic context and retrieval-owned memory

Direct SQL remains acceptable only for:

- migration and backfill
- data import jobs before canonical projection
- analytics and diagnostics
- runtime-owned local execution state that DataBase does not claim as canonical

The first executable guard is:

```powershell
.\scripts\check-contentbase-canonical-sql-boundary.ps1 -ContentBaseRoot "E:\My Project\ContentBase"
```

It verifies that the ContentBase novel product does not add unregistered direct
SQL against DataBase-owned canonical tables. The guarded set includes canonical
content, creative, semantic, vocabulary, author, publication, note, and
experience tables. Known legacy debt must be explicit in the gate and in the
ContentBase migration matrix; new direct SQL against guarded tables fails.

For migration planning, run the same guard in report mode:

```powershell
.\scripts\check-contentbase-canonical-sql-boundary.ps1 -ContentBaseRoot "E:\My Project\ContentBase" -ReportAll
```

Report mode inventories remaining direct SQL table references without expanding
the failing guard list. Current allowed local SQL clusters are mostly
ContentBase runtime tables:

- Fanqie runtime and publication cache: `fanqie_*`, `novel_work_registry`
- local execution/cache tables: `sync_*`, `dashboard_snapshot_cache`,
  `module_snapshot_cache`
- no registered ContentBase migration debt remains for `notes` or `experience_records`; those resources must cross through Gateway read/write routes.
- migrated canonical/story tables must remain behind Gateway contracts:
  `volume_outlines`, `chapter_outlines`, `characters`, `world_settings`,
  `story_events`, `character_growth`, `important_items`

Do not promote runtime/cache tables into the failing guard list until the
Gateway owns a stable SDK/RPC replacement for that exact table responsibility.
Do not add new entries to the registered migration-debt list unless the debt is
also named in ContentBase's `docs/contracts/DATABASE_OWNERSHIP_MIGRATION.md`
with a target Gateway replacement.

## Growth Rule

Before adding an operation, answer these in the implementing change:

1. Which domain layer owns it?
2. Is it a command or a query?
3. Is it stable v1, experimental, or internal/admin?
4. What schema is the runtime authority?
5. Does the generated SDK expose it?
6. What direct-SQL consumer path does it retire?

If those answers are unclear, do not add the operation yet.

```


---

## docs\gateway\client-usage.md

```md
# DataBase Gateway Client Usage

This is the practical usage guide for the reusable Gateway client in
`gateway/src/clients/database-gateway-client.ts`.

## Purpose

The client is a thin HTTP wrapper for consumer apps such as MyBlog and Mortis.
It standardizes:

- base URL handling
- API key injection
- request id propagation
- JSON parsing
- error shaping

It does not replace the HTTP contract. It is only a convenience layer over the
Gateway API.

## Installation Context

The client lives in the same repository as the Gateway service. If you want to
reuse it from another repo, copy the file or extract it into a shared package.

## Initialize

```ts
import { DataBaseGatewayClient } from "./database-gateway-client.js";

const client = new DataBaseGatewayClient({
  baseUrl: process.env.DATABASE_GATEWAY_URL,
  apiKey: process.env.DATABASE_GATEWAY_API_KEY
});
```

Defaults:

- `baseUrl`: `http://127.0.0.1:18090`
- `apiKey`: unset
- `fetchImpl`: global `fetch`

## Unauthenticated Calls

These methods do not require an API key:

```ts
await client.health();
await client.status();
```

Use them for:

- loopback health checks
- runtime cards
- operator dashboards

## Authenticated Calls

These methods require `apiKey`:

```ts
await client.inventoryTables();
await client.search("keyword", 10);
await client.listWorks(10);
await client.listChapters(123, 50);
await client.searchVocabulary("term", 20);
```

If the API key is missing, the client throws before the request is sent.

## Response Shapes

The client returns parsed JSON from the Gateway response.

Important response types:

- `DataBaseGatewayStatusResponse`
- `DataBaseGatewayHealthResponse`
- `DataBaseGatewaySearchResponse`
- `DataBaseGatewayVocabularySearchResponse`

These are good for consumer code that wants typed access to the Gateway
contract without hand-writing interfaces.

## Error Handling

When the Gateway returns a non-2xx response, the client throws an `Error` and
attaches:

- `status`
- `requestId`

Example:

```ts
try {
  await client.search("secret");
} catch (error) {
  console.error(error.message);
  console.error(error.status);
  console.error(error.requestId);
}
```

## Recommended Consumer Pattern

MyBlog and Mortis should use the client in their adapter layer, not directly in
UI components.

```text
UI / workflow
  -> adapter
  -> DataBaseGatewayClient
  -> DataBase Gateway
```

That keeps the HTTP contract in one place.

If a consumer grows beyond one call site, wrap the client in a dedicated
adapter. See:

```text
docs/gateway/consumer-adapters.md
```

## Local Smoke

Run the example or the Gateway smoke check:

```bash
npm run example
npm run smoke
```

`npm run example` expects the Gateway to be reachable on the configured base
URL.

```


---

## docs\gateway\consumer-adapters.md

```md
# DataBase Gateway Consumer Adapters

This document defines how downstream applications should wrap the reusable
Gateway client.

## Goal

Keep consumer code thin:

```text
consumer app
  -> consumer adapter
  -> DataBaseGatewayClient
  -> DataBase Gateway
```

Do not call raw `fetch` from random UI components or workflow nodes if the same
request pattern is used in more than one place.

## MyBlog Adapter Shape

Recommended methods:

```ts
getGatewayStatus()
getWorks(limit?)
getWorkChapters(workId, limit?)
searchVocabulary(query, limit?)
searchKnowledge(query, limit?)
```

MyBlog should treat `getWorks()` and `getWorkChapters()` as contract reads, not
as direct database projections.

## Mortis Adapter Shape

Recommended methods:

```ts
getRuntimeStatus()
getInventoryTables()
search(query, limit?)
health()
```

Mortis should use these methods to feed its runtime cards, timeline panels, and
search surfaces.

## Adapter Example

```ts
import { DataBaseGatewayClient } from "@/gateway/database-gateway-client";

export class MortisDataBaseAdapter {
  constructor(private readonly client = new DataBaseGatewayClient()) {}

  getRuntimeStatus() {
    return this.client.status();
  }

  getInventoryTables() {
    return this.client.inventoryTables();
  }

  search(query: string, limit = 10) {
    return this.client.search(query, limit);
  }
}
```

## Error Policy

Adapters should:

- surface `requestId`
- preserve the upstream status code where possible
- map transport errors into consumer-specific error boundaries only once
- avoid swallowing API key failures

## Integration Rule

If MyBlog or Mortis needs a new Gateway method, add it to the shared client
first, then expose it through the adapter. Do not implement one-off request code
inside the consumer.

```


---

## docs\gateway\database-api-service-plan.md

```md
# DataBase API Service Plan

The DataBase ecosystem should expose data through a service layer, not through direct MySQL credentials in every consumer.

## Target Boundary

```text
MySQL / OpenList / Quark
  -> DataBase service layer
  -> REST API / webhook / operator command
  -> MyBlog / Mortis / n8n / Telegram / future apps
```

## Current Best Arrangement

```text
Tencent CynosDB MySQL
  = structured data truth

NocoDB
  = active MySQL-facing gateway and table API/UI

n8n
  = automation bus and scheduled workflow runner

DreamFactory
  = installed candidate API gateway, currently blocked for MySQL service exposure

Future DataBase Gateway
  = thin stable API facade for external applications
```

## Why Not Direct MySQL Everywhere

Direct MySQL access from every app creates drift:

- every consumer needs database passwords
- schema changes break callers directly
- sensitive tables are easy to expose accidentally
- auditing is scattered
- read/write permissions become hard to reason about
- external apps learn too much about internal table layout

The API service layer should hide raw storage and expose stable domain endpoints.

## Active Short-Term API Surface

Use NocoDB first because it already works with CynosDB:

```text
Runtime: /srv/nocodb
Container: database-nocodb
Bind: 127.0.0.1:18088
Base: CynosDB MyBlog Runtime
External source: mysql2
Models discovered: 76
Enabled models after hardening: 69
Sensitive enabled models: 0
```

NocoDB can serve:

- operator table inspection
- low-code data editing
- quick API access to allowed models
- n8n read workflows
- Mortis status/report workflows

Do not use NocoDB as the only long-term API contract. It is a gateway surface, not the final stable API facade.

## Future Stable API Facade

Create a thin `DataBase Gateway` when consumers need stable routes such as:

```text
GET /health
GET /inventory/tables
GET /content/works
GET /content/works/:id/chapters
GET /vocabulary/search?q=
POST /curation/runs
POST /operator/reports/database-health
```

The facade can call:

- NocoDB API for table-level access
- MySQL service accounts for controlled domain queries
- OpenList API for file/storage projection
- n8n webhooks for automation

This facade should own:

- stable route contracts
- auth policy
- response shape
- sensitive-field redaction
- audit logging
- rate limiting

## Recommended Consumer Routing

| Consumer | Preferred Path |
| --- | --- |
| n8n health/report workflows | DataBase Gateway or NocoDB API |
| MyBlog content display | DataBase Gateway |
| Mortis operator status | DataBase Gateway |
| Telegram commands | n8n -> DataBase Gateway |
| One-off table administration | NocoDB UI |
| Direct SQL maintenance | operator-only MySQL CLI |

## Mature Components To Reuse

| Component | Use |
| --- | --- |
| NocoDB | Active table gateway and low-code UI for MySQL. |
| n8n | Automation bus, scheduled jobs, Telegram triggers. |
| OpenAPI | Contract format for future DataBase Gateway endpoints. |
| FastAPI / NestJS / Hono | Candidate lightweight API facade frameworks if a custom facade is needed. |
| DreamFactory | Candidate generated API gateway, but blocked in the current runtime for MySQL. |

## Decision

The current operational decision is:

```text
NocoDB is the active MySQL service surface.
DreamFactory is installed but blocked for MySQL.
Future DataBase Gateway should provide stable app-facing APIs.
```

Do not expose raw CynosDB directly to new consumers unless there is a specific maintenance reason.

```


---

## docs\gateway\database-gateway-operations.md

```md
# DataBase Gateway Operations

## Runtime

```text
Server: server-124 / 124.220.233.126
Runtime path: /srv/database-gateway
Systemd unit: database-gateway.service
Unit template: gateway/ops/database-gateway.service
Bind: 127.0.0.1:18090
Credential file: /srv/database-gateway/.env
Local secret backup: C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env
```

Source truth:

```text
server-170:/home/ubuntu/workspaces/DataBase
```

Do not edit a local Windows clone for gateway changes. Patch the server-170 source workspace, build there, then deploy to `/srv/database-gateway`.

## Commands

```bash
sudo systemctl status database-gateway --no-pager
sudo systemctl restart database-gateway
journalctl -u database-gateway -n 100 --no-pager
```

## Schema Operations

Runtime schema migrations are operator work, not gateway runtime work.

The mutation ledger schema lives at:

```text
gateway/sql/001_database_gateway_mutations.sql
```

Apply it with an admin/operator MySQL credential, then keep runtime on the restricted service accounts.

Runtime accounts:

```text
MYSQL_USER=database_readonly
MYSQL_WRITE_USER=database_content_rw
```

Minimum privileges for write runtime:

```text
database_content_rw: SELECT, INSERT, UPDATE on database_gateway_mutations
database_content_rw: approved SELECT, INSERT, UPDATE, DELETE on explicit content tables
database_content_rw: no CREATE TABLE privilege
```

## Systemd Hardening

The server unit should match:

```text
gateway/ops/database-gateway.service
```

Current hardening intent:

- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectHome=true`
- `ProtectSystem=strict`
- `ReadWritePaths=/srv/database-gateway`
- `RestrictSUIDSGID=true`
- `LockPersonality=true`
- `SystemCallArchitectures=native`

Do not enable `MemoryDenyWriteExecute=true` for this Node.js service. V8 needs
to manage executable memory for JIT/baseline compilation; enabling that option
causes Node to crash with a V8 permission failure before the HTTP listener is
available.

Apply the repository unit:

```bash
sudo cp /srv/database-gateway/ops/database-gateway.service /etc/systemd/system/database-gateway.service
sudo systemctl daemon-reload
sudo systemctl restart database-gateway
```

Then run the smoke test below. If the service fails after hardening, inspect:

```bash
journalctl -u database-gateway -n 100 --no-pager
systemctl cat database-gateway --no-pager
```

## Smoke Test

```bash
cd /srv/database-gateway
set -a
. ./.env
set +a
npm run smoke
```

Expected:

```text
database-gateway smoke ok
```

The smoke test checks:

- `/health` is available
- data routes reject missing API key
- `/inventory/tables` works with `X-DataBase-Api-Key`
- write routes reject missing idempotency key
- disabled write routes return `501 not_implemented`
- `/writes/upsert-vocabulary-item` can write through the facade
- repeated write with the same idempotency key replays the stored response
- repeated write with the same idempotency key and a different payload returns `409 idempotency_conflict`

## API Key Rotation

1. Generate a new key locally.
2. Update:

```text
C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env
/srv/database-gateway/.env
```

3. Restart:

```bash
sudo systemctl restart database-gateway
```

4. Verify:

```bash
cd /srv/database-gateway
set -a
. ./.env
set +a
npm run smoke
```

## Logs

Logs are JSON lines written to stdout and captured by systemd.

Important fields:

```text
requestId
method
path
status
elapsedMs
```

Every response includes `X-Request-Id`.

## Auth Policy

Unauthenticated:

```text
GET /
GET /health
```

Authenticated with `X-DataBase-Api-Key`:

```text
GET /inventory/tables
GET /content/works
GET /content/works/:id/chapters
GET /vocabulary/search?q=
GET /search?q=
POST /writes/*
```

Write routes additionally require:

```text
X-DataBase-Idempotency-Key
```

## Current Limits

- Loopback-only.
- Read gateway uses `database_readonly`.
- Write gateway uses `database_content_rw`.
- Only `POST /writes/upsert-vocabulary-item` is enabled for real mutation.
- Other write facade routes are contract placeholders and return `501`.
- No public reverse proxy.
- OpenList health remains `unknown` until an internal health URL is configured.

```


---

## docs\gateway\database-gateway-p0.md

```md
# DataBase Gateway P0

This document defines the first stable API facade for the DataBase ecosystem.

The goal is not to replace MySQL, NocoDB, OpenList, or n8n. The goal is to give external consumers one stable, controlled service boundary.

## P0 Goal

Create a thin API service that exposes a small number of read-only endpoints:

```text
GET /health
GET /status
GET /inventory/tables
GET /content/works
GET /content/works/:id/chapters
GET /vocabulary/search?q=
```

The P0 service should:

- use `database_readonly`
- bind to loopback first
- avoid public exposure
- return stable JSON shapes
- redact sensitive fields
- log requests enough for debugging
- be callable by n8n and Mortis
- require `X-DataBase-Api-Key` for data routes

## Runtime Placement

```yaml
name: DataBase Gateway
status: active-p0
server: server-124 / 124.220.233.126
runtimePath: /srv/database-gateway
localBind: 127.0.0.1:18090
sourceRepo: https://github.com/emptyinkpot/DataBase
credentialsSurface: C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env
serverCredentialsSurface: /srv/database-gateway/.env
```

## Why This Exists

Without a gateway, every consumer learns the storage details:

```text
MyBlog -> MySQL
Mortis -> MySQL
n8n -> MySQL
Telegram -> n8n -> MySQL
scripts -> MySQL
```

That creates credential sprawl and schema coupling.

The gateway changes this to:

```text
MyBlog / Mortis / n8n / Telegram / scripts
  -> DataBase Gateway
  -> MySQL / NocoDB / OpenList
```

## P0 Endpoint Contracts

### GET /health

Purpose:

- report whether the service and downstream surfaces are reachable

Response shape:

```json
{
  "ok": true,
  "service": "database-gateway",
  "checks": {
    "mysql": "ok",
    "nocodb": "ok",
    "openlist": "unknown"
  }
}
```

### GET /status

Purpose:

- expose stable runtime metadata for Mortis, n8n, MyBlog, and operator tools
- confirm the service is read-only and which contract files define it
- avoid requiring API keys for non-data diagnostics

Rules:

- do not include passwords, tokens, or connection strings
- do not perform expensive downstream checks
- keep the endpoint loopback-only unless public exposure is explicitly designed

### GET /inventory/tables

Purpose:

- expose table names and approximate row counts for allowed visibility classes

Rules:

- do not include raw credential values
- mark sensitive tables as hidden or redacted
- use MySQL metadata queries or existing inventory files

### GET /content/works

Purpose:

- provide stable read access to works for MyBlog and operator tools

Rules:

- read-only
- paginated
- no sensitive account/session fields

### GET /content/works/:id/chapters

Purpose:

- provide stable chapter listing for a work

Rules:

- read-only
- return predictable ordering
- include only approved content fields

### GET /vocabulary/search?q=

Purpose:

- provide simple vocabulary lookup before a dedicated search backend exists

Rules:

- read-only
- bounded limit
- no broad table scan for empty query

## Preferred Implementation

Recommended P0 implementation:

```text
Hono + TypeScript + mysql2
```

Why:

- small runtime
- simple Docker deployment
- fast enough for internal services
- clean route contracts
- easy to call from n8n and Mortis

Acceptable alternative:

```text
FastAPI + mysqlclient/PyMySQL
```

Use FastAPI if the gateway will soon need Python-native data processing.

## Do Not Do In P0

- do not add write endpoints
- do not expose public internet access
- do not connect with the high-privilege `openclaw` MySQL account
- do not expose password/token/cookie/account-session tables
- do not replace NocoDB UI
- do not migrate MySQL data

## Relationship With Existing Services

| Service | P0 Role |
| --- | --- |
| MySQL | Structured data truth. |
| NocoDB | Active table UI/API surface; fallback for low-code inspection. |
| DreamFactory | Installed candidate, blocked for MySQL service exposure. |
| n8n | Calls `/health` and later report endpoints. |
| Mortis | Operator runtime consumer. |
| MyBlog | Future content consumer. |

## Current Deployment

Verified on 2026-05-10:

```yaml
status: active-p0
runtimePath: /srv/database-gateway
serviceManager: systemd
unit: database-gateway.service
bind: 127.0.0.1:18090
credential: database_readonly
credentialFile: /srv/database-gateway/.env
apiKeyHeader: X-DataBase-Api-Key
apiKeyCredentialSurface: C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env
openapi: gateway/openapi.yaml
operations: docs/gateway/database-gateway-operations.md
```

Verification:

```bash
curl -fsS http://127.0.0.1:18090/health
curl -fsS http://127.0.0.1:18090/status
curl -fsS -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" http://127.0.0.1:18090/inventory/tables
curl -fsS -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" "http://127.0.0.1:18090/content/works?limit=2"
curl -fsS -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" "http://127.0.0.1:18090/content/works/1/chapters?limit=2"
curl -fsS -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" "http://127.0.0.1:18090/vocabulary/search?q=%E7%9A%84&limit=2"
```

n8n workflow `database-health-report` now calls:

```text
http://127.0.0.1:18090/health
```

`/health` remains unauthenticated because it is a loopback-only health probe used by n8n and system checks. Data-bearing routes require `X-DataBase-Api-Key`.

Current protected routes:

```text
GET /inventory/tables
GET /content/works
GET /content/works/:id/chapters
GET /vocabulary/search?q=
```

Current unprotected routes:

```text
GET /
GET /health
GET /status
```

n8n currently runs as a direct Docker container, not a compose-managed service. Do not rebuild the n8n container just to inject `DATABASE_GATEWAY_API_KEY`; use `/health` for n8n health reporting unless a future workflow needs data routes.

## P0 Completion Criteria

P0 is complete when:

- service runs on `127.0.0.1:18090`
- `/health` returns MySQL and NocoDB status
- `/status` returns runtime metadata without exposing secrets
- `/inventory/tables` returns allowed table inventory
- n8n `database-health-report` calls the gateway
- credentials live outside Git
- README and `project.json` record the runtime
- data routes require API key auth
- `gateway/openapi.yaml` defines concrete response schemas

Current state: complete for the listed P0 endpoints.

## First Follow-Up

After P0:

```text
P1: add more content read APIs behind the gateway
P2: add integration clients for MyBlog / Mortis
P3: add write endpoints behind approval
P4: add OpenList health and object inventory
P5: add contract tests and generated clients
```

```


---

## docs\gateway\database-gateway-review.md

```md
# DataBase Gateway Review

Date: 2026-05-10

## Scope

Reviewed the current `gateway/` implementation as an integrator, without
editing gateway source files.

## Checked Files

```text
gateway/package.json
gateway/src/index.ts
gateway/src/config.ts
gateway/src/db.ts
gateway/src/routes.ts
gateway/src/sensitive.ts
gateway/.env.example
```

## Verification

```bash
npm run typecheck
npm run build
```

Result:

```text
passed
```

Re-run after `04dc419 feat: add database gateway api key auth`:

```text
passed
```

## Current Capability

The gateway currently implements:

```text
GET /
GET /health
GET /inventory/tables
GET /content/works
GET /content/works/:id/chapters
GET /vocabulary/search?q=
```

Implementation shape:

```text
Hono + @hono/node-server + mysql2
```

Runtime defaults:

```text
host: 127.0.0.1
port: 18090
```

## Positive Findings

- The service defaults to loopback bind.
- MySQL configuration is environment-driven.
- Data endpoints require `X-DataBase-Api-Key` when `DATABASE_GATEWAY_API_KEY`
  is configured.
- Queries use parameterized MySQL placeholders for route inputs.
- Sensitive table names are classified as `hidden` in `/inventory/tables`.
- P0 typecheck and build pass.

## API Key Auth Review

Commit:

```text
04dc419 feat: add database gateway api key auth
```

Observed behavior:

- `GET /` remains public for service identity.
- `GET /health` remains public for loopback health checks.
- Data endpoints call `requireApiKey`:
  - `GET /inventory/tables`
  - `GET /content/works`
  - `GET /content/works/:id/chapters`
  - `GET /vocabulary/search`
- OpenAPI declares `X-DataBase-Api-Key` as an API key header.

This is acceptable for P0 loopback use.

## Integration Risks

1. `/inventory/tables` still returns names for sensitive tables with visibility
   `hidden`. This is acceptable for operator-only use, but public or broad
   consumers may need sensitive table names fully omitted.
2. `/health` is unauthenticated. That is acceptable for loopback health checks,
   but should stay non-public.
3. The gateway does not yet expose the search projection created by
   `search_documents` / `search_chunks`.
4. The gateway is not yet registered as deployed runtime evidence in this
   review. Build passing is not the same as server deployment.
5. API key enforcement depends on `DATABASE_GATEWAY_API_KEY` being set. Runtime
   deployment should fail closed or document if unset is allowed for local dev.
6. `gateway/openapi.yaml` exists and matches the current P0 route set, but it
   does not yet include a `/search` route.

## Recommended Next Integration Step

Do not add more broad routes yet.

Next smallest integration:

```text
GET /search?q=
  -> search_documents/search_chunks
  -> public/private only
  -> bounded limit
  -> no secret/sensitive rows
```

Then wire n8n/Mortis to call:

```text
GET /health
GET /search?q=
```

before adding write APIs or public exposure.

```


---

## docs\gateway\database-write-facade-p0.md

```md
# DataBase Write Facade P0

This document defines the first controlled mutation boundary for the DataBase ecosystem.

The goal is not to expose raw SQL or a generic table editor. The goal is to give MyBlog and other approved consumers a small, auditable mutation surface that keeps DataBase as the single storage truth.

## P0 Goal

Create a thin write service with a narrow command set:

```text
POST /writes/create-work
POST /writes/append-chapter
POST /writes/upsert-vocabulary-item
POST /writes/record-note
POST /writes/record-experience
```

All mutation routes must require:

```text
X-DataBase-Api-Key: <key>
X-DataBase-Idempotency-Key: <key>
```

P0 write rules:

- accept only documented payload shapes
- reject missing idempotency keys
- log request id, actor, action, and target
- enforce a dedicated write service account
- keep writes separate from the read gateway
- never expose raw SQL or generic table mutation

## Current Implementation Status

Enabled now:

```text
POST /writes/upsert-vocabulary-item
```

Defined but intentionally not enabled yet:

```text
POST /writes/create-work
POST /writes/append-chapter
POST /writes/record-note
POST /writes/record-experience
```

Disabled routes return `501 not_implemented`. This keeps the public contract visible without pretending unsupported mutations are ready.

## Idempotency Semantics

Every write route requires `X-DataBase-Idempotency-Key`.

The gateway stores write attempts in:

```text
database_gateway_mutations
```

The current behavior is:

- first request with a new key inserts a `started` mutation row
- successful writes update the row to `succeeded` and store the response JSON
- retry with the same key and same payload returns the stored response
- retry with the same key and different payload returns `409 idempotency_conflict`
- retry while a mutation is still `started` returns `409 mutation_in_progress`
- retry after a failed mutation returns `409` with the stored error code

This makes client retries safe without exposing raw database access.

## Schema

The gateway-owned mutation ledger is defined in:

```text
gateway/sql/001_database_gateway_mutations.sql
```

Runtime account policy:

- `database_readonly` is used for read routes only.
- `database_content_rw` is used for approved content writes.
- `database_content_rw` needs `SELECT`, `INSERT`, and `UPDATE` on `database_gateway_mutations`.
- `database_content_rw` must not have schema migration privileges.

Schema changes should be applied by an operator/admin credential, then runtime should continue through the restricted gateway account.

## Recommended Implementation

Use the same stack pattern as the read gateway:

```text
Hono + TypeScript + mysql2
```

But the write facade must use a distinct route namespace and a distinct service account from `database_readonly`.

## Suggested Payload Shapes

### create-work

```json
{
  "requestId": "...",
  "actor": "myblog",
  "payload": {
    "title": "...",
    "description": "...",
    "platform": "..."
  }
}
```

### append-chapter

```json
{
  "requestId": "...",
  "actor": "myblog",
  "payload": {
    "workId": 1,
    "chapterNumber": 1,
    "title": "...",
    "wordCount": 1234
  }
}
```

### upsert-vocabulary-item

```json
{
  "requestId": "...",
  "actor": "myblog",
  "payload": {
    "content": "...",
    "type": "...",
    "category": "...",
    "note": "...",
    "tags": ["..."]
  }
}
```

### record-note / record-experience

These should map to DataBase-owned memory services rather than free-form table writes.

## Consumer Contract

MyBlog should use a dedicated write adapter with explicit methods such as:

```text
createWork()
appendChapter()
upsertVocabularyItem()
recordNote()
recordExperience()
```

The adapter should never accept SQL strings.

```


---

## docs\gateway\directus.md

```md
# Directus Gateway

## Purpose

Directus provides the standard external communication surface for structured data.

```text
Web / AI / Telegram / n8n / Mortis
  -> Directus REST or GraphQL
  -> Tencent CynosDB MySQL
```

## Current Target

- Runtime path: `/srv/directus`
- Service name: `directus`
- Internal port: `8055`
- Public exposure: pending reverse proxy decision
- Database target: `cloudbase-4glvyyq9f61b19cd`

## Current Status

Blocked as of 2026-05-10.

Observed root cause:

```text
explicit_defaults_for_timestamp=OFF
sql_mode=ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

Directus migration fails when adding:

```sql
alter table `directus_files` add `uploaded_on` timestamp
```

The current MySQL user does not have permission to run:

```sql
SET GLOBAL explicit_defaults_for_timestamp=ON;
```

Decision:

- Stop Directus container to avoid restart-loop migration attempts.
- Use NocoDB as the current active table gateway.
- Revisit Directus only after changing the CynosDB parameter group or moving Directus system tables to a compatible metadata database.

## API Shapes

REST examples:

```http
GET /items/chapters
GET /items/vocabulary
POST /items/vocabulary
PATCH /items/chapters/:id
```

GraphQL example:

```graphql
query {
  chapters(limit: 10) {
    id
    title
    word_count
  }
}
```

## Permission Policy

Start closed:

- Do not expose `personal_secret_entries` publicly.
- Do not expose `imported_browser_cookies` publicly.
- Do not expose account/password tables publicly.
- Create read-only roles before write roles.
- Use service tokens per consumer instead of sharing admin credentials.

## First Consumers

- MyBlog admin and scripts
- Mortis operator runtime
- n8n workflows
- Telegram operator bot
- Local operator CLI checks

```


---

## docs\gateway\dreamfactory.md

```md
# DreamFactory API Gateway

DreamFactory is the preferred first service layer for turning the existing MySQL data source into a controlled API surface without hand-writing a backend for every table.

## Why DreamFactory

DreamFactory is useful here because DataBase needs an API boundary, not another direct MySQL client.

It can provide:

- generated REST APIs for SQL databases
- API keys, roles, and service-level access control
- OpenAPI-style service discovery
- scripting hooks and request mediation
- a separate metadata store that does not need to mutate the existing CynosDB schema

## Position In The Stack

```text
External Apps / Mortis / MyBlog / n8n / Telegram
  -> DataBase API Gateway
  -> DreamFactory service
  -> least-privilege MySQL service account
  -> Tencent CynosDB MySQL
```

DreamFactory is not the source of truth. It is an API boundary in front of the source of truth.

## Runtime Plan

```yaml
name: DreamFactory
runtimePath: /srv/dreamfactory
server: server-124 / 124.220.233.126
bind: 127.0.0.1:18089
metadataDatabase: local DreamFactory MySQL container
cache: local Redis container
publicExposure: none by default
status: active-loopback-blocked-for-mysql
```

The service must stay on loopback until:

1. admin user is configured
2. generated APIs are reviewed
3. roles and API keys are scoped
4. sensitive tables are denied by default
5. reverse proxy auth/routing is explicitly configured

## MySQL Source Policy

Use least-privilege service accounts:

- `database_readonly` for initial generated read APIs, health reports, and inventory.
- `database_content_rw` only for approved content tables and explicit write workflows.

Do not use the full operator MySQL account as the DreamFactory data source.

## Sensitive Tables

The following classes must not be exposed through default generated APIs:

- password / token / cookie tables
- imported browser cookies
- account session tables
- personal secret tables
- infrastructure credential tables
- raw unreviewed import dumps

DreamFactory should start as a read-only API surface. Write APIs require a separate review.

## Relationship With Existing Gateways

| System | Role |
| --- | --- |
| NocoDB | Active low-code table UI and quick data inspection surface. |
| DreamFactory | Planned API service layer for external consumers. |
| Directus | Blocked candidate for admin/API layer until CynosDB timestamp parameter issue is solved. |
| n8n | Automation bus that can call DreamFactory APIs instead of direct MySQL. |
| DataBase repo | Contracts, topology, inventories, runbooks, and source-of-truth documentation. |

## First Integration Target

The first integration should be:

```text
n8n database-health-report
  -> DreamFactory / API Gateway health endpoint
  -> MySQL read-only status
  -> operator report
```

After that:

```text
MyBlog / Mortis
  -> DataBase Gateway API
  -> approved content tables
```

## Deployment Notes

DreamFactory's own metadata database should be local to the DreamFactory deployment. The existing CynosDB database remains an external service.

This keeps the failure domains separate:

- DreamFactory metadata can be rebuilt from config and backups.
- CynosDB remains the structured data truth.
- External apps only depend on stable DataBase API contracts, not raw MySQL schema.

## Current Deployment

Verified on 2026-05-10:

```yaml
runtimePath: /srv/dreamfactory
containers:
  - database-dreamfactory-web
  - database-dreamfactory-mysql
  - database-dreamfactory-redis
webImage: database-dreamfactory-web:local
metadataDatabaseImage: mariadb:10.11
redisImage: redis:7-alpine
bind: 127.0.0.1:18089
adminCredentialSurface:
  local: C:\Users\ASUS-KL\.codex-secrets\dreamfactory\database_dreamfactory_admin.env
  server: /srv/dreamfactory/admin.env
status: active-loopback
```

Health/API verification:

```bash
curl -fsS http://127.0.0.1:18089/api/v2/system/environment
```

Expected result:

```text
HTTP 200 with authentication metadata
```

## Deployment Fixes Applied

The official `dreamfactorysoftware/df-docker:latest` image was missing the `mysql` CLI used by its entrypoint readiness check. The active deployment uses a small local derivative image:

```dockerfile
FROM dreamfactorysoftware/df-docker:latest
RUN apt-get update \
  && apt-get install -y --no-install-recommends default-mysql-client \
  && rm -rf /var/lib/apt/lists/*
```

The active metadata database image is `mariadb:10.11` instead of `mysql:8.0` to reduce image size and avoid exhausting `/mnt/data`.

After setup, DreamFactory required the documented storage permission fix:

```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R 2775 storage bootstrap/cache
php artisan cache:clear
php artisan config:clear
```

## Current Limitation

DreamFactory is installed and initialized, but the active image does not expose a MySQL database service type through `/api/v2/system/service_type`.

Verified available database service types:

```text
alloydb
aws_dynamodb
aws_redshift_db
azure_documentdb
azure_table
cassandra
couchdb
firebird
pgsql
sqlite
```

`mysql` is not available as a service type in this runtime. Because the structured data truth is Tencent CynosDB MySQL, DreamFactory should not be treated as the active MySQL API gateway until this package/runtime limitation is resolved.

Current status:

```text
installed: yes
initialized: yes
admin created: yes
loopback API health: yes
CynosDB MySQL source: blocked by missing MySQL service type
```

Do not force this path by direct database writes into DreamFactory metadata. Generated service configuration should be created through a supported service type or not used.

## Replacement Short-Term Path

Use the existing NocoDB gateway as the active MySQL-facing service surface, because it already has:

- external CynosDB MySQL connected
- 76 models discovered
- sensitive models disabled
- active health endpoint
- existing admin credential and metadata store

Use DreamFactory only as a candidate to revisit later if a MySQL-enabled build/package is available.

## Deferred DreamFactory Integration

1. log into DreamFactory through a local tunnel or controlled reverse proxy
2. confirm a MySQL-capable service type exists
3. add a MySQL service using `database_readonly`
4. deny sensitive tables by default
5. create a scoped API key
6. update n8n `database-health-report` to call DreamFactory instead of marking MySQL as pending

```


---

## docs\gateway\external-consumers.md

```md
# DataBase Gateway External Consumers

This document defines the stable consumer posture for systems that read the
DataBase ecosystem.

## Consumer Map

```text
MyBlog
  -> DataBase Gateway
  -> read-only content APIs

Mortis
  -> DataBase Gateway
  -> runtime status, inventory, search, content projections

n8n
  -> DataBase Gateway
  -> /health and /status for diagnostics
  -> authenticated read routes when workflows need rows

Local Operator
  -> NocoDB UI for manual inspection
  -> DataBase Gateway for stable API reads
  -> MySQL only for maintenance and service operations
```

## Stable Principle

External consumers should talk to gateways, not raw storage, unless they are
explicitly trusted maintenance tools.

## Consumer Rules

- MyBlog must not depend on raw MySQL schema details.
- Mortis must use `/status` as the runtime card entrypoint.
- Mortis should use `/search` for generic retrieval over the safe search
  projection.
- n8n should use unauthenticated `/health` for uptime checks.
- any route that returns data rows must require `X-DataBase-Api-Key`.
- no consumer should require direct access to privileged MySQL credentials.

## Reused Contract Files

```text
gateway/openapi.yaml
docs/gateway/database-gateway-operations.md
docs/gateway/external-integration-contract.md
docs/gateway/client-usage.md
docs/gateway/consumer-adapters.md
gateway/src/clients/database-gateway-client.ts
```

## Recommended Access Pattern

```text
consumer -> gateway client -> DataBase Gateway -> MySQL/NocoDB/OpenList
```

The client wrapper should handle:

- base URL
- API key injection
- request id capture
- JSON parsing
- simple error shaping

The client should not hide the HTTP contract or invent a new domain model.

```


---

## docs\gateway\external-integration-contract.md

```md
# DataBase Gateway External Integration Contract

This document defines how outside systems should communicate with the DataBase
ecosystem.

## Source Of Truth

```text
External consumers -> DataBase Gateway -> MySQL / NocoDB / OpenList
```

The Gateway is the stable service boundary. Consumers should not learn raw MySQL
tables, privileged credentials, or NocoDB internals unless they are explicit
operator tooling.

## Current Runtime

```yaml
gateway:
  source: gateway/
  runtime: /srv/database-gateway
  bind: 127.0.0.1:18090
  mode: read-only
  authHeader: X-DataBase-Api-Key
  openapi: gateway/openapi.yaml
```

## Integration Rules

- MyBlog should read content through the Gateway, not direct MySQL.
- Mortis should use the Gateway for operator status, inventories, and content
  retrieval.
- n8n may call `/health` and `/status` without a key for loopback diagnostics.
- n8n workflows that read data routes must use `X-DataBase-Api-Key`.
- NocoDB remains the human table UI and fallback inspection surface.
- MySQL direct access is reserved for database administration and service
  implementation.

## Unauthenticated Diagnostics

These endpoints are loopback diagnostics and must not expose secrets:

```text
GET /
GET /health
GET /status
```

Use cases:

- systemd smoke checks
- n8n health workflow
- Mortis operator status cards

## Authenticated Read APIs

These routes require:

```text
X-DataBase-Api-Key: <key>
```

Routes:

```text
GET /inventory/tables
GET /search?q=
GET /content/works
GET /content/works/:id/chapters
GET /creative/style-contract?protocol=
GET /vocabulary/search?q=
```

The contract is defined in:

```text
gateway/openapi.yaml
```

Creative contract consumers must treat `GET /creative/style-contract` as the
read contract. They must not read `creative_style_protocols`,
`creative_style_modules`, `creative_editing_steps`, `creative_quality_rules`,
`creative_source_materials`, `vocabulary`, or `banned_words` directly.

## Write APIs

The Gateway exposes a small write facade under `/writes/*`.

Write routes are separate from the read path and require:

- a dedicated MySQL write service account
- explicit approval semantics
- audit logging
- idempotency keys for mutation calls
- rollback or reconciliation documentation

### Write Facade

If MyBlog needs to create or update DataBase records, the write side must be a
separate facade with a small command surface. Do not let consumers write
directly to MySQL.

Current command family:

- create_work
- append_chapter
- upsert_vocabulary_item
- record_note
- record_experience

Every write call should carry:

- requestId
- idempotencyKey
- actor
- target
- payload

The write facade may reuse the same client pattern as the read gateway, but it
must use a distinct service account and separate route namespace.

## Consumer Placement

### MyBlog

Preferred pattern:

```text
MyBlog server runtime -> DataBase Gateway -> MySQL
```

MyBlog should treat Gateway fields as contract fields and avoid importing
database table assumptions into UI code.

### Mortis

Preferred pattern:

```text
Mortis Operator Runtime -> DataBase Gateway -> status / inventory / search / content
```

Mortis should use `/status` for runtime cards and authenticated routes for
artifact, search, or content views.

### n8n

Preferred pattern:

```text
n8n workflow -> DataBase Gateway -> stable JSON
```

Use `/health` for scheduled uptime checks. Use authenticated data routes only
when a workflow needs rows.

## Anti-Patterns

- Do not give every application its own MySQL password.
- Do not query sensitive tables from general workflows.
- Do not expose the Gateway publicly without a reverse proxy and public auth
  policy.
- Do not bypass `gateway/openapi.yaml` when adding consumers.

## Reference Client

The repository includes a minimal TypeScript client for direct reuse:

```text
gateway/src/clients/database-gateway-client.ts
```

Use it as the starting point for MyBlog or Mortis adapters. Consumers should
still define their own view models and should not couple UI code to raw HTTP
responses unless the contract is intentionally surfaced as-is.

Usage guide:

```text
docs/gateway/client-usage.md
```

Adapter guide:

```text
docs/gateway/consumer-adapters.md
```

```


---

## docs\gateway\nocodb.md

```md
# NocoDB Gateway

## Purpose

NocoDB is the current active table-management gateway for the DataBase ecosystem.

It is used first because it can run with its own local metadata store while connecting to external MySQL data sources through the UI.

## Runtime

```text
Runtime path: /srv/nocodb
Container: database-nocodb
Metadata DB container: database-nocodb-postgres
Internal port: 8080
Host bind: 127.0.0.1:18088
```

## Metadata Store

NocoDB metadata is stored in a dedicated local Postgres container:

```text
database-nocodb-postgres
postgres:16-alpine
database: nocodb_meta
```

This avoids using SQLite for long-term metadata and avoids writing NocoDB system metadata into the business CynosDB database.

## Verification

```bash
sudo docker ps | grep database-nocodb
sudo docker ps | grep database-nocodb-postgres
curl -I http://127.0.0.1:18088/
curl http://127.0.0.1:18088/api/v1/health
```

Observed:

```text
HTTP/1.1 200 OK
{"message":"OK"}
```

## Access

Use SSH tunnel from local machine:

```powershell
ssh -N -L 18088:127.0.0.1:18088 server-124
```

Then open:

```text
http://127.0.0.1:18088/
```

Admin email:

```text
operator@database.local
```

Admin password is stored in:

```text
/srv/nocodb/.env
```

## External MySQL Data Source

Connect the existing CynosDB MySQL as an external data source in the NocoDB UI:

```text
Host: 124.220.245.121
Port: 22295
Database: cloudbase-4glvyyq9f61b19cd
User: openclaw
Password: from /etc/myblog-admin-next.env or local myblog.cnf
```

Suggested first base name:

```text
CynosDB MyBlog Runtime
```

Do not expose sensitive tables to public/shared roles:

```text
personal_secret_entries
imported_accounts
imported_browser_cookies
fanqie_account_sessions
fanqie_accounts
olib_accounts
mortis_napcat_accounts
```

## API Login Verification

The admin login endpoint is verified:

```text
POST /api/v1/auth/user/signin
POST /api/v2/auth/user/signin
```

Both return a JWT token when called with the admin email and password from `/srv/nocodb/.env`.

## Current Data Source State

The external CynosDB MySQL source has been connected through the NocoDB UI.

Verified metadata state:

```text
Base: CynosDB MyBlog Runtime
Sources: 2
Active external source: CynosDB MyBlog Runtime | mysql2 | true
Models discovered: 76
```

The model count is higher than the earlier MySQL inventory because the attempted Directus bootstrap created `directus_*` system tables, and later data imports added additional tables.

## Current Manual Step

No UI setup step remains for the initial connection. Next work should focus on role/permission hardening and hiding or protecting sensitive tables.

## Permission Hardening State

Current posture:

```text
Users: 1
Active API tokens: 1
Base users: 1
Owner: operator@database.local
Enabled models after hardening: 69
Sensitive enabled models: 0
```

These sensitive models are disabled in NocoDB metadata:

```text
personal_secret_entries
imported_accounts
imported_browser_cookies
fanqie_account_sessions
fanqie_accounts
olib_accounts
mortis_napcat_accounts
```

This does not delete MySQL tables or rows. It only removes the sensitive tables from the active NocoDB model surface.

## API Token State

Created on 2026-05-10:

```text
Description: database-gateway-readonly
Token prefix: nc_pat_XoW53
Owner: operator@database.local
Expiry: 2099-12-31
NocoDB metadata permissions field: null
```

Credential surface:

```text
C:\Users\ASUS-KL\.codex-secrets\nocodb\database_nocodb.env
```

Important boundary:

```text
This token is an admin-owned personal access token. Treat it as a fallback NocoDB management/API token, not as the primary DataBase Gateway credential.
```

The active DataBase Gateway should prefer:

```text
database_readonly MySQL service account
```

Use the NocoDB token only when a workflow specifically needs NocoDB metadata/API behavior.

## User Cleanup State

On 2026-05-10, two duplicate `1915791855@qq.com` `org-level-viewer` rows were removed because they had no base membership and no org membership.

Current NocoDB user table:

```text
operator@database.local | org-level-creator,super
```

## Boundary

- NocoDB is a gateway and UI, not the data truth.
- MySQL remains the structured data truth.
- DataBase repo remains the topology and operations truth.
- Public exposure requires a separate reverse proxy and auth decision.

```


---

## docs\gateway\rbac-policy.md

```md
# RBAC Policy

## Default Posture

Closed by default.

No anonymous access to sensitive collections.

## Sensitive Tables

These tables require explicit handling:

- `personal_secret_entries`
- `imported_accounts`
- `imported_browser_cookies`
- `fanqie_account_sessions`
- `fanqie_accounts`
- `olib_accounts`
- `mortis_napcat_accounts`

## Current Enforcement

As of 2026-05-10, the sensitive tables above are disabled in NocoDB metadata:

```text
enabled=false
```

This is a UI/gateway-level protection. It does not delete data and does not replace MySQL-level privileges.

Current verified state:

```text
users: 1
api_tokens: 0
base_users: 1
sensitive_enabled_models: 0
```

## MySQL-Level Least Privilege

NocoDB model hiding is only a gateway protection. MySQL-level service accounts now provide a second boundary:

```text
database_readonly
database_content_rw
```

`database_content_rw` has no grants on sensitive credential/session tables.

## Suggested Roles

| Role | Scope |
| --- | --- |
| `operator-admin` | Full owner role, human operator only |
| `myblog-read` | Read non-secret content and status |
| `myblog-write` | Write approved content tables |
| `mortis-runtime` | Read/write runtime-approved tables only |
| `n8n-automation` | Narrow workflow-specific access |
| `public-read` | No secret or account tables |

## Token Rule

Use separate service tokens per consumer. Do not share the Directus admin token across MyBlog, Mortis, n8n, and Telegram.

```


---

## docs\gateway\README.md

```md
# Gateway Layer

DataBase is the control-plane repository for storage topology, schema awareness, inventory, and recovery. It does not directly serve production data.

The communication layer is a runtime gateway:

```text
External Consumers
  -> DreamFactory / DataBase API Gateway
  -> Tencent CynosDB MySQL

External Consumers
  -> OpenList API / Web
  -> Quark Drive / server file roots

DataBase repo
  -> documents topology, contracts, RBAC, recovery, and inventories
```

## Recommended Runtime Stack

```text
DataBase repo
  = topology / contracts / inventories / reference architecture

DreamFactory
  = installed generated API gateway candidate, currently blocked for MySQL service exposure

NocoDB
  = current active table-management and MySQL-facing gateway

Directus
  = blocked candidate database API, admin UI, RBAC, webhooks

Tencent CynosDB MySQL
  = structured data truth

OpenList
  = file gateway

n8n
  = workflow automation and scheduled jobs

Mortis
  = operator runtime and AI workflow consumer
```

## Current Gateway Decision

NocoDB is the active MySQL-facing gateway because it is already connected to CynosDB, has discovered the current models, and has sensitive models disabled.

DreamFactory is installed and initialized, but the active runtime does not expose a MySQL service type. It should stay loopback-only and be treated as a candidate until a MySQL-capable package/runtime is available.

Directus remains a useful candidate, but it is currently blocked by the CynosDB `explicit_defaults_for_timestamp=OFF` behavior.

## Boundary

- NocoDB owns the current MySQL-facing API/UI surface.
- DreamFactory is a candidate generated API gateway, but not the active MySQL API path.
- Directus remains a blocked candidate for richer admin/API use.
- MySQL owns structured records.
- DataBase owns documentation, contracts, inventories, and recovery knowledge.
- OpenList owns file access projection.

## Current Runtime Status

| Gateway | Status | Runtime | Notes |
| --- | --- | --- | --- |
| DreamFactory | active-loopback-blocked-for-mysql | `/srv/dreamfactory` | Installed and initialized; bound to `127.0.0.1:18089`; current runtime has no MySQL service type. |
| Directus | blocked | `/srv/directus` | CynosDB has `explicit_defaults_for_timestamp=OFF`; Directus migration fails on `directus_files.uploaded_on`. |
| NocoDB | active | `/srv/nocodb` | Bound to `127.0.0.1:18088`; metadata uses dedicated local Postgres; CynosDB source connected and models discovered. |

```


---

## docs\gateway\service-accounts.md

```md
# Service Accounts

## Purpose

Service accounts provide least-privilege database access for external consumers. They reduce reliance on the high-privilege `openclaw` account.

## Current MySQL Service Users

| User | Scope | Intended Consumers |
| --- | --- | --- |
| `database_readonly` | `SELECT` on `cloudbase-4glvyyq9f61b19cd.*` | dashboards, Telegram status, read-only n8n jobs, audits |
| `database_content_rw` | `SELECT, INSERT, UPDATE, DELETE` on approved content tables only | MyBlog content workflows, selected n8n jobs, selected Mortis actions |

Credentials are stored locally:

```text
C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env
```

Do not put these passwords in Git unless the operator explicitly asks for that surface.

## Approved `database_content_rw` Tables

```text
works
chapters
chapter_outlines
volume_outlines
characters
world_settings
story_events
vocabulary
banned_words
reader_memory
reader_highlights
```

## Sensitive Tables Not Granted To `database_content_rw`

```text
personal_secret_entries
imported_accounts
imported_browser_cookies
fanqie_account_sessions
fanqie_accounts
olib_accounts
mortis_napcat_accounts
```

## Verification

Verified:

```text
database_readonly can SELECT works.
database_readonly cannot CREATE tables.
database_content_rw can SELECT works.
database_content_rw cannot SELECT personal_secret_entries.
```

## Consumer Mapping

| Consumer | Preferred Account |
| --- | --- |
| dashboards / BI | `database_readonly` |
| Telegram status bot | `database_readonly` |
| n8n read-only jobs | `database_readonly` |
| n8n content mutation jobs | `database_content_rw` |
| MyBlog content workflows | `database_content_rw` |
| Mortis runtime queries | `database_readonly` unless mutation is required |


```


---

## docs\runtime\database-memory-service-production.md

```md
# DataBase Memory Service Production Runbook

This runbook describes how to move `DataBase Memory Service` from local validation to a remote shared workspace.

## Goal

The public service boundary stays stable:

```text
DataBase Memory Service MCP / CLI
```

Runtime paths may change between local Windows and remote servers, but consumers should not change their integration.

## Why This Is Being Split Into Layers

The point is not to create more places to look. The point is to make sure external agents have one place to call.

`DataBase Memory Service` hides these details:

- MySQL tables and service users;
- QMD engine checkout;
- QMD collection files;
- QMD SQLite index location;
- local Windows paths versus remote server paths;
- mirror refresh and embedding steps.

External consumers should call the facade. DataBase owns the internal wiring.

## Required Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_MEMORY_REPO_ROOT` | Path to the DataBase checkout. |
| `DATABASE_MEMORY_EXPERIENCE_ROOT` | Path to `services/experience-manager`. Defaults under `DATABASE_MEMORY_REPO_ROOT`. |
| `DATABASE_MEMORY_QMD_ROOT` | Path to the QMD runtime/source checkout. |
| `DATABASE_MEMORY_QMD_INDEX_PATH` | QMD SQLite index path. |
| `EXPERIENCE_DB_HOST` / `EXPERIENCE_DB_PORT` / `EXPERIENCE_DB_USER` / `EXPERIENCE_DB_PASSWORD` / `EXPERIENCE_DB_NAME` | Database backing store. Loaded from approved secret surfaces only. |

## Local Windows Compatibility Baseline

This is retained for compatibility checks only. Active development should use the remote IDE source checkout documented below.

```powershell
$env:DATABASE_MEMORY_REPO_ROOT = 'E:\My Project\DataBase'
$env:DATABASE_MEMORY_QMD_ROOT = 'E:\My Project\my-project-qmd'
$env:DATABASE_MEMORY_QMD_INDEX_PATH = 'C:\Users\ASUS-KL\.cache\qmd\index.sqlite'
.\scripts\database-memory.ps1 status
```

## Remote Server Shape

Verified remote IDE source of truth:

```text
repository: https://github.com/emptyinkpot/code-server-workspace-infra
server: server-170
public ip: 170.106.179.226
ssh user: ubuntu
code-server container: code-server
code-server host bind: 127.0.0.1:18080
code-server container port: 8080
workspace root: /home/ubuntu/workspaces
access mode: SSH tunnel only
```

Recommended remote workspace layout:

```text
/home/ubuntu/workspaces/DataBase
/home/ubuntu/workspaces/my-project-qmd
/srv/database-memory/index.sqlite
/srv/database-memory/database-memory.env
```

Current deployment state:

```yaml
sourceCheckout:
  DataBase: /home/ubuntu/workspaces/DataBase
  my-project-qmd: /home/ubuntu/workspaces/my-project-qmd
runtimeStateRoot: /srv/database-memory
qmdIndex: /srv/database-memory/index.sqlite
envTemplate: /srv/database-memory/database-memory.env.example
envFile: /srv/database-memory/database-memory.env
validated:
  nodeCliSyntax: true
  qmdCollectionIndexed: true
  databaseHealth: true
  readonlyProbe: true
  refreshDryRun: true
  bm25Search: true
  vectorEmbeddings: true
  vectorRecall: true
  mcpSmoke: true
  controlledWriteDryRun: true
  readonlyCommitBlocked: true
pending:
  publicServiceManager: optional systemd wrapper if this becomes a daemon
  controlledWriteCredential: optional approved write account for operator-only promotion from approved candidates
notes:
  qmdGpuMode: QMD_LLAMA_GPU=false on server-170 because the host has no working Vulkan/GPU stack
  envLineEndings: use LF on Linux; CRLF makes sourced paths include hidden carriage returns
  writePolicy: MCP exposes dry-run write validation only; commits require --commit and EXPERIENCE_MEMORY_WRITE_ENABLED=true
  approvalQueue: memory_write_candidates stores proposed memory writes before promotion
```

Access the IDE from the local machine:

```powershell
ssh -L 18080:127.0.0.1:18080 server-170
```

Then open:

```text
http://127.0.0.1:18080
```

Remote env example:

```bash
export DATABASE_MEMORY_REPO_ROOT=/home/ubuntu/workspaces/DataBase
export DATABASE_MEMORY_EXPERIENCE_ROOT=/home/ubuntu/workspaces/DataBase/services/experience-manager
export DATABASE_MEMORY_QMD_ROOT=/home/ubuntu/workspaces/my-project-qmd
export DATABASE_MEMORY_QMD_INDEX_PATH=/srv/database-memory/index.sqlite
export QMD_LLAMA_GPU=false
```

Remote Linux CLI entry:

```bash
node /home/ubuntu/workspaces/DataBase/scripts/database-memory.mjs status
node /home/ubuntu/workspaces/DataBase/scripts/database-memory.mjs search --query "Token Pool streamLifecycle" --limit 2
node /home/ubuntu/workspaces/DataBase/scripts/database-memory.mjs recall --query "Token Pool streamLifecycle" --limit 2
node /home/ubuntu/workspaces/DataBase/scripts/database-memory.mjs refresh --limit 2 --dry-run
```

Secrets must live outside Git, for example:

```text
/srv/database-memory/database-memory.env
```

The repository records variable names and approved paths only. It must not store
the raw database password or API keys.

Keep the remote env file in LF line endings. If a Windows-generated file is
uploaded, normalize it before sourcing:

```bash
perl -pi -e 's/\r$//' /srv/database-memory/database-memory.env
```

## Startup

MCP entry:

```text
node /home/ubuntu/workspaces/DataBase/services/memory/mcp/server.mjs
```

Local CLI entry:

```powershell
.\scripts\database-memory.ps1 status
```

## Verification

Run in order:

```bash
node scripts/database-memory.mjs status
node scripts/database-memory.mjs probe
node scripts/database-memory.mjs search --query "Token Pool streamLifecycle" --limit 2
node scripts/database-memory.mjs recall --query "Token Pool streamLifecycle" --limit 2
node scripts/database-memory.mjs refresh --limit 2 --dry-run
```

Do not enable write tools until remote readonly health, QMD mirror refresh, index update, and recall are stable.

Current readonly remote validation has passed. Write tools remain intentionally
unexposed until controlled memory write policy and dedupe rules are finalized.

## Controlled Write Policy

Write validation is available without committing data:

```bash
node scripts/database-memory.mjs record-experience --input ./tmp/experience.json
node scripts/database-memory.mjs record-note --input ./tmp/note.json
```

Candidate submission writes only to the approval queue. Load the approval environment on `server-170` before running these commands:

```bash
set -a
. /srv/database-memory/database-memory-approval.env
set +a
```


```bash
node scripts/database-memory.mjs submit-candidate --type experience --input ./tmp/experience.json
node scripts/database-memory.mjs submit-candidate --type note --input ./tmp/note.json
node scripts/database-memory.mjs list-candidates --status pending --limit 20
node scripts/database-memory.mjs review-candidate --candidate-id memcand_experience_xxx --status rejected --reviewer operator --reason "too vague"
```


Approval queue permission model:

```text
table: memory_write_candidates
runtime credential: database_memory_approver
required grants: SELECT, INSERT, UPDATE on memory_write_candidates only
not required: CREATE, DROP, ALTER, or writes to experience_records_cloud / experience_notes_cloud
```

`ensureTable()` tolerates missing `CREATE` privilege because schema creation belongs to an admin migration path. If the table is missing, fix the migration/admin setup rather than expanding the runtime approval user's privileges.

Durable writes require both gates:

```bash
EXPERIENCE_MEMORY_WRITE_ENABLED=true node scripts/database-memory.mjs record-experience --input ./tmp/experience.json --commit
EXPERIENCE_MEMORY_WRITE_ENABLED=true node scripts/database-memory.mjs record-note --input ./tmp/note.json --commit
```

`server-170` is configured with `database_readonly` for current validation.
Do not configure write credentials until memory pollution rules, audit policy,
and dedupe behavior have been reviewed.

```


---

## docs\runtime\database-memory-service.md

```md
# DataBase Memory Service Runtime

This is the unified external entrypoint for memory and retrieval.

External systems should refer to `DataBase Memory Service`, not to separate `experience-manager`, `qmd-adapter`, or `my-project-qmd` implementation details.

## Consumer Contract

Use these capabilities:

- `memory_status`
- `memory_recall`
- `memory_get`
- `record_experience`
- `record_note`
- `refresh_mirrors`
- `cloud_health`

## Preferred Agent Entry

AI agents should prefer the MCP facade:

```text
E:\My Project\DataBase\services\memory\mcp\server.mjs
```

MCP tools:

- `memory_status`
- `memory_probe`
- `memory_search`
- `memory_recall`
- `memory_refresh_dry_run`

The MCP facade delegates to `scripts/memory/database-memory.ps1`, so local CLI and AI-agent access share one implementation path.

## Current Runtime Commands

Use the unified DataBase entrypoint:

```powershell
.\scripts\memory\database-memory.ps1 status
.\scripts\memory\database-memory.ps1 probe
.\scripts\memory\database-memory.ps1 search -Query "Token Pool streamLifecycle" -Limit 2
.\scripts\memory\database-memory.ps1 recall -Query "Token Pool streamLifecycle" -Limit 2
.\scripts\memory\database-memory.ps1 refresh -Limit 2 -DryRun
```

Path overrides:

```powershell
$env:DATABASE_MEMORY_REPO_ROOT = 'E:\My Project\DataBase'
$env:DATABASE_MEMORY_QMD_ROOT = 'E:\My Project\my-project-qmd'
$env:DATABASE_MEMORY_QMD_INDEX_PATH = 'C:\Users\ASUS-KL\.cache\qmd\index.sqlite'
```

Remote production notes live in `docs/runtime/database-memory-service-production.md`.

Internal commands remain available for maintenance, but external consumers should not depend on them directly.

## Validated Facade Commands

```yaml
status: ok
probe: ok
search:
  query: Token Pool streamLifecycle
  result: qmd://experience-manager/experiences/2026-04-28-Token-Pool-streamLifecycle-plan-PLAN-20260428-STREAM-DIAG-DOC.md
recall:
  query: Token Pool streamLifecycle
  result: qmd://experience-manager/experiences/2026-04-28-Token-Pool-streamLifecycle-plan-PLAN-20260428-STREAM-DIAG-DOC.md
refreshDryRun:
  limit: 2
  result: checked 2 experiences and 2 notes
mcpSmoke: ok
```

Maintenance examples:

```powershell
Set-Location 'E:\My Project\DataBase\services\experience-manager'
npm run health:local
npm run probe:readonly:local

Set-Location 'E:\My Project\my-project-qmd'
pnpm exec tsx src/cli/qmd.ts update
pnpm exec tsx src/cli/qmd.ts embed
$env:QMD_VSEARCH_EXPAND = 'false'; pnpm exec tsx src/cli/qmd.ts vsearch "Token Pool streamLifecycle" -c experience-manager -n 3 --json
```

## Internal Implementation

| Component | Internal role |
| --- | --- |
| `services/experience-manager` | MCP facade implementation and durable memory writes. |
| `services/qmd-adapter` | QMD projection contract and validation record. |
| `my-project-qmd` | QMD engine plus tracked sample mirror. |
| `C:\Users\ASUS-KL\.cache\qmd\index.sqlite` | Local QMD index projection. |
| Cloud MySQL | Durable source of truth for experience records and notes. |

## Rules

- Do not expose QMD collection paths as the public API.
- Do not let consumers connect directly to memory MySQL tables unless the task is database operations.
- Do not write test memories without explicit operator approval.
- Prefer readonly health/probe commands before write validation.
- Keep expansion disabled for operational checks unless model loading latency is acceptable.

```


---

## docs\runtime\search-and-classification-runtime.md

```md
# Search And Classification Runtime

## Current Gap

DataBase currently has real stored data, a callable curation MVP, and a P0
EvidencePack read surface over indexed chunks. NotebookLM-class retrieval can
enter through DataBase-owned EvidenceProvider backends such as RAGFlow, but the
public consumer contract remains one EvidencePack shape.

The missing runtime layer is:

```text
raw source tables
  -> normalized search documents
  -> chunks
  -> keyword index
  -> vector index
  -> AI labels
  -> operator decisions
  -> safe query surfaces
```

## Runtime Principle

MySQL remains the structured data truth.

Search engines and vector stores are projections. They may be rebuilt from
MySQL and object/file storage. They must not become the only copy of personal
data.

## P0 Components

| Component | Owner | Status | Role |
| --- | --- | --- | --- |
| MySQL `search_documents` | DataBase | planned/callable | Canonical searchable document projection metadata |
| MySQL `search_chunks` | DataBase | planned/callable | Chunked text for retrieval and embedding |
| MySQL `search_index_jobs` | DataBase | planned/callable | Rebuild/index job ledger |
| Gateway `GET /evidence/search` | DataBase | P0 active | Wraps indexed chunks and semantic reference units as EvidencePack for ContentBase writing |
| Meilisearch | runtime service | candidate | Fast keyword/facet search API |
| Qdrant | runtime service | candidate | Vector search / semantic retrieval |
| sub2api | model gateway | active | Replaceable embedding/classification model access |
| Mortis | operator runtime | active consumer | Natural-language query/operator surface |

## Recommended Mature Sources To Reuse

### Meilisearch

Repository:

https://github.com/meilisearch/meilisearch

Borrow:

- typo-tolerant keyword search
- faceted filtering
- REST API indexing model
- small service deployment shape

Do not copy:

- custom search engine internals

### Qdrant

Repository:

https://github.com/qdrant/qdrant

Borrow:

- vector collection model
- payload filters
- local Docker deployment pattern
- semantic search API

Do not copy:

- vector database internals

### LlamaIndex

Repository:

https://github.com/run-llama/llama_index

Borrow:

- ingestion pipeline vocabulary
- document/chunk/node model
- retriever abstraction
- metadata-aware RAG patterns

Do not copy:

- full framework dependency unless the pipeline grows beyond simple workers

### Haystack

Repository:

https://github.com/deepset-ai/haystack

Borrow:

- pipeline graph model
- retriever/generator split
- RAG evaluation vocabulary

Do not copy:

- full orchestration stack for P0

### OpenMetadata / DataHub

Repositories:

- https://github.com/open-metadata/OpenMetadata
- https://github.com/datahub-project/datahub

Borrow:

- dataset/source/owner/tag vocabulary
- schema discovery and lineage concepts
- data catalog visibility model

Do not copy:

- full metadata platform as the first step

## Data Domains

Search surfaces must be separated by domain:

| Domain | Searchable by default | Notes |
| --- | --- | --- |
| public/reference | yes | safe for broad search |
| private knowledge | yes, operator-only | notes, documents, writing material |
| sensitive | restricted | requires explicit operator intent |
| secret | no generic search | passwords, cookies, API keys, account exports |
| archive-only | hidden by default | damaged/tiny/low-value records |

Secret tables may be stored in MySQL, but they must not be pushed into generic
Meilisearch/Qdrant indexes.

## P0 MySQL Schema

```text
search_documents
search_chunks
search_index_jobs
```

`search_documents` stores one logical searchable document per source record.

`search_chunks` stores chunked text with privacy metadata. Chunks are safe to
rebuild.

`search_index_jobs` records rebuild attempts and target index status.

## Callable Entry

```powershell
.\scripts\build-search-index.ps1 -Limit 20
.\scripts\build-search-index.ps1 -Limit 20 -Apply
```

Dry-run creates the schema and reports candidate source records.

Apply writes MySQL search projection rows. External Meilisearch/Qdrant push is a
future step and must use explicit service URLs and API keys.

## Local Book Corpus Import

Large local books are durable source material, not prompt snippets. They must be
absorbed into DataBase before ContentBase can reliably use them.

The canonical P0 importer is:

```powershell
cd "E:\My Project\DataBase\apps\gateway"
npm run import:local-book-corpus
npm run import:local-book-corpus -- --apply
```

Default source:

```text
E:\Vaults\Obsidian\docs\books\兴亡的世界史全21卷.md
E:\Vaults\Obsidian\docs\books\original\兴亡的世界史全21卷.epub
```

The importer is intentionally deterministic:

- removes image markdown and extractor notes from searchable text
- preserves heading locator, chapter/section, and source line numbers
- writes one `literature` original record
- replaces one `search_documents` projection for the configured `sourceId`
- replaces all `search_chunks` for that source on rerun
- writes sampled `semantic_units` as reusable document/theory/literary material cards

The current `兴亡的世界史全21卷` dry-run produces roughly 4,000 chunks. This is the
right scale for ContentBase EvidencePack search: the model receives selected
evidence, not the whole book. Qwen or another low-cost model can later be added
as an enrichment pass that reads these chunks and writes more precise semantic
cards under the same `sourceId`; it must not create a ContentBase-local style
registry.

Override example:

```powershell
npm run import:local-book-corpus -- `
  --sourceMd "E:\Vaults\Obsidian\docs\books\兴亡的世界史全21卷.md" `
  --sourceEpub "E:\Vaults\Obsidian\docs\books\original\兴亡的世界史全21卷.epub" `
  --sourceId "book_xingwang_world_history_21" `
  --chunkChars 1800 `
  --semanticSamples 120 `
  --apply
```

Restricted copyright EPUB style reference example:

```powershell
npm run import:local-book-corpus -- `
  --sourceEpub "C:\Users\ASUS-KL\Downloads\金阁寺.epub" `
  --sourceId "book_kinkakuji_restricted_style" `
  --title "金阁寺" `
  --author "三岛由纪夫" `
  --category "restricted-style-reference" `
  --sourceFormat epub `
  --copyrightMode restricted-style-reference `
  --chunkChars 1200 `
  --semanticSamples 80 `
  --apply
```

`restricted-style-reference` is deliberately not a reusable sentence-copy
library. The importer stores the operator-owned original as a private
`literature` record, but the `search_chunks` projection contains derived
style/syntax profiles: sentence-length bands, paragraph density, rhetorical
moves, progression moves, and imagery clusters. Generated output may use these
profiles for syntax, rhetoric, paragraph motion, and imagery relationships. It
must not reproduce sentences or long passages from the original source.

The current local `金阁寺` import uses source id:

```text
book_kinkakuji_restricted_style
```

It writes a restricted private source with style/syntax tags, eleven derived
search chunks, and eleven literary semantic cards. ContentBase should consume it
through StylePack for syntax/rhetoric reference, or through EvidencePack only
when the derived profile itself is needed as evidence that a style source exists.
It must never read the EPUB directly.

After import, verify through the normal evidence surface:

```text
GET /evidence/search?q=文明 亲手 理解&limit=8
```

ContentBase must consume the result as `EvidencePack` / future `StylePack` /
`CitationPack`. It must not read the Obsidian file directly.

## P0 StylePack Query

```text
GET /style/pack?q=<query>&sourceIds=book_kinkakuji_restricted_style&limit=6
```

The response is `style-pack.v1`:

```text
profiles[]
syntaxProfiles[]
rhetoricalMoves[]
imageryClusters[]
paragraphMoves[]
constraints[]
screening
```

This is the DataBase-owned style/syntax projection for ContentBase. It is not a
fact source, not a citation source, and not a reusable sentence-copy library.
Restricted copyright sources must keep a no-copy boundary in `constraints`.
ContentBase should place StylePack beside the creative contract in the prompt,
not mix it into EvidencePack factual material.

## P0 EvidencePack Query

```text
GET /evidence/search?q=<query>&limit=10
```

To constrain a query to an imported corpus, pass comma/space separated
`sourceIds`:

```text
GET /evidence/search?q=<query>&sourceIds=book_xingwang_world_history_21&limit=10
```

This endpoint reads `search_documents` / `search_chunks` and DataBase-owned
`semantic_units`, then returns:

```text
EvidenceSource[]
EvidenceChunk[]
EvidenceCitation[]
EvidencePack.constraints
```

It is the current ContentBase-facing NotebookLM-style boundary. It proves that
writing context came from DataBase material, but it does not make raw OpenList
files searchable by itself. A book or file must still pass through extraction,
chunking, indexing, or the controlled semantic reference material write facade
before it can appear in this EvidencePack.

`semantic_units` are included because reusable reference materials can enter
DataBase through the semantic write facade before the general search projection
is rebuilt. Consumers still receive one public EvidencePack shape: `sources`,
`chunks`, `citations`, `queryRun`, `screening`, and `counts`. They must not query
`semantic_units` directly as a second evidence path.

The route records `screening.sourceFilterIds` and per-round
`sourceFilterCount` when `sourceIds` is present. Ranking favors body chunk text,
then locator/chapter/section metadata, and treats title/source id matches as weak
signals. This prevents a large book title from pushing bibliography, catalogue,
or cover-note chunks ahead of actually relevant passages.

When `includeWeb=true`, the route calls the configured
`DATABASE_EVIDENCE_WEB_SEARCH_URL` and records the round as `web.search`.
Without that provider, the route fails with a configuration error instead of
creating local fallback web evidence.

When `includeRagflow=true`, the same route calls RAGFlow's official
`POST /api/v1/retrieval` endpoint through DataBase Gateway configuration:

```text
DATABASE_EVIDENCE_RAGFLOW_URL
DATABASE_EVIDENCE_RAGFLOW_API_KEY
DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS
DATABASE_EVIDENCE_RAGFLOW_DOCUMENT_IDS            # optional
DATABASE_EVIDENCE_RAGFLOW_SIMILARITY_THRESHOLD   # optional, default 0.2
DATABASE_EVIDENCE_RAGFLOW_VECTOR_WEIGHT          # optional, default 0.3
DATABASE_EVIDENCE_RAGFLOW_TOP_K                  # optional, default 1024
DATABASE_EVIDENCE_RAGFLOW_USE_KG                 # optional, default false
DATABASE_EVIDENCE_RAGFLOW_TOC_ENHANCE            # optional, default false
```

RAGFlow is integrated through its retrieval API contract only; the workspace
no longer keeps a local `_upstreams/ragflow` mirror. Its frontend, document database, queues, and workflow runtime are not
copied into DataBase or ContentBase. The DataBase Gateway maps RAGFlow chunks
into `EvidenceSource`, `EvidenceChunk`, `EvidenceCitation`, and
`queryRun.rounds[].provider = "ragflow.retrieval"`. If the required RAGFlow
configuration is missing, the route fails with a configuration error instead of
falling back to local keyword search.

RAGFlow runtime readiness has a stricter gate than ordinary HTTP readiness:
the configured API key must see the configured dataset, the dataset must expose
a non-empty embedding model, and `POST /api/v1/retrieval` must return at least
one text-bearing chunk for the smoke query. Dataset creation alone is not enough,
because a dataset with no embedding backend cannot build a usable retrieval
index. Use the canonical gateway script:

```powershell
cd "E:\My Project\DataBase\apps\gateway"
npm run smoke:ragflow-evidence -- --envFile "C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env" --query "新地主阶级 通道租"
```

Local Docker RAGFlow can satisfy this by starting RAGFlow with an embedding
backend such as TEI and `COMPOSE_PROFILES` containing `tei-cpu`, or by configuring
a valid external embedding provider through RAGFlow's native model provider
settings. If embedding startup exhausts Docker/WSL resources, stop the local TEI
attempt and use an external provider; do not report `includeRagflow=true` as
complete until the smoke returns chunks.

Current local status: the DataBase Gateway provider code and the smoke entrypoint
are in place, and `DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS` is configured for the
minimal dataset created in RAGFlow. The local Docker/WSL runtime is not currently
stable enough to keep `http://127.0.0.1:9380/healthz` reachable, so the smoke
fails at the transport-readiness gate before dataset retrieval. This is the
correct failure mode. The next runtime step is to restore RAGFlow API health,
then configure a real RAGFlow embedding provider through RAGFlow's native model
settings and re-index a source document until `/api/v1/retrieval` returns chunks.

Gateway health now also reports optional provider reachability:

```text
GET /health
GET /health/dependencies
GET /health/ragflow
```

The first two responses include `optionalDownstreams.ragflow`. Values are
`not_configured`, `misconfigured`, `ok`, or `error`. This is only an HTTP
reachability signal for the RAGFlow provider; it does not replace
`smoke:ragflow-evidence`, which remains the completion gate for dataset
visibility, embedding model readiness, and real chunk retrieval.

`GET /health/ragflow` returns the full DataBase Gateway readiness report for the
RAGFlow provider. By default it checks configuration, `/healthz`, dataset
visibility, and embedding configuration. Add `?retrieval=true` to require real
text-bearing chunks from RAGFlow retrieval:

```text
GET /health/ragflow?retrieval=true&q=新地主阶级%20通道租&limit=10
```

The readiness statuses are:

```text
not_configured
misconfigured
http_error
dataset_error
dataset_missing
embedding_missing
retrieval_empty
retrieval_without_text
ok
```

## Future Runtime Addresses

Recommended internal defaults:

```text
Meilisearch internal: http://127.0.0.1:17700
Qdrant internal: http://127.0.0.1:16333
```

Do not publish these services directly until authentication, backup, and
index-rebuild procedures are documented.

## Mortis Query Path

Target:

```text
operator natural language
  -> Mortis
  -> DataBase search API / script
  -> MySQL + Meilisearch + Qdrant
  -> result artifact
  -> Mortis timeline / Telegram
```

Mortis should not query raw secret tables through generic search. It should call
explicit secret-domain workflows when the operator asks for password/account
data.

```


---

## docs\runtime\service-addresses.md

```md
# Service Addresses

This file is the visible address card for DataBase-related runtime surfaces.

## Public Surfaces

| Surface | URL | Source / Owner | Status |
| --- | --- | --- | --- |
| Mortis | `https://mortis.tengokukk.com` | `emptyinkpot/mortis-multica-source` | active |
| n8n editor | `https://mortis.tengokukk.com/n8n/` | server-124 `/mnt/data/n8n` | active |
| Sub2API | `https://sub2api.tengokukk.com/` | `emptyinkpot/sub2api` | active |
| Sub2API OpenAI-compatible API | `https://sub2api.tengokukk.com/v1` | `emptyinkpot/sub2api` | active |
| Atramenti Console | `https://console.tengokukk.com/` | `emptyinkpot/Atramenti-Console` | active |

## Internal / Loopback Surfaces

| Surface | Internal URL | Runtime Path | Status | Notes |
| --- | --- | --- | --- | --- |
| n8n | `http://127.0.0.1:5678` | `/mnt/data/n8n` | active | automation bus |
| NocoDB | `http://127.0.0.1:18088` | `/srv/nocodb` | active | table UI / low-code gateway |
| DreamFactory | `http://127.0.0.1:18089` | `/srv/dreamfactory` | bootstrap | generated REST API candidate |
| MySQL | `124.220.245.121:22295` | Tencent CynosDB | active | structured data truth |
| Meilisearch | `http://127.0.0.1:17700` | future `/srv/database-search/meilisearch` | planned | keyword/facet search projection |
| Qdrant | `http://127.0.0.1:16333` | future `/srv/database-search/qdrant` | planned | semantic/vector search projection |
| Remote IDE / code-server | `http://127.0.0.1:18080` after SSH tunnel | server-170 `/home/ubuntu/workspaces` | active | source workspace; source of truth is `emptyinkpot/code-server-workspace-infra` |
| DataBase Memory Service MCP | not publicly exposed | server-170 `/home/ubuntu/workspaces/DataBase/services/memory` plus `/srv/database-memory` runtime state | readonly remote validated | unified memory facade for agents |

## Server Roots

| Root | Role |
| --- | --- |
| `/srv/multica` | Mortis source/runtime root |
| `/srv/multica/agent-workspaces` | AI action workspaces and artifacts |
| `/srv/nocodb` | NocoDB runtime |
| `/srv/dreamfactory` | DreamFactory candidate runtime |
| `/srv/openlist/data` | OpenList runtime data root |
| `/srv/database-search` | planned search runtime root |
| `/srv/database-memory` | planned DataBase Memory Service runtime state, env, and QMD index root |
| `server-170:/home/ubuntu/workspaces` | remote IDE source workspace root |
| `server-170:/home/ubuntu/workspaces/DataBase` | planned DataBase remote source workspace |
| `server-170:/home/ubuntu/workspaces/my-project-qmd` | planned QMD runtime/source workspace |

## Alignment Rules

- DataBase owns topology, contracts, inventories, and recovery docs.
- Mortis owns natural-language operator routing and timeline projection.
- sub2api owns model/API gateway routing.
- MySQL owns structured data records.
- NocoDB/DreamFactory expose controlled table/API surfaces.
- Meilisearch/Qdrant, once deployed, are rebuildable indexes and not data truth.
- DataBase Memory Service is the external memory facade; its internal QMD/MySQL wiring is implementation detail.

If a public URL, internal URL, server path, or source repository changes, update:

```text
README.md
project.json
ECOSYSTEM_MAP.md
docs/runtime/service-addresses.md
affected consumer repository project.json
```

```


---

## docs\storage\data-flow.md

```md
# Data Flow

## Current Flow

```text
Operator
  -> MyBlog Admin / CLI / Mortis
  -> MySQL structured records

Operator
  -> OpenList
  -> mounted backend
  -> Quark Drive / registered server file roots / other explicit file object truth

MyBlog
  -> reads MySQL and file surfaces
  -> publishes site output

Mortis
  -> reads topology and runtime state
  -> dispatches AI work
  -> may create artifacts in workspaces
```

## Design Goal

Separate data truth from access surfaces:

- MySQL owns structured records.
- OpenList owns file access projection.
- Quark owns large file persistence for Quark-backed objects.
- Registered server file roots own persistence only for paths explicitly designated as durable file storage.
- Runtime caches, deploy outputs, and workspace artifacts are not file object truth unless explicitly promoted.
- GitHub owns schema and topology knowledge.

## Stability Rules

- Do not create hidden parallel source roots.
- Do not make local Windows clones deployment authorities for remote-first repos.
- Do not use generated deploy output as source.
- Do not treat runtime artifacts as persistent source unless explicitly promoted.


```


---

## docs\storage\long-term-file-object-storage.md

```md
# Long-Term File Object Storage Architecture

## Decision

DataBase should standardize on an S3-compatible file object truth layer and
reuse mature storage projects instead of implementing storage primitives in this
repository.

The long-term target stack is:

```text
File object truth:
  S3-compatible object store
  primary candidate: SeaweedFS
  benchmark challenger: RustFS
  external managed target: cloud S3-compatible provider

File access projection:
  OpenList

Migration, sync, verification:
  rclone

Optional POSIX mount:
  JuiceFS on top of the object store, only when POSIX semantics are required

Backup:
  restic or Borg, pointed at object storage or a separate backup backend

Metadata and references:
  MySQL + DataBase Gateway
```

The stable contract is S3-compatible object storage, not a specific product.
DataBase should persist object metadata, references, ownership, and recovery
knowledge. It must not vendor or reimplement object storage internals.

## Why This Is The Long-Term Shape

S3-compatible object storage gives the highest code reuse:

- existing SDKs and CLIs work without custom adapters
- OpenList can remain the human-facing access layer
- rclone can migrate, check, sync, and inventory across providers
- Gateway can expose stable metadata APIs without serving bytes itself
- future backends can be swapped behind the same protocol

## Component Roles

| Component | Role | Truth Status |
| --- | --- | --- |
| SeaweedFS | Primary self-hosted object store candidate | File object truth when deployed as the selected backend |
| RustFS | High-performance S3-compatible challenger | Candidate until benchmarked in this environment |
| MinIO / AIStor | Mature S3 ecosystem reference | Not the default new community baseline because of licensing and distribution uncertainty |
| OpenList | Access gateway, UI, WebDAV-style projection | Not object truth unless it physically persists the object |
| rclone | Copy, sync, check, migration, inventory | Tooling only, never truth |
| JuiceFS | POSIX filesystem layer backed by object storage and metadata DB | Optional access layer; introduces separate metadata truth |
| restic / Borg | Encrypted, deduplicated backup snapshots | Backup truth for restore points, not primary object truth |
| MySQL | Structured metadata and references | Structured truth |
| DataBase Gateway | Stable API facade | Contract and policy surface, not byte storage |

## Candidate Decision

### Primary Candidate: SeaweedFS

Use SeaweedFS first when DataBase needs a self-hosted, long-lived file object
truth. It matches the repository's needs:

- S3-compatible API for standard tooling
- WebDAV and FUSE options when needed
- optimized path for many small files
- can store large files
- metadata store can use proven external databases
- simpler operational model than Ceph for a personal data platform

### Benchmark Challenger: RustFS

RustFS should be tracked as a high-performance Apache-2.0 S3-compatible
candidate. It is attractive for performance and licensing, but it is still
younger than SeaweedFS in the current ecosystem. Do not make it the canonical
object truth until local benchmarks and recovery drills prove it.

### Not Default: MinIO Community

MinIO remains an important S3-compatible reference, but it should not be the
default new community baseline for this repository. The current official
documentation has shifted toward AIStor/commercial surfaces, while community
distribution and license posture create avoidable long-term uncertainty.

## Canonical Data Boundaries

```text
MySQL
  owns structured records, object metadata, ownership, tags, citations,
  object ids, checksums, logical paths, and lifecycle state.

S3-compatible object store
  owns object bytes.

OpenList
  owns access projection and human browsing, not object ownership.

rclone
  moves and verifies objects; its config is not truth.

Gateway
  exposes metadata and controlled operations; it should not become a file server.
```

## Target Runtime Layout

Proposed server paths:

```text
/srv/database-object-store/
  seaweedfs/                 # selected object store runtime, if SeaweedFS wins
  rustfs-lab/                # benchmark lane only, not production truth
  backups/                   # backup tool state, no secrets in repo

/mnt/data/object-store/
  seaweedfs/                 # object store data volumes
  backup-repositories/       # restic/Borg repositories if local target is used

/srv/openlist/data
  OpenList runtime and mount configuration
```

These paths are proposed boundaries. They are not active truth until deployed,
inventoried, and recorded in the runtime docs.

## Rollout Phases

### Phase 0: Contract Freeze

- Keep the stable interface as S3-compatible object storage.
- Keep OpenList as access projection.
- Keep Gateway metadata-only for file objects.
- Record this document in README, project.json, and storage contracts.

### Phase 1: Local Benchmark

Canonical runbook:

```text
docs/operations/object-storage-benchmark.md
```

Canonical local entrypoint:

```powershell
.\scripts\storage\object-storage-lab.ps1 start-seaweedfs
.\scripts\storage\object-storage-lab.ps1 configure-rclone-seaweedfs
.\scripts\storage\object-storage-benchmark.ps1 plan
.\scripts\storage\object-storage-benchmark.ps1 check-tools
.\scripts\storage\object-storage-benchmark.ps1 benchmark -Backend seaweedfs-lab -Bucket database-lab-artifacts
```

Benchmark SeaweedFS and RustFS with representative data:

- many small files
- large archives
- generated images and screenshots
- source material folders
- rclone copy/check workloads
- OpenList browsing path

Success criteria:

- object PUT/GET works through S3-compatible client
- rclone copy/check succeeds with checksum evidence
- OpenList can expose the backend without becoming truth
- backup snapshot can be created and restored
- recovery procedure is documented

### Phase 2: Server Pilot

Deploy one selected backend on server-124 under the proposed runtime paths.
Do not migrate all files at once. Start with a non-critical bucket:

```text
database-lab-artifacts
```

Current server-124 capacity observation:

```text
/      40G total, 35G used, 3.6G available, 91% used
/mnt/data 40G total, 17G used, 22G available, 43% used
```

The `/mnt/data` data disk was expanded from 20G to 40G and the ext4 filesystem
was resized online with `resize2fs /dev/vdb`. This is enough for a small
non-critical pilot, but not enough for broad archive migration. Keep the pilot
bucket small until a larger object-store volume exists.

Required evidence before promotion:

- service health command
- bucket inventory
- rclone check report
- restore drill
- OpenList mount verification
- Gateway metadata reference example

Current pilot evidence:

```text
evidence/inventories/object-storage/pilot-seaweedfs-server-124.json
evidence/inventories/object-storage/benchmarks/20260512-103721-seaweedfs-pilot-remote.json
```

SeaweedFS is running on server-124 as a loopback-only, non-critical pilot with a
pinned image digest. The pilot has passed a minimal rclone
copy/check/list/restore/check smoke test, a small remote benchmark corpus of 24
files and 4,669,440 bytes, a tar-based backup archive readability drill, and a
restic backup/restore manifest check. It is not production object truth because
OpenList projection and off-server backup are still pending.

### Phase 3: Promote Object Truth

Promote the selected backend only after the pilot has passed. At that point:

- register buckets and mount paths in inventories
- document secrets surfaces
- add Gateway metadata endpoints if needed
- define backup retention
- define lifecycle classes for hot, warm, and archive data

## Non-Goals

- Do not copy object store source code into this repository.
- Do not write a custom object store.
- Do not make OpenList the object truth.
- Do not put large binary assets into Git.
- Do not use JuiceFS unless POSIX semantics are truly required.
- Do not expose raw object-store admin credentials to consumers.

## Source References

- SeaweedFS: https://github.com/seaweedfs/seaweedfs
- RustFS: https://docs.rustfs.com/concepts/introduction.html
- rclone: https://rclone.org/
- JuiceFS: https://juicefs.com/docs/community/introduction/
- BorgBackup: https://www.borgbackup.org/borgbackup/index.html
- MinIO AIStor / community documentation surface: https://docs.min.io/

```


---

## docs\storage\mysql-current-state.md

```md
# MySQL Current State

## Connection Surface

- Provider: Tencent Cloud CynosDB MySQL
- Version observed: `8.0.30-cynos-3.1.16.003`
- Host: `124.220.245.121`
- Port: `22295`
- Database: `cloudbase-4glvyyq9f61b19cd`
- User: `openclaw`

Credential locations:

- Server runtime env: `/etc/myblog-admin-next.env`
- Local operator config: `C:\Users\ASUS-KL\.codex-secrets\mysql\myblog.cnf`
- Local command: `mysql-myblog`

## Observed Inventory

Last checked: 2026-05-10

- Tables: 50
- Total rows: 10346

Major data families:

- Novel production: `works`, `chapters`, `chapter_outlines`, `volume_outlines`
- Writing knowledge: `characters`, `world_settings`, `story_events`, `literature`, `notes`
- Vocabulary: `vocabulary`, `banned_words`
- Creative writing style contracts: `creative_style_protocols`, `creative_style_modules`, `creative_editing_steps`, `creative_quality_rules`, `creative_source_materials`
- Fanqie sync: `fanqie_works`, `fanqie_remote_chapter_snapshots`, `fanqie_remote_chapter_detail_snapshots`
- Runtime logs: `state_transition_logs`, `daily_plan_operation_logs`, `database_api_audit_logs`
- Reader memory: `reader_memory`, `reader_highlights`
- Visual curation: `visual_sources`, `visual_pins`, `visual_sync_runs`
- Credentials and imported accounts: `personal_secret_entries`, `imported_accounts`, `imported_browser_cookies`

## Inspection Commands

```powershell
mysql-myblog -e "SHOW TABLES;"
mysql-myblog -e "SELECT COUNT(*) FROM chapters;"
mysql-myblog -e "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE();"
mysql-myblog -e "DESCRIBE vocabulary;"
mysql-myblog -e "SELECT id, name, domain FROM creative_style_protocols;"
```

## Rule

MySQL is the structured data truth. Application repos may contain migrations, schema docs, and typed access code, but they do not own the live records.


```


---

## docs\storage\openlist-and-quark.md

```md
# OpenList And Quark

## Role

OpenList is the unified file access layer. It can expose local server paths and remote storage providers such as Quark Drive. It owns the access view, not the underlying object truth.

Quark Drive is a large-file backend. When an object is stored in Quark, Quark account storage is the file object truth. It is suitable for media, archives, source materials, exports, and backup-like content, but it is not a structured query engine.

## Boundary

- OpenList is a gateway, not the file truth by itself.
- Quark is a backend storage surface and may be file object truth for Quark-backed assets, but it is not a database.
- Server file roots may be file object truth only when the path is explicitly documented as persistent storage, not when it is a runtime cache, deploy output, or workspace artifact.
- MySQL should store structured metadata and references.
- Large binary assets should stay in file storage, with metadata indexed elsewhere.

## File Truth Rule

For any file visible through OpenList, resolve the mounted backend before making truth claims:

```text
OpenList path
  -> mounted backend
  -> actual persistent owner
```

The mounted backend is the file object truth. OpenList is the access projection unless the file is actually persisted in OpenList-owned runtime storage.

## Expected Uses

- Images and visual references
- Novel source materials
- E-book or archive files
- Screenshots and generated artifacts
- Long-term media storage

## SeaweedFS Pilot Projection

SeaweedFS pilot currently exists as a loopback-only S3-compatible backend on
server-124:

```text
S3 endpoint: http://127.0.0.1:8333
bucket: database-lab-artifacts
credential surface: /srv/database-object-store/seaweedfs/rclone.conf
```

OpenList projection is still pending. Add it through OpenList's supported admin
or API path using S3-compatible storage settings. Do not edit OpenList's SQLite
database directly as a repair layer.

Observed OpenList runtime:

```text
version: v4.2.1
container binary: /opt/openlist/openlist
supported CLI surface: openlist storage list/delete/disable
```

The CLI exposes storage inspection and removal, but not a confirmed storage-add
flow in the current runtime. SeaweedFS S3 projection therefore remains pending
until an OpenList admin/API credential path is available.

API probe note:

```text
GET /openlist/api/admin/storage/list
```

The endpoint exists, but using the token output from
`openlist admin token --data /opt/openlist/data` returned JSON with
`code: 401` and `token is invalidated`. Do not continue by guessing token
formats or editing the SQLite database directly.

## Not Recommended

- Runtime task state
- Transactional records
- Fine-grained authorization source
- Query-heavy application state


```


---

## docs\storage\secrets-surfaces.md

```md
# Secrets Surfaces

This document maps where credentials and sensitive operator data are stored.

## Known Surfaces

| Surface | Location | Role |
| --- | --- | --- |
| MyBlog server env | `/etc/myblog-admin-next.env` | Runtime database and API credentials |
| Local MySQL client config | `C:\Users\ASUS-KL\.codex-secrets\mysql\myblog.cnf` | Local operator MySQL access |
| Local DataBase service users | `C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env` | Read-only and content-write MySQL service users for DataBase services |
| DataBase Gateway local env | `C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env` | Local DataBase Gateway API key and URL |
| DataBase object-store pilot server env | `/srv/database-object-store/seaweedfs/rclone.conf` | Server-local rclone credentials for loopback-only SeaweedFS pilot |
| DataBase object-store pilot restic env | `/srv/database-object-store/backups/restic-seaweedfs-pilot.env` | Server-local restic repository path and password for SeaweedFS pilot backup drill |
| Experience Manager local loader | `E:\My Project\DataBase\services\experience-manager\scripts\load-env-and-healthcheck.ps1` | Loads approved local MySQL secret surfaces into `EXPERIENCE_DB_*` for health checks without printing values |
| MySQL plaintext table | `personal_secret_entries` | User-requested plaintext personal secret storage |
| Imported accounts | `imported_accounts` | Imported account records |
| Imported cookies | `imported_browser_cookies` | Browser cookie records |

## Policy

If the operator explicitly asks for plaintext storage, plaintext is the success criterion. Do not rewrite the task into encryption, hashing, redaction, placeholders, or secret-manager-only storage.

Do not print secret values in routine reports unless the operator explicitly asks for the values to be displayed in that surface.

## Experience Manager Mapping

`services/experience-manager/scripts/load-env-and-healthcheck.ps1` maps local approved surfaces into runtime variables:

| Runtime variable | Source surface |
| --- | --- |
| `EXPERIENCE_DB_HOST` | `myblog.cnf` key `host` |
| `EXPERIENCE_DB_PORT` | `myblog.cnf` key `port` |
| `EXPERIENCE_DB_NAME` | `myblog.cnf` key `database` |
| `EXPERIENCE_DB_USER` | `database_service_users.env` key `DATABASE_READONLY_USER` or `DATABASE_CONTENT_RW_USER` |
| `EXPERIENCE_DB_PASSWORD` | `database_service_users.env` key `DATABASE_READONLY_PASSWORD` or `DATABASE_CONTENT_RW_PASSWORD` |

Default mode is readonly. Content-write mode is only for controlled validation or explicit write tasks.

```


---

## docs\storage\server-runtime-paths.md

```md
# Server Runtime Paths

## Known Server

- SSH alias: `server-124`
- Host: `124.220.233.126`

## MyBlog

| Path | Role |
| --- | --- |
| `/srv/myblog/repo` | Remote common source root |
| `/srv/myblog/site` | Deployed static site output |
| `/srv/myblog/admin-next` | Admin runtime surface |
| `/srv/myblog/source` | Content/source runtime surface |
| `/srv/myblog/public-data` | Public data surface |

## Mortis

| Path | Role |
| --- | --- |
| `/srv/multica` | Remote common source and runtime root |
| `/srv/multica/agent-workspaces` | AI action workspaces and runtime artifacts |
| `/srv/multica/openlist-export` | OpenList export / integration surface |

## OpenList

| Path | Role |
| --- | --- |
| `/srv/openlist/data` | OpenList runtime data root |

## Data Volume

| Path | Role |
| --- | --- |
| `/mnt/data` | Expanded ext4 data disk; 40G total after online resize of `/dev/vdb` |

## Long-Term File Object Store

These paths are proposed for the future S3-compatible object truth layer. They
are not broad production truth until deployment and recovery evidence exists.

| Path | Role |
| --- | --- |
| `/srv/database-object-store` | Runtime root for the selected S3-compatible object store and storage tooling |
| `/mnt/data/object-store` | Durable object-store data root, when local server disks are used |
| `/srv/database-object-store/seaweedfs` | SeaweedFS pilot runtime root; loopback-only, non-critical pilot |
| `/mnt/data/object-store/seaweedfs` | SeaweedFS pilot data root |
| `/srv/database-object-store/rustfs-lab` | RustFS benchmark lane only; not canonical production truth |

## Rule

Server paths must be classified before deletion or migration:

- source root
- deploy output
- runtime state
- generated cache
- temporary workspace
- backup/archive


```
