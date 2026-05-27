# DataBase Memory Service

`DataBase Memory Service` is the public memory and retrieval facade for Mortis, Codex, Claude, n8n, and future agents.

External consumers should depend on this service boundary, not on internal implementation paths.

## Current Source Of Truth

Active source work happens in the remote IDE workspace, not in a local Windows checkout:

```text
server: server-170
source: /home/ubuntu/workspaces/DataBase
qmdSource: /home/ubuntu/workspaces/my-project-qmd
runtimeState: /srv/database-memory
ideTunnel: ssh -L 18080:127.0.0.1:18080 server-170
ideUrl: http://127.0.0.1:18080
```

Local paths such as `E:\My Project\DataBase` are compatibility/operator references only. Future code edits, commits, and pushes for this repository should be performed from the remote workspace so agents do not recreate parallel local source roots.

## Why This Exists

This service is not extra architecture for its own sake. It prevents future humans and agents from wiring themselves to unstable implementation details.

Without this facade, every consumer would need to know:

- where the MySQL memory tables live;
- which account can read them;
- where QMD is checked out;
- where the QMD SQLite index lives;
- whether a local path or remote server path is active;
- how to refresh the mirror;
- which commands are safe readonly checks and which can write memory.

That would recreate path drift. The facade makes the external contract small and stable while allowing DataBase to change internals safely.

## Public Surface

| Capability | Purpose |
| --- | --- |
| `memory_status` | Report memory service, database, QMD mirror, and index state. |
| `memory_recall` | Search durable memory through the QMD-backed retrieval projection. |
| `memory_get` | Retrieve a specific memory mirror document. |
| `record_experience` | Store a durable experience record. |
| `record_note` | Store a durable note. |
| `refresh_mirrors` | Refresh QMD mirror and index projection. |
| `cloud_health` | Check the backing database connection. |

## Unified CLI

From the DataBase repository root:

```powershell
.\scripts\memory\database-memory.ps1 status
.\scripts\memory\database-memory.ps1 probe
.\scripts\memory\database-memory.ps1 search -Query "Token Pool streamLifecycle" -Limit 2
.\scripts\memory\database-memory.ps1 recall -Query "Token Pool streamLifecycle" -Limit 2
.\scripts\memory\database-memory.ps1 refresh -Limit 2 -DryRun
```

Cross-platform entry used by Linux remote workspaces and MCP:

```bash
node scripts/memory/database-memory.mjs status
node scripts/memory/database-memory.mjs probe
node scripts/memory/database-memory.mjs search --query "Token Pool streamLifecycle" --limit 2
node scripts/memory/database-memory.mjs recall --query "Token Pool streamLifecycle" --limit 2
node scripts/memory/database-memory.mjs refresh --limit 2 --dry-run
node scripts/memory/database-memory.mjs record-experience --input ./tmp/experience.json
node scripts/memory/database-memory.mjs record-note --input ./tmp/note.json
node scripts/memory/database-memory.mjs submit-candidate --type experience --input ./tmp/experience.json
node scripts/memory/database-memory.mjs list-candidates --status pending --limit 20
```

The default write mode is dry-run. `record_experience` and `record_note` require explicit gates before they can write durable memory.

## Controlled Writes

Write commands are gated and should normally start as approval candidates:

- default mode is dry-run;
- `submit-candidate` writes to the approval queue, not to durable memory;
- `--commit` is required to write;
- `EXPERIENCE_MEMORY_WRITE_ENABLED=true` is also required;
- duplicate `id` or duplicate `title` blocks insertion;
- MCP exposes dry-run tools only.

Commit examples, for an operator shell with a write-capable approved database account:

```bash
EXPERIENCE_MEMORY_WRITE_ENABLED=true node scripts/memory/database-memory.mjs record-experience --input ./tmp/experience.json --commit
EXPERIENCE_MEMORY_WRITE_ENABLED=true node scripts/memory/database-memory.mjs record-note --input ./tmp/note.json --commit
```

Remote `server-170` currently uses `database_readonly`; write commits are expected to fail until an approved write credential is deliberately configured.

Approval queue commands:

```bash
node scripts/memory/database-memory.mjs submit-candidate --type experience --input ./tmp/experience.json
node scripts/memory/database-memory.mjs submit-candidate --type note --input ./tmp/note.json
node scripts/memory/database-memory.mjs list-candidates --status pending --limit 20
node scripts/memory/database-memory.mjs review-candidate --candidate-id memcand_experience_xxx --status rejected --reviewer operator --reason "too vague"
```

The approval queue table is `memory_write_candidates`. A candidate can be approved, rejected, or superseded without mutating `experience_records_cloud` or `experience_notes_cloud`.

## MCP Facade

`services/memory/mcp/server.mjs` exposes the same facade to AI agents through MCP.

Tools:

- `memory_status`
- `memory_probe`
- `memory_search`
- `memory_recall`
- `memory_refresh_dry_run`
- `record_experience_dry_run`
- `record_note_dry_run`

Run from the remote IDE workspace:

```bash
cd /home/ubuntu/workspaces/DataBase/services/memory
npm install
npm run smoke
npm run mcp
```

The Windows wrapper remains for operator compatibility, but it is not the source-of-truth development path.

The MCP implementation calls `scripts/memory/database-memory.mjs`; it does not connect directly to MySQL or QMD internals.

Remote path configuration:

```bash
export DATABASE_MEMORY_REPO_ROOT=/home/ubuntu/workspaces/DataBase
export DATABASE_MEMORY_EXPERIENCE_ROOT=/home/ubuntu/workspaces/DataBase/services/experience-manager
export DATABASE_MEMORY_QMD_ROOT=/home/ubuntu/workspaces/my-project-qmd
export DATABASE_MEMORY_QMD_INDEX_PATH=/srv/database-memory/index.sqlite
export QMD_LLAMA_GPU=false
```

## Internal Layers

| Layer | Responsibility |
| --- | --- |
| `services/experience-manager/` | MCP implementation, durable memory CRUD, QMD mirror orchestration. |
| `services/qmd-adapter/` | QMD collection, index, embedding, and retrieval projection contract. |
| `my-project-qmd` | QMD engine/runtime repository and tracked mirror collection. |
| `services/database-ops-mcp/` | Database schema and operational inspection context. |
| Cloud MySQL | Durable memory table truth. |

## Boundary Rule

Consumers must not hard-code internal paths such as `my-project-qmd/collections/...` or `services/qmd-adapter/...`.

Use the public MCP/tool surface above and treat QMD, MySQL, and internal adapters as DataBase-owned implementation details.

## What The Layers Mean

| Layer | Why it exists |
| --- | --- |
| `services/memory` | Public facade: what external agents use. |
| `scripts/memory/database-memory.mjs` | Cross-platform CLI implementation shared by remote Linux and MCP. |
| `scripts/memory/database-memory.ps1` | Windows-friendly wrapper retained for local operator commands. |
| `services/experience-manager` | Durable memory implementation and mirror orchestration. |
| `services/qmd-adapter` | Retrieval projection contract and validation record. |
| `my-project-qmd` | Replaceable QMD engine/runtime source. |
| MySQL | Durable truth for records and notes. |

Only the first two should matter to consumers. The rest are internal implementation details.

## Current Validation State

```yaml
readonlyDbHealth: ok
readonlyTables:
  experience_records_cloud: 349
  experience_notes_cloud: 44
qmdMirrorMode: controlled-sample
qmdMirrorSample:
  experienceRecords: 5
  notes: 5
qmdIndex:
  indexedFiles: 11
  pendingEmbeddings: 0
stableRecall:
  bm25: ok
  vector: ok with QMD_VSEARCH_EXPAND=false
  structuredQuery: ok with QMD_QUERY_EXPAND=false and --no-rerank
```
