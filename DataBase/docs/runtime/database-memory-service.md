# DataBase Memory Service Runtime

This is the unified external entrypoint for memory and retrieval.

External systems should refer to `DataBase Memory Service`, not to separate `experience-manager`, `qmd-adapter`, or `my-project-qmd` implementation details.

## Consumer Contract

Use these capabilities:

- `memory_status`
- `memory_recall`
- `memory_get`
- `record_experience`
- `record_note`
- `refresh_mirrors`
- `cloud_health`

## Preferred Agent Entry

AI agents should prefer the MCP facade:

```text
E:\My Project\DataBase\services\memory\mcp\server.mjs
```

MCP tools:

- `memory_status`
- `memory_probe`
- `memory_search`
- `memory_recall`
- `memory_refresh_dry_run`

The MCP facade delegates to `scripts/memory/database-memory.ps1`, so local CLI and AI-agent access share one implementation path.

## Current Runtime Commands

Use the unified DataBase entrypoint:

```powershell
.\scripts\memory\database-memory.ps1 status
.\scripts\memory\database-memory.ps1 probe
.\scripts\memory\database-memory.ps1 search -Query "Token Pool streamLifecycle" -Limit 2
.\scripts\memory\database-memory.ps1 recall -Query "Token Pool streamLifecycle" -Limit 2
.\scripts\memory\database-memory.ps1 refresh -Limit 2 -DryRun
```

Path overrides:

```powershell
$env:DATABASE_MEMORY_REPO_ROOT = 'E:\My Project\DataBase'
$env:DATABASE_MEMORY_QMD_ROOT = 'E:\My Project\my-project-qmd'
$env:DATABASE_MEMORY_QMD_INDEX_PATH = 'C:\Users\ASUS-KL\.cache\qmd\index.sqlite'
```

Remote production notes live in `docs/runtime/database-memory-service-production.md`.

Internal commands remain available for maintenance, but external consumers should not depend on them directly.

## Validated Facade Commands

```yaml
status: ok
probe: ok
search:
  query: Token Pool streamLifecycle
  result: qmd://experience-manager/experiences/2026-04-28-Token-Pool-streamLifecycle-plan-PLAN-20260428-STREAM-DIAG-DOC.md
recall:
  query: Token Pool streamLifecycle
  result: qmd://experience-manager/experiences/2026-04-28-Token-Pool-streamLifecycle-plan-PLAN-20260428-STREAM-DIAG-DOC.md
refreshDryRun:
  limit: 2
  result: checked 2 experiences and 2 notes
mcpSmoke: ok
```

Maintenance examples:

```powershell
Set-Location 'E:\My Project\DataBase\services\experience-manager'
npm run health:local
npm run probe:readonly:local

Set-Location 'E:\My Project\my-project-qmd'
pnpm exec tsx src/cli/qmd.ts update
pnpm exec tsx src/cli/qmd.ts embed
$env:QMD_VSEARCH_EXPAND = 'false'; pnpm exec tsx src/cli/qmd.ts vsearch "Token Pool streamLifecycle" -c experience-manager -n 3 --json
```

## Internal Implementation

| Component | Internal role |
| --- | --- |
| `services/experience-manager` | MCP facade implementation and durable memory writes. |
| `services/qmd-adapter` | QMD projection contract and validation record. |
| `my-project-qmd` | QMD engine plus tracked sample mirror. |
| `C:\Users\ASUS-KL\.cache\qmd\index.sqlite` | Local QMD index projection. |
| Cloud MySQL | Durable source of truth for experience records and notes. |

## Rules

- Do not expose QMD collection paths as the public API.
- Do not let consumers connect directly to memory MySQL tables unless the task is database operations.
- Do not write test memories without explicit operator approval.
- Prefer readonly health/probe commands before write validation.
- Keep expansion disabled for operational checks unless model loading latency is acceptable.
