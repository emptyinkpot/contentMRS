# Mortis Repository Consolidation

Date: 2026-05-11

## Decision

The latest and fullest Mortis source line is:

```text
https://github.com/emptyinkpot/mortis-multica-source
default branch: mortis/operator-runtime
```

This repository is the consolidation target for Mortis operator runtime work.

## Current Repositories

| Repository | Role | Current action |
| --- | --- | --- |
| `mortis-multica-source` | active Mortis operator-runtime source | keep active |
| `mortis-multica-source-legacy` | legacy rollback/source record | retain until rollback docs cite exact commits, then archive |
| `mortis-multica-watch` | sanitized watch mirror | archive after confirming no watch workflow consumes it |
| `mortis-napcat-control` | chat/control adapter | migrate durable adapter code/docs into the active source or keep as explicitly documented integration repo |

## Why There Were Four

The four repositories are not all equivalent copies:

- `mortis-multica-source` is the forward source line and already has the
  `mortis/operator-runtime` branch.
- `mortis-multica-source-legacy` preserves older work and rollback context.
- `mortis-multica-watch` is a sanitized/public watch mirror, not a source of
  truth.
- `mortis-napcat-control` is a small adapter surface, not the main app source.

## Merge Target Layout

When adapter migration is performed, use:

```text
mortis-multica-source/
  integrations/napcat-control/
  docs/integrations/napcat-control.md
```

Do not overwrite the main app with adapter-only files.

## Safe Order

1. Verify production/runtime source still maps to `mortis-multica-source`.
2. Add three environment branches to `mortis-multica-source`:
   - `main`
   - `local`
   - `remote-ide`
   while keeping `mortis/operator-runtime` as the active operator branch until
   a separate branch-default migration is planned.
3. Import useful docs from `legacy` into `docs/archive/legacy/` or cite exact
   rollback commits.
4. Confirm no workflow consumes `mortis-multica-watch`.
5. Migrate or document `mortis-napcat-control` as an integration.
6. Archive `legacy` and `watch` only after references are updated and backups
   are retained.

## Prohibited Shortcut

Do not delete or hide the historical repositories before rollback and watch
workflow checks are complete.


## Progress 2026-05-11

Completed:

- Created `local` and `remote-ide` branches on `mortis-multica-source`.
- Migrated `mortis-napcat-control` into `mortis-multica-source` at `integrations/napcat-control/`.
- Added active-source archive references for `mortis-multica-source-legacy` and `mortis-multica-watch`.
- Created bare mirror backups and verified them with `git fsck --full`:
  - `E:\Backups\github\mortis-multica-source-legacy.git`
  - `E:\Backups\github\mortis-multica-watch.git`
  - `E:\Backups\github\mortis-napcat-control.git`
- Active consolidation commit: `7a0636388c3163ee9ecdc889d9dd71a36d8f2ba8`.

Deleted repositories:

- `mortis-multica-source-legacy`: backup main `c495be267c1aca9de453c1bae888b7dd5e2c57f9`.
- `mortis-multica-watch`: backup main `476c3453113fe62402c4d9e3fafcdd1249e37537`.
- `mortis-napcat-control`: backup main `c13567db0f3f537854bd6593c3fc619b6116a14b`.
- GitHub archive completed at `2026-05-11T16:34:51+08:00`.
- GitHub deletion completed at `2026-05-11T16:39:00+08:00`.

Remaining:

- Do not recreate these repositories unless a rollback task explicitly restores
  from the verified mirror backups.
