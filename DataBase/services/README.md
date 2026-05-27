# DataBase Internal Services

This directory records service-level capabilities that belong inside the DataBase ecosystem boundary.

DataBase may own adapters, MCP surfaces, ingestion jobs, contracts, schemas, and runbooks. It should not blindly vendor complete third-party engines when a cleaner upstream/fork relationship exists.

## Layers

| Layer | Purpose |
| --- | --- |
| `memory/` | Public facade boundary for DataBase memory and retrieval consumers. |
| `experience-manager/` | Durable memory write, recall, notes, and QMD mirror refresh surface. |
| `database-ops-mcp/` | Database inspection and operational context MCP surface. |
| `qmd-adapter/` | DataBase-owned QMD collection/index contract and adapter surface. |
| `gateway-client-adapters/` | Consumer-side wrappers for DataBase Gateway. |
| `gateway-mcp/` | MCP adapter that exposes the existing DataBase Gateway HTTP API as AI tools without direct MySQL access. |
| `openlist-adapter/` | DataBase-owned SDK/API adapter over an external OpenList runtime; does not vendor OpenList source, data, or binaries. |

## Source Policy

- DataBase is the canonical truth for topology, schemas, contracts, runtime surfaces, and ownership.
- `my-project-qmd` is the private QMD runtime/source repo.
- `emptyinkpot/qmd` is the GitHub-recognized fork used to track `tobi/qmd` upstream updates.
- `experience-manager` must not be imported from Atramenti until credential-shaped defaults are removed.
- `gateway-client-adapters` is the consumer-facing product layer for Gateway reuse.

## External Boundary

External consumers should use `DataBase Memory Service` for memory and retrieval. `experience-manager`, `qmd-adapter`, and `my-project-qmd` are internal implementation layers behind that facade.

## MCP Boundary

`gateway-mcp/` intentionally wraps the existing HTTP Gateway. It is not a generic MySQL MCP and must not expose raw SQL.

Use mature MySQL MCP servers only for separate read-only schema inspection workflows. DataBase business reads and writes should go through the Gateway and its MCP adapter.
