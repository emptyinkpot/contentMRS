# Obsidian Canonical Projection

This document defines the DataBase side of Obsidian-to-canonical projection.

## Boundary

Obsidian Vault remains the human-editable Markdown file truth.

DataBase owns the structured canonical projection:

```text
content_works
content_parts
content_blocks
content_assets
content_relations
```

DataBase does not own the Markdown file bytes. It records source identity,
hashes, frontmatter snapshots, ordered blocks, asset references, and relations.

## Canonical Write Path

```text
POST /writes/project-obsidian-markdown
```

This is an idempotent Gateway write facade endpoint. Consumers must provide:

```text
X-DataBase-Idempotency-Key
```

The idempotency key should be derived from the projection source and hash, for
example:

```text
obsidian:docs/blog/example.md:sha256:<hash>
```

## Required Payload Ownership

The caller must provide stable ids.

DataBase does not infer identity from titles, folders, or frontmatter because
that would create ambiguous ownership and silent drift.

Required source fields:

```text
provider = obsidian-vault
sourcePath
sourceUri
sha256
mtime
frontmatter
```

Required work fields:

```text
id
kind
title
```

Required part fields:

```text
id
kind
partOrder
```

Required block fields:

```text
id
kind
blockOrder
```

## Mutation Semantics

For one submitted `part.id`, the endpoint:

1. Upserts declared assets.
2. Upserts the work.
3. Upserts the part.
4. Replaces blocks for that part.
5. Replaces Obsidian-derived relations for the submitted source path.
6. Adds author and source-derived relations.

All steps run in a single database transaction.

## Non-Goals

This endpoint does not:

- run file sync
- watch the Vault
- parse Markdown
- rewrite Markdown
- generate semantic units
- publish content
- make MySQL the Markdown body truth

Those jobs belong to their own owner layers. This endpoint only accepts a
validated projection and writes it to DataBase canonical tables.

## Current Consumers

The expected first consumer is MyBlog's runtime projection layer:

```text
Obsidian Vault
  -> Syncthing
  -> Linux /home/vault/Obsidian
  -> MyBlog projector
  -> DataBase Gateway /writes/project-obsidian-markdown
```

MyBlog may continue to serve public runtime projection from its existing
`content-index.json`. DataBase projection is the structured domain truth used
by generation, semantic memory, publishing, and cross-product context
resolution.
