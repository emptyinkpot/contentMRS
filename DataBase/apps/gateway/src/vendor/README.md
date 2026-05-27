# Gateway vendored modules

Copied/adapted from `ContentMRS/vendor/*` clones. Do not edit upstream clones for product behavior — change here.

| Path | Upstream | Role |
|------|----------|------|
| `storm/evidence-query-expansion.ts` | stanford-oval/storm | Multi-perspective query expansion |
| `gpt-researcher/research-query-expansion.ts` | assafelovic/gpt-researcher | Subtopic-shaped retrieval seeds |
| `../lib/research-query-planner.ts` | storm + gpt-researcher | Unified query planner for `/evidence/search` |
| `open-notebook/inclusion-levels.ts` | lfnovo/open-notebook | Notebook source inclusion semantics |
| `ragflow/retrieval.ts` | infiniflow/ragflow | POST `/api/v1/retrieval` client |
| `paper-qa/gather-relevance.ts` | Future-House/paper-qa | Gather-evidence relevance scoring |

Scope registry: `apps/gateway/config/material-notebooks.json` (notebook → sourceIds / datasetIds).

闭环（ContentBase）：`pnpm run smoke:closed-loop` 先调 `/scope/resolve` 与 `/evidence/search`，再可选 `runtime.generate.article`。
