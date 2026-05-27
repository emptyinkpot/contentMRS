# Archive Candidates

Date: 2026-05-10

This report lists the first repositories that may be archived after reference
scan and backup checks. It does not authorize deletion.

Generated from:

```text
ecosystem/repository-consolidation.json
scripts/audit-repository-consolidation.ps1
```

## Hard Rule

Do not delete any repository in this report.

Archive only after:

```text
1. reference scan passes
2. no active runtime depends on it
3. durable docs/code are migrated if needed
4. backup/export exists
```

## High-Confidence Archive Candidates

| Repository | Reason | Before Archive |
| --- | --- | --- |
| `mortis-multica-source-legacy` | Legacy source record; active source is `mortis-multica-source`. | Confirm rollback docs reference exact legacy commit. |
| `mortis-multica-watch` | Sanitized watch mirror, not source of truth. | Confirm no current watch workflow consumes it. |
| `AIClient2API-Tutorial` | Tutorial/reference content; sub2api is active gateway. | Check for unique notes before archive. |
| `golutra` | Research fork. | Confirm no active runtime/workflow reference. |
| `auto-coding-agent-demo` | Research fork. | Confirm no active runtime/workflow reference. |
| `ai-town` | Manual research mirror. | Confirm no active extraction plan. |
| `ai-office` | Research fork. | Confirm no active extraction plan. |
| `agent-office` | Research fork. | Confirm no active extraction plan. |

## Medium-Confidence Archive Candidates

| Repository | Reason | Before Archive |
| --- | --- | --- |
| `AstrBot` | Reference fork unless active community contribution continues. | Confirm whether plugin contribution still needs this fork. |
| `AIClient-2-API` | Provider-adapter reference once sub2api is active. | Preserve useful provider-adapter notes in DataBase/sub2api docs. |
| `Roo-Kit` | Tooling/reference repo unless actively used. | Check local workflows and docs for references. |
| `Lex-Universalis` | No current runtime recorded. | Confirm no live application depends on it. |
| `Parliamentary-Simulation` | No current runtime recorded. | Confirm no live application depends on it. |
| `DataSheet` | Data/content repo with unclear active status. | Inspect contents before archive/delete. |
| `codex-crs-profile` | Likely superseded by `asus-kl-codex-home`. | Confirm no active Codex profile dependency. |
| `mirror-openai-skills-vendor-imports` | Vendor import mirror. | Confirm no active sync workflow. |
| `emptyinkpot.github.io` | No active site role currently documented. | Confirm GitHub Pages is unused. |

## Delete-After-Backup Candidates

These are deletion candidates only after archive and backup review.

```text
cloude-app
AIClient2API-Tutorial
emptyinkpot.github.io
DataSheet
codex-crs-profile
```

Current policy:

```text
deleteAllowedNow = false
```

## Merge Before Archive

Do not archive these until the target exists and smoke tests pass:

| Source | Target |
| --- | --- |
| `my-project-ffmpeg-mcp` | `my-project-media-mcp` |
| `my-project-video-audio-mcp` | `my-project-media-mcp` |
| `my-project-yt-dlp-mcp` | `my-project-media-mcp` |
| `token-pool` | `sub2api` / DataBase docs |

## Check Commands

Run before any archive/delete action:

```powershell
.\scripts\audit-repository-consolidation.ps1 -Repository <repo>
rg -n "<repo>" E:\My Project\DataBase E:\My Project
gh repo view emptyinkpot/<repo> --json name,isArchived,defaultBranchRef,updatedAt,description
```

For deletion candidates, also create a backup:

```powershell
git clone --mirror https://github.com/emptyinkpot/<repo>.git E:\Backups\github\<repo>.git
```
