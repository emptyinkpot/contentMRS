# NocoDB Deployment

## Runtime Path

```text
/srv/nocodb
```

## Compose Services

```text
database-nocodb
database-nocodb-postgres
```

## Bind

```text
127.0.0.1:18088 -> 8080
```

## Metadata Store

NocoDB metadata uses local Postgres:

```text
postgres:16-alpine
database: nocodb_meta
```

This is intentionally separate from the business CynosDB MySQL database.

## Operator Access

Open an SSH tunnel:

```powershell
ssh -N -L 18088:127.0.0.1:18088 server-124
```

Open:

```text
http://127.0.0.1:18088/
```

Admin email:

```text
operator@database.local
```

Admin password:

```text
/srv/nocodb/.env
```

## Health Check

```bash
curl http://127.0.0.1:18088/api/v1/health
```

Expected:

```json
{"message":"OK"}
```

## Connected Data Source

The external CynosDB MySQL data source has been added in the NocoDB UI:

```text
Host: 124.220.245.121
Port: 22295
Database: cloudbase-4glvyyq9f61b19cd
User: openclaw
```

Verified:

```text
Base: CynosDB MyBlog Runtime
Source: CynosDB MyBlog Runtime | mysql2 | true
Models discovered: 76
```

## Permission Hardening

Applied:

```text
Sensitive NocoDB models disabled: 7
Active API tokens: 0
Users: 1
Base users: 1
Enabled models after hardening: 69
```

Disabled sensitive models:

```text
personal_secret_entries
imported_accounts
imported_browser_cookies
fanqie_account_sessions
fanqie_accounts
olib_accounts
mortis_napcat_accounts
```

## Next Step

Create separate service tokens only when a concrete consumer is ready, such as n8n, Mortis, or Telegram. Each token should receive table-specific least privilege.
