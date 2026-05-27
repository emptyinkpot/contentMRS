# DataBase Memory Service Production Runbook

This runbook describes how to move `DataBase Memory Service` from local validation to a remote shared workspace.

## Goal

The public service boundary stays stable:

```text
DataBase Memory Service MCP / CLI
```

Runtime paths may change between local Windows and remote servers, but consumers should not change their integration.

## Why This Is Being Split Into Layers

The point is not to create more places to look. The point is to make sure external agents have one place to call.

`DataBase Memory Service` hides these details:

- MySQL tables and service users;
- QMD engine checkout;
- QMD collection files;
- QMD SQLite index location;
- local Windows paths versus remote server paths;
- mirror refresh and embedding steps.

External consumers should call the facade. DataBase owns the internal wiring.

## Required Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_MEMORY_REPO_ROOT` | Path to the DataBase checkout. |
| `DATABASE_MEMORY_EXPERIENCE_ROOT` | Path to `services/experience-manager`. Defaults under `DATABASE_MEMORY_REPO_ROOT`. |
| `DATABASE_MEMORY_QMD_ROOT` | Path to the QMD runtime/source checkout. |
| `DATABASE_MEMORY_QMD_INDEX_PATH` | QMD SQLite index path. |
| `EXPERIENCE_DB_HOST` / `EXPERIENCE_DB_PORT` / `EXPERIENCE_DB_USER` / `EXPERIENCE_DB_PASSWORD` / `EXPERIENCE_DB_NAME` | Database backing store. Loaded from approved secret surfaces only. |

## Local Windows Compatibility Baseline

This is retained for compatibility checks only. Active development should use the remote IDE source checkout documented below.

```powershell
$env:DATABASE_MEMORY_REPO_ROOT = 'E:\My Project\DataBase'
$env:DATABASE_MEMORY_QMD_ROOT = 'E:\My Project\my-project-qmd'
$env:DATABASE_MEMORY_QMD_INDEX_PATH = 'C:\Users\ASUS-KL\.cache\qmd\index.sqlite'
.\scripts\database-memory.ps1 status
```

## Remote Server Shape

Verified remote IDE source of truth:

```text
repository: https://github.com/emptyinkpot/code-server-workspace-infra
server: server-170
public ip: 170.106.179.226
ssh user: ubuntu
code-server container: code-server
code-server host bind: 127.0.0.1:18080
code-server container port: 8080
workspace root: /home/ubuntu/workspaces
access mode: SSH tunnel only
```

Recommended remote workspace layout:

```text
/home/ubuntu/workspaces/DataBase
/home/ubuntu/workspaces/my-project-qmd
/srv/database-memory/index.sqlite
/srv/database-memory/database-memory.env
```

Current deployment state:

```yaml
sourceCheckout:
  DataBase: /home/ubuntu/workspaces/DataBase
  my-project-qmd: /home/ubuntu/workspaces/my-project-qmd
runtimeStateRoot: /srv/database-memory
qmdIndex: /srv/database-memory/index.sqlite
envTemplate: /srv/database-memory/database-memory.env.example
envFile: /srv/database-memory/database-memory.env
validated:
  nodeCliSyntax: true
  qmdCollectionIndexed: true
  databaseHealth: true
  readonlyProbe: true
  refreshDryRun: true
  bm25Search: true
  vectorEmbeddings: true
  vectorRecall: true
  mcpSmoke: true
  controlledWriteDryRun: true
  readonlyCommitBlocked: true
pending:
  publicServiceManager: optional systemd wrapper if this becomes a daemon
  controlledWriteCredential: optional approved write account for operator-only promotion from approved candidates
notes:
  qmdGpuMode: QMD_LLAMA_GPU=false on server-170 because the host has no working Vulkan/GPU stack
  envLineEndings: use LF on Linux; CRLF makes sourced paths include hidden carriage returns
  writePolicy: MCP exposes dry-run write validation only; commits require --commit and EXPERIENCE_MEMORY_WRITE_ENABLED=true
  approvalQueue: memory_write_candidates stores proposed memory writes before promotion
```

Access the IDE from the local machine:

```powershell
ssh -L 18080:127.0.0.1:18080 server-170
```

Then open:

```text
http://127.0.0.1:18080
```

Remote env example:

```bash
export DATABASE_MEMORY_REPO_ROOT=/home/ubuntu/workspaces/DataBase
export DATABASE_MEMORY_EXPERIENCE_ROOT=/home/ubuntu/workspaces/DataBase/services/experience-manager
export DATABASE_MEMORY_QMD_ROOT=/home/ubuntu/workspaces/my-project-qmd
export DATABASE_MEMORY_QMD_INDEX_PATH=/srv/database-memory/index.sqlite
export QMD_LLAMA_GPU=false
```

Remote Linux CLI entry:

```bash
node /home/ubuntu/workspaces/DataBase/scripts/database-memory.mjs status
node /home/ubuntu/workspaces/DataBase/scripts/database-memory.mjs search --query "Token Pool streamLifecycle" --limit 2
node /home/ubuntu/workspaces/DataBase/scripts/database-memory.mjs recall --query "Token Pool streamLifecycle" --limit 2
node /home/ubuntu/workspaces/DataBase/scripts/database-memory.mjs refresh --limit 2 --dry-run
```

Secrets must live outside Git, for example:

```text
/srv/database-memory/database-memory.env
```

The repository records variable names and approved paths only. It must not store
the raw database password or API keys.

Keep the remote env file in LF line endings. If a Windows-generated file is
uploaded, normalize it before sourcing:

```bash
perl -pi -e 's/\r$//' /srv/database-memory/database-memory.env
```

## Startup

MCP entry:

```text
node /home/ubuntu/workspaces/DataBase/services/memory/mcp/server.mjs
```

Local CLI entry:

```powershell
.\scripts\database-memory.ps1 status
```

## Verification

Run in order:

```bash
node scripts/database-memory.mjs status
node scripts/database-memory.mjs probe
node scripts/database-memory.mjs search --query "Token Pool streamLifecycle" --limit 2
node scripts/database-memory.mjs recall --query "Token Pool streamLifecycle" --limit 2
node scripts/database-memory.mjs refresh --limit 2 --dry-run
```

Do not enable write tools until remote readonly health, QMD mirror refresh, index update, and recall are stable.

Current readonly remote validation has passed. Write tools remain intentionally
unexposed until controlled memory write policy and dedupe rules are finalized.

## Controlled Write Policy

Write validation is available without committing data:

```bash
node scripts/database-memory.mjs record-experience --input ./tmp/experience.json
node scripts/database-memory.mjs record-note --input ./tmp/note.json
```

Candidate submission writes only to the approval queue. Load the approval environment on `server-170` before running these commands:

```bash
set -a
. /srv/database-memory/database-memory-approval.env
set +a
```


```bash
node scripts/database-memory.mjs submit-candidate --type experience --input ./tmp/experience.json
node scripts/database-memory.mjs submit-candidate --type note --input ./tmp/note.json
node scripts/database-memory.mjs list-candidates --status pending --limit 20
node scripts/database-memory.mjs review-candidate --candidate-id memcand_experience_xxx --status rejected --reviewer operator --reason "too vague"
```


Approval queue permission model:

```text
table: memory_write_candidates
runtime credential: database_memory_approver
required grants: SELECT, INSERT, UPDATE on memory_write_candidates only
not required: CREATE, DROP, ALTER, or writes to experience_records_cloud / experience_notes_cloud
```

`ensureTable()` tolerates missing `CREATE` privilege because schema creation belongs to an admin migration path. If the table is missing, fix the migration/admin setup rather than expanding the runtime approval user's privileges.

Durable writes require both gates:

```bash
EXPERIENCE_MEMORY_WRITE_ENABLED=true node scripts/database-memory.mjs record-experience --input ./tmp/experience.json --commit
EXPERIENCE_MEMORY_WRITE_ENABLED=true node scripts/database-memory.mjs record-note --input ./tmp/note.json --commit
```

`server-170` is configured with `database_readonly` for current validation.
Do not configure write credentials until memory pollution rules, audit policy,
and dedupe behavior have been reviewed.
