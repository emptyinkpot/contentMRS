---
title: Asset Graph Contract
status: canonical
owner: DataBase
---

# Asset Graph Contract

This document defines how images, media, and other binary assets relate to the
Canonical Content Graph (CCG).

Raw artifact stores bytes. Asset graph gives those bytes semantic placement.

```text
Raw Artifact
  -> Asset node
  -> Block / Evidence / Annotation / Projection relation
```

Do not inline image bytes into document content as canonical truth.

## Asset Identity

An asset is a graph node backed by a raw artifact or external source.

Examples:

- illustration image
- cover image
- scanned page
- OCR source image
- audio clip
- video clip
- embedded EPUB media
- evidence screenshot

## Asset Record

Machine schema:

```text
schemas/document/asset-graph.schema.json
```

Example:

```text
examples/document/minimal-asset-graph.json
```

Required concepts:

```yaml
Asset:
  id:
  rawArtifactId:
  sha256:
  mime:
  width:
  height:
  originalPath:
  role:
  metadata:
```

## Asset Relations

Common relations:

| Relation | Meaning |
| --- | --- |
| `illustrates` | Asset illustrates a section/block/entity. |
| `embedded_in` | Asset appears inside an imported source document. |
| `evidence_for` | Asset is evidence for a claim/block/entity. |
| `thumbnail_of` | Asset is a generated thumbnail of another asset. |
| `cover_of` | Asset is a cover for a document/work. |
| `projection_of` | Asset is generated from a canonical node/graph. |

## Image Blocks

A CDM image block should reference an asset:

```yaml
Block:
  type: image
  content:
    assetId:
    caption:
```

This lets the AST change without mutating the raw source file. Inserting an
illustration creates or references an asset and links it into a graph version
through `docs/contracts/graph-versioning-edit-contract.md`.

## Projection Rule

Projection engines may resize, compress, crop, or transform assets for output.
Those outputs are derivative/projection assets, not replacements for the source
asset.

## Non-Goals

- Do not implement image processing here.
- Do not move bytes in OpenList here.
- Do not infer semantic asset roles by filename alone.
