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
