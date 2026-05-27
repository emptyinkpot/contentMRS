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
