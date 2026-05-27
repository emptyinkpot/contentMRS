# Experience Manager

`experience-manager` is the implementation layer behind the public `DataBase Memory Service` facade. It handles durable experience records, notes, recall, and QMD mirror refresh.

External consumers should refer to `DataBase Memory Service` rather than this internal module name.

## Working Location

The active implementation checkout is the remote IDE workspace:

```text
server-170:/home/ubuntu/workspaces/DataBase/services/experience-manager
```

Do not use a local Windows checkout as the development source for this module. Local paths may appear in old validation notes, but remote `server-170` is the current source-of-truth workspace.

## Role

- Store durable experience records.
- Store durable notes and corrections.
- Expose memory recall for Codex, Mortis, and future agents.
- Refresh QMD mirrors for fast local retrieval.
- Keep memory policy aligned with DataBase schemas and ContractGuard gates.

## Source Lineage

```yaml
sourceRepository: https://github.com/emptyinkpot/Atramenti-Console
cleanstreamRoot: E:\My Project\Atramenti-Console-cleanstream
sourcePath: codex/mcps/experience
pairedSkill: codex/skills/experience-manager/SKILL.md
sourceBaselineCommit: d9f2700e59daefb6a352c5d563f6910d652ccd0a
status: sanitized-imported-minimal-runtime
```

Only the minimal runtime surface is imported here:

- `mcp/`
- `scripts/sync-to-qmd.mjs`
- `skill/SKILL.md`
- package metadata

The Atramenti frontend and historical knowledge bundle are intentionally not imported in this phase.

## Required Environment

Use `EXPERIENCE_DB_*` variables first. `DB_*` aliases remain compatible for local operators.

See `.env.example` for variable names. Real values belong in the secret surface recorded by DataBase, not in this repository.

## Commands

Run commands from the remote workspace unless a runbook explicitly says otherwise:

```bash
cd /home/ubuntu/workspaces/DataBase/services/experience-manager
```

```powershell
npm run smoke
npm run health
npm run health:local
npm run probe:readonly:local
npm run mcp
npm run sync:qmd:dry
npm run sync:qmd:dry:local
npm run sync:qmd
```

Set `EXPERIENCE_QMD_REFRESH_ON_WRITE=false` when you want writes to persist to MySQL without running QMD mirror/index refresh inline. Use `refresh_mirrors` or `npm run sync:qmd` for controlled batch refresh.

The MCP loads QMD through `EXPERIENCE_QMD_PACKAGE_IMPORT` or `@tobilu/qmd`. Keep QMD engine code in `my-project-qmd`; this service owns the adapter and memory policy.

## MCP Tools

- `cloud_health`
- `memory_status`
- `list_experiences`
- `search_experiences`
- `memory_recall`
- `memory_get`
- `get_experience`
- `record_experience`
- `delete_experience`
- `list_notes`
- `search_notes`
- `get_note`
- `record_note`
- `delete_note`
- `refresh_mirrors`
- `plugin_overview`

## Secret Surface

DataBase may record variable names and storage locations. It must not record provider keys, database passwords, cookies, or tokens.

## Schemas

- `schemas/experience.schema.json`
- `schemas/note.schema.json`

## Approval Queue Policy

Agents should submit proposed memories as candidates first:

```bash
cd /home/ubuntu/workspaces/DataBase
node scripts/database-memory.mjs submit-candidate --type experience --input ./tmp/experience.json
node scripts/database-memory.mjs submit-candidate --type note --input ./tmp/note.json
node scripts/database-memory.mjs list-candidates --status pending --limit 20
```

The candidate table is `memory_write_candidates`. It is intentionally separate from durable memory tables so noisy, duplicated, or low-quality AI observations can be reviewed before they become long-term recall material.

Durable writes are operator-only and require both `--commit` and `EXPERIENCE_MEMORY_WRITE_ENABLED=true`. The MCP facade exposes dry-run write validation only.
