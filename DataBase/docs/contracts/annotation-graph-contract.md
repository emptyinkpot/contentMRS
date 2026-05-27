---
title: Annotation Graph Contract
status: canonical
owner: DataBase
---

# Annotation Graph Contract

This document defines comments, highlights, review notes, editorial notes, and
AI notes as graph overlays.

Annotations must not rewrite raw artifacts or canonical content nodes. They
attach to nodes or anchors, then reader runtimes may render them through projection packages defined in `docs/contracts/reader-runtime-projection-contract.md`.
MyBlog-originated comments, highlights, and notes should enter through
`docs/contracts/public-surface-edit-intake-contract.md` before becoming
annotation nodes.

```text
Content node / Anchor
  <- annotates
Annotation node
```

## Annotation Types

| Type | Meaning |
| --- | --- |
| `highlight` | User or system highlight over an anchor. |
| `comment` | Reader/user comment. |
| `review` | Longer review or paragraph comment. |
| `editorial_note` | Editing note for future revision. |
| `ai_note` | AI-generated observation or suggestion. |
| `correction_candidate` | Proposed correction that is not canonical content yet. |

## Targeting

Annotations target one of:

- Document
- Section
- Block
- InlineSpan
- Anchor
- Projection artifact

Anchor targeting is preferred for reader-runtime comments because layout and
page numbers can change while anchors remain stable. Anchor rules live in `docs/contracts/anchor-location-contract.md`.

## Visibility

Annotation visibility:

| Visibility | Meaning |
| --- | --- |
| `private` | Only owner/operator can see. |
| `public` | Can be projected to public reader surfaces. |
| `editorial` | Editing workflow only. |
| `shared` | Visible to selected collaborators. |

## Promotion Rule

Annotations are not content edits.

A correction candidate becomes canonical content only through a separate review
or edit operation that creates a new graph version. The edit/version contract is `docs/contracts/graph-versioning-edit-contract.md`.

```text
annotation correction_candidate
  -> review
  -> accepted edit operation
  -> graph vNext
```

Public comments and highlights may stay as annotations forever. They become
canonical content only when an explicit reviewed edit operation promotes them.

## Machine Contract

Schema:

```text
schemas/document/annotation-graph.schema.json
```

Example:

```text
examples/document/minimal-annotation-graph.json
```

## Non-Goals

- Do not implement reader UI here.
- Do not implement comments database here.
- Do not mutate source text when creating annotations.
- Do not store page number as canonical target.
