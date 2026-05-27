# Service Addresses

This file is the visible address card for DataBase-related runtime surfaces.

## Public Surfaces

| Surface | URL | Source / Owner | Status |
| --- | --- | --- | --- |
| Mortis | `https://mortis.tengokukk.com` | `emptyinkpot/mortis-multica-source` | active |
| n8n editor | `https://mortis.tengokukk.com/n8n/` | server-124 `/mnt/data/n8n` | active |
| Sub2API | `https://sub2api.tengokukk.com/` | `emptyinkpot/sub2api` | active |
| Sub2API OpenAI-compatible API | `https://sub2api.tengokukk.com/v1` | `emptyinkpot/sub2api` | active |
| Atramenti Console | `https://console.tengokukk.com/` | `emptyinkpot/Atramenti-Console` | active |

## Internal / Loopback Surfaces

| Surface | Internal URL | Runtime Path | Status | Notes |
| --- | --- | --- | --- | --- |
| n8n | `http://127.0.0.1:5678` | `/mnt/data/n8n` | active | automation bus |
| NocoDB | `http://127.0.0.1:18088` | `/srv/nocodb` | active | table UI / low-code gateway |
| DreamFactory | `http://127.0.0.1:18089` | `/srv/dreamfactory` | bootstrap | generated REST API candidate |
| MySQL | `124.220.245.121:22295` | Tencent CynosDB | active | structured data truth |
| Meilisearch | `http://127.0.0.1:17700` | future `/srv/database-search/meilisearch` | planned | keyword/facet search projection |
| Qdrant | `http://127.0.0.1:16333` | future `/srv/database-search/qdrant` | planned | semantic/vector search projection |
| Remote IDE / code-server | `http://127.0.0.1:18080` after SSH tunnel | server-170 `/home/ubuntu/workspaces` | active | source workspace; source of truth is `emptyinkpot/code-server-workspace-infra` |
| DataBase Memory Service MCP | not publicly exposed | server-170 `/home/ubuntu/workspaces/DataBase/services/memory` plus `/srv/database-memory` runtime state | readonly remote validated | unified memory facade for agents |

## Server Roots

| Root | Role |
| --- | --- |
| `/srv/multica` | Mortis source/runtime root |
| `/srv/multica/agent-workspaces` | AI action workspaces and artifacts |
| `/srv/nocodb` | NocoDB runtime |
| `/srv/dreamfactory` | DreamFactory candidate runtime |
| `/srv/openlist/data` | OpenList runtime data root |
| `/srv/database-search` | planned search runtime root |
| `/srv/database-memory` | planned DataBase Memory Service runtime state, env, and QMD index root |
| `server-170:/home/ubuntu/workspaces` | remote IDE source workspace root |
| `server-170:/home/ubuntu/workspaces/DataBase` | planned DataBase remote source workspace |
| `server-170:/home/ubuntu/workspaces/my-project-qmd` | planned QMD runtime/source workspace |

## Alignment Rules

- DataBase owns topology, contracts, inventories, and recovery docs.
- Mortis owns natural-language operator routing and timeline projection.
- sub2api owns model/API gateway routing.
- MySQL owns structured data records.
- NocoDB/DreamFactory expose controlled table/API surfaces.
- Meilisearch/Qdrant, once deployed, are rebuildable indexes and not data truth.
- DataBase Memory Service is the external memory facade; its internal QMD/MySQL wiring is implementation detail.

If a public URL, internal URL, server path, or source repository changes, update:

```text
README.md
project.json
ECOSYSTEM_MAP.md
docs/runtime/service-addresses.md
affected consumer repository project.json
```
