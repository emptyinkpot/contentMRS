# Long-Term File Object Storage Architecture

## Decision

DataBase should standardize on an S3-compatible file object truth layer and
reuse mature storage projects instead of implementing storage primitives in this
repository.

The long-term target stack is:

```text
File object truth:
  S3-compatible object store
  primary candidate: SeaweedFS
  benchmark challenger: RustFS
  external managed target: cloud S3-compatible provider

File access projection:
  OpenList

Migration, sync, verification:
  rclone

Optional POSIX mount:
  JuiceFS on top of the object store, only when POSIX semantics are required

Backup:
  restic or Borg, pointed at object storage or a separate backup backend

Metadata and references:
  MySQL + DataBase Gateway
```

The stable contract is S3-compatible object storage, not a specific product.
DataBase should persist object metadata, references, ownership, and recovery
knowledge. It must not vendor or reimplement object storage internals.

## Why This Is The Long-Term Shape

S3-compatible object storage gives the highest code reuse:

- existing SDKs and CLIs work without custom adapters
- OpenList can remain the human-facing access layer
- rclone can migrate, check, sync, and inventory across providers
- Gateway can expose stable metadata APIs without serving bytes itself
- future backends can be swapped behind the same protocol

## Component Roles

| Component | Role | Truth Status |
| --- | --- | --- |
| SeaweedFS | Primary self-hosted object store candidate | File object truth when deployed as the selected backend |
| RustFS | High-performance S3-compatible challenger | Candidate until benchmarked in this environment |
| MinIO / AIStor | Mature S3 ecosystem reference | Not the default new community baseline because of licensing and distribution uncertainty |
| OpenList | Access gateway, UI, WebDAV-style projection | Not object truth unless it physically persists the object |
| rclone | Copy, sync, check, migration, inventory | Tooling only, never truth |
| JuiceFS | POSIX filesystem layer backed by object storage and metadata DB | Optional access layer; introduces separate metadata truth |
| restic / Borg | Encrypted, deduplicated backup snapshots | Backup truth for restore points, not primary object truth |
| MySQL | Structured metadata and references | Structured truth |
| DataBase Gateway | Stable API facade | Contract and policy surface, not byte storage |

## Candidate Decision

### Primary Candidate: SeaweedFS

Use SeaweedFS first when DataBase needs a self-hosted, long-lived file object
truth. It matches the repository's needs:

- S3-compatible API for standard tooling
- WebDAV and FUSE options when needed
- optimized path for many small files
- can store large files
- metadata store can use proven external databases
- simpler operational model than Ceph for a personal data platform

### Benchmark Challenger: RustFS

RustFS should be tracked as a high-performance Apache-2.0 S3-compatible
candidate. It is attractive for performance and licensing, but it is still
younger than SeaweedFS in the current ecosystem. Do not make it the canonical
object truth until local benchmarks and recovery drills prove it.

### Not Default: MinIO Community

MinIO remains an important S3-compatible reference, but it should not be the
default new community baseline for this repository. The current official
documentation has shifted toward AIStor/commercial surfaces, while community
distribution and license posture create avoidable long-term uncertainty.

## Canonical Data Boundaries

```text
MySQL
  owns structured records, object metadata, ownership, tags, citations,
  object ids, checksums, logical paths, and lifecycle state.

S3-compatible object store
  owns object bytes.

OpenList
  owns access projection and human browsing, not object ownership.

rclone
  moves and verifies objects; its config is not truth.

Gateway
  exposes metadata and controlled operations; it should not become a file server.
```

## Target Runtime Layout

Proposed server paths:

```text
/srv/database-object-store/
  seaweedfs/                 # selected object store runtime, if SeaweedFS wins
  rustfs-lab/                # benchmark lane only, not production truth
  backups/                   # backup tool state, no secrets in repo

/mnt/data/object-store/
  seaweedfs/                 # object store data volumes
  backup-repositories/       # restic/Borg repositories if local target is used

/srv/openlist/data
  OpenList runtime and mount configuration
```

These paths are proposed boundaries. They are not active truth until deployed,
inventoried, and recorded in the runtime docs.

## Rollout Phases

### Phase 0: Contract Freeze

- Keep the stable interface as S3-compatible object storage.
- Keep OpenList as access projection.
- Keep Gateway metadata-only for file objects.
- Record this document in README, project.json, and storage contracts.

### Phase 1: Local Benchmark

Canonical runbook:

```text
docs/operations/object-storage-benchmark.md
```

Canonical local entrypoint:

```powershell
.\scripts\storage\object-storage-lab.ps1 start-seaweedfs
.\scripts\storage\object-storage-lab.ps1 configure-rclone-seaweedfs
.\scripts\storage\object-storage-benchmark.ps1 plan
.\scripts\storage\object-storage-benchmark.ps1 check-tools
.\scripts\storage\object-storage-benchmark.ps1 benchmark -Backend seaweedfs-lab -Bucket database-lab-artifacts
```

Benchmark SeaweedFS and RustFS with representative data:

- many small files
- large archives
- generated images and screenshots
- source material folders
- rclone copy/check workloads
- OpenList browsing path

Success criteria:

- object PUT/GET works through S3-compatible client
- rclone copy/check succeeds with checksum evidence
- OpenList can expose the backend without becoming truth
- backup snapshot can be created and restored
- recovery procedure is documented

### Phase 2: Server Pilot

Deploy one selected backend on server-124 under the proposed runtime paths.
Do not migrate all files at once. Start with a non-critical bucket:

```text
database-lab-artifacts
```

Current server-124 capacity observation:

```text
/      40G total, 35G used, 3.6G available, 91% used
/mnt/data 40G total, 17G used, 22G available, 43% used
```

The `/mnt/data` data disk was expanded from 20G to 40G and the ext4 filesystem
was resized online with `resize2fs /dev/vdb`. This is enough for a small
non-critical pilot, but not enough for broad archive migration. Keep the pilot
bucket small until a larger object-store volume exists.

Required evidence before promotion:

- service health command
- bucket inventory
- rclone check report
- restore drill
- OpenList mount verification
- Gateway metadata reference example

Current pilot evidence:

```text
evidence/inventories/object-storage/pilot-seaweedfs-server-124.json
evidence/inventories/object-storage/benchmarks/20260512-103721-seaweedfs-pilot-remote.json
```

SeaweedFS is running on server-124 as a loopback-only, non-critical pilot with a
pinned image digest. The pilot has passed a minimal rclone
copy/check/list/restore/check smoke test, a small remote benchmark corpus of 24
files and 4,669,440 bytes, a tar-based backup archive readability drill, and a
restic backup/restore manifest check. It is not production object truth because
OpenList projection and off-server backup are still pending.

### Phase 3: Promote Object Truth

Promote the selected backend only after the pilot has passed. At that point:

- register buckets and mount paths in inventories
- document secrets surfaces
- add Gateway metadata endpoints if needed
- define backup retention
- define lifecycle classes for hot, warm, and archive data

## Non-Goals

- Do not copy object store source code into this repository.
- Do not write a custom object store.
- Do not make OpenList the object truth.
- Do not put large binary assets into Git.
- Do not use JuiceFS unless POSIX semantics are truly required.
- Do not expose raw object-store admin credentials to consumers.

## Source References

- SeaweedFS: https://github.com/seaweedfs/seaweedfs
- RustFS: https://docs.rustfs.com/concepts/introduction.html
- rclone: https://rclone.org/
- JuiceFS: https://juicefs.com/docs/community/introduction/
- BorgBackup: https://www.borgbackup.org/borgbackup/index.html
- MinIO AIStor / community documentation surface: https://docs.min.io/
