---
title: Canonical Document Model
status: canonical
owner: DataBase
---

# Canonical Document Model

This document defines the ordered document-structure subgraph of the emptyinkpot
content ecosystem. The graph-level canonical content truth is defined in
`docs/contracts/canonical-content-graph.md`.

The goal is not EPUB support. CDM is the DataBase-owned structure tree inside
the larger Canonical Content Graph (CCG). EPUB, PDF, HTML, MDX, Astro pages,
Fanqie payloads, search indexes, reader locations, and print layouts are
projections from the graph.

```text
Canonical Document AST
  -> projection engine
  -> EPUB / PDF / HTML / MDX / Astro / Fanqie / print
```

Markdown is an import/export format. It is not the long-term canonical document
truth.

## Machine Contract

The first machine-readable CDM contract is:

```text
schemas/document/canonical-document.schema.json
```

A minimal example lives at:

```text
examples/document/minimal-cdm-document.json
```

This schema is intentionally a first boundary contract, not a storage migration.
It makes Document, Section, Block, Inline span, Citation, layout hints, and
ProjectionManifest machine-readable before any EPUB/PDF/MyBlog/Fanqie pipeline
implementation.

## Ownership

DataBase owns the canonical document model because it owns domain truth,
semantic graph, projection contracts, and cross-repo artifact grammar.

ContentBase may generate, repair, audit, and publish document objects.

MyBlog may render public projection packages.

Neither ContentBase nor MyBlog should become the owner of document structure.

## Structure First

The CDM is hierarchy-first:

```text
Document
  -> Section
    -> Section
      -> Block
        -> InlineSpan
```

A document is a tree before it is a rendered page, Markdown file, EPUB chapter,
PDF outline, or Astro route. `Section` is a structural node, not just a heading
string.

This means a table of contents is not manually authored and not regex-parsed
from Markdown headings. TOC is a projection from the section tree:

```text
Document.sections
  -> traverse Section.children
  -> TOC / EPUB nav / PDF outline / HTML sidebar
```

A projection may choose which section levels to expose, but it must not become a
second source of structural truth.

## Core Principle

A document is not a string and not a file. It is a structured object that can be:

- paginated
- rearranged
- cited
- semantically indexed
- projected into multiple formats
- partially regenerated at block or section level
- reconciled against source and projection artifacts

Page numbers are not canonical truth. Page numbers belong to a projection.

## Model Levels

| Level | Unit | Role |
| --- | --- | --- |
| 0 | Document | Work, article, note, paper, story, world file, or other complete document object. |
| 1 | Section | Chapter, introduction, scene group, argument section, appendix, or other structural unit. |
| 2 | Block | Canonical editing and generation unit. Paragraph, dialogue, evidence, quote, code, image, table, footnote, aside, scene break, and similar units. |
| 3 | Inline span | Emphasis, link, citation reference, person/name marker, concept tag, footnote reference, or semantic inline annotation. |

Block is the critical unit. Files are storage/projection containers; blocks are
where editing, generation, semantic tagging, citation, and layout hints converge.

## Document

A Document is the top-level canonical object.

Required shape:

```yaml
Document:
  id:
  type:
  title:
  authors:
  status:
  sourceLineage:
  styleProfile:
  semanticTags:
  projectionPolicy:
  projections:
  sections:
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `id` | Stable DataBase-owned document identity. |
| `type` | `novel`, `article`, `note`, `paper`, `world_file`, `evidence_file`, or another DataBase-approved document type. |
| `title` | Canonical title, independent of projection-specific display title. |
| `authors` | Canonical author/person references. |
| `status` | Draft, reviewed, published, archived, or another lifecycle state. |
| `sourceLineage` | Import source, source commit/version, ingest command, or external origin. |
| `styleProfile` | Reference to style/rhetorical profile used by projections or generation. |
| `semanticTags` | Document-level tags and graph references. |
| `projectionPolicy` | Which projections are allowed and what each may expose. |
| `projections` | Known projection artifacts and freshness metadata. |
| `sections` | Ordered section objects. |

## Section

A Section is a structural unit within a Document.

Required shape:

```yaml
Section:
  id:
  documentId:
  parentSectionId:
  order:
  level:
  title:
  semanticRole:
  references:
  blocks:
  sections:
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `id` | Stable section identity. |
| `documentId` | Owning Document. |
| `parentSectionId` | Optional parent section. |
| `order` | Canonical order within parent. |
| `level` | Structural depth used to generate TOC/nav/outline projections. |
| `title` | Section title. |
| `semanticRole` | Chapter, scene, argument, appendix, evidence, etc. |
| `references` | Section-level references and source links. |
| `blocks` | Ordered block objects directly owned by this Section. |
| `sections` | Ordered child Section objects; this is the canonical structure tree used for TOC/nav/outline projection. |

A table of contents is projected by traversing the section tree. It is not
manually maintained as separate truth, and it is not parsed from heading text as
canonical structure.


### TOC Projection

Conceptual projection:

```ts
function buildTOC(section: Section): TocNode {
  return {
    id: section.id,
    title: section.title,
    level: section.level,
    children: section.sections.map(buildTOC),
  };
}
```

The same section traversal can produce EPUB nav, PDF outline, HTML sidebar,
reader breadcrumbs, and search facets. These are projection artifacts.

## Block

A Block is the canonical editing unit.

Required shape:

```yaml
Block:
  id:
  documentId:
  sectionId:
  order:
  type:
  content:
  annotations:
  citations:
  references:
  layoutHints:
  semanticTags:
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `id` | Stable block identity. |
| `documentId` | Owning Document. |
| `sectionId` | Owning Section. |
| `order` | Canonical order within Section. |
| `type` | Block kind. |
| `content` | Structured block payload, not necessarily plain string. |
| `annotations` | Editorial, semantic, quality, or AI annotations. |
| `citations` | Citation references attached to this block. |
| `references` | Links to evidence, entities, media, or graph nodes. |
| `layoutHints` | Projection hints such as break/keep/orphan behavior. |
| `semanticTags` | Block-level semantic tags and graph references. |

Recommended block types:

```text
paragraph
quote
dialogue
narration
inner_monologue
poetry
code
image
table
footnote
aside
epigraph
scene_break
evidence
claim
argument
reflection
```

Block types are semantic and editorial. They are not just CSS classes.

## Inline Span

Inline spans are structured nodes inside a block payload.

Common inline span types:

```text
text
emphasis
strong
link
citation_ref
footnote_ref
person_ref
concept_ref
entity_ref
code_span
ruby
annotation
```

Inline spans enable semantic linking, citations, knowledge graph references,
reader annotations, and projection-specific formatting without flattening the
block into plain Markdown.

## Citation

A Citation links document content to a source or evidence fragment.

Required shape:

```yaml
Citation:
  id:
  sourceId:
  fragmentId:
  locator:
  citationStyle:
  note:
```

Citations are canonical references. Footnote numbering, bibliography order, and
reader-visible citation layout are projections.

## Layout Hints

Layout hints are canonical hints, not final layout truth.

Recommended shape:

```yaml
layoutHints:
  pageBreakBefore:
  pageBreakAfter:
  keepWithNext:
  keepTogether:
  orphanControl:
  widowControl:
  preferredFloat:
  projectionOverrides:
```

Page numbers are never stored as canonical truth because page numbers depend on
font, paper, viewport, reader engine, output format, and accessibility settings.

## Projection Manifest

Each generated output should have a ProjectionManifest.

Required shape:

```yaml
ProjectionManifest:
  documentId:
  sourceDocumentVersion:
  projectionType:
  projectionVersion:
  producer:
  generatedAt:
  inputContracts:
  outputArtifacts:
  warnings:
```

Projection types include:

```text
epub
pdf
html
mdx
astro
fanqie
print
search
semantic_chunks
```

Projection manifests are how MyBlog, ContentBase, and operators verify
freshness without turning projection output into source truth.

## Import And Projection Flow

Target flow:

```text
Obsidian Markdown / existing Markdown / external source
  -> importer
  -> Canonical Document AST in DataBase
  -> projection engine
  -> EPUB / PDF / HTML / MDX / Astro / Fanqie / search / semantic chunks
```

Importers must preserve source lineage. Projections must declare source document
version and generated-at time.

## Pandoc And Typst Placement

Pandoc is the primary reference for AST shape and multi-format conversion.
Pandoc JSON AST should be studied before inventing custom block/inline syntax.

Typst is the primary reference for programmable print/PDF layout.
Typst belongs in the projection layer, not as canonical truth.

Placement:

| System | Role |
| --- | --- |
| Pandoc AST | Reference model and possible import/export bridge for blocks/inlines. |
| Typst | PDF/print projection engine candidate. |
| Markdown | Authoring/import/export format. |
| EPUB | Projection artifact. |
| PDF | Projection artifact. |
| HTML/MDX/Astro | Projection artifacts for public web. |
| Fanqie payload | Projection artifact for platform publishing. |

## Cross-Repo Boundary

| Repository | Allowed role | Forbidden role |
| --- | --- | --- |
| DataBase | Own CDM schema, document AST, citations, semantic graph links, projection contracts, projection manifests. | Workflow execution, public UI rendering. |
| ContentBase | Generate, repair, audit, and publish Document/Section/Block objects through DataBase contracts. | Own canonical document schema or keep hand-maintained duplicate document types. |
| MyBlog | Render public projection packages from DataBase/CDM projections. | Read raw Markdown as long-term truth, own CDM schema, or infer private workflow state. |

Future MyBlog should consume projection packages such as:

```text
public-content-bundle/
  document.ast.public.json
  document.mdx
  document.toc.json
  document.search.json
  projection-manifest.json
```

This replaces the long-term pattern of treating `apps/web/src/content/**/*.md`
as the source of document truth.

## AST-Level Generation

AI generation should target structured document units instead of large Markdown
strings.

Preferred generation target:

```yaml
generate:
  documentId:
  sectionId:
  blocks:
    - type: dialogue
    - type: evidence
    - type: reflection
```

This makes generation compatible with:

- pagination
- table of contents
- citation projection
- semantic indexing
- block-level repair
- partial regeneration
- multi-format publishing

## Non-Goals

- Do not implement EPUB/PDF generation in this document.
- Do not add ContractGuard gates for CDM yet.
- Do not migrate MyBlog away from Markdown in this step.
- Do not create placeholder schema files until DataBase chooses the concrete
  schema storage path and versioning strategy.
- Do not treat projection page numbers as canonical truth.
