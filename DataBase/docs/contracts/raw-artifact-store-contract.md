---
title: Raw Artifact Store Contract
status: canonical
owner: DataBase
---

# Raw Artifact Store Contract

This document defines Layer 0 of the content ingestion system: immutable source
artifacts.

OpenList-backed storage may hold the raw bytes. DataBase owns artifact identity,
hash, lineage, retention policy, and graph references.

```text
OpenList / Quark / COS / server blob root
  -> stores source bytes
DataBase Raw Artifact Registry
  -> owns artifact identity and lifecycle metadata
Canonical Content Graph
  -> references artifacts, assets, anchors, annotations, and projections
```

OpenList is storage and access. It is not canonical content truth.

## Storage Principle

Raw artifacts are immutable and content-addressed.

Recommended blob layout:

```text
raw-artifacts/
  sha256/
    ab/
      cd/
        <full-sha256>.<ext>
```

Rules:

- Same `sha256` means one stored raw blob.
- Multiple imports of the same file create new import/source records, not new
  blob copies.
- Raw artifacts are never overwritten in place.
- A changed source file is a new artifact version with a new hash.
- Projection artifacts are not raw artifacts unless explicitly imported as
  source material.

## OpenList Placement

OpenList can expose the blob store for operator access and cold archive.

DataBase records storage URIs such as:

```text
openlist://raw-artifacts/sha256/ab/cd/<sha256>.epub
quark://...
cos://...
server://...
```

The storage URI is a locator. The SHA-256 hash is the identity check.

## No Infinite Proliferation

Prevent archive explosion with these policies:

- Deduplicate by `sha256` before storing another blob.
- Store import attempts and source records as metadata, not byte copies.
- Treat derived HTML/MDX/PDF/search output as projections unless explicitly
  promoted as source artifacts.
- Keep projection outputs rebuildable and subject to projection retention.
- Track `referencedBy` before garbage collection.
- Never let AI delete or merge raw artifacts without explicit retention review.

## Asset Graph

Asset semantics and image/media relationships are governed by `docs/contracts/asset-graph-contract.md`. Raw artifacts store bytes; assets give those bytes graph meaning and placement.

## AST Edits Do Not Mutate Sources

Editing CDM/CCG creates a new graph version. It does not alter the raw artifact.

Example:

```text
book.epub raw artifact
  -> imported graph v1
  -> edit operation: insert illustration
  -> graph v2
```

Illustrations are separate artifacts/assets:

```text
image.png raw artifact
  -> Asset node
  -> Image block or illustrates edge
  -> projection output
```

The original EPUB and original image remain immutable.

## Raw Artifact Record

Machine schema:

```text
schemas/document/raw-artifact.schema.json
```

Minimal example:

```text
examples/document/minimal-raw-artifact.json
```

A raw artifact record must include:

- `artifactId`
- `sha256`
- `mime`
- `sizeBytes`
- `originalName`
- `originalPath`
- `sourceUri`
- `storageUri`
- `importedAt`
- `immutable: true`
- `retentionPolicy`
- `derivatives`
- `referencedBy`

## Retention And Garbage Collection

Retention policy is metadata-controlled.

Suggested statuses:

| Status | Meaning |
| --- | --- |
| `retain` | Keep indefinitely unless manually reviewed. |
| `archive` | Cold storage is acceptable; metadata remains active. |
| `candidate_gc` | May be removed only after reference and policy review. |
| `legal_hold` | Must not be removed. |

GC is blocked when:

- artifact is referenced by an import manifest
- artifact is referenced by a CCG node
- artifact is used by an annotation/evidence/asset relation
- artifact is source for a published projection
- retention is `retain` or `legal_hold`

## Forbidden Operations

AI and import workers must not:

- rename raw source as canonical cleanup
- overwrite raw source bytes
- delete raw source because a projection exists
- treat converted Markdown as the raw source for EPUB/PDF/DOCX
- import files without a hash
- move files without an import manifest
- inline images as base64 instead of asset records
- duplicate blobs when `sha256` already exists

## Cross-Repo Roles

| Repository | Role |
| --- | --- |
| DataBase | Owns artifact registry, hash identity, retention, lineage, and references. |
| ContentBase | May request imports or attach generated assets as raw artifacts. |
| MyBlog | May consume public projections and public artifact URLs, but must not own raw artifact truth. |

## Non-Goals

- Do not implement OpenList moves here.
- Do not reorganize existing files here.
- Do not delete duplicates here.
- Do not implement GC here.
