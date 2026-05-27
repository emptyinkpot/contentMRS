# Directus Gateway

## Purpose

Directus provides the standard external communication surface for structured data.

```text
Web / AI / Telegram / n8n / Mortis
  -> Directus REST or GraphQL
  -> Tencent CynosDB MySQL
```

## Current Target

- Runtime path: `/srv/directus`
- Service name: `directus`
- Internal port: `8055`
- Public exposure: pending reverse proxy decision
- Database target: `cloudbase-4glvyyq9f61b19cd`

## Current Status

Blocked as of 2026-05-10.

Observed root cause:

```text
explicit_defaults_for_timestamp=OFF
sql_mode=ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

Directus migration fails when adding:

```sql
alter table `directus_files` add `uploaded_on` timestamp
```

The current MySQL user does not have permission to run:

```sql
SET GLOBAL explicit_defaults_for_timestamp=ON;
```

Decision:

- Stop Directus container to avoid restart-loop migration attempts.
- Use NocoDB as the current active table gateway.
- Revisit Directus only after changing the CynosDB parameter group or moving Directus system tables to a compatible metadata database.

## API Shapes

REST examples:

```http
GET /items/chapters
GET /items/vocabulary
POST /items/vocabulary
PATCH /items/chapters/:id
```

GraphQL example:

```graphql
query {
  chapters(limit: 10) {
    id
    title
    word_count
  }
}
```

## Permission Policy

Start closed:

- Do not expose `personal_secret_entries` publicly.
- Do not expose `imported_browser_cookies` publicly.
- Do not expose account/password tables publicly.
- Create read-only roles before write roles.
- Use service tokens per consumer instead of sharing admin credentials.

## First Consumers

- MyBlog admin and scripts
- Mortis operator runtime
- n8n workflows
- Telegram operator bot
- Local operator CLI checks
