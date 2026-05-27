# Service Accounts

## Purpose

Service accounts provide least-privilege database access for external consumers. They reduce reliance on the high-privilege `openclaw` account.

## Current MySQL Service Users

| User | Scope | Intended Consumers |
| --- | --- | --- |
| `database_readonly` | `SELECT` on `cloudbase-4glvyyq9f61b19cd.*` | dashboards, Telegram status, read-only n8n jobs, audits |
| `database_content_rw` | `SELECT, INSERT, UPDATE, DELETE` on approved content tables only | MyBlog content workflows, selected n8n jobs, selected Mortis actions |

Credentials are stored locally:

```text
C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env
```

Do not put these passwords in Git unless the operator explicitly asks for that surface.

## Approved `database_content_rw` Tables

```text
works
chapters
chapter_outlines
volume_outlines
characters
world_settings
story_events
vocabulary
banned_words
reader_memory
reader_highlights
```

## Sensitive Tables Not Granted To `database_content_rw`

```text
personal_secret_entries
imported_accounts
imported_browser_cookies
fanqie_account_sessions
fanqie_accounts
olib_accounts
mortis_napcat_accounts
```

## Verification

Verified:

```text
database_readonly can SELECT works.
database_readonly cannot CREATE tables.
database_content_rw can SELECT works.
database_content_rw cannot SELECT personal_secret_entries.
```

## Consumer Mapping

| Consumer | Preferred Account |
| --- | --- |
| dashboards / BI | `database_readonly` |
| Telegram status bot | `database_readonly` |
| n8n read-only jobs | `database_readonly` |
| n8n content mutation jobs | `database_content_rw` |
| MyBlog content workflows | `database_content_rw` |
| Mortis runtime queries | `database_readonly` unless mutation is required |

