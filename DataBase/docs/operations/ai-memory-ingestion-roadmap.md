# AI Memory Ingestion Roadmap

The goal is to make the operator's AI systems accumulate durable engineering context instead of relying on chat history.

## Canonical Sources

Initial ingestion should read:

- `ecosystem/repos.json`
- `ecosystem/upstreams.json`
- `ecosystem/runtime-surfaces.json`
- `ecosystem/supply-relationships.json`
- `ecosystem/atramenti-capability-inventory.json`
- each core repository `project.json`
- each core repository README identity card
- each core repository `docs/runtime/production-runbook.md`
- DataBase storage, gateway, and operation docs
- selected experience-manager distilled docs

## Storage Layers

| Layer | Role |
| --- | --- |
| DataBase | Canonical topology, contracts, memory policy, and ingestion registry. |
| experience-manager | Durable experience and note records. |
| QMD | Fast local markdown and semantic retrieval mirror. |
| Mortis | Operator-facing query, action, and orchestration surface. |
| sub2api | Replaceable model gateway for summarization, labeling, and embedding providers. |

## First Milestone

Build a registry-to-QMD ingestion job:

```text
DataBase ecosystem JSON/Markdown
  -> normalized markdown mirror
  -> qmd collection: emptyinkpot-ecosystem
  -> Mortis/Codex query
```

The output should answer:

- Which repository is the source of truth?
- Which repositories are legacy or watch mirrors?
- What upstream does a fork/manual mirror come from?
- Which runtime URL maps to which source repository?
- Where should a future agent write a change?
- Which facts are safe to memorize and which must remain secret-only?

## Mature Systems To Reuse Later

- QMD: local search and semantic retrieval already present in the ecosystem.
- Onyx: self-hosted knowledge/RAG platform if the corpus grows beyond local QMD.
- Letta: stateful agent memory if Mortis needs agent-level memory semantics.
- LanceDB: lightweight vector store for multimodal/video search and future FuckVideo material retrieval.

Do not deploy all of these at once. Stabilize DataBase -> QMD -> Mortis first.
