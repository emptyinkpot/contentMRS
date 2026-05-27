# DataBase Gateway API Surface Governance

This document defines how the DataBase Gateway API surface is allowed to grow.
The current Gateway is already callable through OpenAPI and a generated
TypeScript SDK, so the next priority is consolidation, not endpoint expansion.

## Authority

DataBase owns the canonical domain contract for:

- canonical content identity and publication-facing content state
- creative style and story memory contracts
- semantic units, tags, relations, and retrieval-facing context
- Gateway OpenAPI and generated SDK output

Consumers must not redefine these domain contracts. Consumers may define local
UI, form, workflow, cache, and runtime state models.

## Stable v1 Surface

Stable v1 APIs are the operations that consumers may build against without
expecting breaking response-shape changes:

| Domain | Stable operations |
| --- | --- |
| Runtime | `getServiceIdentity`, `getHealth`, `getStatus` |
| Canonical content | `listWorks`, `listWorkChapters`, `listWorkCharacters`, `createWork`, `appendChapter`, `upsertWork` |
| Creative contract | `getCreativeStyleContract`, `getAuthorProfile`, `resolveCreativeContext` |
| Story memory | `getStoryMemory`, `getStoryMemoryContext`, `recordStoryMemory` |
| Canonical writes | `recordGenerationOutput`, `recordChapterTransition`, `recordAuditResult`, `replaceWorkStructure`, `upsertVocabularyItem` |
| Search and semantic reads | `searchContent`, `searchVocabulary`, `listSemanticUnits`, `listSemanticTags`, `listSemanticRelations` |

Stable v1 changes must be additive unless a new version is introduced.

`resolveCreativeContext` is the stable AI-ready prompt aggregate. Consumers
should prefer these v1 fields over low-level compatibility fields:

- `narrativeState`: current, previous, and next chapter briefs plus character,
  world-rule, and continuity material.
- `semanticState`: retrieval query, semantic units, and a prompt-ready memory
  brief.
- `styleState`: active author profile, protocol, preferred terms, banned terms,
  quality rules, and technique identifiers.
- `publicationState`: active publication targets and platform constraints.
- `runtimeSnapshot`: context hash, resolution time, and source counts for
  traceability.

The older `parts`, `recentBlocks`, `currentPart`, `semanticContext`,
`publicationTargets`, `snapshot`, and `counts` fields remain compatibility
fields. New ContentBase generation code should consume the aggregate fields
first and treat compatibility fields as debug or migration support.

Allowed additive changes:

- optional response fields
- new enum values when consumers are already required to handle unknown values
- new query filters that preserve existing defaults
- new SDK methods for new operations

Breaking changes require a versioned replacement:

- renaming or removing fields
- changing requiredness or nullability
- changing operation meaning while keeping the same operation id
- changing idempotency semantics
- changing a command from append/event behavior into replacement behavior

## Experimental And Internal Surface

The following operations are useful but are not the stable consumer boundary:

| Category | Operations |
| --- | --- |
| Table-shaped canonical reads | `listCanonicalContentWorks`, `listCanonicalContentParts`, `listCanonicalContentBlocks`, `listCanonicalContentAssets`, `listCanonicalPublicationTargets` |
| Legacy or inventory reads | `getTableInventory`, `listFanqieWorks`, `listLiterature`, `listStateTransitions`, `listNotes`, `getNote` |
| Projection and utility commands | `recordNote`, `recordExperience`, `projectObsidianMarkdown` |

These operations may remain available, but new consumers should prefer stable
domain operations. If one of these becomes product-critical, promote it by
documenting its domain owner, command/query behavior, schema, idempotency rule,
and compatibility promise.

## Domain Layers

New operations must land in one domain layer:

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Canonical Content | Works, chapters, characters, publication-facing content state | `appendChapter`, `upsertWork` |
| Creative Runtime | author profile, style contract, resolved creative context | `resolveCreativeContext` |
| Narrative Memory | story events, character growth, important items, prompt memory context | `recordStoryMemory` |
| Semantic | semantic units, tags, relations, retrieval filters | `listSemanticUnits` |
| Publication And Audit | audit decisions, publication transitions, generation output persistence | `recordAuditResult` |
| Projection And Admin | inventory, Obsidian projection, legacy import visibility | `projectObsidianMarkdown` |

Do not add a new table-shaped `listX`, `getX`, or `upsertX` operation unless the
domain aggregate cannot satisfy the use case.

## Command And Query Split

Query operations:

- must not mutate canonical state
- should be cacheable by request identity when practical
- may return denormalized domain bundles
- should use stable filters instead of exposing raw SQL concerns

Command operations:

- must require `X-DataBase-Idempotency-Key`
- must record or update state through the Gateway mutation ledger where
  applicable
- must fail fast on schema validation
- must return a typed mutation response with enough metadata for audit and
  replay decisions

Command names should express business intent. `record*` is acceptable for event
append commands. New database-language names such as `upsert*` should only be
used when the operation is explicitly an idempotent canonical identity sync.

## Canonical Write Whitelist

Consumers must call the generated SDK or Gateway for these authority-owned
writes:

- work identity and chapter content
- chapter lifecycle state
- generation output
- audit result
- publication target/state
- story memory
- creative vocabulary and style contract material
- semantic context and retrieval-owned memory

Direct SQL remains acceptable only for:

- migration and backfill
- data import jobs before canonical projection
- analytics and diagnostics
- runtime-owned local execution state that DataBase does not claim as canonical

The first executable guard is:

```powershell
.\scripts\check-contentbase-canonical-sql-boundary.ps1 -ContentBaseRoot "E:\My Project\ContentBase"
```

It verifies that the ContentBase novel product does not add unregistered direct
SQL against DataBase-owned canonical tables. The guarded set includes canonical
content, creative, semantic, vocabulary, author, publication, note, and
experience tables. Known legacy debt must be explicit in the gate and in the
ContentBase migration matrix; new direct SQL against guarded tables fails.

For migration planning, run the same guard in report mode:

```powershell
.\scripts\check-contentbase-canonical-sql-boundary.ps1 -ContentBaseRoot "E:\My Project\ContentBase" -ReportAll
```

Report mode inventories remaining direct SQL table references without expanding
the failing guard list. Current allowed local SQL clusters are mostly
ContentBase runtime tables:

- Fanqie runtime and publication cache: `fanqie_*`, `novel_work_registry`
- local execution/cache tables: `sync_*`, `dashboard_snapshot_cache`,
  `module_snapshot_cache`
- no registered ContentBase migration debt remains for `notes` or `experience_records`; those resources must cross through Gateway read/write routes.
- migrated canonical/story tables must remain behind Gateway contracts:
  `volume_outlines`, `chapter_outlines`, `characters`, `world_settings`,
  `story_events`, `character_growth`, `important_items`

Do not promote runtime/cache tables into the failing guard list until the
Gateway owns a stable SDK/RPC replacement for that exact table responsibility.
Do not add new entries to the registered migration-debt list unless the debt is
also named in ContentBase's `docs/contracts/DATABASE_OWNERSHIP_MIGRATION.md`
with a target Gateway replacement.

## Growth Rule

Before adding an operation, answer these in the implementing change:

1. Which domain layer owns it?
2. Is it a command or a query?
3. Is it stable v1, experimental, or internal/admin?
4. What schema is the runtime authority?
5. Does the generated SDK expose it?
6. What direct-SQL consumer path does it retire?

If those answers are unclear, do not add the operation yet.
