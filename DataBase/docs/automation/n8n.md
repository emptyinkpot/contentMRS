# n8n Automation Bus

n8n is the automation bus for the DataBase ecosystem. It is not the source of truth for data. It receives operator events, runs scheduled checks, calls gateway APIs, and sends reports back to operator surfaces such as Telegram, Web, or Mortis.

## Current Runtime

```yaml
name: n8n
container: n8n
image: blowsnow/n8n-chinese
server: server-124 / 124.220.233.126
localBind: 127.0.0.1:5678
publicEditorUrl: https://mortis.tengokukk.com/n8n/
dataRoot: /mnt/data/n8n
locale: zh-CN
healthcheck: http://127.0.0.1:5678/healthz
status: active
```

## Role In The DataBase System

n8n is responsible for:

- scheduled inventory refresh jobs
- database health reports
- NocoDB / OpenList / storage health checks
- Telegram operator commands such as `/db-status`
- webhook bridges from Mortis and external tools into DataBase workflows
- low-risk automation around reports, checks, and notifications

n8n is not responsible for:

- storing canonical structured data
- replacing MySQL as the structured data source of truth
- storing secrets as workflow notes
- owning schema migrations
- becoming the only way to access the data system

## Boundaries

The intended runtime boundary is:

```text
Telegram / Web / Scheduler / Mortis
  -> n8n workflow
  -> DataBase gateway or service account
  -> MySQL / NocoDB / OpenList
  -> report artifact
  -> Telegram / Web / Mortis timeline
```

For database access, workflows should use least-privilege service accounts:

- `database_readonly` for status, inventory, reports, dashboards, and health checks.
- `database_content_rw` only for approved content tables and controlled write workflows.

Do not use the full operator MySQL account for routine n8n workflows.

## Known Workflows

Existing workflows observed in the active n8n instance:

- `mortis-smoke-gateway`
- `mortis-telegram-operator`

Planned DataBase workflows:

- `database-health-report`
- `database-inventory-refresh`
- `telegram-db-status`
- `nocodb-health-report`
- `openlist-storage-check`

## Current Risk

The active n8n instance currently uses SQLite metadata at:

```text
/mnt/data/n8n/database.sqlite
```

Logs have shown timeout events such as database connection timeouts and operation timeouts. This does not mean workflows are unusable, but it means the metadata store should eventually move to Postgres before n8n becomes a critical production automation plane.

Migration to Postgres must be treated as a separate maintenance task:

1. export all workflows and credentials
2. stop n8n
3. back up `/mnt/data/n8n`
4. start a Postgres-backed n8n instance
5. import workflows
6. verify Telegram and DataBase workflows

Do not perform the migration casually while workflows are active.

## Backup Procedure

Before importing or changing workflows:

```bash
ts=$(date +%Y%m%d-%H%M%S)
sudo docker exec n8n n8n export:workflow --all \
  --output=/home/node/.n8n/backups/workflows-before-change-$ts.json
```

Current backup location:

```text
/mnt/data/n8n/backups/
```

Known backup created before DataBase automation work:

```text
/mnt/data/n8n/backups/workflows-before-database-automation-20260510-101832.json
```

## Operator Rules

- Treat n8n as an automation surface, not as the canonical data source.
- Keep DataBase workflow credentials least-privilege.
- Prefer webhook/API contracts over direct shell execution from n8n.
- Keep workflow outputs artifact-shaped: status, evidence, query result summary, next action.
- Back up workflows before imports and structural edits.
- Record stable workflow names in `docs/automation/n8n-workflows.md`.
