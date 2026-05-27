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
