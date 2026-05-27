# Public HTTP Gateway Plan

## Decision

The public Database service should use a database-first domain, not a MyBlog domain.

Recommended public host:

```text
database.tengokukk.com
```

Reserved future API-only host:

```text
api.database.tengokukk.com
```

Do not use `api.blog.tengokukk.com` for the generic DataBase service. That name implies the API belongs to MyBlog, while the intended product is a reusable DataBase Gateway that MyBlog, Mortis, future apps, and external readers can all consume.

## Runtime Shape

```text
External client
  -> https://database.tengokukk.com
  -> Nginx TLS reverse proxy
  -> 127.0.0.1:18090
  -> DataBase Gateway
  -> MySQL / NocoDB / OpenList-adjacent data services
```

## Public vs Protected Routes

Unauthenticated public probes:

- `GET /`
- `GET /health`
- `GET /status`

Data route authentication is controlled by `DATABASE_GATEWAY_AUTH_REQUIRED`. The default is `false`, so data routes do not require a key unless the switch is enabled.

When enabled, routes require:

```text
X-DataBase-Api-Key: <key>
```

Data routes:

- `GET /inventory/tables`
- `GET /content/works`
- `GET /content/works/:id/chapters`
- `GET /vocabulary/search?q=`
- `GET /search?q=`
- `POST /writes/*`

## Public Documentation Goal

The service should make it possible to inspect the database from other projects without downloading the runtime environment.

Minimum public docs surface:

- `README.md`
- `API.md`
- `openapi.yaml`
- `docs/gateway/client-usage.md`
- `docs/gateway/public-http-gateway.md`

## DNS Requirement

Create an A record:

```text
database.tengokukk.com -> 124.220.233.126
```

Current check on 2026-05-10 found no DNS answer for:

- `database.tengokukk.com`
- `db.tengokukk.com`
- `data.tengokukk.com`
- `api.database.tengokukk.com`

## TLS Requirement

After DNS resolves, issue a certificate on the server:

```bash
sudo certbot --nginx -d database.tengokukk.com
```

## Mature References

This gateway follows the mature pattern used by:

- Directus: API-first data platform over a database
- NocoDB: REST API and UI over SQL tables
- PostgREST: REST API directly over PostgreSQL
- Supabase: hosted database platform with REST/GraphQL/Auth/Storage layers

Recommended principle:

```text
Database is the source.
HTTP API is the access boundary.
Docs/OpenAPI/SDK are the consumption layer.
Apps are clients, not new truth sources.
```

## MyBlog Relationship

MyBlog should not own the generic database API.

Correct relationship:

```text
DataBase Gateway
  -> generic HTTP database service

MyBlog
  -> one consumer/client of DataBase Gateway
```

MyBlog may keep its local `/api/runtime/*` routes for reader memory and UI state, but cross-project data access should move through `database.tengokukk.com`.
