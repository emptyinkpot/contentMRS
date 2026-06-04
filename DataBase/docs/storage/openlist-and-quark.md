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

## Current Runtime

Observed on server-124:

```text
OpenList URL: http://124.220.233.126:5244
container: openlist
image: openlistteam/openlist:latest
version: v4.2.2
runtime data: /srv/openlist-data -> /opt/openlist/data
```

Current mounts:

| OpenList mount | Backend | Object truth |
| --- | --- | --- |
| `/quark` | Quark Drive | Quark account storage |
| `/cos-myblog-media` | Tencent COS S3-compatible bucket `myblog-media-1410041307` in `ap-shanghai` | Tencent COS bucket |

The COS mount is managed through OpenList's supported admin API as an `S3`
storage. Do not edit OpenList SQLite directly. Tencent COS requires virtual-host
style access, so `OPENLIST_S3_FORCE_PATH_STYLE=false`.

Stable entrypoints:

```powershell
cd "E:\My Project\ContentMRS\DataBase\services\openlist-adapter"
npm run provision:s3-storage
npm run smoke

cd "E:\My Project\ContentMRS\DataBase\apps\gateway"
npm run smoke:openlist
```

The Gateway smoke verifies `/openlist/health`, lists OpenList storages, checks
the expected mount, and asserts that sensitive storage fields are redacted.

## SeaweedFS Pilot Projection

SeaweedFS pilot currently exists as a loopback-only S3-compatible backend on
server-124:

```text
S3 endpoint: http://127.0.0.1:8333
bucket: database-lab-artifacts
credential surface: /srv/database-object-store/seaweedfs/rclone.conf
```

SeaweedFS projection is still pending. Add it through OpenList's supported
admin API using S3-compatible storage settings. Do not edit OpenList's SQLite
database directly as a repair layer.

Observed OpenList runtime:

```text
version: v4.2.2
container binary: /opt/openlist/openlist
supported CLI surface: openlist storage list/delete/disable; admin token
admin API surface: /api/admin/storage/create|update|load_all
```

The confirmed storage-add/update flow is
`services/openlist-adapter/scripts/provision-s3-storage.mjs`. It calls the
OpenList admin API and redacts credentials in output.

## Not Recommended

- Runtime task state
- Transactional records
- Fine-grained authorization source
- Query-heavy application state

