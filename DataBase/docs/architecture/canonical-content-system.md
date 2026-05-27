# Canonical Content System

This document defines the target content model for DataBase.

DataBase must store more than novels. It should store the operator's durable
content assets across novels, blog posts, essays, short-video scripts, comics,
visual pages, author style, semantic material, and publishing records.

The canonical model is:

```text
content
+ world
+ author
+ evidence
+ publishing
```

This document owns the structural direction. The executable schema entry is:

```text
gateway/sql/005_canonical_content_schema.sql
```

The TypeScript contract entry is:

```text
schemas/content/canonical-content-contract.ts
```

## Borrowed Mature Models

The model borrows structure, not implementation.

| Source | What DataBase borrows |
| --- | --- |
| Schema.org CreativeWork | One top-level content family for books, articles, blog posts, comic stories, and other authored works. |
| IIIF Presentation API 3.0 | Image-heavy works are modeled as manifests, canvases/pages, and annotations instead of loose image files. |
| Wagtail StreamField | Mixed long-form content should be typed blocks, not one opaque text blob. |
| Payload CMS Blocks | Blocks should carry a stable block type and payload shape so UI and API consumers can render them deterministically. |
| ComicInfo.xml / comic library systems | Comic metadata needs series, episode/book, pages, contributors, characters, and reading order. |

References:

- https://schema.org/CreativeWork
- https://iiif.io/api/presentation/3.0/
- https://docs.wagtail.org/en/stable/topics/streamfield.html
- https://payloadcms.com/docs/fields/blocks

## Canonical Domains

### content

Owns the produced artifact graph.

Canonical entities:

```text
content_works
content_parts
content_blocks
content_assets
content_relations
```

Examples:

| Real object | Canonical representation |
| --- | --- |
| Novel | `content_works.kind = 'novel'` |
| Novel chapter | `content_parts.kind = 'chapter'` |
| Blog article | `content_works.kind = 'blog_post'` or `content_parts.kind = 'article'` |
| Short-video script | `content_works.kind = 'short_video_script'` |
| Comic series | `content_works.kind = 'comic_series'` |
| Comic episode | `content_parts.kind = 'comic_episode'` |
| Comic page | `content_assets.kind = 'comic_page'` |
| Comic panel | `content_blocks.kind = 'comic_panel'` |
| Dialogue bubble | `content_blocks.kind = 'dialogue'` |
| Narration caption | `content_blocks.kind = 'caption'` |

### world

Owns story-world objects used by fiction and comics.

Canonical entities may continue to include existing `characters` while the
new model records stable relationships through `content_relations`.

World objects include:

```text
characters
locations
lore
timelines
organizations
events
```

No UI or generation runtime should invent its own character or world schema.

### author

Owns style and author modeling.

Existing truth remains:

```text
creative_style_protocols
creative_style_modules
creative_editing_steps
creative_quality_rules
creative_source_materials
creative_writing_techniques
creative_author_techniques
vocabulary
banned_words
```

The new missing owner is:

```text
author_profiles
author_interest_clusters
author_lexicon_reviews
```

Rules:

- `vocabulary` remains the active preferred-term truth.
- `banned_words` remains the active banned-term truth.
- `author_lexicon_reviews` records candidate promotion and rejection events.
- Candidate words do not become active just because a model generated them.
- Author style cannot override evidence facts.

### evidence

Owns source identity, semantic units, citations, and retrieval traces.

Existing truth remains:

```text
semantic_units
semantic_tag_taxonomy
semantic_unit_tags
semantic_relations
```

Evidence must connect to generated content through `content_relations`, not
through detached notes.

### publishing

Owns platform mapping and publication evidence.

Canonical entities:

```text
publication_targets
publication_records
```

The publishing domain answers:

```text
which local work/part was published to which platform identity, under which
remote id, with which observed result
```

## Content Work

`content_works` is the top-level creative work table.

It is the canonical owner for all produced works, regardless of medium.

Minimum fields:

```text
id
kind
title
subtitle
status
author_profile_id
metadata_json
created_at
updated_at
```

Allowed `kind` values:

```text
novel
fiction_series
blog_post
essay
current_affairs_commentary
historical_short_video
business_copywriting
comic_series
comic_one_shot
image_collection
manuscript
```

## Content Part

`content_parts` stores ordered sub-units inside a work.

Examples:

```text
chapter
scene
article_section
script_segment
comic_episode
comic_page_ref
volume
appendix
```

It supports parent-child structure through `parent_part_id`.

## Content Block

`content_blocks` stores typed renderable or generatable blocks.

Blocks are necessary because article and comic content are not pure chapter
text. A block may be:

```text
paragraph
heading
quote
image
comic_panel
dialogue
caption
page_break
evidence_citation
semantic_unit_ref
prompt_context
```

Each block has:

```text
block_order
kind
text_content
asset_id
payload_json
```

The `payload_json` field stores type-specific structure only after the block
kind has already named the structure.

## Content Asset

`content_assets` stores metadata and references for binary or external objects.

DataBase does not become object storage. It records identity and pointers.

Examples:

```text
cover_image
comic_page
panel_crop
reference_image
audio
video
pdf
markdown_export
epub_export
```

The actual file belongs to an object backend, OpenList-mounted backend, server
file root, or future S3-compatible storage.

## Content Relation

`content_relations` connects content to world, author, evidence, assets, and
publishing objects.

This prevents every feature from adding its own join table.

Examples:

```text
work -> character
part -> semantic_unit
block -> content_asset
work -> source_material
part -> publication_record
work -> platform_book
```

## Obsidian Projection Boundary

Obsidian remains the human-editable Markdown file truth.

DataBase owns the structured projection derived from those files:

```text
Obsidian Vault Markdown
  -> Gateway write facade
  -> content_works / content_parts / content_blocks / content_assets / content_relations
```

The canonical write path is:

```text
POST /writes/project-obsidian-markdown
```

Rules:

- The Vault owns the Markdown file body and editing surface.
- DataBase owns content identity, structure, source hash, frontmatter snapshot,
  asset references, semantic relations, and generation context.
- Projection callers must provide stable ids; DataBase must not infer identity
  from title or folder names.
- Projection callers must provide `sourcePath`, `sourceUri`, `sha256`, and
  `mtime`.
- DataBase may replace blocks and Obsidian-derived relations for the submitted
  source path.
- DataBase must not write back to Markdown unless a future explicit write-back
  command is defined.

## Author Model

The author model must be reusable across novels, essays, historical scripts,
business copywriting, and comics.

Minimum shape:

```text
author_profiles
  id
  display_name
  stance
  voice_json
  status

author_interest_clusters
  id
  author_profile_id
  name
  terms_json
  applies_to_json
  evidence_json
  status

author_lexicon_reviews
  id
  author_profile_id
  term
  decision
  source_kind
  source_ref
  reason
```

The active lexicon still lives in `vocabulary` and `banned_words`.

## Publishing Model

Publication is not a text field on a work. It is a durable observed event.

`publication_targets` stores platform bindings:

```text
platform
account_identity
remote_work_id
local_work_id
status
```

`publication_records` stores attempts and observed results:

```text
target_id
content_part_id
action
remote_part_id
observed_status
idempotency_key
result_json
```

## Non-Goals

This model does not create:

- a second vocabulary truth
- a second banned-word truth
- a detached comic database
- a detached blog database
- a second publishing state machine
- a raw file-storage implementation

## Adoption Rule

New content capabilities must enter through this canonical model first.

If a future UI, generator, publishing worker, RAG workflow, or comic editor
needs a new content field, the change must land in the owning domain:

```text
content / world / author / evidence / publishing
```

It must not create a local registry, detached JSON catalog, or feature-private
schema.
