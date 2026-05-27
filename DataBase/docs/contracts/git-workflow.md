# Git Workflow Contract

This repository uses GitHub Flow plus two environment debug branches.

## Stable Branches

```text
main        stable integration and release truth
local       local Windows debugging lane
remote-ide  remote IDE / code-server debugging lane
```

`main` is the only durable integration branch. `local` and `remote-ide` are
allowed to diverge for debugging, but their changes are not product truth until
promoted through a task branch or pull request.

## Task Branches

Use short-lived task branches for durable work:

```text
agent/<agent-id>/<task-slug>
fix/<agent-id>/<task-slug>
docs/<agent-id>/<task-slug>
refactor/<agent-id>/<task-slug>
```

## Pull Before Push

Before pushing any durable change:

```powershell
git fetch origin --prune
git switch main
git pull --ff-only origin main
```

Before working in an environment branch:

```powershell
git fetch origin --prune
git switch local
git merge --ff-only origin/main
```

or:

```powershell
git fetch origin --prune
git switch remote-ide
git merge --ff-only origin/main
```

## Promotion Rule

Do not merge `local` or `remote-ide` wholesale into `main`.

Promote only the intentional patch:

```text
local / remote-ide
  -> task branch from origin/main
  -> checks
  -> pull request or scoped direct merge
  -> main
```

Environment-only logging, debug probes, machine paths, and temporary config must
be removed before promotion.

## Commit Style

Prefer Conventional Commits:

```text
feat:
fix:
docs:
refactor:
chore:
test:
ci:
perf:
```

For repository governance, use:

```text
docs:
chore:
ci:
```

## Branch Protection Target

Protect `main` in GitHub:

- require pull request review for non-trivial changes
- require status checks to pass
- require branches to be up to date before merge
- block force pushes
- block branch deletion

`local` and `remote-ide` should also block force pushes unless an operator is
intentionally resetting the environment lane.
