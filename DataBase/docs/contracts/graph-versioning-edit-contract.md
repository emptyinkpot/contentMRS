---
title: Graph Versioning And Edit Operation Contract
status: canonical
owner: DataBase
---

# Graph Versioning And Edit Operation Contract

This document defines how the Canonical Content Graph (CCG) changes over time.

Raw artifacts are immutable. Graphs are versioned. Edits are explicit
operations.

```text
graph v1
  -> edit operation(s)
  -> graph v2
```

No system should mutate a canonical graph in place without a version record.

## Core Rule

Every content change must be represented as:

1. parent graph version
2. edit operation manifest
3. new graph version manifest

This is what lets the system support:

- original artifact preservation
- AST edits
- inserted illustrations
- annotation promotion
- rollback
- diff
- projection rebuild
- reader location remapping
- MyBlog edit proposal review

## Edit Operation Types

Allowed edit operation types:

| Type | Meaning |
| --- | --- |
| `insert_node` | Add a new CCG node. |
| `update_node` | Update fields on an existing node. |
| `tombstone_node` | Mark a node removed without losing history. |
| `insert_edge` | Add a relation/containment/projection edge. |
| `remove_edge` | Remove or tombstone an edge. |
| `insert_asset_block` | Insert an asset-backed image/media block into CDM/CCG. |
| `attach_annotation` | Attach annotation overlay without changing canonical content. |
| `replace_projection` | Replace projection artifact for a graph version. |
| `promote_correction` | Promote a reviewed correction_candidate annotation into canonical graph edits. |

Physical deletion should not be the first choice. Prefer tombstones unless a
separate retention/GC policy authorizes removal.

## Raw Artifact Boundary

Edit operations never mutate raw artifacts.

Example:

```text
book.epub raw artifact
  -> graph v1
  -> insert_asset_block(image asset)
  -> graph v2
```

The EPUB bytes are unchanged. The image bytes are a separate raw artifact and
asset. The graph version records the new relationship.

## Annotation Promotion

Annotations are overlays. They are not content edits.

```text
annotation(type=correction_candidate)
  -> review
  -> promote_correction edit operation
  -> graph vNext
```

The edit operation must reference the source annotation id, reviewer/producer,
and resulting graph changes.

## Public Surface Edit Intake

MyBlog and reader surfaces may propose edits through
`docs/contracts/public-surface-edit-intake-contract.md`.

```text
public edit intake(edit_proposal)
  -> review
  -> graph edit operation
  -> graph vNext
```

The graph edit operation should reference the source intake id in its reason,
source annotation, source artifact, or future provenance fields. The intake
record is the surface provenance; the graph edit operation is the canonical
mutation.

## Version Manifest

Each graph version must have a manifest.

Schema:

```text
schemas/document/graph-version-manifest.schema.json
```

Example:

```text
examples/document/minimal-graph-version-manifest.json
```

Required concepts:

```yaml
GraphVersionManifest:
  graphId:
  versionId:
  parentVersionId:
  operationIds:
  producer:
  createdAt:
  sourceArtifacts:
  projections:
```

## Edit Operation Manifest

Each edit operation must be explicit.

Schema:

```text
schemas/document/graph-edit-operation.schema.json
```

Example:

```text
examples/document/minimal-graph-edit-operation.json
```

Required concepts:

```yaml
GraphEditOperation:
  operationId:
  graphId:
  parentVersionId:
  operationType:
  actor:
  reason:
  changes:
  createdAt:
```

## Projection Rule

Projection manifests must reference a graph version.

```text
graph version
  -> projection manifest
  -> HTML / EPUB / PDF / Astro / Search / Fanqie
```

Consumers should not read a mutable "current AST" without a version id.

## Cross-Repo Roles

| Repository | Role |
| --- | --- |
| DataBase | Owns graph version manifests, edit operation schema, version lineage, and canonical graph truth. |
| ContentBase | May propose or execute graph edit operations through DataBase contracts. |
| MyBlog | Consumes versioned projections and may submit structured edit intake; it must not mutate graph truth directly. |

## Non-Goals

- Do not implement graph storage here.
- Do not implement an editor here.
- Do not add merge/conflict resolution algorithms here.
- Do not mutate existing artifacts or projections here.
