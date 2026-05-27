# Archive Readiness Scan

Date: 2026-05-10

This report records a reference scan for repository consolidation. It does not
authorize deletion.

## Policy

Archive only after:

1. reference scan passes
2. no active runtime depends on the repository
3. durable content has been migrated if needed
4. backup/export exists for deletion candidates

## Summary

| Repository | GitHub State | Repo Audit | Reference Scan | Recommendation | Blocker |
| --- | --- | --- | --- | --- | --- |
| `mortis-multica-source-legacy` | public, not archived, default `main` | `archive-candidate` | referenced by Mortis docs and consolidation map only | `archive-candidate` | needs rollback reference confirmation |
| `mortis-multica-watch` | public, not archived, default `main` | `archive-candidate` | referenced by Mortis docs and host-control notes | `needs-manual-review` | confirm no active watch workflow consumes it |
| `AIClient2API-Tutorial` | deleted after backup on 2026-05-10 | `delete-after-backup` | only referenced by consolidation docs and upstream registry | `deleted-after-backup` | backup stored at `E:\Backups\github\AIClient2API-Tutorial.git` |
| `golutra` | public fork, not archived, default `master` | `archive-candidate` | referenced by Atramenti and inventory docs, plus historical tunnel notes | `archive-blocked` | historical runtime references still exist |
| `auto-coding-agent-demo` | deleted after backup on 2026-05-10 | `archive-candidate` | referenced by inventory and Atramenti history docs | `deleted-after-backup` | backup stored at `E:\Backups\github\auto-coding-agent-demo.git` |
| `ai-town` | public mirror, not archived, default `main` | `archive-candidate` | referenced by vendor shell and consolidation records | `needs-manual-review` | confirm no active extraction or mirror plan |
| `ai-office` | public fork, not archived, default `main` | `archive-candidate` | referenced by vendor shell, control plane registry, and remote runtime status artifacts | `archive-blocked` | active runtime artifacts still reference it |
| `agent-office` | deleted after backup on 2026-05-10 | `archive-candidate` | referenced by vendor shell and inventory records | `deleted-after-backup` | backup stored at `E:\Backups\github\agent-office.git` |

## Notes

- `mortis-multica-source-legacy` is a legacy source record and should stay as a
  rollback reference until the live source and rollback docs are independently
  validated.
- `mortis-multica-watch` is a sanitized mirror, but the host-control docs still
  mention it, so archive is blocked until the workflow is proven unused.
- `AIClient2API-Tutorial` was backed up and deleted on 2026-05-10.
- `agent-office` was backed up and deleted on 2026-05-10.
- `auto-coding-agent-demo` was backed up and deleted on 2026-05-10.
- `golutra` and `ai-office` still have concrete runtime references outside the
  repository catalog, so they should not be archived yet.

## Recommended Next Actions

1. Validate `AIClient2API-Tutorial` contents and create a backup/export.
2. Verify whether any active watch or notification workflow still consumes
   `mortis-multica-watch`.
3. Decide whether `golutra` and `ai-office` are still part of any active
   runtime or should be retained as historical references.
4. Keep `mortis-multica-source-legacy` until rollback documentation is explicit.

## Final Disposition Draft

This is the current working disposition, not a delete order.

| Repository | Draft Disposition | Why |
| --- | --- | --- |
| `AIClient2API-Tutorial` | `deleted-after-backup` | Tutorial content with no active runtime role found; mirror backup exists. |
| `agent-office` | `deleted-after-backup` | Historical research fork references only; mirror backup exists. |
| `auto-coding-agent-demo` | `deleted-after-backup` | Historical demo fork references only; mirror backup exists. |
| `ai-town` | `manual-review-before-archive` | Manual mirror plus active-looking inventory references. |
| `mortis-multica-watch` | `manual-review-before-archive` | Watch mirror still referenced by host-control docs. |
| `golutra` | `retain-until-runtime-check` | Historical tunnel/runtime references still exist. |
| `ai-office` | `retain-until-runtime-check` | Active worker/runtime artifacts still reference it. |
| `mortis-multica-source-legacy` | `retain-as-rollback-record` | Needed as a legacy rollback source record. |

## Current Recommendation

If consolidation proceeds next, the safest order is:

1. verify backup retention for deleted repositories
2. complete manual review for `ai-town`
3. separate active runtime checks for `mortis-multica-watch`, `golutra`, and
   `ai-office`
4. postpone any delete action until every repo above has an explicit final
   status

## Operation Queue

This is the next execution queue, ordered by risk.

### 1. Deleted After Backup

- `AIClient2API-Tutorial`
- `agent-office`
- `auto-coding-agent-demo`

### 3. Manual Runtime Check

- `mortis-multica-watch`
- `golutra`
- `ai-office`
- `ai-town`

### 4. Retain

- `mortis-multica-source-legacy`

## Merge Notes

No merge target is recommended for these six repositories yet.

- `AIClient2API-Tutorial`, `agent-office`, and `auto-coding-agent-demo` were
  backed up as bare mirror repositories and deleted from GitHub on 2026-05-10.
- `mortis-multica-watch` should remain a mirror until the notification workflow
  is proven unused.
- `golutra`, `ai-office`, and `ai-town` still need runtime/reference checks
  before any merge or archive decision.


## Mortis Update 2026-05-11

Mortis consolidation progressed after this scan:

- `mortis-napcat-control` durable code moved into `mortis-multica-source` at `integrations/napcat-control/`.
- `mortis-multica-source` now records legacy/watch repository references in `docs/archive/legacy-and-watch-repositories.md`.
- `mortis-multica-source-legacy`, `mortis-multica-watch`, and `mortis-napcat-control` are archive-ready with verified bare mirror backups.
- GitHub archive completed for `mortis-multica-source-legacy`, `mortis-multica-watch`, and `mortis-napcat-control` at `2026-05-11T16:34:51+08:00`.
- GitHub deletion completed for `mortis-multica-source-legacy`, `mortis-multica-watch`, and `mortis-napcat-control` at `2026-05-11T16:39:00+08:00`.
- Active Mortis consolidation commit: `7a0636388c3163ee9ecdc889d9dd71a36d8f2ba8`.

Verified backups:

| Repository | Backup | Verification | Main commit |
| --- | --- | --- | --- |
| `mortis-multica-source-legacy` | `E:\Backups\github\mortis-multica-source-legacy.git` | `git fsck --full` passed | `c495be267c1aca9de453c1bae888b7dd5e2c57f9` |
| `mortis-multica-watch` | `E:\Backups\github\mortis-multica-watch.git` | `git fsck --full` passed | `476c3453113fe62402c4d9e3fafcdd1249e37537` |
| `mortis-napcat-control` | `E:\Backups\github\mortis-napcat-control.git` | `git fsck --full` passed | `c13567db0f3f537854bd6593c3fc619b6116a14b` |

Do not recreate these repositories unless a rollback task explicitly restores
from the verified mirror backups.
