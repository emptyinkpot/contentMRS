---
title: Public Surface Edit Intake Contract
status: canonical
owner: DataBase
---

# Public Surface Edit Intake Contract

This document defines how MyBlog can behave like a modern public content surface
with comments, highlights, corrections, image suggestions, and owner edits
without becoming the canonical content owner.

```text
MyBlog reader/editor UI
  -> public edit intake record
  -> annotation / review / graph edit operation
  -> new graph version
  -> regenerated projection package
  -> MyBlog display
```

MyBlog may initiate change. DataBase owns whether that change becomes canonical
graph truth.

## Core Rule

MyBlog must not write canonical CCG/CDM nodes directly.

Every write from MyBlog enters DataBase as one of these intake classes:

| Intake class | Meaning | Canonical effect |
| --- | --- | --- |
| `interaction` | Like, reaction, bookmark, share intent, lightweight reader action. | Runtime or analytics state only; no content graph change. |
| `annotation` | Comment, highlight, review note, paragraph comment, private note. | Creates or updates Annotation Graph overlays. |
| `edit_proposal` | Text correction, title change, block rewrite, section reorder, illustration insertion, asset replacement. | Requires review; approved proposals become Graph Edit Operations and new graph versions. |
| `moderation` | Hide, report, resolve, pin, unpin, archive public surface content. | Updates surface/annotation moderation state; does not mutate raw artifacts. |

This preserves the desired Bilibili/Zhihu-style surface while keeping the
single-truth rule intact.

## Machine Contract

Schema:

```text
schemas/document/public-edit-intake.schema.json
```

Example:

```text
examples/document/minimal-public-edit-intake.json
```

Required concepts:

```yaml
PublicEditIntake:
  intakeId:
  sourceSurface:
  actor:
  graphId:
  graphVersionId:
  packageId:
  intakeClass:
  target:
  payload:
  clientContext:
  reviewPolicy:
  createdAt:
```

## Source Surface

`sourceSurface` identifies the projection shell that collected the write:

```yaml
sourceSurface:
  repo: emptyinkpot/emptyinkpot.github.io
  surface: myblog
  route: /reader/example
  projectionType: html
```

The surface identity is provenance. It is not permission to own graph truth.

## Targeting

All intake records must target stable DataBase identities:

| Target | Use |
| --- | --- |
| `document` | Whole-document review, publish note, top-level discussion. |
| `section` | Chapter/section comment, reorder proposal, title correction. |
| `block` | Paragraph, image, quote, evidence, table, dialogue, or scene edit. |
| `inline` | Small text correction or inline annotation. |
| `anchor` | Reader comments, highlights, and progress-linked edits. |
| `asset` | Illustration, cover, figure, replacement image, caption proposal. |
| `projection` | Surface-only issue, rendering bug, search/index feedback. |

Projection-specific locators such as CSS selectors, scroll positions, EPUB CFI,
or page numbers may be included in `clientContext`, but they are evidence only.
They must not become canonical content identity.

## MyBlog Write Capabilities

MyBlog may provide UI for:

- public comments and threaded replies
- private notes and highlights
- correction suggestions
- owner-authored text edits
- illustration insertion proposals
- caption and alt-text proposals
- moderation actions such as pin, hide, resolve, archive, or report

These capabilities are allowed because they enter as structured intake records.
They are not allowed to bypass DataBase review/versioning.

## Annotation Path

For comments, highlights, reviews, and private notes:

```text
public edit intake
  -> annotation graph node
  -> annotation overlay in projection package
  -> MyBlog reader surface
```

Annotations attach to node ids or anchor ids. They do not rewrite content nodes,
raw artifacts, or projection packages as truth.

## Edit Proposal Path

For real content changes:

```text
public edit intake(edit_proposal)
  -> review
  -> graph edit operation
  -> graph version manifest
  -> projection package rebuild
```

Examples:

- fix typo in a paragraph
- replace a block title
- insert an illustration after a scene
- replace an image asset
- update a caption
- reorder a section

Approved edits must reference the source intake id. Rejected edits remain intake
history or annotations, not canonical content.

## Asset And Illustration Boundary

When MyBlog proposes or uploads an image:

```text
uploaded bytes
  -> raw artifact record
  -> asset graph node
  -> edit proposal
  -> insert_asset_block / update_node edit operation
```

The uploaded image does not overwrite the original source file. It becomes a new
raw artifact and asset, then the graph version records where and how it is used.

## Moderation Boundary

Moderation is surface state unless it explicitly promotes to a graph edit.

Examples:

- hiding a public comment updates annotation visibility/status
- pinning a comment updates surface ordering metadata
- reporting content creates moderation evidence
- deleting abusive public text may tombstone an annotation

Moderation must not silently rewrite canonical document text.

## Conflict And Freshness

An intake record must declare the graph version and projection package seen by
the user. If the current graph has advanced, the intake processor must treat the
record as potentially stale.

Allowed outcomes:

| Outcome | Meaning |
| --- | --- |
| `accepted` | Intake was accepted as annotation or reviewed edit. |
| `needs_rebase` | Target graph version is stale; remap through anchors or ask for review. |
| `needs_review` | Human/operator review required before graph edit. |
| `rejected` | Intake is invalid, unsafe, spam, or semantically wrong. |
| `archived` | Kept for history but not active. |

## Cross-Repo Roles

| Repository | Role |
| --- | --- |
| DataBase | Owns intake schema, annotation promotion, graph edit operation linkage, graph versions, and projection rebuild requirements. |
| ContentBase | May assist review, repair, moderation, or AI suggestions through DataBase contracts. |
| MyBlog | Owns the reader/editor interaction surface and submits structured intake records; it does not own canonical graph mutations. |

## Non-Goals

- Do not implement MyBlog UI here.
- Do not implement authentication or moderation storage here.
- Do not add direct database writes from MyBlog.
- Do not let rendered HTML/MDX become the edit source of truth.
- Do not treat comments or highlights as canonical content edits without review.