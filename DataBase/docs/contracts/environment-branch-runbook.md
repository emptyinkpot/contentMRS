# Environment Branch Runbook

This runbook explains how to use the three-branch debugging contract.

## Branches

```text
main        integration truth
local       local Windows debug lane
remote-ide  remote IDE debug lane
```

## Local Debug

```powershell
git fetch origin
git switch local
git merge --ff-only origin/main
```

Use this lane for Windows-only reproduction, local browser/CDP behavior, local
filesystem issues, and machine-specific Codex or MCP problems.

When a local fix becomes durable, create a normal task branch from `main` and
cherry-pick or reapply the scoped patch there.

## Remote IDE Debug

```bash
git fetch origin
git switch remote-ide
git merge --ff-only origin/main
```

Use this lane for server-like dependency versions, code-server behavior,
Linux-only paths, remote services, and deployment-adjacent reproduction.

When a remote IDE fix becomes durable, create a normal task branch from `main`
and promote the scoped patch there.

## Promotion

```text
local or remote-ide
  -> task branch from main
  -> checks
  -> main
```

Do not merge environment branches wholesale into `main`. Promote only the
intentional patch. Environment-only logs, temporary probes, debug flags, and
machine paths must be removed before promotion.

## First Rollout Repositories

- `https://github.com/emptyinkpot/DataBase`
- `https://github.com/emptyinkpot/Atramenti-Console`

Both repositories now have:

```text
main
local
remote-ide
```
