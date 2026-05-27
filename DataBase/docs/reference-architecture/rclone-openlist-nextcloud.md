# Rclone, OpenList, And Nextcloud

## Repositories

- https://github.com/rclone/rclone
- https://github.com/OpenListTeam/OpenList
- https://github.com/nextcloud/server
- https://github.com/seaweedfs/seaweedfs
- https://docs.rustfs.com/concepts/introduction.html
- https://juicefs.com/docs/community/introduction/

## Referenced Concepts

- Multiple file backends behind one access model
- Remote storage abstraction
- File inventory and mount thinking
- Distinction between gateway and storage truth
- S3-compatible object storage as the replaceable long-term file object truth interface
- Optional POSIX layer over object storage only when required

## Referenced Areas In DataBase

- `docs/storage/openlist-and-quark.md`
- `docs/storage/long-term-file-object-storage.md`
- `docs/storage/server-runtime-paths.md`
- future OpenList backend inventory

## NOT Copied

- Sync engine
- Web file manager UI
- Provider implementations
- Filesystem mount runtime

## Differences

DataBase records file topology and ownership. OpenList and Quark remain the actual file access/storage layers.

