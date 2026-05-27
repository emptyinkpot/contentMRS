# Backstage Catalog Export

This repository can export `catalog/ecosystem/repos.json` into a
Backstage-compatible catalog projection.

## Why This Exists

The repo registry already knows the stable truth:

- repository names
- visibility
- role
- upstream
- preferred source
- canonical doc
- machine-readable entry

Backstage can consume that truth as catalog entities without re-modeling the
ecosystem by hand.

## Export Input

- `catalog/ecosystem/repos.json`

## Export Output

- `catalog/backstage/*.catalog-info.yaml`

## Export Command

```powershell
.\scripts\catalog\export-backstage-catalog.ps1
```

## Rule

The export is a projection, not a second truth source.

