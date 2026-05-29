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

## Planned Content Workflow: novel-factory-generate-quality-publish

```yaml
workflowId: novel-factory-generate-quality-publish
status: active
definition: docs/automation/workflows/novel-factory-generate-quality-publish.json
trigger: production webhook
endpoint: http://127.0.0.1:5678/webhook/novel-factory-generate-quality-publish
credential:
  - CONTENTBASE_RUNTIME_URL
  - CONTENTBASE_RUNTIME_API_KEY
  - DATABASE_GATEWAY_URL
  - DATABASE_GATEWAY_API_KEY
  - FANQIE_SERVICE_URL
systems:
  - ContentBase Runtime as novel-factory service
  - DataBase Gateway write facade
  - fanqie-service
output:
  type: generation + database save + publish result
  destination:
    - webhook JSON response
failure:
  quality gate:
    responseCode: 422
    behavior: do not call fanqie-service
```

Current nodes:

- Webhook
- Generate chapter: `POST /api/novel/runtime/actions/generate-chapter`
- Quality check: deterministic body presence and minimum length check
- Save generation output: `POST /writes/record-generation-output`
- Publish: `POST /publish/database-chapter`
- Respond success / Respond quality blocked

Runtime contract:

- n8n calls ContentBase on loopback with `CONTENTBASE_RUNTIME_URL`.
- ContentBase owns model/provider selection through `CONTENTBASE_LLM_*`.
- n8n writes generated chapter output back through DataBase Gateway.
- fanqie-service resolves the chapter from DataBase before publishing.
- Workflow JSON must not encode a provider-specific route or model fallback.

Import procedure:

```bash
ts=$(date +%Y%m%d-%H%M%S)
sudo docker exec n8n n8n export:workflow --all \
  --output=/home/node/.n8n/backups/workflows-before-change-$ts.json
sudo docker exec -i n8n n8n import:workflow \
  --input=/home/node/.n8n/import/novel-factory-generate-quality-publish.json
```

The workflow requires `CONTENTBASE_RUNTIME_API_KEY` in the n8n environment.
If Gateway auth is enabled, it also requires `DATABASE_GATEWAY_API_KEY`.
Dry-run publish must return a structured Fanqie result before using live publish.

Imported on 2026-05-29 after backup:

```text
/mnt/data/n8n/backups/workflows-before-novel-factory-20260529-110232.json
```

Observed workflow id:

```text
novelFactoryGenerateQualityPublish
```

Activated on 2026-05-29 after adding the stable webhook id in the workflow JSON.

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
