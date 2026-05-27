# DataBase Gateway

Thin read-only API facade for the DataBase ecosystem.

Canonical plan:

```text
docs/gateway/database-gateway-p0.md
```

## Public Gateway

The generic public host should be:

```text
database.tengokukk.com
```

Do not use `api.blog.tengokukk.com` for this service; MyBlog is only one consumer.

See:

```text
docs/gateway/public-http-gateway.md
docs/gateway/client-usage.md
API.md
```

## P0 Routes

```text
GET /
GET /health
GET /status
GET /inventory/tables
GET /content/works
GET /content/works/:id/chapters
GET /creative/style-contract?protocol=
GET /vocabulary/search?q=
GET /search?q=
```

`GET /`, `GET /health`, and `GET /status` are unauthenticated internal probes.

Data route authentication is controlled by `DATABASE_GATEWAY_AUTH_REQUIRED`. The default is `false`, so data routes do not require a key unless the switch is enabled.

When enabled, routes require:

```text
X-DataBase-Api-Key: <key>
```

OpenAPI contract:

```text
openapi.yaml
https://database.tengokukk.com/openapi.yaml
```

Client guide:

```text
docs/gateway/client-usage.md
```

Consumer adapters:

```text
docs/gateway/consumer-adapters.md
```

## Local Development

Copy `.env.example` to `.env` and fill credentials from:

```text
C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env
```

Then:

```bash
npm install
npm run dev
```

## Production Runtime

Target server runtime:

```text
/srv/database-gateway
127.0.0.1:18090
```

The service must stay loopback-only until auth and reverse proxy policy are explicitly configured.

API key secret surfaces:

```text
C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env
/srv/database-gateway/.env
```

## Smoke Test

```bash
DATABASE_GATEWAY_URL=http://127.0.0.1:18090 \
npm run smoke
```

The smoke test verifies:

- `/health` returns OK for required Gateway core dependencies
- `/health/dependencies` returns MySQL/schema health and optional downstream evidence
- `/status` exposes read-write runtime metadata
- auth switch matches `DATABASE_GATEWAY_AUTH_REQUIRED`
- `/inventory/tables` works without an API key when auth is disabled
- keyed write checks run when `DATABASE_GATEWAY_API_KEY` is provided

Reusable client:

```text
gateway/src/clients/database-gateway-client.ts
```

Node-ready client:

```text
gateway/src/clients/database-gateway-client.js
```

Generated OpenAPI client:

```text
npm run generate:client
generated/clients/database-gateway
```

The generated client is derived from `gateway/openapi.yaml`. It is a generated
consumer artifact, not a new API truth source.

Example:

```text
npm run example
```

The example expects the Gateway to be running on `DATABASE_GATEWAY_URL` or on
`http://127.0.0.1:18090`.

## Logs

The service writes JSON request logs to stdout. On the server:

```bash
journalctl -u database-gateway -n 100 --no-pager
```
