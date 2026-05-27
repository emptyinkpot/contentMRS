---
title: Cross-Repo Artifact Inventory
status: canonical
owner: DataBase
---

# Cross-Repo Artifact Inventory

This document is the current-state inventory for the artifact grammar defined in
`docs/contracts/cross-repo-artifact-contracts.md`.

It is a projection of reality, not a new rule system. Use it to see which
DataBase / ContentBase / MyBlog artifacts already exist, which are partial, and
which are still planned.

Status values:

| Status | Meaning |
| --- | --- |
| `implemented` | Artifact exists on the canonical branch/path and has a usable producer/consumer story. |
| `partial` | Artifact or producer exists, but path, schema, freshness, or consumer contract is incomplete. |
| `planned` | Artifact is named in the contract but not implemented at the canonical path. |
| `blocked` | Artifact cannot safely be implemented until an ownership or source-truth problem is resolved. |
| `deprecated` | Artifact exists but should not be used as the forward path. |

## Snapshot

Inventory date: 2026-05-13.

Evidence surfaces checked:

- DataBase clean worktree at `origin/main` commit `c74891b`.
- ContentBase Windows checkout on `refactor/codex/canonical-database-consumer` after commit `7903afc8`.
- MyBlog production workspace at `server-124:/srv/myblog/repo`.

The ContentBase and MyBlog worktrees both contain unrelated dirty work. This
inventory only records artifact existence and boundary risk; it does not claim
those worktrees are otherwise clean.

## DataBase Artifacts

| Artifact | Status | Evidence | Gap / risk | Next action |
| --- | --- | --- | --- | --- |
| Gateway OpenAPI | `implemented` | `gateway/openapi.yaml` exists on DataBase `origin/main`. | Freshness still depends on route/build discipline; consumers must match deployed Gateway version. | Keep OpenAPI as the access contract and require generated clients to declare source version. |
| Generated DataBase client | `planned` on `origin/main`; active work exists elsewhere | `generated/` is absent on clean `origin/main`; DataBase main worktree currently has untracked `generated/` and generator files. | Generated client is not yet a stable committed artifact on the canonical branch. ContentBase use may outrun DataBase publication. | Promote generated client through a dedicated DataBase commit after source/schema review. |
| Content schema contracts | `planned` on `origin/main`; active work exists elsewhere | `schemas/content/` is absent on clean `origin/main`; DataBase main worktree currently has untracked `schemas/content/`. | Consumer code can start depending on schema paths that are not yet canonical. | Land content schemas with owner/version/freshness fields before expanding consumers. |
| Creative schema/contracts | `partial` | `schemas/creative/` and `creative-contracts/` are absent on clean `origin/main`; ContentBase runtime capability docs reference `@emptyinkpot/database-creative-contracts:runCreativeRules`. | ContentBase already names a DataBase creative contract package, but the DataBase canonical artifact path is not fully committed on `origin/main`. | Decide whether the canonical artifact is a schema path, package, Gateway route, or all three; then publish it from DataBase. |
| Semantic graph snapshot | `planned` | `semantic-graph.snapshot.json` and `schemas/semantic/` are absent on clean `origin/main`; DataBase main worktree currently has untracked `schemas/semantic/`. | No stable snapshot/version contract for ContentBase context hydration or MyBlog knowledge projection. | Define snapshot schema and freshness fields before first consumer dependency. |
| Public projection schema | `planned` | `public-projection.schema.json` is absent on clean `origin/main`. | MyBlog can consume runtime/public data without a DataBase-owned projection schema. | Create schema before standardizing public content bundles. |
| Canonical Content Graph | `partial` | `docs/contracts/canonical-content-graph.md`, `schemas/document/canonical-content-graph.schema.json`, and `examples/document/minimal-content-graph.json` define the first graph-level boundary. | No graph storage, importer, projection engine, anchor resolver, or reader runtime exists yet. | Use CCG as the parent model before extending CDM or adding projection pipelines. |
| Raw artifact store contract | `partial` | `docs/contracts/raw-artifact-store-contract.md`, `schemas/document/raw-artifact.schema.json`, and `examples/document/minimal-raw-artifact.json` define immutable content-addressed source artifact records. | No OpenList storage layout implementation, registry table, dedupe command, retention review, or GC workflow exists yet. | Implement raw artifact registry before import workers move or archive files. |
| Reader runtime/projection package contract | `partial` | `docs/contracts/reader-runtime-projection-contract.md`, `schemas/document/projection-package.schema.json`, `schemas/document/reader-runtime-state.schema.json`, and examples define graph-versioned projection packages and reader state. | No projection engine, MyBlog consumer, reader UI, pagination engine, or search package builder exists yet. | Implement projection package builder before replacing MyBlog content roots or adding reader comments/highlights. |
| Public surface edit intake contract | `partial` | `docs/contracts/public-surface-edit-intake-contract.md`, `schemas/document/public-edit-intake.schema.json`, and `examples/document/minimal-public-edit-intake.json` define MyBlog write intake for comments, highlights, moderation, and edit proposals. | No MyBlog UI, auth boundary, intake processor, spam/moderation store, or graph edit promotion workflow exists yet. | Implement intake API/queue before enabling MyBlog-side edits or comments against public projection packages. |
| Graph versioning/edit contract | `partial` | `docs/contracts/graph-versioning-edit-contract.md`, `schemas/document/graph-edit-operation.schema.json`, `schemas/document/graph-version-manifest.schema.json`, and examples define versioned graph edits. | No graph storage, editor, merge/conflict handling, or projection rebuild trigger exists yet. | Implement before allowing AST edits, illustration insertion, or correction promotion in runtime. |
| Asset graph contract | `partial` | `docs/contracts/asset-graph-contract.md`, `schemas/document/asset-graph.schema.json`, and `examples/document/minimal-asset-graph.json` define media/asset node relationships. | No asset registry, image processing, OpenList storage integration, or projection derivative policy implementation exists yet. | Implement asset registry before adding illustration workflows. |
| Anchor/location contract | `partial` | `docs/contracts/anchor-location-contract.md`, `schemas/document/anchor-location.schema.json`, and `examples/document/minimal-anchor-location.json` define stable anchors and runtime locations. | No anchor resolver, projection location map producer, reader runtime, or pagination engine exists yet. | Implement anchors before comments/highlights/pagination. |
| Annotation graph contract | `partial` | `docs/contracts/annotation-graph-contract.md`, `schemas/document/annotation-graph.schema.json`, and `examples/document/minimal-annotation-graph.json` define annotation overlays. | No reader/editor UI, comments database, anchor resolver, or public/private projection policy implementation exists yet. | Add only after anchor/node identity is stable enough for reader runtime. |
| Content ingestion constitution | `partial` | `docs/contracts/content-ingestion-constitution.md`, `schemas/document/content-import-manifest.schema.json`, and `examples/document/minimal-content-import-manifest.json` define the no-silent-loss import boundary. | No import workers, raw artifact store, normalizer, or review workflow exists yet. | Implement format workers only after raw artifact preservation and loss report storage are chosen. |
| EPUB ingestion contract | `partial` | `docs/contracts/epub-ingestion-contract.md`, `schemas/document/epub-ingestion-manifest.schema.json`, and `examples/document/minimal-epub-ingestion-manifest.json` define the import boundary. | No importer command, Pandoc/HAST transform, asset extraction, or CDM/CCG persistence exists yet. | Build importer only after choosing parser route and output manifest location. |
| Canonical Document Model | `partial` | `docs/contracts/canonical-document-model.md`, `schemas/document/canonical-document.schema.json`, and `examples/document/minimal-cdm-document.json` define the first machine-readable boundary. | No storage tables, importer, projection engine, or projection manifest producer exists yet; Markdown/content roots still act as practical source formats in current repos. | Implement importer/projection manifest strategy before EPUB/PDF/MDX/Fanqie pipelines. |
| Ecosystem catalog | `implemented` | `ECOSYSTEM_MAP.md`, `catalog-info.yaml`, `catalog/`, and `ecosystem/` exist. | Catalog is topology metadata only; it must not become runtime config. | Keep as navigation and ownership source; update when repo identity or dependency changes. |

## ContentBase Artifacts

| Artifact | Status | Evidence | Gap / risk | Next action |
| --- | --- | --- | --- | --- |
| Runtime capability metadata | `implemented` | `product/novel/app/runtime-capabilities.ts` exists. | It lives on a feature branch with broader runtime work; branch delivery must remain scoped. | Keep executable metadata as source; do not duplicate in docs by hand. |
| Runtime capability documentation projection | `implemented` | `docs/api/generated/runtime-capabilities.md` exists and says it is generated from `product/novel/app/runtime-capabilities.ts`. | Generated doc is currently in an untracked/dirty area in the local checkout; verify branch publication before relying on it from DataBase. | Ensure generated projection and source metadata land together. |
| Runtime capability OpenAPI projection | `partial` | `runtime-capabilities.md` links `contentbase-runtime.openapi.json`, but inventory did not verify that file as canonical. | Link may drift from generated file availability. | Verify or generate the machine-readable projection in the same delivery as capability docs. |
| Workflow capability report | `planned` | `workflow-capabilities.json` not found at repo root. | No machine-readable report summarizing executable workflow graph/capabilities. | Add only after executable workflow metadata has a source owner. |
| Quality report | `planned` | `quality-report.json` not found. | Quality outcomes may remain internal runtime responses without reusable evidence artifact. | Define per-run output path and manifest fields before publishing outside ContentBase. |
| Repair trace | `planned` | `repair-trace.json` not found. | Repair results could be confused with DataBase durable truth if exported informally. | Define trace schema and promotion path before cross-repo consumption. |
| Publish manifest | `planned` | `publish-manifest.json` not found. | Publication truth can drift between browser action, ContentBase runtime, and DataBase platform binding. | Make confirmed/unconfirmed status explicit in a manifest before MyBlog consumes publish output. |
| Audit evidence bundle | `planned` | `audit-evidence/` not found. | Evidence may be scattered across logs/screenshots without privacy/publication review. | Create bundle manifest first; only public-approved artifacts can flow to MyBlog. |

## MyBlog Artifacts

| Artifact | Status | Evidence | Gap / risk | Next action |
| --- | --- | --- | --- | --- |
| Public content bundle | `planned` | `public-content-bundle/` not found. | MyBlog has content/runtime sources, but no named cross-repo public bundle boundary. | Define bundle manifest after DataBase public projection schema exists. |
| Generated MDX | `planned` | `generated-mdx/` not found. Existing content roots include `apps/web/src/content/notes`, `apps/web/src/content/projects`, and `apps/web/src/content/pages`. | Existing content roots are presentation/source paths, not a cross-repo generated artifact contract. | Do not rename existing roots yet; first define whether generated MDX is needed. |
| Evidence library | `implemented` | `public-data/evidence-library` exists. | Public approval/freshness manifest was not verified in this inventory. | Add or verify manifest fields before accepting ContentBase audit evidence. |
| Search index | `planned` or build-output-local | `search-index/` not found at repo root. | Search output may exist under build output or Pagefind paths, but it is not named as a stable cross-repo artifact. | Identify actual search index output path and document it before external producers depend on it. |
| Runtime content index | `implemented` | `public-data/runtime/content-index.json` exists and is large. | It is a projection; source version/freshness fields were not verified. | Add/verify generated-at and source mirror/version fields where possible. |
| Public edit intake output | `planned` | No MyBlog intake artifact/API path verified yet. | MyBlog can become a shadow editor if comments, highlights, or corrections are stored only in presentation code or ad-hoc JSON. | Implement only as structured `public-edit-intake` records that reference DataBase graph versions and projection package ids. |
| Static dist | `implemented` | `apps/web/dist/` exists. | Dist is deploy artifact, not source truth. Current MyBlog workspace has unrelated dirty docs/contracts. | Continue treating dist as output only; fixes go through source/build/deploy. |

## Highest-Risk Gaps

1. **Generated DataBase client is not yet cleanly canonical on `origin/main`.**
   ContentBase is already converging on generated/Gateway consumption. The
   client publication path should be stabilized before more workflow code depends
   on new generated contracts.

2. **Creative contract path is semantically referenced before it is fully
   visible as a DataBase artifact.** ContentBase capability metadata names
   `@emptyinkpot/database-creative-contracts:runCreativeRules`; DataBase should
   make the canonical creative contract artifact explicit.

3. **MyBlog has real projection artifacts but no DataBase-owned public
   projection schema.** `public-data/runtime/content-index.json` and evidence
   library exist, but the cross-repo contract for public bundle shape is still
   planned.

4. **MyBlog-side writes need intake before UI implementation.** Comments,
   highlights, owner edits, and illustration changes should not be stored as
   ad-hoc presentation files or direct DataBase writes.

5. **Workflow evidence artifacts are planned, not implemented.** Quality report,
   repair trace, publish manifest, and audit evidence are the next likely source
   of drift if ad-hoc JSON/log/screenshot exports start crossing repos.

6. **Freshness metadata is inconsistent.** Existing artifacts may work, but many
   do not yet declare source commit, generated-at time, schema version, or
   DataBase Gateway/client version in a standard way.

7. **Canonical document truth is still format-bound in practice.** Markdown,
   runtime JSON, MDX/content roots, EPUB/PDF/Fanqie outputs, and search indexes
   are still practical formats rather than projections from a DataBase-owned
   Document AST. CDM schema and projection manifests are the next publishing
   boundary to define before adding EPUB/PDF workflows.


## Recommended Convergence Order

1. **DataBase generated client publication**
   - Land generated client path or package on DataBase `origin/main`.
   - Declare source OpenAPI version and regeneration command.
   - Make ContentBase consume only that published contract.

2. **DataBase creative contract artifact**
   - Decide canonical path/package/route for `database-creative-contracts`.
   - Publish schema/version/freshness fields.
   - Align ContentBase runtime capability references with that canonical owner.

3. **DataBase public projection schema**
   - Define the shape MyBlog can consume.
   - Add freshness/version fields before standardizing public content bundles.

4. **MyBlog runtime content index freshness**
   - Verify or add generated-at/source/version metadata.
   - Keep it as projection only.

5. **MyBlog public edit intake**
   - Add an intake API/queue/artifact that emits `public-edit-intake.v1`.
   - Route comments/highlights to Annotation Graph and edits to reviewed Graph
     Edit Operations.

6. **ContentBase workflow evidence bundle family**
   - Start with `publish-manifest.json`, because publication truth is the most
     likely cross-repo ambiguity.
   - Then add `quality-report.json`, `repair-trace.json`, and `audit-evidence/`
     only as produced artifacts with manifests.

## Non-Goals

- Do not add ContractGuard gates for these gaps yet.
- Do not create placeholder files in ContentBase or MyBlog just to satisfy this
  inventory.
- Do not move DataBase-generated artifacts into consumer repositories as manual
  truth.
- Do not treat MyBlog dist/runtime output as source.
