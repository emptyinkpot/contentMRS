# GitHub Repository Consolidation Plan

Date: 2026-05-10

## Goal

Keep the GitHub organization clean without damaging working systems.

This plan does not delete repositories immediately. It defines the safest merge,
archive, and deletion order.

## Rules

1. Do not delete first. Archive first unless the repository is confirmed empty
   or obsolete.
2. Do not merge research forks into active runtime repositories.
3. Do not merge upstream-tracking forks into private runtime forks.
4. Do not delete a repository that is referenced by:
   - `DataBase/ecosystem/*.json`
   - `project.json`
   - deployment scripts
   - MCP configs
   - n8n workflows
   - Mortis runtime docs
5. Every archive/delete action must have a backup commit/tag or exported
   repository bundle.

## Keep Active

These repositories are active sources of truth or runtime sources.

| Repository | Reason |
| --- | --- |
| `DataBase` | Ecosystem truth, topology, inventories, contracts, coordination state. |
| `asus-kl-codex-home` | Global Codex control plane backup. |
| `ContractGuard` | Governance and AI behavior gates. |
| `sub2api` | Active AI API gateway. |
| `mortis-multica-source` | Active Mortis/Multica fork source line. |
| `FuckVideo` | Active video application. |
| `code-server-workspace-infra` | Remote IDE/workspace infrastructure truth. |
| `Atramenti-Console` | Active console surface. |
| `my-project-qmd` | Private QMD runtime source. |
| `qmd` | GitHub-recognized upstream tracking fork for QMD. |
| `my-project-database-ops-mcp` | Active database inspection MCP. |
| `my-project-ffmpeg-mcp` | Active media MCP until consolidated. |
| `my-project-video-audio-mcp` | Active media MCP until consolidated. |
| `my-project-yt-dlp-mcp` | Active media MCP until consolidated. |

## Merge Candidates

### Media MCP Split

Current:

```text
my-project-ffmpeg-mcp
my-project-video-audio-mcp
my-project-yt-dlp-mcp
```

Target:

```text
my-project-media-mcp
```

Why:

- all three are media acquisition/analysis/processing tools
- they likely share credentials, file paths, artifact policy, and operator
  workflows
- a single media MCP reduces MCP config sprawl

Safe merge order:

1. Create `my-project-media-mcp`.
2. Copy each existing MCP into separate submodules/directories:
   - `packages/ffmpeg`
   - `packages/video-audio`
   - `packages/yt-dlp`
3. Preserve each README/RUNBOOK.
4. Add one top-level `project.json`.
5. Update MCP configs to point to the merged server.
6. Archive old repos only after the merged server passes smoke tests.

Do not delete the old repos until there is a verified replacement.

### Token / AI Gateway Sprawl

Current:

```text
sub2api
token-pool
AIClient-2-API
AIClient2API-Tutorial
```

Target:

```text
sub2api = active gateway truth
token-pool = archive or migrate unique docs/scripts into sub2api/DataBase
AIClient-2-API = reference fork
AIClient2API-Tutorial = archive/delete candidate after content check
```

Safe order:

1. Inspect `token-pool` for unique runtime code or credentials policy.
2. Move durable docs into `DataBase/docs/reference-architecture/` or
   `sub2api/docs/`.
3. Keep `AIClient-2-API` only if it is used as provider-adapter reference.
4. Archive `AIClient2API-Tutorial` if it only mirrors tutorial content.

### Mortis Historical Repositories

Current:

```text
mortis-multica-source
mortis-multica-source-legacy
mortis-multica-watch
```

Target:

```text
mortis-multica-source = active source
mortis-multica-source-legacy = archived legacy source record
mortis-multica-watch = archived or retained only if public watch mirror is still useful
```

Safe order:

1. Confirm `/srv/multica` and GitHub active branch match
   `mortis-multica-source`.
2. Ensure rollback docs reference legacy repo by URL and commit.
3. Archive `mortis-multica-source-legacy`.
4. Archive `mortis-multica-watch` if no public watch workflow consumes it.

Do not delete either historical repo until rollback value is exhausted.

### Workspace Root Duplication

Current:

```text
my-project-root
code-server-workspace-infra
DataBase
```

Target:

```text
code-server-workspace-infra = remote IDE/workspace runtime truth
DataBase = ecosystem/storage topology truth
my-project-root = archive after durable content migration
```

Safe order:

1. Inspect `my-project-root`.
2. Move durable workspace docs to `code-server-workspace-infra`.
3. Move ecosystem/data facts to `DataBase`.
4. Archive `my-project-root`.

## Archive Candidates

Archive first, delete later only after confirmation.

| Repository | Reason |
| --- | --- |
| `mortis-multica-source-legacy` | Legacy source record; not preferred forward source. |
| `mortis-multica-watch` | Watch mirror; not source of truth. |
| `AstrBot` | Reference fork unless active community contribution continues. |
| `AIClient-2-API` | Reference fork once sub2api is active gateway. |
| `AIClient2API-Tutorial` | Tutorial/reference content. |
| `golutra` | Research fork. |
| `auto-coding-agent-demo` | Research fork. |
| `ai-town` | Manual research mirror. |
| `ai-office` | Research fork. |
| `agent-office` | Research fork. |
| `Roo-Kit` | Reference/tooling unless actively used. |
| `Lex-Universalis` | Application/research project with no current runtime. |
| `Parliamentary-Simulation` | Application/research project with no current runtime. |
| `DataSheet` | Data/content repo; inspect before archive/delete. |
| `codex-crs-profile` | Profile/config repo; likely superseded by `asus-kl-codex-home`. |
| `mirror-openai-skills-vendor-imports` | Vendor import mirror; archive if no active sync. |
| `emptyinkpot.github.io` | Archive/delete if no active site. |
| `cloude-app` | Already archived; delete candidate after backup review. |

## Delete Candidates

Deletion should be delayed until after archive and backup review.

Initial delete candidates:

```text
cloude-app
AIClient2API-Tutorial
emptyinkpot.github.io
DataSheet
codex-crs-profile
```

Required checks before deletion:

```text
gh repo view <repo>
gh api repos/emptyinkpot/<repo>/contents
gh repo clone emptyinkpot/<repo> <tmp>
git log --oneline -20
rg -n "<repo-name>" E:\My Project\DataBase E:\My Project
```

If any active reference exists, archive instead of delete.

## Repository Status Vocabulary

Use these statuses in machine-readable inventories:

```text
keep-active
merge-source
merge-target
archive-candidate
delete-after-backup
reference-fork
upstream-tracking
legacy
watch-mirror
already-archived
```

## Execution Phases

### Phase 1: Document And Tag

- Write this plan.
- Add machine-readable consolidation inventory.
- Update DataBase ecosystem registry.

### Phase 2: Archive Obvious Non-Active Repos

Archive only:

```text
mortis-multica-source-legacy
mortis-multica-watch
AIClient2API-Tutorial
research forks
```

Skip anything with active runtime references.

### Phase 3: Merge Media MCPs

Create `my-project-media-mcp`, migrate the three MCPs, validate, then archive
old repos.

### Phase 4: Delete Only After Backup

Delete only repos that:

- are archived
- have no active references
- have no unique runtime or docs
- have a local backup or exported Git bundle

## Do Not Touch Without Explicit Approval

```text
DataBase
sub2api
mortis-multica-source
asus-kl-codex-home
ContractGuard
code-server-workspace-infra
my-project-qmd
qmd
```
