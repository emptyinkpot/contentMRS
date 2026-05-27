# Object Storage Pilot

This directory records the server-side pilot shape for the long-term
S3-compatible file object truth layer.

The pilot is intentionally small and non-critical. It must not become production
truth until benchmark, backup, restore, and OpenList projection evidence exists.

## Runtime Target

```text
server-124
/srv/database-object-store/seaweedfs
/mnt/data/object-store/seaweedfs
```

## Image Pin

```text
chrislusf/seaweedfs@sha256:f5515a88db87397b65b613d604d88dc9855dcca9de6d0ed5a95bf8cf5572f03c
```

## Network Policy

Pilot ports must bind to loopback only:

```text
127.0.0.1:8333  SeaweedFS S3 gateway
127.0.0.1:18888 SeaweedFS filer
127.0.0.1:9333  SeaweedFS master
```

External consumers must not receive raw S3 credentials. Future consumers should
use Gateway metadata and OpenList projection.

## Promotion Boundary

The first bucket is:

```text
database-lab-artifacts
```

It is non-critical pilot data only.

Required checks before any promotion:

- `rclone copy`
- `rclone check`
- restore copy and second `rclone check`
- OpenList mount verification
- backup snapshot and restore drill
- credential surface recorded outside Git
