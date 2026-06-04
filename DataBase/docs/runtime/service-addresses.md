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
| DataBase Gateway | `http://127.0.0.1:18090` on server-124 and RainYun | `/srv/database-gateway` | active | server-124 remains public `database.tengokukk.com`; both gateways report MySQL ok and RAGFlow ok |
| OpenList | `http://127.0.0.1:5244` / `http://124.220.233.126:5244` | `/srv/openlist-data` | active | OpenList v4.2.2; mounts `/quark` and `/cos-myblog-media` |
| RAGFlow standby on server-124 | `http://127.0.0.1:9080` / `http://127.0.0.1:9380` | `/srv/ragflow` plus Docker volumes | standby cleanup-candidate | kept during RainYun observation window; stop/delete only after the evidence checks below still pass |
| RAGFlow primary on RainYun | `http://10.100.0.2:9080` / `http://10.100.0.2:9380` | `/srv/ragflow` | active heavy-runtime | RainYun Chongqing NAT host; default target for RAGFlow and ContentBase heavy work |
| NocoDB | `http://127.0.0.1:18088` | `/srv/nocodb` | not-listening | not part of the current Gateway/OpenList/RAGFlow path |
| DreamFactory | `http://127.0.0.1:18089` | `/srv/dreamfactory` | not-listening | not part of the current Gateway/OpenList/RAGFlow path |
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
| `/srv/openlist-data` | OpenList runtime data root |
| `/srv/database-gateway` | DataBase Gateway production runtime copy |
| `/srv/ragflow` | RAGFlow runtime on server-124 and RainYun; 124 copy is standby during migration |
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
- NocoDB/DreamFactory are not in the current active path unless their listeners are restored and verified.
- Meilisearch/Qdrant, once deployed, are rebuildable indexes and not data truth.
- DataBase Memory Service is the external memory facade; its internal QMD/MySQL wiring is implementation detail.
- Heavy RAGFlow/ContentBase work should run on RainYun. server-124 remains the public ingress, control, OpenList, automation, and lighter-service host until those services are explicitly migrated.
- Before stopping or deleting server-124 RAGFlow, re-run the runtime matrix and confirm: RainYun ES `ragflow_12dbc...` is green with `158396` docs / `4gb`, RAGFlow MySQL has 5 knowledge bases / 148 documents / 148 tasks, MinIO user objects diff is zero, and `/srv/backups/ragflow/20260604-162629-cold/SHA256SUMS` verifies.

If a public URL, internal URL, server path, or source repository changes, update:

```text
README.md
project.json
ECOSYSTEM_MAP.md
docs/runtime/service-addresses.md
affected consumer repository project.json
```
