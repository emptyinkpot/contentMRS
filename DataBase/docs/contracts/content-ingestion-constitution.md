---
title: Content Ingestion Constitution
status: canonical
owner: DataBase
---

# Content Ingestion Constitution

This document defines the constitutional rules for importing external content
into the DataBase-owned Canonical Content Graph (CCG) and Canonical Document
Model (CDM).

The central law:

```text
import != convert
```

Import means preserving the source artifact, extracting structure, reporting
loss, and normalizing into canonical graph objects without silent semantic
degradation.

Conversion means producing another format. Conversion output is never canonical
truth by itself.

## Canonical Import Law

Raw source artifacts are immutable.

Examples:

```text
book.epub
scan.pdf
obsidian.md
image.png
archive.zip
docx
html
```

The original artifact must never disappear because an AI or importer produced a
cleaner-looking Markdown file, AST, summary, or projection.

Canonical AST/graph objects are normalized representations derived from the
source. They do not erase source lineage.

## Four-Layer Ingestion Model

```text
Layer 0 Raw Artifact
  -> Layer 1 Extracted Structure
  -> Layer 2 Canonical AST / Canonical Content Graph
  -> Layer 3 Projection
```

| Layer | Name | Responsibility | Truth status |
| --- | --- | --- | --- |
| 0 | Raw Artifact | Immutable source bytes and metadata. | Source artifact truth. |
| 1 | Extracted Structure | Parser/OCR/DOM/Pandoc/HAST/PDF layout extraction results. | Extraction evidence, not canonical content truth. |
| 2 | Canonical AST / CCG | Normalized Document/Section/Block/Inline and graph nodes/edges. | DataBase canonical content truth. |
| 3 | Projection | HTML, MDX, EPUB, PDF, Astro, search, reader runtime, platform payloads. | Derived artifact truth only. |

A pipeline may regenerate Layer 1, 2, or 3. It must not mutate Layer 0.

## AI Role Boundary

AI may assist with:

- extraction
- normalization
- annotation
- linking
- entity candidate identification
- loss report drafting
- unresolved warning classification

AI must not silently:

- rewrite source text
- summarize source text as a replacement
- merge duplicated text
- deduplicate semantically distinct content
- rename canonical source artifacts
- flatten hierarchy
- discard layout intent
- discard footnotes
- discard anchors
- discard image relationships
- rewrite encoding
- convert EPUB/PDF/DOCX to Markdown and treat it as truth

If an AI cannot preserve structure, it must return a warning or blocked import,
not a cleaned-up substitute.

## Import Job

Every ingestion task must produce an ImportJob/ImportManifest record.

The generic schema is:

```text
schemas/document/content-import-manifest.schema.json
```

Format-specific manifests may extend or specialize it:

```text
schemas/document/epub-ingestion-manifest.schema.json
```

Required concepts:

```yaml
ImportJob:
  sourceArtifact:
  extractor:
  parser:
  normalizationPolicy:
  imagePolicy:
  outputPolicy:
  lossReport:
  unresolvedWarnings:
  status:
```

## Loss Report

No silent degradation is allowed.

A LossReport records:

```yaml
LossReport:
  unsupportedFeatures:
  downgraded:
  unresolved:
  blockedReasons:
```

Examples:

```text
floating-image
embedded-font
ruby-annotation
epub-footnote-inline
malformed-html
pdf-reading-order-uncertain
ocr-low-confidence
missing-image-asset
broken-anchor
```

If loss affects structure, citation, anchor, evidence, image relationships, or
semantic meaning, the import should be marked `blocked` or `review_required`.

## Raw Artifact Store

Layer 0 storage is governed by:

```text
docs/contracts/raw-artifact-store-contract.md
schemas/document/raw-artifact.schema.json
```

OpenList-backed storage may hold raw bytes, but DataBase owns artifact identity,
hash, lineage, retention, and references. The raw artifact store is
content-addressed and immutable.

## Source Artifact

A SourceArtifact record must include:

```yaml
SourceArtifact:
  id:
  originalPath:
  sha256:
  mime:
  sizeBytes:
  source:
  importedAt:
  immutable: true
```

The hash is part of source identity. A changed file is a new artifact version,
not an in-place rewrite.

## Asset Graph

Images and media are assets, not inline base64 text.

Required shape:

```yaml
Asset:
  id:
  sourceArtifactId:
  sha256:
  mime:
  width:
  height:
  originalPath:
```

Image blocks should reference assets:

```yaml
Block:
  type: image
  assetId:
  caption:
```

This preserves image identity, layout relation, evidence relation, and future
projection choices.

## PDF Import Rule

PDF is a rendered artifact, not a document truth format.

PDF import must preserve the raw PDF and use a dual-track extraction:

```text
Raw PDF
  -> text/OCR layer
  -> layout layer with page boxes, coordinates, anchors
  -> extracted structure
  -> canonical graph candidates
```

PDF page numbers and bounding boxes are extraction/layout evidence. They are not
canonical document structure by themselves.

Recommended technologies to evaluate:

| Format | Mature extraction route |
| --- | --- |
| EPUB | Pandoc JSON AST; XHTML/HAST via unified/rehype. |
| HTML/Markdown | unified/rehype/remark. |
| PDF | unstructured.io, OCR, layout-aware extraction. |
| OCR | PaddleOCR, Tesseract, or equivalent OCR workers. |

## Import Workers

Do not build one universal parser.

Use bounded workers:

```text
epub-import-worker
pdf-import-worker
markdown-import-worker
obsidian-import-worker
html-import-worker
image-import-worker
docx-import-worker
```

Each worker emits extracted structure plus an import manifest. The normalizer
then converts extracted structure into CCG/CDM nodes.

## Blocked Import

The correct response to unsafe import is `blocked`, not silent repair.

Block when:

- source artifact hash is missing
- raw artifact cannot be retained
- parser route is unknown
- TOC/section hierarchy cannot be recovered with confidence
- footnotes/citations are dropped
- image relationships are dropped
- anchors cannot be represented
- PDF reading order is uncertain and no review path is recorded
- OCR confidence is below policy threshold
- output would flatten meaningful structure

## Cross-Repo Roles

| Repository | Role |
| --- | --- |
| DataBase | Owns ingestion constitution, source artifact identity, import manifests, loss reports, canonical CCG/CDM objects. |
| ContentBase | May run import workflows and AI-assisted normalization under this constitution. |
| MyBlog | May consume public projections after import; it must not canonicalize raw files by rendering them. |

## Non-Goals

- Do not implement import workers in this document.
- Do not move existing files.
- Do not let AI organize files without a manifest and loss report.
- Do not create Markdown as an intermediate canonical layer.
- Do not add enforcement gates yet.
