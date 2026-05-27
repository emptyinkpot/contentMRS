# Storage Topology

## High-Level Map

```text
GitHub DataBase
  -> topology / contracts / inventories / recovery docs

Tencent CynosDB MySQL
  -> structured records / novel runtime / vocabulary / accounts / logs / secrets table

OpenList
  -> unified file access gateway / projection surface

Quark Drive
  -> file object truth for Quark-backed large files and archives

S3-Compatible Object Store
  -> long-term replaceable file object truth layer

Server Filesystems
  -> registered file object roots / remote source roots / deploy roots / runtime artifacts / temporary workspaces

MyBlog
  -> content production and publishing runtime

Mortis
  -> operator runtime and AI workflow consumer
```

## Canonical Ownership

| Layer | Owner | Canonical Role |
| --- | --- | --- |
| MySQL / CynosDB | Tencent Cloud database | Structured data truth |
| OpenList | `/srv/openlist/data` runtime | File access gateway and projection surface, not file object truth |
| Quark Drive | Quark account storage | File object truth for Quark-backed large files, source materials, exports, and archives |
| S3-compatible object store | SeaweedFS primary candidate; RustFS benchmark challenger; cloud S3-compatible provider as external managed candidate | Long-term replaceable file object truth layer |
| Registered server file roots | Explicit server paths documented in `docs/storage/server-runtime-paths.md` or inventories | File object truth only for paths designated as persistent storage roots |
| MyBlog repo | `/srv/myblog/repo` and GitHub | Content/application source |
| Mortis repo | `/srv/multica` and GitHub | Operator/runtime source |
| Local MySQL CLI config | `C:\Users\ASUS-KL\.codex-secrets\mysql\myblog.cnf` | Local operator access |

## Truth Split

- Structured records live in MySQL / CynosDB.
- File objects live in the backend that physically persists them: Quark Drive, a registered server file root, or another explicit OpenList-mounted backend.
- Long-term self-owned file object truth should converge on an S3-compatible object store, with OpenList and rclone consuming it through standard protocols.
- OpenList normalizes access to those backends; it must not be treated as the object owner unless the object is actually persisted in OpenList's own runtime storage.

## Non-Goals

- Do not copy full MySQL dumps into this repo.
- Do not copy OpenList or Quark files into this repo.
- Do not store deployment build output in this repo.
- Do not treat inventories as live data; they are snapshots and maps.
