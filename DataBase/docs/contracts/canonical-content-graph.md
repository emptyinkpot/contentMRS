---
title: Canonical Content Graph
status: canonical
owner: DataBase
---

# Canonical Content Graph

This document defines the graph-level content truth for the emptyinkpot
publishing ecosystem.

The Canonical Document Model (CDM) is the ordered document-structure subgraph of
this larger Canonical Content Graph (CCG). CDM answers containment and order:

```text
Document -> Section -> Section -> Block -> InlineSpan
```

CCG answers relationship and derivation:

```text
entity references, citations, evidence, annotations, anchors, projections,
reader runtime locations, and derived artifacts
```

A mature content system is not a file system. It is a structured graph with
multiple projections.

## Core Model

```text
Canonical Content Graph
  -> Document Structure Tree
  -> Entity Graph
  -> Reference Graph
  -> Annotation Graph
  -> Projection Graph
  -> Reader Runtime Graph
```

The document tree is one view of the graph. It is important, but it is not the
whole truth.

## Node Classes

| Node class | Meaning | Examples |
| --- | --- | --- |
| `document` | Top-level content object. | novel, article, note, paper, world file |
| `section` | Ordered structural node in a document. | chapter, scene, appendix, argument section |
| `block` | Canonical editing/generation unit. | paragraph, dialogue, evidence, quote |
| `inline` | Inline semantic or formatting span. | citation ref, person ref, emphasis |
| `entity` | Semantic object referenced by content. | person, place, concept, work, source |
| `citation` | Structured citation reference. | source locator, bibliography entry |
| `evidence` | Evidence fragment or supporting artifact. | excerpt, image, log, source fragment |
| `annotation` | Human or AI note attached to another node. | highlight, comment, editorial note |
| `anchor` | Stable location reference across projections. | document/block offset, reader location |
| `projection` | Generated output artifact node. | HTML, MDX, EPUB, PDF, Fanqie, search index |

## Edge Classes

| Edge class | Meaning |
| --- | --- |
| `contains` | Ordered containment from Document to Section to Block to Inline. |
| `references` | Content node references an Entity or another content node. |
| `cites` | Content node cites a Citation or Evidence node. |
| `supports` | Evidence supports a claim/block/section. |
| `annotates` | Annotation attaches to a target node or anchor. |
| `projects_to` | Canonical node or graph version produced a projection artifact. |
| `derived_from` | Node or artifact was derived from a source node/artifact/version. |
| `located_by` | Reader/runtime location resolves to a stable Anchor. |
| `supersedes` | New node/version replaces an older node/version. |
| `related_to` | Explicit semantic relation that is not containment. |

Edges are first-class. Do not hide semantic relations in Markdown text or
projection-only metadata.

## Structure Tree

The ordered structure tree is represented by `contains` edges:

```text
document contains section
section contains section
section contains block
block contains inline
```

TOC, EPUB nav, PDF outline, HTML sidebar, breadcrumbs, and heading lists are all
projections from this ordered containment subgraph.

## Asset Graph

Asset/media graph rules are defined in `docs/contracts/asset-graph-contract.md`. Assets are graph nodes backed by raw artifacts; image blocks reference assets instead of inlining bytes.

## Entity Graph

Entities are semantic nodes independent of any one document.

Common entity types:

```text
person
place
concept
work
source
organization
event
object
style_profile
```

Content nodes may reference entities. The entity graph lets a concept, person,
source, or place appear across many documents without duplicating identity in
each file or projection.

## Reference And Evidence Graph

Citations and evidence are graph nodes, not footnote strings.

```text
block cites citation
citation references source
block cites evidence
evidence supports claim
```

Footnote numbering, bibliography order, hover cards, side notes, and evidence
panels are projections.

## Raw Artifact Layer

Raw source bytes live below the graph as immutable artifacts. The contract is:

```text
docs/contracts/raw-artifact-store-contract.md
schemas/document/raw-artifact.schema.json
```

CCG nodes reference raw artifacts through lineage, asset, evidence, and
projection edges. AST edits create new graph versions; they do not mutate raw
artifacts.

## Annotation Graph

Annotation overlay rules are defined in `docs/contracts/annotation-graph-contract.md`.


Annotations attach to nodes or anchors.

Examples:

```text
highlight annotates anchor
comment annotates block
AI note annotates section
editorial mark annotates inline span
```

Annotations must not change canonical content unless promoted through a review
or ingestion path.

## Anchor And Location Model

Stable anchor and projection-specific location rules are defined in `docs/contracts/anchor-location-contract.md`.


Page number is not canonical truth.

The stable unit is an anchor:

```yaml
Anchor:
  id:
  targetNodeId:
  selector:
  offset:
  projectionHints:
```

Reader runtime can map anchors to pages, scroll positions, percentages, or
platform locations. These are runtime/layout projections:

```text
Anchor
  -> layout engine
  -> page number / scroll offset / EPUB CFI / reader progress
```

## Public Surface Writes

MyBlog and reader surfaces may collect comments, highlights, owner edits,
illustration proposals, and moderation actions. These writes enter the graph
system as public edit intake records, not direct CCG mutations.

```text
projection surface
  -> public edit intake
  -> annotation overlay or reviewed graph edit
```

The contract is `docs/contracts/public-surface-edit-intake-contract.md`.

## Graph Versioning

Graph changes are governed by `docs/contracts/graph-versioning-edit-contract.md`.
Raw artifacts are immutable; graph edits produce new graph versions through
explicit edit operations.

## Reader Runtime And Projection Packages

Reader/projection package boundaries are defined in `docs/contracts/reader-runtime-projection-contract.md`. Projection packages are rebuildable artifacts derived from graph versions; reader runtime state points back to anchors and graph versions.

## Projection Graph

Projection artifacts are graph nodes connected by `projects_to` and
`derived_from` edges.

Examples:

```text
document graph version projects_to html bundle
section tree projects_to EPUB nav
citation graph projects_to bibliography
block graph projects_to search chunks
anchor graph projects_to reader progress map
```

Every projection node should carry a projection manifest with:

- source graph version
- producer
- generated-at time
- projection type
- output artifact path/hash
- input contracts
- warnings

## Cross-Repo Roles

| Repository | Graph role |
| --- | --- |
| DataBase | Owns Canonical Content Graph schema, node identity, edge classes, graph versions, and projection contracts. |
| ContentBase | Generates, repairs, audits, and publishes graph nodes through DataBase contracts. |
| MyBlog | Renders public projection artifacts and reader runtime surfaces from approved graph projections. |

ContentBase and MyBlog may hold projection/runtime artifacts. They must not own
canonical graph identity.

## Content Ingestion Constitution

All imports into CCG/CDM must follow:

```text
docs/contracts/content-ingestion-constitution.md
schemas/document/content-import-manifest.schema.json
```

The core law is `import != convert`: raw artifacts are immutable, extracted
structure is evidence, canonical graph objects are normalized truth, and
projections are derived artifacts.

## EPUB Ingestion

EPUB is an import source artifact, not document truth. The canonical EPUB import
path is defined in:

```text
docs/contracts/epub-ingestion-contract.md
schemas/document/epub-ingestion-manifest.schema.json
```

The preferred direction is EPUB -> Pandoc AST or XHTML/HAST -> CDM -> CCG. Do
not use EPUB -> Markdown as the canonical ingestion path.

## Import And Runtime Flow

Target flow:

```text
Markdown / EPUB / HTML / external source
  -> importer
  -> Canonical Content Graph
  -> projection engine
  -> web / reader / PDF / EPUB / Fanqie / search / AI context
```

AI generation should operate on graph operations:

```yaml
insert:
  node:
    class: block
    type: evidence
link:
  from: block:...
  to: entity:concept.civilization
  edge: references
cite:
  from: block:...
  to: evidence:...
```

This is the semantic publishing operating system substrate.

## Non-Goals

- Do not migrate storage in this document.
- Do not implement a graph database in this document.
- Do not add ContractGuard gates yet.
- Do not require MyBlog to stop reading current content roots in this step.
- Do not treat the graph schema as a replacement for the CDM section tree; it
  contextualizes CDM as the ordered containment subgraph.
