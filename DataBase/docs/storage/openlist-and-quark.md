# OpenList And Quark

## Role

OpenList is the unified file access layer. It can expose local server paths and remote storage providers such as Quark Drive. It owns the access view, not the underlying object truth.

Quark Drive is a large-file backend. When an object is stored in Quark, Quark account storage is the file object truth. It is suitable for media, archives, source materials, exports, and backup-like content, but it is not a structured query engine.

## Boundary

- OpenList is a gateway, not the file truth by itself.
- Quark is a backend storage surface and may be file object truth for Quark-backed assets, but it is not a database.
- Server file roots may be file object truth only when the path is explicitly documented as persistent storage, not when it is a runtime cache, deploy output, or workspace artifact.
- MySQL should store structured metadata and references.
- Large binary assets should stay in file storage, with metadata indexed elsewhere.

## File Truth Rule

For any file visible through OpenList, resolve the mounted backend before making truth claims:

```text
OpenList path
  -> mounted backend
  -> actual persistent owner
```

The mounted backend is the file object truth. OpenList is the access projection unless the file is actually persisted in OpenList-owned runtime storage.

## Expected Uses

- Images and visual references
- Novel source materials
- E-book or archive files
- Screenshots and generated artifacts
- Long-term media storage

## SeaweedFS Pilot Projection

SeaweedFS pilot currently exists as a loopback-only S3-compatible backend on
server-124:

```text
S3 endpoint: http://127.0.0.1:8333
bucket: database-lab-artifacts
credential surface: /srv/database-object-store/seaweedfs/rclone.conf
```

OpenList projection is still pending. Add it through OpenList's supported admin
or API path using S3-compatible storage settings. Do not edit OpenList's SQLite
database directly as a repair layer.

Observed OpenList runtime:

```text
version: v4.2.1
container binary: /opt/openlist/openlist
supported CLI surface: openlist storage list/delete/disable
```

The CLI exposes storage inspection and removal, but not a confirmed storage-add
flow in the current runtime. SeaweedFS S3 projection therefore remains pending
until an OpenList admin/API credential path is available.

API probe note:

```text
GET /openlist/api/admin/storage/list
```

The endpoint exists, but using the token output from
`openlist admin token --data /opt/openlist/data` returned JSON with
`code: 401` and `token is invalidated`. Do not continue by guessing token
formats or editing the SQLite database directly.

## Not Recommended

- Runtime task state
- Transactional records
- Fine-grained authorization source
- Query-heavy application state

