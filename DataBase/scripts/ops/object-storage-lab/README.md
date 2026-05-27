# Object Storage Lab

This directory contains local-only lab definitions for testing the long-term
S3-compatible file object truth layer.

The lab is not production truth. It exists to validate:

- S3-compatible PUT/GET
- rclone copy/check/list/restore workflows
- OpenList projection compatibility
- promotion evidence before any server deployment

## Current Lab

```text
docker-compose.seaweedfs.yml
```

It starts a local SeaweedFS stack with:

- master: `127.0.0.1:9333`
- volume: `127.0.0.1:8080`
- filer: `127.0.0.1:8888`
- S3 gateway: `127.0.0.1:8333`

The lab stores data under:

```text
.runtime/object-storage-lab/seaweedfs/
```

This path is intentionally ignored by Git.

## Workflow

```powershell
.\scripts\storage\object-storage-lab.ps1 start-seaweedfs
.\scripts\storage\object-storage-lab.ps1 configure-rclone-seaweedfs
.\scripts\storage\object-storage-benchmark.ps1 benchmark -Backend seaweedfs-lab -Bucket database-lab-artifacts
.\scripts\storage\object-storage-lab.ps1 stop-seaweedfs
```

If Docker Desktop is not running, start it first.

## Credentials

The lab rclone config is generated from operator-owned environment variables:

```text
DATABASE_OBJECT_LAB_S3_ACCESS_KEY
DATABASE_OBJECT_LAB_S3_SECRET_KEY
```

The values are written only to `.runtime/object-storage-lab/rclone.conf`, which
is ignored by Git.
