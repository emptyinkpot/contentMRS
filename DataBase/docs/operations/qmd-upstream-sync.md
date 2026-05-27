# QMD Upstream Sync

QMD has two repositories in this ecosystem:

| Repository | GitHub relation | Purpose |
| --- | --- | --- |
| `emptyinkpot/qmd` | GitHub-recognized fork of `tobi/qmd` | Upstream update tracking and clean comparison point. |
| `emptyinkpot/my-project-qmd` | Private manual runtime/source repo | Ecosystem-specific QMD source, docs, and runtime defaults. |

GitHub cannot convert an existing normal repository into a fork in place. Therefore `emptyinkpot/qmd` exists as the fork-visible upstream anchor, while `my-project-qmd` remains the private working source.

## Local Remote Policy

For `E:\My Project\my-project-qmd`:

```powershell
git remote -v
```

Expected:

```text
origin    https://github.com/emptyinkpot/my-project-qmd.git
upstream  https://github.com/tobi/qmd.git
```

The `upstream` push URL must remain disabled to avoid accidental pushes to the original project.

## Update Flow

1. Fetch upstream:

```powershell
git -C 'E:\My Project\my-project-qmd' fetch upstream --prune --tags
```

2. Compare:

```powershell
git -C 'E:\My Project\my-project-qmd' log --oneline HEAD..upstream/main
git -C 'E:\My Project\my-project-qmd' diff --stat HEAD..upstream/main
```

3. Rebase or cherry-pick only after checking local ecosystem changes.
4. Run QMD tests and ContractGuard.
5. Update DataBase registry if runtime behavior or collection policy changes.

## Do Not

- Do not make DataBase the full vendored QMD engine.
- Do not treat `emptyinkpot/qmd` as the private runtime source.
- Do not push secrets, indexes, model caches, or local collection data.
