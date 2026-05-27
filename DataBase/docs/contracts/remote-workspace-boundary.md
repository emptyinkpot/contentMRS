# Remote Workspace And Environment Branch Boundary

This repository supports three stable environment branches so local debugging
and remote IDE debugging can both stay visible without creating hidden
worktrees.

## Branch Roles

```text
main        stable integration and release truth
local       local-machine debugging lane
remote-ide  remote IDE / code-server debugging lane
```

`main` remains the only durable integration branch. `local` and `remote-ide`
are environment branches: they may contain temporary diagnostics, environment
patches, logging, or work-in-progress needed to reproduce an issue in that
environment.

## Rule

- Do not treat `local` or `remote-ide` as product truth.
- Do not deploy from `local` or `remote-ide` unless an incident runbook
  explicitly says to test that lane.
- Promote useful changes through a normal task branch or pull request into
  `main`.
- Keep secrets, `.env`, runtime logs, local databases, and generated caches out
  of all three branches.
- If `local` and `remote-ide` diverge, use `main` as the merge base and record
  the environment-specific reason before carrying changes across.

## Current Canonical Boundary

- canonical integration truth: `main`
- local debug branch: `local`
- remote IDE debug branch: `remote-ide`
- canonical repository: GitHub origin
- remote IDE workspace: `server-170:/home/ubuntu/workspaces/DataBase`
- local Windows checkout: `E:\My Project\DataBase`

## Recommended Flow

```text
main
  -> local       reproduce or patch on local Windows
  -> remote-ide  reproduce or patch on server/code-server
  -> task branch / PR
  -> main
```

For small documentation-only changes, committing directly to `main` is still
acceptable when no active claim overlaps. For runtime, deployment, API,
database, or cross-environment changes, use a task branch and mention which
environment branch was used for validation.

## Initial Rollout

The first repositories using this branch contract are:

| Repository | main | local | remote-ide |
| --- | --- | --- | --- |
| `emptyinkpot/DataBase` | `main` | `local` | `remote-ide` |
| `emptyinkpot/Atramenti-Console` | `main` | `local` | `remote-ide` |

`Atramenti-Console` keeps its source checkout in the remote IDE workspace, while
this DataBase repository records the topology and branch contract.

## Why This Matters

The model gives the operator two fast debugging surfaces without losing a single
integration truth. Environment branches are visible in GitHub, so agents can
compare local and remote IDE state explicitly instead of guessing from private
worktree drift.
