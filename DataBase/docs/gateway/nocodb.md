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
