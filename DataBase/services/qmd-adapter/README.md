# QMD Adapter

`qmd-adapter` is the DataBase-owned internal contract layer around QMD.

External consumers should use the public `DataBase Memory Service` facade. They should not depend directly on this adapter path or on QMD collection filesystem paths.

## Role

- Define DataBase collection names and index locations.
- Define which content classes may enter QMD indexes.
- Provide wrapper and runtime policy for Mortis, Codex, and memory ingestion jobs.
- Keep QMD engine updates separate from DataBase topology and memory contracts.

## Repository Roles

| Repository | Role |
| --- | --- |
| `https://github.com/emptyinkpot/my-project-qmd` | Private QMD runtime/source repo used by this ecosystem. |
| `https://github.com/emptyinkpot/qmd` | GitHub-recognized fork for upstream tracking. |
| `https://github.com/tobi/qmd` | Original upstream QMD project. |

## Default Runtime State

```yaml
defaultIndexPath: C:\Users\ASUS-KL\.cache\qmd\index.sqlite
experienceCollection: experience-manager
futureEcosystemCollection: emptyinkpot-ecosystem
```

## Current Experience Mirror Validation

```yaml
mode: controlled-sample
sourceService: DataBase/services/experience-manager
targetRepository: https://github.com/emptyinkpot/my-project-qmd
targetPath: collections/experience-manager
targetCommit: 1b312d5
sampleExperienceRecords: 5
sampleNotes: 5
readonlySourceCounts:
  experience_records_cloud: 349
  experience_notes_cloud: 44
gatewayStatus: local DataBase Gateway unavailable; direct MySQL readonly fallback used
```

## Current Index Validation

```yaml
localQmdConfig: C:\Users\ASUS-KL\.config\qmd\index.yml
configuredCollectionPath: E:\My Project\my-project-qmd\collections\experience-manager
indexPath: C:\Users\ASUS-KL\.cache\qmd\index.sqlite
lastUpdateCommand: pnpm exec tsx src/cli/qmd.ts update
indexedFiles: 11
embeddingCommand: pnpm exec tsx src/cli/qmd.ts embed
embeddedChunks: 11
embeddedDocuments: 6
pendingEmbeddings: 0
validatedSearches:
  - query: Token Pool streamLifecycle
    result: qmd://experience-manager/experiences/2026-04-28-Token-Pool-streamLifecycle-plan-PLAN-20260428-STREAM-DIAG-DOC.md
  - query: OpenClaw MySQL schema token
    result: qmd://experience-manager/notes/2026-03-24-OpenClaw-MySQL-schema-token-db-note-35.md
validatedVectorSearches:
  - query: Token Pool streamLifecycle
    env: QMD_VSEARCH_EXPAND=false
    result: qmd://experience-manager/experiences/2026-04-28-Token-Pool-streamLifecycle-plan-PLAN-20260428-STREAM-DIAG-DOC.md
validatedStructuredQueries:
  - query: "lex: Token Pool streamLifecycle"
    env: QMD_QUERY_EXPAND=false
    flags: --no-rerank
    result: qmd://experience-manager/experiences/2026-04-28-Token-Pool-streamLifecycle-plan-PLAN-20260428-STREAM-DIAG-DOC.md
knownIssue:
  defaultExpansionPath: vsearch/query with expansion may trigger model download/loading and exceed 120s on the current tool timeout; use QMD_VSEARCH_EXPAND=false or QMD_QUERY_EXPAND=false for stable operational checks.
```

## Policy

Do not store secrets in QMD indexes. Secret-class records require a separate allowlist and consumer-specific access policy before indexing.
