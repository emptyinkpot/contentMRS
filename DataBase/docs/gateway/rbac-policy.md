# RBAC Policy

## Default Posture

Closed by default.

No anonymous access to sensitive collections.

## Sensitive Tables

These tables require explicit handling:

- `personal_secret_entries`
- `imported_accounts`
- `imported_browser_cookies`
- `fanqie_account_sessions`
- `fanqie_accounts`
- `olib_accounts`
- `mortis_napcat_accounts`

## Current Enforcement

As of 2026-05-10, the sensitive tables above are disabled in NocoDB metadata:

```text
enabled=false
```

This is a UI/gateway-level protection. It does not delete data and does not replace MySQL-level privileges.

Current verified state:

```text
users: 1
api_tokens: 0
base_users: 1
sensitive_enabled_models: 0
```

## MySQL-Level Least Privilege

NocoDB model hiding is only a gateway protection. MySQL-level service accounts now provide a second boundary:

```text
database_readonly
database_content_rw
```

`database_content_rw` has no grants on sensitive credential/session tables.

## Suggested Roles

| Role | Scope |
| --- | --- |
| `operator-admin` | Full owner role, human operator only |
| `myblog-read` | Read non-secret content and status |
| `myblog-write` | Write approved content tables |
| `mortis-runtime` | Read/write runtime-approved tables only |
| `n8n-automation` | Narrow workflow-specific access |
| `public-read` | No secret or account tables |

## Token Rule

Use separate service tokens per consumer. Do not share the Directus admin token across MyBlog, Mortis, n8n, and Telegram.
