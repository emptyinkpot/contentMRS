# Agent Workflow

This repository is a personal-development repository, but multiple AI agents may
work on it. Coordination state must be visible from GitHub and from a local
checkout.

## Golden Rule

Do not start a non-trivial edit before checking active claims and the
integration queue.

Claims are coordination signals by default, not blocking locks.

Multiple agents may work on the same project at the same time when they use
separate branches, separate worktrees, and clear integration records.

Read these first:

```text
AGENTS.md
AGENT_WORKFLOW.md
evidence/claims/
evidence/integration-queue/
evidence/timeline/events.jsonl
project.json
README.md
```

## Coordination Truth

Branch names are not the whole coordination truth.

The coordination truth is the combination of:

```text
evidence/claims/*.json
evidence/integration-queue/*.json
evidence/timeline/events.jsonl
```

Each active task should have one claim file. Each branch waiting to merge should
have one integration queue file.

## Branch Model

Stable environment branches:

```text
main        stable integration and release truth
local       local Windows debugging lane
remote-ide  remote IDE / code-server debugging lane
```

`local` and `remote-ide` are not product truth. They are visible debugging
lanes. Promote useful work through a normal task branch rather than merging an
environment branch wholesale into `main`.

Preferred branch names:

```text
agent/<agent-id>/<task-slug>
fix/<agent-id>/<task-slug>
docs/<agent-id>/<task-slug>
refactor/<agent-id>/<task-slug>
```

`main` is the stable integration branch.

Agents may work in parallel on different branches. The claim registry makes the
parallel work visible; it does not automatically prevent work.

## Claim File

Claim path:

```text
evidence/claims/<task-id>.json
```

Example:

```json
{
  "task_id": "database-gateway-p0",
  "title": "Implement DataBase Gateway P0",
  "agent_id": "builder-agent",
  "status": "active",
  "branch": "agent/builder-agent/database-gateway-p0",
  "conflict_policy": "coordinate-on-overlap",
  "claimed_paths": [
    "apps/gateway/",
    "docs/gateway/database-gateway-p0.md",
    "project.json"
  ],
  "started_at": "2026-05-10T00:00:00Z",
  "updated_at": "2026-05-10T00:00:00Z",
  "handoff": null,
  "notes": "Overlapping work is allowed on separate branches, but must be recorded in the timeline and resolved through integration review."
}
```

## Status Values

```text
active
blocked
review
handoff
completed
abandoned
```

## Before Editing

1. Pull latest `main`.
2. Read `evidence/claims/`.
3. Read `evidence/integration-queue/`.
4. Check whether your target paths overlap active claims.
5. If overlap exists, choose one:
   - work on a separate branch and record the overlap in timeline
   - narrow your claimed paths
   - ask for handoff
   - become reviewer/integrator instead of implementer
6. Create or update your claim.
7. Append a timeline event.
8. Make the smallest path-scoped change.

## Path Ownership

An active claim declares intent over its `claimed_paths`.

Another agent may edit overlapping paths on a separate branch if the overlap is
recorded and the delivery goes through integration review.

Direct edits to `main` over an active overlapping claim are discouraged.

Use `conflict_policy`:

```text
coordinate-on-overlap
review-before-merge
handoff-required
operator-owned
```

Only `handoff-required` acts like a lock.

## Integration Queue

When an agent has a branch, patch, or local worktree ready for integration, add:

```text
evidence/integration-queue/<task-id>.json
```

Example:

```json
{
  "task_id": "database-gateway-p0",
  "agent_id": "builder-agent",
  "branch": "agent/builder-agent/database-gateway-p0",
  "status": "ready-for-review",
  "base": "main",
  "commit": null,
  "claimed_paths": ["apps/gateway/"],
  "checks": ["npm test"],
  "integration_notes": "Requires review against search-query-entrypoint before merge."
}
```

Queue status:

```text
draft
ready-for-review
changes-requested
approved
merged
abandoned
```

## Timeline

Append notable events to:

```text
evidence/timeline/events.jsonl
```

Example:

```json
{"time":"2026-05-10T00:00:00Z","actor":"codex","event":"claim.created","task_id":"search-query-entrypoint","paths":["scripts/database-query.ps1"]}
```

The timeline is for coordination, not logs. Keep entries short.

## Delivery Rule

Every task must end with one of:

```text
completed
handoff
blocked
abandoned
```

Final report must include:

```text
Task:
Claim:
Commit:
Files changed:
Checks:
Open risks:
Next owner:
```

## Mature Pattern Behind This

This is the lightweight repo-native version of:

- GitHub Issues assignment
- Jira ticket ownership
- Kubernetes Lease-style coordination, but advisory by default
- GitHub Flow branch-per-task development
- Graphite/ghstack stacked change thinking
- PR path ownership and review queues

The repository uses JSON files first because they are visible to humans, GitHub,
and AI agents without requiring another service.
