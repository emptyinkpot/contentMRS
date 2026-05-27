# Ecosystem Map

This document is the cross-repository source of truth for the emptyinkpot AI infrastructure ecosystem.

The canonical constitution for the DataBase / ContentBase / MyBlog topology is
`docs/contracts/three-repo-topology-constitution.md`. Use it before changing
domain ownership, workflow runtime ownership, or public projection boundaries
between those repositories.

The canonical artifact grammar for those repositories is
`docs/contracts/cross-repo-artifact-contracts.md`. Use it before adding or
consuming artifacts across DataBase, ContentBase, and MyBlog.

The current-state inventory and gap map for that grammar is
`docs/contracts/cross-repo-artifact-inventory.md`. Use it to choose the next
artifact convergence task.

The canonical content graph model is
`docs/contracts/canonical-content-graph.md`. CDM lives below it as the ordered
structure-tree subgraph at `docs/contracts/canonical-document-model.md`. Use
these before treating Markdown, EPUB, PDF, HTML, MDX, reader locations, search
indexes, or platform payloads as content truth.

The content ingestion constitution is
`docs/contracts/content-ingestion-constitution.md`: raw artifacts are immutable,
imports must produce manifests and loss reports, and AI must not silently
rewrite or flatten source files. The EPUB import boundary
`docs/contracts/epub-ingestion-contract.md` specializes that constitution; EPUB
is an import source artifact and the canonical target is CDM/CCG, not Markdown.

Raw artifact storage is governed by `docs/contracts/raw-artifact-store-contract.md`; OpenList may store bytes, while DataBase owns hash identity, lineage, retention, and references. Annotation overlays are governed by `docs/contracts/annotation-graph-contract.md`.

## High-Level Chain

```text
DataBase / ContractGuard
  -> code-server-workspace-infra
  -> sub2api
  -> Mortis
  -> FuckVideo / Atramenti / MyBlog / Telegram / n8n
```

## Repository Roles

| Repository | Visibility | Role | Canonical Boundary |
| --- | --- | --- | --- |
| `emptyinkpot/DataBase` | private | Data topology, contracts, inventories and recovery map | Does not store full production data or secrets. |
| `emptyinkpot/ContentBase` | private | Workflow runtime for copywriting, fiction production, quality, repair, audit, and publishing | Consumes DataBase contracts through generated clients or Gateway; does not own durable domain truth. |
| `emptyinkpot/emptyinkpot.github.io` | public | MyBlog public projection shell | Renders public projection artifacts; does not own workflow logic, raw database access, or private runtime APIs. |
| `emptyinkpot/ContractGuard` | public | Reusable project contract and AI behavior gates | Governance tooling, not business runtime. |
| `emptyinkpot/code-server-workspace-infra` | private | Remote IDE and shared workspace infrastructure truth | Remote source/workspace runtime, not deployment target for every app. |
| `emptyinkpot/sub2api` | public fork | AI API gateway, account pool, group routing, OpenAI-compatible endpoints | Provider credentials and client API keys belong here or in its secret store. |
| `emptyinkpot/mortis-multica-source` | public fork | Current Mortis operator-runtime source line | Active Mortis source direction; fork of Multica. |
| `emptyinkpot/mortis-multica-source-legacy` | public | Legacy live `/srv/multica` source record | Historical/legacy source, not the preferred future source. |
| `emptyinkpot/mortis-multica-watch` | public | Sanitized public watch mirror | Mirror/change tracking only, not authoritative source. |
| `emptyinkpot/FuckVideo` | private | AI video understanding and Remotion generation application | Downstream application; uses Sub2API for hosted model/embedding access. |
| `emptyinkpot/Atramenti-Console` | private | Self-hosted console surface | Application/control surface, not global topology truth. |

## Production Surfaces

| Surface | URL | Source Repository | Notes |
| --- | --- | --- | --- |
| Sub2API | `https://sub2api.tengokukk.com/` | `emptyinkpot/sub2api` | Public AI API gateway; client base URL is `https://sub2api.tengokukk.com/v1`. |
| Mortis | `https://mortis.tengokukk.com` | `emptyinkpot/mortis-multica-source` | Operator runtime surface; legacy/watch repos must not be treated as current source without verification. |
| Atramenti Console | `https://console.tengokukk.com/` | `emptyinkpot/Atramenti-Console` | Private console deployment. |

## Supply Relationships

```text
sub2api
  -> supplies OpenAI-compatible model access
  -> consumed by Mortis, Telegram, n8n, FuckVideo

DataBase
  -> supplies topology, storage contracts and consumer maps
  -> consumed by operators and agents

code-server-workspace-infra
  -> supplies remote IDE/workspace truth
  -> consumed by humans and AI coding agents

ContractGuard
  -> supplies project contract schema and behavior gates
  -> consumed by core repositories
```

## Anti-Drift Rules

- Do not configure consumers directly with raw provider keys when Sub2API can supply a routed key.
- Do not treat `mortis-multica-watch` as source; it is a sanitized mirror.
- Do not treat `mortis-multica-source-legacy` as the preferred forward path unless a rollback task says so.
- Do not put production dumps, screenshots with secrets, provider keys, cookies or OAuth tokens in Git.
- If a production endpoint, source root, server root or consumer relationship changes, update this file and the affected repository's `project.json`.

## Recommended Read Order

1. `README.md`
2. `STORAGE_TOPOLOGY.md`
3. `ECOSYSTEM_MAP.md`
4. `docs/storage/server-runtime-paths.md`
5. `docs/gateway/external-consumers.md`
6. Affected repository `project.json`

Asset graph and anchor/location contracts are defined in `docs/contracts/asset-graph-contract.md` and `docs/contracts/anchor-location-contract.md`; assets attach media to CCG without mutating raw artifacts, and anchors support comments/highlights/reader locations without canonical page numbers.

Graph versioning and edit operations are defined in `docs/contracts/graph-versioning-edit-contract.md`; AST edits, illustration insertion, annotation promotion, and projection replacement must create new graph versions rather than mutating raw artifacts or unversioned current AST.

Reader runtime and projection packages are defined in `docs/contracts/reader-runtime-projection-contract.md`; MyBlog and reader surfaces should consume graph-versioned projection packages with TOC, anchor map, asset map, annotation overlay, search chunks, and reader state instead of treating rendered content as truth.

MyBlog-side comments, highlights, owner edits, illustration proposals, and
moderation actions are governed by
`docs/contracts/public-surface-edit-intake-contract.md`; MyBlog may initiate
changes, but DataBase owns annotation promotion, graph edit operations, graph
versions, and projection rebuilds. Clone-first implementation guidance lives in
`docs/reference-architecture/myblog-edit-surface.md`.
