# n8n Workflows

This file records the intended workflow catalog for the DataBase automation bus. It should be updated when a workflow is imported, renamed, disabled, or removed.

## Naming Convention

Workflow names should use stable lowercase IDs:

```text
database-health-report
database-inventory-refresh
telegram-db-status
nocodb-health-report
openlist-storage-check
```

Each workflow should include:

- trigger surface
- credential or service account used
- systems touched
- output artifact
- failure behavior
- operator command, if any

## Active External Workflows

These workflows already exist in the shared n8n instance and are not owned by DataBase:

| Workflow ID | Purpose | Owner |
| --- | --- | --- |
| `mortis-smoke-gateway` | Mortis gateway smoke test | Mortis |
| `mortis-telegram-operator` | Telegram operator bridge | Mortis |

Do not rename or remove them from a DataBase task.

## Active DataBase Workflow: database-health-report

```yaml
workflowId: database-health-report
status: active
trigger: production webhook
endpoint: http://127.0.0.1:5678/webhook/database-health-report
credential: none yet
systems:
  - DataBase Gateway health endpoint
output:
  type: report
  destination:
- webhook JSON response
```

Current checks:

- DataBase Gateway `/health` returns OK
- MySQL status is delegated to DataBase Gateway
- NocoDB status is delegated to DataBase Gateway
- no DataBase Gateway API key is required for `/health`

Current output shape:

```text
DataBase Health
- DataBase Gateway: ok
- MySQL: ok
- NocoDB: ok
- OpenList: unknown
```

Verified on 2026-05-10 through:

```bash
curl -fsS http://127.0.0.1:5678/webhook/database-health-report
```

The workflow is intentionally read-only and currently stores no MySQL password in workflow JSON.

It also stores no DataBase Gateway API key because it only calls the unauthenticated loopback `/health` probe.

## Planned DataBase Workflow: database-inventory-refresh

```yaml
workflowId: database-inventory-refresh
trigger: manual or scheduled
credential: database_readonly
systems:
  - Tencent CynosDB MySQL
  - DataBase repo inventory files
output:
  type: inventory artifact
  destination:
    - inventories/mysql/table-inventory.json
```

This workflow should eventually refresh table counts and schema snapshots. The write-back to Git should be handled carefully: either through a dedicated Git automation credential or through Mortis as an approval-gated action.

## Planned DataBase Workflow: telegram-db-status

```yaml
workflowId: telegram-db-status
trigger: Telegram command /db-status
credential: database_readonly
systems:
  - Telegram Bot API
  - n8n
  - MySQL
  - NocoDB
output:
  type: short operator status
  destination:
    - Telegram
```

This workflow should be short and read-only. It should not expose passwords, tokens, cookies, or row-level sensitive content in Telegram messages.

## Planned DataBase Workflow: nocodb-health-report

```yaml
workflowId: nocodb-health-report
trigger: scheduled
credential: none for health endpoint, NocoDB token only if API metadata is needed
systems:
  - NocoDB
  - NocoDB metadata Postgres
output:
  type: health report
```

Expected checks:

- container is running
- health endpoint responds
- connected source remains `CynosDB MyBlog Runtime`
- sensitive models remain disabled

## Planned DataBase Workflow: openlist-storage-check

```yaml
workflowId: openlist-storage-check
trigger: scheduled or manual
credential: OpenList API token when available
systems:
  - OpenList
  - Quark Drive
  - server file roots
output:
  type: storage status report
```

Expected checks:

- OpenList service responds
- mounted storage roots are visible
- known critical folders are present
- recent error logs are summarized

## Import Safety

Before importing any workflow:

1. Export all existing workflows from n8n.
2. Confirm workflow names do not collide.
3. Use least-privilege credentials.
4. Test manually before enabling schedule or Telegram command triggers.
5. Record the imported workflow in this file.
