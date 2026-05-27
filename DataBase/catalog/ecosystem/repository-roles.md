# Repository Roles

This directory is the machine-readable registry for the emptyinkpot ecosystem. It exists so humans and AI agents can decide where work belongs without relying on memory or repository name guesses.

## Role Vocabulary

| Role | Meaning |
| --- | --- |
| `ecosystem-truth` | Canonical cross-repository truth, topology, inventory, and memory material. |
| `repository-governance-and-ai-behavior-gates` | Contract and gate tooling that verifies other repositories. |
| `remote-ide-and-shared-workspace-infra` | Remote development workspace infrastructure. |
| `ai-gateway` | Model provider routing, OpenAI-compatible API, account groups, and key distribution. |
| `ACTIVE Mortis operator-runtime source line` | Preferred forward source for Mortis. |
| `legacy-source-record` | Historical source record; only use for rollback or forensics. |
| `sanitized-watch-mirror` | Public visibility/change-tracking mirror; never deploy from it. |
| `manual-research-mirror` | Imported mirror that GitHub does not recognize as a fork; upstream must be declared manually. |
| `research-fork` | Fork/reference code used for learning or future extraction, not current production source. |

## AI Memory Use

The registry is deliberately designed as memory substrate. Future indexing jobs should prioritize:

- `ecosystem/repos.json`
- `ecosystem/upstreams.json`
- `ecosystem/runtime-surfaces.json`
- `ecosystem/supply-relationships.json`
- each core repository `project.json`
- each core repository `docs/runtime/production-runbook.md`
- architecture and decision records

The goal is not to store private secrets. The goal is to preserve stable facts and operator preferences so future AI agents know the correct source, runtime, and dependency chain.
