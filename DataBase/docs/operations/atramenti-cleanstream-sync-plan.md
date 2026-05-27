# Atramenti Cleanstream Sync And Capability Split Plan

This plan prepares the split of memory, database, MCP, and skill capabilities currently living under `Atramenti-Console`.

## Current State

Update on 2026-05-11:

```yaml
localRoot: E:\My Project\Atramenti-Console
branch: main
remote: https://github.com/emptyinkpot/Atramenti-Console.git
relationToOrigin: clean and synced
lastVerifiedCommit: a0a13cf9
localCheckoutStatus: retired-after-clean-push
remoteIdeTruth: https://github.com/emptyinkpot/code-server-workspace-infra
remoteIdePath: server-170:/home/ubuntu/workspaces/Atramenti-Console
remoteIdeStatus: verified
remoteIdeVerifiedAt: 2026-05-11T02:18:00Z
remoteGitCredentialStatus: read-only deploy key configured and git pull verified
remoteOrigin: git@github.com-atramenti-console:emptyinkpot/Atramenti-Console.git
```

The previous dirty local checkout was cleaned by removing migrated Codex capability payloads from `Atramenti-Console` and pushing the cleaned `main` branch. Forward source truth is now:

- `Atramenti-Console` GitHub repository for the console application surface.
- `C:\Users\ASUS-KL\.codex` for global Codex MCP, skill, plugin, and app runtime assets.
- `DataBase/services/*` and dedicated capability repositories for memory, retrieval, and database MCP surfaces.
- `code-server-workspace-infra` for remote IDE topology and the shared `/home/ubuntu/workspaces` root.

The remote IDE checkout was created at `/home/ubuntu/workspaces/Atramenti-Console` from a local Git bundle, then switched to a repository-scoped read-only GitHub deploy key on `server-170`. Pulls from the server are verified through the SSH alias `github.com-atramenti-console`.

Historical state kept for audit context:

As of 2026-05-10, the local `Atramenti-Console` worktree is not safe for direct source relocation:

```yaml
localRoot: E:\My Project\Atramenti-Console
branch: main
remote: https://github.com/emptyinkpot/Atramenti-Console.git
relationToOrigin: ahead 2, behind 6
dirtyFilesApprox: 1000+
```

The repository contains useful capability source, but also many unrelated local edits, deletions, generated/cache files, and historical docs. Therefore the next step is cleanstream sync, not broad copy/move.

## Meaning Of Cleanstream Sync

Cleanstream sync means:

1. Preserve the dirty local worktree exactly as evidence.
2. Create or use a clean clone/worktree from `origin/main`.
3. Compare local-only commits and dirty changes by path group.
4. Replay only selected, reviewed capability changes into clean target repositories.
5. Record the new owner in DataBase and require each target repo to pass ContractGuard.

It explicitly does not mean `git reset --hard`, broad deletion, or dragging all Atramenti `codex/` content into DataBase.

## Target Capability Ownership

| Capability | Current path | Target direction |
| --- | --- | --- |
| `experience-manager` | `codex/mcps/experience` | Dedicated memory capability repo or retained in Atramenti until split. Data topology belongs to DataBase. |
| `qmd` | `codex/mcps/core/qmd` | Split and registered in `my-project-qmd`. DataBase records collection/index topology. |
| `database-ops-mcp` | `codex/mcps/database-ops-mcp` | Dedicated database MCP repo or retained in Atramenti until split. DataBase records DB contract. |
| `database-api` | `codex/mcps/database-api` | Keep separate from database-ops MCP; possible future gateway/API repo. |
| `plan-history-recall` | `codex/skills/plan-history-recall` | Skills/capability repo; memory policy recorded in DataBase. |
| `memory-lancedb-pro` | `codex/skills/memory-lancedb-pro` | Reference only; do not restore as live MCP by default. |

## Required Preflight

Before moving source:

1. Create a safety branch or bundle for current dirty Atramenti state.
2. Export a path-group inventory:
   - `codex/mcps/experience`
   - `codex/mcps/core/qmd`
   - `codex/mcps/database-ops-mcp`
   - `codex/mcps/database-api`
   - `codex/skills/experience-manager`
   - `codex/skills/qmd`
   - `codex/skills/plugin-database--database-ops`
   - `codex/skills/plan-history-recall`
3. Scan selected groups for credential-shaped defaults before copy.
4. Decide target repository for each group.
5. Add or update `project.json` in every target repo.
6. Run:

```powershell
node E:\My Project\ContractGuard\tools\check-project-json.mjs --repo-root <target-repo> --strict
```

## First Split Candidates

Do these in order:

1. `database-ops-mcp`
   - Lowest conceptual coupling.
   - Clear DataBase ownership.
   - Already has a canonical MCP name and skill pair.

2. `qmd`
   - Split and registered as `https://github.com/emptyinkpot/my-project-qmd`.
   - Manual upstream/reference: `https://github.com/tobi/qmd`.
   - Cleanstream source baseline: `d9f2700e59daefb6a352c5d563f6910d652ccd0a`.
   - It is the retrieval engine needed by the AI memory ingestion loop.

3. `experience-manager`
   - Highest value, but must first remove credential-shaped defaults and register secret surfaces.

4. `plan-history-recall`
   - Move after experience-manager contracts are stable.

## Secret Cleanup Requirement

`experience-manager` source must not be split or reused as-is until credential-shaped defaults are removed.

Required contract:

- Source reads DB settings from environment or a documented secret surface.
- DataBase records only the secret surface, not the secret value.
- ContractGuard or repo-local pre-commit blocks credential defaults in source.

## Integration Target

The desired memory loop is:

```text
DataBase ecosystem registry
  -> QMD collection: emptyinkpot-ecosystem
  -> Mortis / Codex query
  -> durable corrections in experience-manager
  -> refreshed QMD mirror
```

## Done Criteria

Cleanstream sync is considered ready when:

- Atramenti dirty state is preserved.
- Clean source baseline exists.
- Each selected capability has an owner repo or explicit "stay in Atramenti" decision.
- DataBase registry names the owner and consumer.
- Target repos pass ContractGuard.
- No credential-shaped defaults are copied into new repos.
