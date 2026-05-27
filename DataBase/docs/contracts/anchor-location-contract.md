---
title: Anchor And Location Contract
status: canonical
owner: DataBase
---

# Anchor And Location Contract

This document defines stable anchors and runtime locations for reader systems,
annotations, progress sync, highlights, and projection mapping.

Page number is not canonical truth.

```text
Anchor
  -> layout/runtime engine
  -> page number / scroll offset / EPUB CFI / progress / selection range
```

## Anchor

An anchor is a stable reference to a canonical node or a range inside a node.

Machine schema:

```text
schemas/document/anchor-location.schema.json
```

Example:

```text
examples/document/minimal-anchor-location.json
```

Recommended shape:

```yaml
Anchor:
  id:
  targetNodeId:
  targetNodeType:
  selector:
  offsets:
  sourceLocator:
```

## Runtime Location

A runtime location is projection-specific.

Examples:

- EPUB CFI
- scroll offset
- rendered page index
- percentage progress
- selection rectangle
- PDF page/bounding box
- mobile reader location

Runtime locations must point back to anchors. They are not canonical content
structure.

## Annotation Targeting

Annotations should target anchors when the user selects text or a reader
position.

This preserves comments/highlights when layout changes.

## Projection Mapping

Projection packages and reader runtime state are defined in `docs/contracts/reader-runtime-projection-contract.md`.

Projection manifests may emit location maps:

```text
anchor id -> projection location
```

This lets MyBlog, EPUB readers, PDF projection, and future reader runtime map
highlights and comments without rewriting content.

## Non-Goals

- Do not implement pagination here.
- Do not store page numbers as canonical content.
- Do not require every projection to support every location type.
