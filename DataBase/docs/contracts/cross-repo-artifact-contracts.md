---
title: Cross-Repo Artifact Contracts
status: canonical
owner: DataBase
---

# Cross-Repo Artifact Contracts

This document defines the artifact grammar between DataBase, ContentBase, and
MyBlog.

It refines `docs/contracts/three-repo-topology-constitution.md`. The
constitution defines repository identity; this document defines what may cross
repository boundaries.

The rule is simple:

```text
repositories exchange artifacts, not implementation ownership
```

ContractGuard is not the owner of this grammar. It may validate selected
contracts later, but DataBase owns the topology and artifact language.

## Contract Fields

Every cross-repo artifact must be describable with these fields:

| Field | Meaning |
| --- | --- |
| Owner | Repository that owns the artifact's meaning and lifecycle. |
| Producer | Runtime, command, or repo path that creates the artifact. |
| Consumers | Repositories or systems allowed to read the artifact. |
| Canonical path | Preferred path or URL. If the path is not implemented yet, mark it planned. |
| Format | OpenAPI, JSON, JSONL, Markdown, static files, generated package, or directory tree. |
| Freshness rule | How consumers decide whether the artifact is current enough. |
| Forbidden use | What consumers must not infer or do from the artifact. |
| Promotion path | How artifact facts become durable DataBase truth, if they ever should. |

If a proposed cross-repo artifact cannot fill these fields, it is not ready to
be a boundary contract.

## Artifact Classes

| Class | Direction | Purpose |
| --- | --- | --- |
| Domain contract | DataBase -> ContentBase | Stable access to durable content and creative truth. |
| Projection contract | DataBase -> MyBlog, ContentBase -> MyBlog | Public, renderable content shape. |
| Workflow evidence | ContentBase -> DataBase, ContentBase -> operator | Runtime proof of generation, repair, audit, and publish execution. |
| Public shell artifact | MyBlog -> public web | Static and runtime projection output. |
| Public edit intake | MyBlog -> DataBase | Structured comments, highlights, moderation actions, and edit proposals from public/reader surfaces. |
| Catalog artifact | DataBase -> operators and agents | Topology, ownership, and ecosystem navigation. |
| Publishing projection | DataBase -> MyBlog, ContentBase -> platforms | Projection from canonical Document AST into EPUB, PDF, HTML, MDX, Astro, Fanqie, search, or print artifacts. |

## DataBase Export Contracts



### Canonical Content Graph

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase graph schema/model authorship and future importers/projection engines |
| Consumers | ContentBase workflow runtime, MyBlog projection tooling, reader runtime, publishing projection engines |
| Canonical path | `docs/contracts/canonical-content-graph.md`, `schemas/document/canonical-content-graph.schema.json`, `examples/document/minimal-content-graph.json` |
| Format | Markdown model document plus JSON Schema-backed node/edge graph |
| Freshness rule | Projection manifests must declare source graph version, projection node, producer, generated-at time, and output artifacts. |
| Forbidden use | Consumers must not hide entity, citation, evidence, annotation, anchor, or projection relationships inside Markdown strings or projection-only metadata. |
| Promotion path | Imported/generated content becomes durable only after conversion into DataBase-owned graph nodes and edges. |

The CCG is the top-level content truth. CDM is its ordered structure-tree
subgraph.




### Raw Artifact Record

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Raw artifact store/import pipeline |
| Consumers | DataBase ingestion, ContentBase import workflows, MyBlog public projections after publication approval |
| Canonical path | `docs/contracts/raw-artifact-store-contract.md`, `schemas/document/raw-artifact.schema.json`, `examples/document/minimal-raw-artifact.json` |
| Format | Markdown contract plus JSON artifact record |
| Freshness rule | Artifact identity is content-addressed by SHA-256; storage URI must resolve to bytes matching the recorded hash. |
| Forbidden use | Do not overwrite, rename, delete, duplicate, or replace raw artifacts with converted Markdown/projections. |
| Promotion path | Raw artifacts become CCG evidence/source/asset references through import manifests and graph edges. |




### Reader Runtime Projection Package

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Projection engine / reader package builder |
| Consumers | MyBlog, reader runtime, search, EPUB/PDF/HTML/Astro/Fanqie projection consumers |
| Canonical path | `docs/contracts/reader-runtime-projection-contract.md`, `schemas/document/projection-package.schema.json`, `schemas/document/reader-runtime-state.schema.json` |
| Format | Markdown contract plus JSON projection package and reader runtime state |
| Freshness rule | Projection package must reference graph id/version, producer, generated-at time, rendered content, TOC, anchor map, asset map, annotation overlay, and search chunks. |
| Forbidden use | Projection package and reader state must not become canonical content truth or raw source artifacts. |
| Promotion path | Projection packages are regenerated from graph versions; reader annotations/progress point back to anchors. |

### Public Surface Edit Intake

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | MyBlog reader/editor UI, reader runtime, future public surface adapters |
| Consumers | DataBase intake processor, Annotation Graph, graph review/edit workflow, ContentBase review assistance |
| Canonical path | `docs/contracts/public-surface-edit-intake-contract.md`, `schemas/document/public-edit-intake.schema.json`, `examples/document/minimal-public-edit-intake.json` |
| Format | Markdown contract plus JSON intake record |
| Freshness rule | Intake must reference graph id/version, projection package id, target node/anchor/asset/projection id, actor, surface, payload, review policy, and created-at time. |
| Forbidden use | MyBlog must not mutate canonical CCG/CDM nodes, raw artifacts, or DataBase tables directly from public UI actions. |
| Promotion path | Annotation intake creates annotation overlays; edit proposals require review and become graph edit operations plus new graph versions. |

### Graph Version And Edit Operation

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase graph editor/importer/review workflow |
| Consumers | ContentBase workflow runtime, MyBlog projection consumers, projection engines, review tools |
| Canonical path | `docs/contracts/graph-versioning-edit-contract.md`, `schemas/document/graph-edit-operation.schema.json`, `schemas/document/graph-version-manifest.schema.json` |
| Format | Markdown contract plus JSON edit operation and graph version manifests |
| Freshness rule | Consumers must reference graph version ids; projection manifests must point to source graph versions. |
| Forbidden use | Do not mutate canonical graph in place, do not treat annotations as edits, and do not modify raw artifacts through graph edits. |
| Promotion path | Reviewed edit operations create new graph versions; projections are regenerated from graph versions. |

### Asset Graph

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Import pipeline, asset registration, projection engines |
| Consumers | CDM/CCG, ContentBase workflows, MyBlog projections, annotation/evidence surfaces |
| Canonical path | `docs/contracts/asset-graph-contract.md`, `schemas/document/asset-graph.schema.json`, `examples/document/minimal-asset-graph.json` |
| Format | Markdown contract plus JSON asset graph |
| Freshness rule | Asset records must reference rawArtifactId and sha256; projection derivatives must not replace source assets. |
| Forbidden use | Do not inline asset bytes as canonical content or infer semantic role only from filenames. |
| Promotion path | Assets become canonical graph nodes through import/registration and graph relations such as illustrates/evidence_for/cover_of. |

### Anchor And Location Map

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Import pipeline, projection engines, reader runtime |
| Consumers | Annotation graph, reader runtime, MyBlog projections, EPUB/PDF/HTML/search mappings |
| Canonical path | `docs/contracts/anchor-location-contract.md`, `schemas/document/anchor-location.schema.json`, `examples/document/minimal-anchor-location.json` |
| Format | Markdown contract plus JSON anchor/location map |
| Freshness rule | Runtime locations must reference stable anchor ids and declare projection type and generated-at time. |
| Forbidden use | Do not store page numbers, scroll offsets, or EPUB CFI as canonical content structure. |
| Promotion path | Anchors become canonical location references; projection-specific locations are regenerated from anchors. |

### Annotation Graph

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Reader runtime, editor workflow, AI annotation workflow, import review |
| Consumers | MyBlog reader surfaces, ContentBase review workflows, DataBase graph review |
| Canonical path | `docs/contracts/annotation-graph-contract.md`, `schemas/document/annotation-graph.schema.json`, `examples/document/minimal-annotation-graph.json` |
| Format | Markdown contract plus JSON annotation graph |
| Freshness rule | An annotation must target a stable node or anchor id and declare visibility, author, created-at time, and status. |
| Forbidden use | Annotations must not mutate source artifacts or canonical content nodes directly. |
| Promotion path | Correction candidates become canonical content only through reviewed edit operations that create a new graph version. |

### Content Import Manifest

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Format-specific import workers and future normalization pipeline |
| Consumers | DataBase ingestion review, ContentBase import workflows, future projection pipelines |
| Canonical path | `docs/contracts/content-ingestion-constitution.md`, `schemas/document/content-import-manifest.schema.json`, `examples/document/minimal-content-import-manifest.json` |
| Format | Markdown constitution plus JSON import manifest |
| Freshness rule | Manifest must include immutable source artifact identity, extractor/parser route, normalization/image/output policies, loss report, unresolved warnings, outputs, and generated-at time. |
| Forbidden use | AI or import workers must not silently rewrite, summarize, merge, deduplicate, flatten, rename, or convert source artifacts into canonical truth. |
| Promotion path | Imported content becomes durable only after raw artifact preservation, extraction, loss reporting, normalization, and review/promotion into CCG/CDM. |

This is the parent contract for EPUB/PDF/Markdown/HTML/image/DOCX import workers.

### EPUB Ingestion Manifest

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Future DataBase EPUB importer |
| Consumers | DataBase ingestion review, ContentBase workflows that request EPUB import, MyBlog only after public projection |
| Canonical path | `docs/contracts/epub-ingestion-contract.md`, `schemas/document/epub-ingestion-manifest.schema.json`, `examples/document/minimal-epub-ingestion-manifest.json` |
| Format | Markdown contract plus JSON ingestion manifest |
| Freshness rule | Manifest must declare source EPUB artifact, importer/version, parser route, target document id, target graph id/version, generated-at time, and outputs. |
| Forbidden use | Consumers must not treat EPUB files or EPUB-to-Markdown output as canonical document truth. |
| Promotion path | EPUB content becomes durable only after conversion into CDM Document/Section/Block tree and CCG nodes/edges. |

EPUB is already structured. The importer should preserve OPF metadata, spine,
nav/toc tree, XHTML blocks, footnotes, anchors, and assets where possible.

### Canonical Document Model

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase document schema/model authorship and future importers |
| Consumers | ContentBase workflow runtime, MyBlog projection tooling, publishing projection engines |
| Canonical path | `docs/contracts/canonical-document-model.md`, `schemas/document/canonical-document.schema.json`, `examples/document/minimal-cdm-document.json` |
| Format | Markdown model document plus JSON Schema-backed Document/Section/Block/Inline AST |
| Freshness rule | Projection manifests must declare source document version, projection type, producer, and generated-at time. |
| Forbidden use | Consumers must not treat Markdown, EPUB, PDF, HTML, MDX, Astro content files, or Fanqie payloads as canonical document truth. |
| Promotion path | Imported Markdown or generated text becomes durable only after conversion into DataBase-owned Document/Section/Block objects. |

The CDM makes EPUB, PDF, HTML, MDX, Astro, search, and Fanqie output projection
artifacts rather than source truth.


### DataBase Gateway OpenAPI

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase Gateway source and OpenAPI generation path |
| Consumers | ContentBase, MyBlog server-side adapters when explicitly approved, operator tooling, AI adapters |
| Canonical path | `gateway/openapi.yaml` |
| Format | OpenAPI YAML |
| Freshness rule | Must match the deployed Gateway routes and generated client version used by consumers. |
| Forbidden use | Consumers must not infer raw table ownership, service account rights, or undocumented routes from this file. |
| Promotion path | API changes become durable only after DataBase schema/storage contract and Gateway route are updated together. |

The OpenAPI contract describes access. It does not transfer DataBase schema
ownership to consumers.

### Generated DataBase Client

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase generated client build from `gateway/openapi.yaml` |
| Consumers | ContentBase workflow runtime, approved service adapters |
| Canonical path | `generated/` or the published generated client package for the Gateway |
| Format | Generated client source/package |
| Freshness rule | Client version must be generated from the OpenAPI contract that matches the target Gateway. |
| Forbidden use | Consumers must not hand-edit generated types or fork them into manual domain DTOs. |
| Promotion path | Missing client fields must be fixed in DataBase OpenAPI/Gateway, then regenerated. |

Generated client usage is the preferred boundary for ContentBase. Manual
schema duplication in ContentBase is drift.

### Content Schema Contracts

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase schema and contract authorship |
| Consumers | ContentBase, MyBlog projection tooling, operator tooling |
| Canonical path | `schemas/content/` |
| Format | JSON Schema or future schema language chosen by DataBase |
| Freshness rule | Schema version must match the DataBase Gateway/projection that exposes it. |
| Forbidden use | Consumers must not create parallel durable schema files for the same facts. |
| Promotion path | Consumer-discovered fields enter DataBase schema review before becoming canonical. |

### Creative Contract Artifacts

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase creative source and Gateway projections |
| Consumers | ContentBase generation, audit, and repair workflows |
| Canonical path | `schemas/creative/`, `creative-contracts/`, and related Gateway routes |
| Format | JSON/Markdown/schema-backed contract artifacts |
| Freshness rule | ContentBase generation must use the current DataBase-projected contract for the target work/author. |
| Forbidden use | ContentBase must not maintain detached author, vocabulary, style, or banned-term truth. |
| Promotion path | Workflow discoveries become candidate suggestions until DataBase accepts them into canonical creative truth. |

### Semantic Graph Snapshot

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase semantic graph projection/export command |
| Consumers | ContentBase context hydration, MyBlog public knowledge projection, operator analysis |
| Canonical path | `semantic-graph.snapshot.json` or `schemas/semantic/` backed snapshot path |
| Format | JSON snapshot with declared schema/version |
| Freshness rule | Consumers must record or compare snapshot version when producing downstream artifacts. |
| Forbidden use | A snapshot is read-only projection; consumers must not treat it as the graph owner. |
| Promotion path | Consumer graph annotations return as explicit DataBase ingestion candidates, not direct snapshot edits. |

### Public Projection Schema

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase projection contract authorship |
| Consumers | MyBlog, public bundle generators, search index builders |
| Canonical path | `public-projection.schema.json` or the DataBase-owned replacement path |
| Format | JSON Schema or future DataBase schema format |
| Freshness rule | Public bundles and MyBlog indexes must declare the schema version they were built from. |
| Forbidden use | MyBlog must not infer private workflow or raw domain fields from public projection fields. |
| Promotion path | Public rendering needs that require new fields start as projection schema changes in DataBase. |

### Ecosystem Catalog Artifacts

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase catalog, ecosystem, and repository metadata files |
| Consumers | Operators, agents, future Backstage/catalog surfaces |
| Canonical path | `ECOSYSTEM_MAP.md`, `catalog/`, `catalog-info.yaml`, `ecosystem/` |
| Format | Markdown, YAML, JSON |
| Freshness rule | Update when a repository identity, owner, production root, or cross-repo dependency changes. |
| Forbidden use | Catalog metadata must not become a second runtime config source for deployed services. |
| Promotion path | Runtime discoveries become catalog updates only after canonical owner/path verification. |

## ContentBase Export Contracts

### Runtime Capability Metadata

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | ContentBase runtime capability metadata and generated docs projection |
| Consumers | Operators, AI clients, DataBase topology docs when summarizing capabilities |
| Canonical path | `product/novel/app/runtime-capabilities.ts` and generated projection such as `docs/api/generated/runtime-capabilities.md` |
| Format | Executable metadata plus generated Markdown/JSON projection |
| Freshness rule | Generated projection must be rebuilt from executable metadata after capability changes. |
| Forbidden use | Capability metadata must not define DataBase domain truth or public MyBlog presentation behavior. |
| Promotion path | DataBase may catalog the capability, but the executable owner remains ContentBase. |

### Workflow Capability Report

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | ContentBase workflow/runtime reporting command or API |
| Consumers | Operators, AI assistants, DataBase catalog summaries |
| Canonical path | planned `workflow-capabilities.json` |
| Format | JSON |
| Freshness rule | Report must include generated-at time, ContentBase commit, and DataBase client/schema version. |
| Forbidden use | Do not treat a capability report as a stable API contract or domain schema. |
| Promotion path | Stable recurring capabilities may be summarized in DataBase catalog artifacts. |

### Quality Report

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | Generation/audit quality workflows |
| Consumers | Operators, DataBase ingestion review, MyBlog only if explicitly public |
| Canonical path | planned `quality-report.json` per run or release bundle |
| Format | JSON |
| Freshness rule | Must include target work/chapter identifiers, DataBase contract version, workflow version, and generated-at time. |
| Forbidden use | MyBlog must not render private quality reports unless they are explicitly published as public evidence. |
| Promotion path | Accepted corrections or semantic facts become DataBase ingestion candidates. Raw report remains workflow evidence. |

### Repair Trace

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | Repair workflow runtime |
| Consumers | Operators, audit review, DataBase ingestion review when durable facts change |
| Canonical path | planned `repair-trace.json` per repair operation |
| Format | JSON or JSONL |
| Freshness rule | Must link to the input artifact, repair command, model/provider if used, and output version. |
| Forbidden use | Repair trace must not silently overwrite DataBase durable truth without an explicit DataBase write contract. |
| Promotion path | Repair output becomes durable only through DataBase Gateway/write facade or approved ingestion command. |

### Publish Manifest

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | Publish command service/orchestrator |
| Consumers | Operators, MyBlog public projection tooling only after publication, DataBase platform binding review |
| Canonical path | planned `publish-manifest.json` per publish run |
| Format | JSON |
| Freshness rule | Must include platform, target account/work/chapter identifiers, source artifact versions, and confirmation status. |
| Forbidden use | Browser click success is not publish truth; MyBlog must not infer publication truth from unconfirmed manifests. |
| Promotion path | Confirmed platform facts enter DataBase platform binding/publication records through explicit contract. |

### Audit Evidence

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | Audit workflows and evidence collectors |
| Consumers | Operators, DataBase review, MyBlog public evidence library only after publication approval |
| Canonical path | planned `audit-evidence/` bundle path |
| Format | Directory tree containing JSON, logs, screenshots, or text artifacts with manifest |
| Freshness rule | Bundle must include manifest, generated-at time, ContentBase commit, and DataBase contract version. |
| Forbidden use | Evidence bundles must not contain secrets, cookies, private provider keys, or unpublished private runtime data. |
| Promotion path | Public evidence is copied/projected into MyBlog only after privacy and publication review. Durable facts enter DataBase first. |

## MyBlog Artifact Contracts

### Public Content Bundle

| Field | Value |
| --- | --- |
| Owner | DataBase for domain meaning; MyBlog for rendering bundle layout |
| Producer | DataBase projection/export or approved public bundle generator |
| Consumers | MyBlog public shell |
| Canonical path | planned `public-content-bundle/` |
| Format | Directory tree with manifest and public content JSON/Markdown assets |
| Freshness rule | Bundle manifest must declare DataBase projection schema version and generated-at time. |
| Forbidden use | MyBlog must not treat bundle layout as durable domain schema. |
| Promotion path | Rendering needs that require domain changes go back to DataBase projection schema. |

### Generated MDX

| Field | Value |
| --- | --- |
| Owner | MyBlog for presentation; DataBase or authoring source for content meaning |
| Producer | Public projection or authoring pipeline |
| Consumers | MyBlog Astro site |
| Canonical path | planned `generated-mdx/` or existing MyBlog content projection path |
| Format | MDX/Markdown files with manifest |
| Freshness rule | Manifest must identify source content version and generation command. |
| Forbidden use | Generated MDX must not become the only durable content truth if source content belongs to DataBase or authoring vault. |
| Promotion path | Edits discovered in generated MDX return to the owning source, then regenerate MDX. |

### Evidence Library

| Field | Value |
| --- | --- |
| Owner | MyBlog for public presentation; ContentBase/DataBase for source evidence meaning |
| Producer | Approved public evidence publishing path |
| Consumers | MyBlog readers and search/index tooling |
| Canonical path | `public-data/evidence-library` or MyBlog's active evidence-library path |
| Format | Directory tree with public files and manifest |
| Freshness rule | Manifest must declare source, publication approval, and generated-at time. |
| Forbidden use | Do not publish private audit evidence, cookies, provider data, or unpublished runtime traces. |
| Promotion path | Public evidence references may be indexed by MyBlog; durable factual claims belong in DataBase. |

### Search Index

| Field | Value |
| --- | --- |
| Owner | MyBlog |
| Producer | MyBlog build/indexing command |
| Consumers | MyBlog public search UI |
| Canonical path | `search-index/` or the active MyBlog index output path |
| Format | Static index files |
| Freshness rule | Rebuild after public content bundle, generated MDX, or public evidence changes. |
| Forbidden use | Search index must not become content truth or private metadata storage. |
| Promotion path | Search quality signals may inform DataBase metadata only through explicit review/ingestion. |

### Runtime Content Index

| Field | Value |
| --- | --- |
| Owner | MyBlog |
| Producer | MyBlog runtime content projector |
| Consumers | MyBlog reader/home/search projection |
| Canonical path | `runtime/content-index.json` in the active MyBlog runtime output root |
| Format | JSON |
| Freshness rule | Must identify source mirror/version and generated-at time where supported. |
| Forbidden use | Runtime index is a projection, not source content, workflow state, or database authority. |
| Promotion path | Missing or corrected source facts go back to the owning source, then regenerate the index. |

### Static Dist

| Field | Value |
| --- | --- |
| Owner | MyBlog |
| Producer | MyBlog build command |
| Consumers | Nginx/static hosting and public readers |
| Canonical path | `apps/web/dist/` before deploy; production root `/srv/myblog/site` |
| Format | Static web files |
| Freshness rule | Built from the deploy-authoritative workspace after workspace and build checks pass. |
| Forbidden use | Static dist must not be edited as source truth. |
| Promotion path | Fixes go to MyBlog source, then rebuild and redeploy. |

## Promotion Rules

Workflow or projection artifacts do not automatically become durable truth.

Use this path:

```text
runtime artifact
  -> review or validation
  -> DataBase ingestion/write contract
  -> DataBase durable truth
  -> regenerated projection/client/bundle
```

Forbidden path:

```text
runtime artifact
  -> copied into consumer repo
  -> treated as schema/domain truth
```

## Freshness Rules

A cross-repo artifact is current enough only when its consumer can identify:

- source repository and commit or version
- generated-at time when generated
- schema or contract version when schema-backed
- producer command or runtime when relevant
- target DataBase Gateway/client version when DataBase-backed

If a consumer cannot prove freshness for a high-impact operation, it should stop
and request a regenerated artifact instead of guessing.

## Forbidden Crossings

- ContentBase must not create durable domain schema because a DataBase artifact
  is missing a field.
- MyBlog must not fetch ContentBase private workflow APIs for public rendering.
- MyBlog must not read raw DataBase tables or infer private schema from public
  bundles.
- DataBase must not depend on ContentBase implementation modules or MyBlog UI
  components.
- Generated artifacts must not be hand-edited as if they were source truth.
- Catalog artifacts must not become runtime config for deployed services.

## Adding A New Artifact

Before adding a cross-repo artifact, update this document with:

1. artifact name and class
2. owner
3. producer
4. consumers
5. canonical path
6. format
7. freshness rule
8. forbidden use
9. promotion path

Then update only the owning repository's implementation or docs needed for that
artifact. Do not create matching placeholder files in all three repositories.
