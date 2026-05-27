# DreamFactory API Gateway

DreamFactory is the preferred first service layer for turning the existing MySQL data source into a controlled API surface without hand-writing a backend for every table.

## Why DreamFactory

DreamFactory is useful here because DataBase needs an API boundary, not another direct MySQL client.

It can provide:

- generated REST APIs for SQL databases
- API keys, roles, and service-level access control
- OpenAPI-style service discovery
- scripting hooks and request mediation
- a separate metadata store that does not need to mutate the existing CynosDB schema

## Position In The Stack

```text
External Apps / Mortis / MyBlog / n8n / Telegram
  -> DataBase API Gateway
  -> DreamFactory service
  -> least-privilege MySQL service account
  -> Tencent CynosDB MySQL
```

DreamFactory is not the source of truth. It is an API boundary in front of the source of truth.

## Runtime Plan

```yaml
name: DreamFactory
runtimePath: /srv/dreamfactory
server: server-124 / 124.220.233.126
bind: 127.0.0.1:18089
metadataDatabase: local DreamFactory MySQL container
cache: local Redis container
publicExposure: none by default
status: active-loopback-blocked-for-mysql
```

The service must stay on loopback until:

1. admin user is configured
2. generated APIs are reviewed
3. roles and API keys are scoped
4. sensitive tables are denied by default
5. reverse proxy auth/routing is explicitly configured

## MySQL Source Policy

Use least-privilege service accounts:

- `database_readonly` for initial generated read APIs, health reports, and inventory.
- `database_content_rw` only for approved content tables and explicit write workflows.

Do not use the full operator MySQL account as the DreamFactory data source.

## Sensitive Tables

The following classes must not be exposed through default generated APIs:

- password / token / cookie tables
- imported browser cookies
- account session tables
- personal secret tables
- infrastructure credential tables
- raw unreviewed import dumps

DreamFactory should start as a read-only API surface. Write APIs require a separate review.

## Relationship With Existing Gateways

| System | Role |
| --- | --- |
| NocoDB | Active low-code table UI and quick data inspection surface. |
| DreamFactory | Planned API service layer for external consumers. |
| Directus | Blocked candidate for admin/API layer until CynosDB timestamp parameter issue is solved. |
| n8n | Automation bus that can call DreamFactory APIs instead of direct MySQL. |
| DataBase repo | Contracts, topology, inventories, runbooks, and source-of-truth documentation. |

## First Integration Target

The first integration should be:

```text
n8n database-health-report
  -> DreamFactory / API Gateway health endpoint
  -> MySQL read-only status
  -> operator report
```

After that:

```text
MyBlog / Mortis
  -> DataBase Gateway API
  -> approved content tables
```

## Deployment Notes

DreamFactory's own metadata database should be local to the DreamFactory deployment. The existing CynosDB database remains an external service.

This keeps the failure domains separate:

- DreamFactory metadata can be rebuilt from config and backups.
- CynosDB remains the structured data truth.
- External apps only depend on stable DataBase API contracts, not raw MySQL schema.

## Current Deployment

Verified on 2026-05-10:

```yaml
runtimePath: /srv/dreamfactory
containers:
  - database-dreamfactory-web
  - database-dreamfactory-mysql
  - database-dreamfactory-redis
webImage: database-dreamfactory-web:local
metadataDatabaseImage: mariadb:10.11
redisImage: redis:7-alpine
bind: 127.0.0.1:18089
adminCredentialSurface:
  local: C:\Users\ASUS-KL\.codex-secrets\dreamfactory\database_dreamfactory_admin.env
  server: /srv/dreamfactory/admin.env
status: active-loopback
```

Health/API verification:

```bash
curl -fsS http://127.0.0.1:18089/api/v2/system/environment
```

Expected result:

```text
HTTP 200 with authentication metadata
```

## Deployment Fixes Applied

The official `dreamfactorysoftware/df-docker:latest` image was missing the `mysql` CLI used by its entrypoint readiness check. The active deployment uses a small local derivative image:

```dockerfile
FROM dreamfactorysoftware/df-docker:latest
RUN apt-get update \
  && apt-get install -y --no-install-recommends default-mysql-client \
  && rm -rf /var/lib/apt/lists/*
```

The active metadata database image is `mariadb:10.11` instead of `mysql:8.0` to reduce image size and avoid exhausting `/mnt/data`.

After setup, DreamFactory required the documented storage permission fix:

```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R 2775 storage bootstrap/cache
php artisan cache:clear
php artisan config:clear
```

## Current Limitation

DreamFactory is installed and initialized, but the active image does not expose a MySQL database service type through `/api/v2/system/service_type`.

Verified available database service types:

```text
alloydb
aws_dynamodb
aws_redshift_db
azure_documentdb
azure_table
cassandra
couchdb
firebird
pgsql
sqlite
```

`mysql` is not available as a service type in this runtime. Because the structured data truth is Tencent CynosDB MySQL, DreamFactory should not be treated as the active MySQL API gateway until this package/runtime limitation is resolved.

Current status:

```text
installed: yes
initialized: yes
admin created: yes
loopback API health: yes
CynosDB MySQL source: blocked by missing MySQL service type
```

Do not force this path by direct database writes into DreamFactory metadata. Generated service configuration should be created through a supported service type or not used.

## Replacement Short-Term Path

Use the existing NocoDB gateway as the active MySQL-facing service surface, because it already has:

- external CynosDB MySQL connected
- 76 models discovered
- sensitive models disabled
- active health endpoint
- existing admin credential and metadata store

Use DreamFactory only as a candidate to revisit later if a MySQL-enabled build/package is available.

## Deferred DreamFactory Integration

1. log into DreamFactory through a local tunnel or controlled reverse proxy
2. confirm a MySQL-capable service type exists
3. add a MySQL service using `database_readonly`
4. deny sensitive tables by default
5. create a scoped API key
6. update n8n `database-health-report` to call DreamFactory instead of marking MySQL as pending
