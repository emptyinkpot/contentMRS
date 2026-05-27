---
title: EPUB Ingestion Contract
status: canonical
owner: DataBase
---

# EPUB Ingestion Contract

This document defines how EPUB enters the DataBase-owned Canonical Content Graph
(CCG) and Canonical Document Model (CDM). It specializes the broader `docs/contracts/content-ingestion-constitution.md`.

The goal is not to store EPUB as document truth. EPUB is an import source
artifact. The canonical target is structured content:

```text
EPUB
  -> EPUB importer
  -> Pandoc AST or XHTML/HAST intermediate AST
  -> Canonical Document Model
  -> Canonical Content Graph
  -> projection artifacts
```

Do not use this path:

```text
EPUB -> Markdown -> parse Markdown -> canonical truth
```

Markdown is an import/export format and loses too much structure when used as an
intermediate truth layer.

## EPUB Is Already Structured

EPUB is a package, usually a zip archive containing:

```text
META-INF/container.xml
content.opf
nav.xhtml or toc.ncx
chapter XHTML files
images/
css/
fonts/
metadata
```

Important EPUB structures:

| EPUB structure | Canonical target |
| --- | --- |
| OPF metadata | Document metadata and sourceLineage. |
| OPF manifest | Import source artifact inventory. |
| OPF spine | Reading order / ordered Section source order. |
| nav.xhtml or toc.ncx | Section tree candidate. |
| XHTML headings | Section nodes or section labels. |
| XHTML paragraphs/lists/quotes/images/tables | Block nodes. |
| XHTML inline tags/links | InlineSpan nodes and references. |
| Footnotes/endnotes | Citation/evidence/reference graph nodes. |
| Internal anchors | Anchor nodes and located_by edges. |
| Images/media | Evidence/entity/media references. |

## Import Pipeline

Required conceptual stages:

```text
1. Identify EPUB package
2. Read container.xml
3. Read OPF package document
4. Extract metadata, manifest, and spine
5. Read nav.xhtml or toc.ncx
6. Read spine XHTML in order
7. Convert XHTML DOM to intermediate AST
8. Normalize intermediate AST to CDM section tree
9. Emit CCG nodes and edges
10. Emit ingestion manifest
```

The importer may use either or both mature AST routes:

| Route | Use |
| --- | --- |
| Pandoc | EPUB -> Pandoc JSON AST; strong multi-format bridge. |
| unified/rehype/HAST | XHTML DOM -> HAST -> normalized AST; strong HTML transform pipeline. |

The importer must not use regex over EPUB files as the canonical parse method.

## Section Tree Recovery

EPUB TOC is a structure source, not a display-only sidebar.

Preferred section recovery order:

1. `nav.xhtml` TOC tree.
2. `toc.ncx` navMap tree.
3. OPF spine order plus XHTML heading hierarchy.
4. Last-resort generated sections from spine documents.

The resulting canonical structure must be:

```text
Document
  -> Section
    -> Section
      -> Block
```

TOC projection later comes from the Section tree. It is not copied as a second
manual TOC truth.

## Block Normalization

Common XHTML/Pandoc/HAST structures map to CDM blocks:

| Source | CDM block |
| --- | --- |
| `p` / Pandoc `Para` | `paragraph` |
| `blockquote` / Pandoc `BlockQuote` | `quote` |
| heading / Pandoc `Header` | `section` candidate, not paragraph text |
| `pre code` / Pandoc `CodeBlock` | `code` |
| `img` / Pandoc `Image` | `image` |
| `table` / Pandoc `Table` | `table` |
| thematic break / scene divider | `scene_break` |
| note/aside landmarks | `aside` or `footnote` |

Dialogue, narration, evidence, claim, argument, and reflection may require
semantic enrichment after structural import. Do not guess these with brittle
regex during the base import.

## Anchor Model

EPUB is reflowable. It does not provide stable canonical page numbers.

The importer should create anchors from stable source locations:

```yaml
Anchor:
  sourceHref:
  sourceFragment:
  cfi:
  targetNodeId:
  offset:
```

Reader page numbers, progress bars, scroll offsets, and device locations are
runtime layout projections from anchors.

## Ingestion Manifest

Each EPUB import must produce an ingestion manifest.

Required shape is defined at:

```text
schemas/document/epub-ingestion-manifest.schema.json
```

The manifest records:

- input EPUB artifact identity
- importer and version
- parser route used
- OPF path
- nav/toc path
- spine item count
- generated Document id
- generated graph id/version
- warnings and losses
- output artifacts

Warnings are important. EPUBs vary widely, and an honest importer must record
structure loss, unsupported nodes, missing TOC, broken anchors, or media issues.

## Promotion Rule

EPUB content becomes durable only after conversion into CDM/CCG:

```text
EPUB artifact
  -> ingestion manifest
  -> CDM Document/Section/Block tree
  -> CCG nodes and edges
  -> DataBase durable truth
```

Forbidden promotion:

```text
EPUB artifact
  -> Markdown conversion
  -> treated as canonical truth
```

## Cross-Repo Roles

| Repository | Role |
| --- | --- |
| DataBase | Owns EPUB ingestion contract, CDM/CCG target schema, ingestion manifests, and durable graph truth. |
| ContentBase | May request/import EPUBs as workflow input and may enrich imported blocks, but cannot own imported document truth. |
| MyBlog | May render public projection packages derived from imported EPUBs, but must not read EPUB files as public content truth. |

## Non-Goals

- Do not implement the importer in this document.
- Do not pick only one parser library yet.
- Do not store EPUB files as canonical document truth.
- Do not convert EPUB to Markdown as the canonical path.
- Do not infer final page numbers during import.
