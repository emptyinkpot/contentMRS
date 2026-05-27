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
