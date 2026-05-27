# Server Runtime Paths

## Known Server

- SSH alias: `server-124`
- Host: `124.220.233.126`

## MyBlog

| Path | Role |
| --- | --- |
| `/srv/myblog/repo` | Remote common source root |
| `/srv/myblog/site` | Deployed static site output |
| `/srv/myblog/admin-next` | Admin runtime surface |
| `/srv/myblog/source` | Content/source runtime surface |
| `/srv/myblog/public-data` | Public data surface |

## Mortis

| Path | Role |
| --- | --- |
| `/srv/multica` | Remote common source and runtime root |
| `/srv/multica/agent-workspaces` | AI action workspaces and runtime artifacts |
| `/srv/multica/openlist-export` | OpenList export / integration surface |

## OpenList

| Path | Role |
| --- | --- |
| `/srv/openlist/data` | OpenList runtime data root |

## Data Volume

| Path | Role |
| --- | --- |
| `/mnt/data` | Expanded ext4 data disk; 40G total after online resize of `/dev/vdb` |

## Long-Term File Object Store

These paths are proposed for the future S3-compatible object truth layer. They
are not broad production truth until deployment and recovery evidence exists.

| Path | Role |
| --- | --- |
| `/srv/database-object-store` | Runtime root for the selected S3-compatible object store and storage tooling |
| `/mnt/data/object-store` | Durable object-store data root, when local server disks are used |
| `/srv/database-object-store/seaweedfs` | SeaweedFS pilot runtime root; loopback-only, non-critical pilot |
| `/mnt/data/object-store/seaweedfs` | SeaweedFS pilot data root |
| `/srv/database-object-store/rustfs-lab` | RustFS benchmark lane only; not canonical production truth |

## Rule

Server paths must be classified before deletion or migration:

- source root
- deploy output
- runtime state
- generated cache
- temporary workspace
- backup/archive

