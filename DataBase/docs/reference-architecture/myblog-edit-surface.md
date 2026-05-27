# MyBlog Edit Surface Reference Architecture

## Decision

Build the MyBlog editable reader surface by composing mature editor,
annotation, and collaboration projects. Do not hand-roll a full rich text
editor, comment engine, annotation model, or collaboration protocol.

The initial reference stack is:

```text
BlockNote / Tiptap / ProseMirror
  -> block editor and structured editing UI

W3C Web Annotation / Hypothesis
  -> annotation, highlight, comment, selector, and target model

Yjs / Hocuspocus
  -> future collaboration and offline conflict handling

Payload CMS
  -> optional admin/editor workbench reference, not domain truth

DataBase public-edit-intake.v1
  -> canonical write intake boundary
```

## Clone Candidates

| Project | Repository | Use | Clone posture |
| --- | --- | --- | --- |
| BlockNote | https://github.com/TypeCellOS/BlockNote | React block editor for Notion-like writing, image blocks, structured block operations. | Preferred first UI spike. Clone examples and integration patterns. |
| Tiptap | https://github.com/ueberdosis/tiptap | Headless rich text editor built on ProseMirror. | Use when MyBlog needs lower-level control than BlockNote exposes. |
| ProseMirror | https://github.com/ProseMirror | Mature editor state, schema, transactions, and document transforms. | Treat as long-term model foundation, not first app surface. |
| W3C Web Annotation | https://www.w3.org/TR/annotation-model/ | Standard model for annotation body, target, selector, motivation, and provenance. | Adopt vocabulary and mapping concepts. |
| Hypothesis client/server | https://github.com/hypothesis/client / https://github.com/hypothesis/h | Production-grade web annotation and sidebar interaction model. | Clone interaction ideas and data model shape; avoid direct dependency until auth/storage boundary is clear. |
| Yjs | https://github.com/yjs/yjs | CRDT shared data types for collaborative editing. | Defer until multi-user collaboration is required. |
| Hocuspocus | https://github.com/ueberdosis/hocuspocus | Collaboration backend for Tiptap/Yjs. | Defer with Yjs; do not build collaboration transport by hand. |
| Payload CMS | https://github.com/payloadcms/payload | Next.js-native admin, upload, access control, versions, Lexical rich text, blocks. | Consider for private admin/editor facade; never make it DataBase truth. |
| Remark42 | https://github.com/umputun/remark42 | Lightweight self-hosted comments. | Accept only for simple comments; not enough for AST anchor edits. |
| giscus | https://github.com/giscus/giscus | GitHub Discussions-backed comments. | Useful for static public comments, not for canonical annotation graph. |

## Recommended First Spike

Use BlockNote inside MyBlog as the first editable reader/editor prototype.

Reasons:

- React-friendly for a modern public surface.
- Block model matches DataBase CDM/CCG direction better than Markdown textarea.
- Image, paragraph, heading, list, and custom block affordances can map to
  `public-edit-intake.v1` payloads.
- It keeps ProseMirror/Tiptap below the surface, so the system can drop lower
  later without rebuilding the entire UI concept.

The spike should prove only this path:

```text
projection package block / anchor
  -> MyBlog edit/comment UI
  -> public-edit-intake.v1 record
  -> annotation or edit_proposal classification
```

It should not attempt full canonical graph persistence, multi-user editing,
full moderation, or projection rebuild.

## Mapping To DataBase Contracts

| UI action | MyBlog candidate component | Intake class | Payload intent | DataBase destination |
| --- | --- | --- | --- | --- |
| Highlight text | Hypothesis-style selector over rendered content | `annotation` | `highlight` | Annotation Graph target anchor. |
| Comment on paragraph | Sidebar/comment thread anchored to block or range | `annotation` | `comment` / `reply` | Annotation Graph public/shared/private annotation. |
| Private note | Reader note UI | `annotation` | `private_note` | Annotation Graph private annotation. |
| Correct typo | Inline edit or suggestion UI | `edit_proposal` | `correction` | Review, then Graph Edit Operation. |
| Rewrite block | BlockNote block edit | `edit_proposal` | `rewrite_block` | Review, then update_node operation. |
| Insert illustration | Block insert/upload UI | `edit_proposal` | `insert_asset_block` | Raw artifact, Asset Graph, then insert_asset_block operation. |
| Replace image | Asset picker/upload UI | `edit_proposal` | `replace_asset` | Raw artifact, Asset Graph, then graph edit. |
| Update caption | Inline block metadata editor | `edit_proposal` | `update_caption` | Review, then update_node operation. |
| Pin/hide/report comment | Moderation controls | `moderation` | `moderate` | Annotation/surface moderation state. |
| Like/bookmark | Reader interaction controls | `interaction` | `reaction` / `bookmark` | Runtime/user state; no canonical content change. |

## Anchor Strategy

MyBlog must edit against DataBase identity, not DOM-only identity.

Each editable surface should receive:

```yaml
projectionPackage:
  graphId:
  graphVersionId:
  packageId:
  anchorMap:
  assetMap:
  annotationOverlay:
```

When the user interacts with rendered content, MyBlog should resolve:

```text
DOM selection / block id / asset widget
  -> projection package anchorMap
  -> anchorId / nodeId / assetId
  -> public-edit-intake.v1 target
```

CSS selectors, scroll offsets, and selected text may be attached as
`clientContext` evidence. They must not replace anchor ids.

## Asset Upload Strategy

Image upload from MyBlog must not mutate an existing source artifact.

Correct flow:

```text
uploaded bytes
  -> raw artifact record
  -> asset graph node
  -> public-edit-intake.v1(edit_proposal, insert_asset_block or replace_asset)
  -> review
  -> graph edit operation
  -> new graph version
  -> projection package rebuild
```

OpenList may store the bytes, but DataBase owns the hash record, lineage,
asset id, and graph relationship.

## Comment And Annotation Strategy

Prefer W3C Web Annotation terms for conceptual alignment:

| W3C concept | DataBase equivalent |
| --- | --- |
| Annotation | Annotation Graph node / public edit intake annotation result. |
| Body | Annotation content payload. |
| Target | DataBase node, anchor, asset, or projection target. |
| Selector | `clientContext.locator` or target selector evidence. |
| Motivation | Intake payload intent. |

Hypothesis is the strongest public implementation reference for interaction
patterns: sidebar, highlight selection, target selectors, annotation lifecycle,
and moderation/review UX. It should be studied before building a custom sidebar.

## Collaboration Strategy

Do not build collaboration in the first spike.

When collaboration becomes necessary, use:

```text
Tiptap collaboration extension
  -> Yjs shared document
  -> Hocuspocus server
  -> public-edit-intake.v1 on accepted/proposed changes
```

Collaboration state is editing runtime state. It is not canonical graph truth
until it emits reviewed intake/edit operations.

## Payload CMS Boundary

Payload is useful if a private admin/editor workbench is needed quickly:

- authenticated admin UI
- media uploads
- draft/publish workflows
- access control
- version history
- rich text and block fields

But Payload must not become the DataBase canonical owner. If used, it should be
an admin facade that emits DataBase intake/edit operations or calls DataBase
Gateway contracts.

## What To Clone First

First clone/spike order:

1. BlockNote example app in a MyBlog branch.
2. Minimal adapter from BlockNote block action to `public-edit-intake.v1` JSON.
3. Hypothesis-style annotation sidebar behavior, using DataBase anchors rather
   than free DOM-only selectors.
4. Asset upload proof that returns rawArtifactId/assetId before edit proposal.

Do not start with Payload, Yjs, or a general comments engine. Those are larger
system commitments and should follow after the anchor/intake path works.

## NOT Copied

- BlockNote document JSON is not canonical DataBase CDM/CCG.
- ProseMirror transactions are not graph edit operations until promoted.
- Hypothesis storage is not the DataBase Annotation Graph.
- Yjs CRDT state is not graph truth.
- Payload collections are not DataBase domain schema.
- Remark42/giscus comments are not canonical annotations.

## Success Criteria For First MyBlog Spike

The first MyBlog spike succeeds when it can produce valid examples of:

- public comment intake against an anchor
- private highlight intake against an anchor
- typo correction proposal against an inline/block target
- illustration insertion proposal against an anchor with asset id
- moderation intake for a public comment

Each example must include:

- graphId
- graphVersionId
- packageId
- sourceSurface
- actor
- target
- payload intent
- reviewPolicy
- createdAt

The spike does not need to persist canonical graph versions. It only needs to
prove the write boundary and UI model.