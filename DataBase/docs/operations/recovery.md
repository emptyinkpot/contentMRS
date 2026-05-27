# Recovery

## MySQL

Minimum recovery knowledge:

- Host, port, user, database are documented in `docs/storage/mysql-current-state.md`.
- Password surface is documented in `docs/storage/secrets-surfaces.md`.
- Schema and inventory snapshots live under `schemas/mysql/` and `inventories/mysql/`.

Recommended next step:

- Add dump commands and backup target policy.
- Define restore drills.

## Files

Minimum recovery knowledge:

- OpenList runtime root: `/srv/openlist/data`
- Long-term object-store runtime proposal: `/srv/database-object-store`
- Long-term object data root proposal: `/mnt/data/object-store`
- MyBlog data paths: `/srv/myblog/public-data`, `/srv/myblog/site/data`, `/srv/myblog/source/public-data`
- Quark Drive mappings should be inventoried in `inventories/server/` or `inventories/openlist/`.
- Future S3-compatible object-store buckets must have bucket inventory, credential surface, backup target, and restore drill before promotion.

## Rebuild Order

1. Restore MySQL connectivity.
2. Restore OpenList access.
3. Restore the selected S3-compatible object store if it has been promoted.
4. Restore MyBlog source and deploy output.
5. Restore Mortis operator runtime.
6. Rebuild generated indexes and caches.

