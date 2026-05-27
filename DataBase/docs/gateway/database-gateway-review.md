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
