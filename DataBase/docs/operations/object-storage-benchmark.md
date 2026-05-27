# Object Storage Benchmark And Promotion Runbook

## Purpose

This runbook defines the repeatable benchmark and promotion path for the
long-term DataBase file object store.

The benchmark compares S3-compatible backends through stable client protocols.
It must not call unverified internal service APIs or depend on product-specific
implementation details.

## Canonical Entrypoint

```powershell
.\scripts\storage\object-storage-benchmark.ps1 plan
.\scripts\storage\object-storage-benchmark.ps1 check-tools
.\scripts\storage\object-storage-benchmark.ps1 benchmark -Backend seaweedfs-lab -Bucket database-lab-artifacts
```

Local SeaweedFS lab helper:

```powershell
.\scripts\storage\object-storage-lab.ps1 start-seaweedfs
.\scripts\storage\object-storage-lab.ps1 configure-rclone-seaweedfs
```

The helper writes lab runtime data and local rclone config under:

```text
.runtime/object-storage-lab/
```

That path is ignored by Git and must not be used for production truth.

The script is the canonical local benchmark orchestrator. It records results
under:

```text
evidence/inventories/object-storage/benchmarks/
```

Benchmark records are inventory snapshots, not storage truth.

## Required Tools

- `rclone`
- one S3-compatible backend configured in rclone
- optional: `restic` for backup restore drills

The required rclone remotes should be configured outside this repository because
they contain credentials.

Suggested remote names:

```text
seaweedfs-lab:
rustfs-lab:
quark:
```

## Workload Classes

Use representative DataBase file shapes:

| Workload | Purpose |
| --- | --- |
| many-small-files | Notes, screenshots metadata, small generated assets |
| medium-assets | Images, source materials, exports |
| large-archives | Backups, e-books, media archives |
| metadata-listing | OpenList-style browsing and inventory |
| restore-drill | Backup correctness and operator recovery |

## Success Criteria

A backend can be promoted only when all criteria are met:

- S3-compatible PUT/GET works through rclone.
- `rclone check` succeeds for the benchmark corpus.
- Listing performance is acceptable for many-small-files.
- OpenList can expose the backend without becoming the object truth.
- A backup snapshot can be created and restored.
- Credentials surface is documented outside Git.
- Runtime paths are recorded in `docs/storage/server-runtime-paths.md`.
- Recovery steps are recorded in `docs/operations/recovery.md`.

## Promotion Gates

### Gate 1: Lab Candidate

The backend can be tested with non-critical objects only.

Required evidence:

- tool check result
- benchmark JSON report
- failure notes, if any

### Gate 2: Pilot Backend

The backend may host one non-critical bucket:

```text
database-lab-artifacts
```

Server-124 `/mnt/data` has been expanded from 20G to 40G. A small non-critical
pilot is now acceptable, but broad archive migration remains blocked until a
larger object-store volume exists.

Required evidence:

- bucket inventory
- rclone copy/check report
- OpenList mount verification
- restore drill

OpenList is reachable on server-124, but SeaweedFS projection must be added
through OpenList's supported admin/API path. Do not modify OpenList SQLite state
directly.

Current server-124 SeaweedFS pilot evidence:

```text
evidence/inventories/object-storage/pilot-seaweedfs-server-124.json
evidence/inventories/object-storage/benchmarks/20260512-103721-seaweedfs-pilot-remote.json
```

The pilot image is pinned by digest. A tar-based backup drill and a restic
backup/restore manifest check have passed. The current restic repository is
still on the same server data volume, so production promotion requires an
off-server or otherwise independent backup target.

### Gate 3: Object Truth

The backend may become durable file object truth only after:

- backup policy exists
- restore drill is successful
- object metadata mapping exists in MySQL or Gateway docs
- consumer path is through Gateway metadata and OpenList projection
- old source is retained until checksum-equivalent migration is proven

## Non-Goals

- Do not benchmark by calling service internals.
- Do not copy real personal files into a benchmark corpus unless explicitly
  approved.
- Do not store credentials or rclone config in Git.
- Do not promote a benchmark result to truth without recovery evidence.
