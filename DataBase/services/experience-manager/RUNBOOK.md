# Experience Manager Runbook

## Purpose

This service is the durable memory write and recall surface for Codex, Mortis, and future agents.

## Start

```bash
cd /home/ubuntu/workspaces/DataBase/services/experience-manager
npm install
npm run smoke
npm run health
npm run sync:qmd:dry
npm run mcp
```

Remote IDE access from the operator machine:

```powershell
ssh -L 18080:127.0.0.1:18080 server-170
```

Then open `http://127.0.0.1:18080`.


## Source Boundary

Active source edits, commits, and pushes happen in:

```text
server-170:/home/ubuntu/workspaces/DataBase
```

Local Windows checkouts are not the development source for this service. Treat them as compatibility/operator references unless a task explicitly asks for local cleanup.

## Required Secrets

Load these from the approved secret surface before startup:

- `EXPERIENCE_DB_HOST`
- `EXPERIENCE_DB_PORT`
- `EXPERIENCE_DB_USER`
- `EXPERIENCE_DB_PASSWORD`
- `EXPERIENCE_DB_NAME`

Do not store the values in this repository.

Local approved surfaces:

```text
C:\Users\ASUS-KL\.codex-secrets\mysql\myblog.cnf
C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env
```

Default local health mode uses `database_readonly` credentials through `npm run health:local`. Use content write credentials only for controlled write validation:

```powershell
.\scripts\load-env-and-healthcheck.ps1 -Mode content-rw
```

## QMD Mirror

The mirror writes markdown into:

```text
QMD_EXPERIENCE_COLLECTION_DIR
```

Then QMD indexes the collection using:

```text
EXPERIENCE_QMD_INDEX_PATH
```

Disable inline refresh during risky maintenance:

```powershell
$env:EXPERIENCE_QMD_REFRESH_ON_WRITE = 'false'
```

Then run a controlled refresh:

```powershell
npm run sync:qmd:dry
npm run sync:qmd:dry:local
npm run sync:qmd:local
npm run sync:qmd
```

`sync:qmd` prefers DataBase Gateway. If the gateway is unavailable, it falls back to direct MySQL read through the loaded `EXPERIENCE_DB_*` variables unless `EXPERIENCE_QMD_SYNC_DISABLE_DB_FALLBACK=true`.

## Validation

```powershell
npm run smoke
npm run health
npm run health:local
npm run probe:readonly:local
npm run sync:qmd:dry:local
node E:\My Project\ContractGuard\tools\check-project-json.mjs --repo-root E:\My Project\DataBase --strict
```

Observed local readonly validation:

- `npm run health:local`: DB ping ok with `database_readonly`.
- `npm run probe:readonly:local`: `experience_records_cloud` and `experience_notes_cloud` readable.
- `EXPERIENCE_QMD_SYNC_LIMIT=2; npm run sync:qmd:dry:local`: dry-run ok; gateway unavailable locally, direct MySQL fallback used.
- `EXPERIENCE_QMD_SYNC_LIMIT=5; npm run sync:qmd:local`: controlled QMD sample mirror wrote 5 experience records and 5 notes to `my-project-qmd`; committed as `1b312d5`.
- `pnpm exec tsx src/cli/qmd.ts update` in `my-project-qmd`: indexed the controlled sample collection as 11 files and removed old Atramenti-path entries from the local QMD index.
- `qmd search` validated recall for `Token Pool streamLifecycle` and `OpenClaw MySQL schema token`.
- `pnpm exec tsx src/cli/qmd.ts embed`: embedded 11 chunks from 6 documents.
- `QMD_VSEARCH_EXPAND=false; qmd vsearch "Token Pool streamLifecycle"` validated vector recall.
- `QMD_QUERY_EXPAND=false; qmd query "lex: Token Pool streamLifecycle" --no-rerank` validated stable structured query recall.

## Failure Modes

- Missing `EXPERIENCE_DB_PASSWORD`: startup or first DB access fails intentionally.
- Healthcheck timeout: check network reachability, MySQL firewall rules, and whether the chosen service user is allowed from the current host.
- Missing QMD runtime path: memory write can still hit MySQL, but mirror refresh fails.
- Database API unavailable: `sync-to-qmd.mjs` falls back only to configured candidates; investigate DataBase Gateway first.

## Approval Queue Operation

Use the approval queue for AI-generated memory candidates:

```bash
cd /home/ubuntu/workspaces/DataBase
set -a
. /srv/database-memory/database-memory-approval.env
set +a
node scripts/database-memory.mjs submit-candidate --type experience --input ./tmp/experience.json
node scripts/database-memory.mjs list-candidates --status pending --limit 20
node scripts/database-memory.mjs review-candidate --candidate-id memcand_experience_xxx --status rejected --reviewer operator --reason "too vague"
```

The approval credential needs `SELECT`, `INSERT`, and `UPDATE` on `memory_write_candidates`. It does not need permission to create tables or mutate durable memory tables. Schema creation is an admin migration task, not an agent runtime task.

Promotion into durable tables is intentionally separate and remains gated by operator credentials, `EXPERIENCE_MEMORY_WRITE_ENABLED=true`, and `--commit`.
