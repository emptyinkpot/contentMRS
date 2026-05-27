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
