---
title: Reader Runtime And Projection Package Contract
status: canonical
owner: DataBase
---

# Reader Runtime And Projection Package Contract

This document defines how a versioned Canonical Content Graph becomes a reader
experience without making the reader runtime the source of truth.

```text
graph version
  -> projection package
  -> reader runtime / MyBlog / EPUB / PDF / search
```

The projection package is the handoff artifact. The reader runtime consumes it,
adds layout/runtime state, and records annotations against anchors. Public
surface writes from MyBlog or a reader runtime must enter through the intake
contract in `docs/contracts/public-surface-edit-intake-contract.md` before they
can become annotations or graph edits.

## Projection Package

A projection package is a rebuildable artifact derived from a graph version.

Machine schema:

```text
schemas/document/projection-package.schema.json
```

Example:

```text
examples/document/minimal-projection-package.json
```

Required concepts:

```yaml
ProjectionPackage:
  packageId:
  graphId:
  graphVersionId:
  projectionType:
  producer:
  generatedAt:
  manifest:
  renderedContent:
  toc:
  anchorMap:
  assetMap:
  annotationOverlay:
  searchChunks:
```

Projection packages are not raw source artifacts. They may be regenerated from
CCG/CDM and graph version manifests.

## Reader Runtime State

Reader runtime state is user/session/layout state.

Machine schema:

```text
schemas/document/reader-runtime-state.schema.json
```

Example:

```text
examples/document/minimal-reader-runtime-state.json
```

Required concepts:

```yaml
ReaderRuntimeState:
  userId:
  packageId:
  graphVersionId:
  currentAnchorId:
  progress:
  layoutProfile:
  runtimeLocations:
  annotationRefs:
```

Reader runtime state is not canonical document truth. It points back to anchors
and graph versions.

## TOC Projection

TOC is projected from the section tree / ordered `contains` edges.

```text
section tree
  -> toc.json
  -> EPUB nav
  -> PDF outline
  -> HTML sidebar
```

Do not store a hand-authored TOC as canonical truth.

## Anchor Map

Projection packages should include an anchor map:

```text
anchor id -> projection-specific locator
```

Examples:

- HTML CSS selector
- EPUB CFI
- PDF page/bounding box
- search chunk id
- reader runtime range

Locations are projection-specific and may change when layout changes. Anchor ids
remain the stable bridge.

## Annotation Overlay

Annotations are not baked into rendered content as canonical edits.

Reader runtime should load annotation overlay references and render them on top
of the projection package:

```text
projection package
  + annotation graph
  + reader runtime state
  -> reading UI
```

A highlight/comment attaches to anchor or node id, not to page number.

## Asset Map

Projection packages should include asset references:

```text
asset id -> projection asset path/url/hash
```

Projection engines may create resized/compressed derivatives. These are package
assets and must not replace raw artifacts or source assets.

## Search Chunks

Search chunks are projection artifacts. They must reference source graph nodes
and anchors.

Search output must not become content truth.

## Cross-Repo Roles

| Repository | Role |
| --- | --- |
| DataBase | Owns projection package schema, graph version source, anchors, assets, annotation graph contracts. |
| ContentBase | May produce workflow-driven projection packages or request rebuilds. |
| MyBlog | Consumes public projection packages and reader runtime state; may submit structured public edit intake; does not own graph truth. |

## Non-Goals

- Do not implement reader UI here.
- Do not implement pagination here.
- Do not deploy MyBlog changes here.
- Do not make projection packages immutable source artifacts.
