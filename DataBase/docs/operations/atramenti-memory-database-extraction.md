# Atramenti Memory And Database Capability Extraction

This document records how memory, database, retrieval, MCP, and skill capabilities currently living inside `Atramenti-Console` should be brought under the DataBase ecosystem.

## Current Finding

`Atramenti-Console` contains several capabilities that are broader than a console application:

- `experience-manager`: durable experience records, notes, QMD mirror, and MCP surface.
- `qmd`: local markdown and vector retrieval layer.
- `database-ops-mcp`: canonical database inspection MCP.
- `database-api`: controlled product/business database API surface.
- `plan-history-recall`: plan ledger recall and experience sync skill.
- `memory-lancedb-pro`: retired/reference memory policy skill.

These should not be physically moved in one broad operation. The current local `Atramenti-Console` worktree is dirty and has branch divergence, so DataBase should first own the topology and migration contract.

Machine-readable inventory:

- `ecosystem/atramenti-capability-inventory.json`

## Target Ownership

| Capability | Source code owner | Data/topology owner | Runtime consumer |
| --- | --- | --- | --- |
| `experience-manager` | Atramenti until split, later dedicated memory capability repo | DataBase | Mortis, Codex |
| `qmd` | `my-project-qmd` or dedicated QMD repo | DataBase | Mortis, Codex |
| `database-ops-mcp` | Atramenti until split, later database capability repo | DataBase | Codex, Mortis |
| `database-api` | Atramenti or future gateway repo | DataBase | Console/API consumers |
| `plan-history-recall` | skills repo or Atramenti until split | DataBase | Codex, Mortis |
| `memory-lancedb-pro` | reference only | DataBase memory policy docs | none as live MCP |

## Extraction Rules

- Do not copy secrets into DataBase.
- Do not move source out of a dirty/divergent Atramenti worktree.
- Do not revive retired `memory-lancedb-pro` as a live MCP unless a future task explicitly reopens that design.
- Do not treat `db-readonly` as a first-class MCP; it is a compatibility alias for `database-ops-mcp`.
- DataBase owns schemas, topology, ownership maps, memory policy, ingestion policy, and risk register.
- ContractGuard owns the `project.json` checker and repository contract enforcement.
- Mortis should consume stable memory/query surfaces instead of reading Atramenti internals directly.

## Immediate Risk

The current experience-manager MCP source contains default database connection values with credential-shaped material. The value itself must not be copied into DataBase or docs.

Required fix in the source-owning repository:

1. Move database host, port, user, password, and database name into environment variables or a registered secret surface.
2. Fail closed when required credentials are missing in production.
3. Document the secret surface path in DataBase `docs/storage/secrets-surfaces.md`.
4. Add a source scan gate in ContractGuard or the source repo to block committed credential defaults.

## Memory Ingestion Direction

The first practical memory loop should be:

```text
DataBase ecosystem registry
  + core repo project.json
  + production runbooks
  + Atramenti capability inventory
  + experience-manager distilled docs
        ↓
QMD collection / future vector store
        ↓
Mortis query surface
        ↓
AI answers with source-aware context
        ↓
durable corrections return to experience-manager/DataBase
```

This gives the AI durable context without making chat history the source of truth.

## Migration Phases

1. Inventory phase:
   - Keep source code in place.
   - Maintain `ecosystem/atramenti-capability-inventory.json`.
   - Register risks and target ownership.

2. Contract phase:
   - Add `project.json` to any split capability repo.
   - Make each repo pass `ContractGuard` `check-project-json`.
   - Add README identity cards and governance docs.

3. Secret cleanup phase:
   - Remove credential-shaped defaults from source.
   - Register secret surfaces in DataBase.
   - Add pre-commit/source scan gates.

4. Runtime integration phase:
   - Expose memory query through Mortis.
   - Keep QMD as fast local retrieval.
   - Add Onyx/LanceDB only after the registry and QMD path are stable.
