# database-architecture-contracts.md

Source root: E:\My Project\ContentMRS\DataBase
Generated for Bailian knowledge base upload.



---

## docs\architecture\author-operating-database.md

```md
# Author Operating Database

This document defines the target role of DataBase in the writing and publishing
ecosystem. It is the canonical architecture document for the author operating
database concept.

## Purpose

DataBase is not only a storage repository. Its target role is the source of
truth for a personal content production system:

```text
DataBase = business truth + author model + evidence contracts + workflow state
```

The core product goal is:

```text
produce grounded, style-controlled writing and publish it through verified
platform execution
```

DataBase owns the durable facts and contracts. Other tools may execute,
retrieve, compile, or present those facts, but they do not become the truth.

## Canonical Domains

DataBase should converge around four durable domains.

### identity

Owns platform identity and publishing bindings.

Examples:

- platform accounts
- account identity hashes
- platform sessions and credential metadata
- work-to-platform-book mappings
- publish targets
- remote book ids and chapter ids

This domain answers:

```text
who can publish, where, and under which verified platform identity
```

### content

Owns the writing object graph.

Examples:

- works
- volumes
- chapters
- scenes
- characters
- world background
- lore
- timelines
- revisions
- platform-neutral manuscript snapshots

This domain answers:

```text
what is being written, what state it is in, and what it depends on
```

### author

Owns the author model and style contract.

Examples:

- author profile
- creative style protocols
- narrative techniques
- active vocabulary
- banned words
- interest clusters
- lexicon lifecycle rules
- quality rules

The current canonical runtime truth is:

```text
creative_style_protocols
creative_style_modules
creative_editing_steps
creative_quality_rules
creative_source_materials
vocabulary
banned_words
```

The current canonical contract package is:

```text
schemas/creative/
```

This domain answers:

```text
how the author writes, what the system should prefer, and what it must reject
```

### evidence

Owns source material references and citation state.

Examples:

- source documents
- source metadata
- evidence chunks
- citations
- query runs
- RAGFlow document ids
- retrieval traces

This domain answers:

```text
what the writing is grounded on and how claims can be traced
```

Evidence storage may be backed by external retrieval systems, but the durable
reference and usage record belongs to DataBase.

## External Tool Placement

External tools are execution surfaces, not truth owners.

### ContentBase

Role:

```text
content generation, review, publishing orchestration, frontend shell
```

ContentBase consumes DataBase contracts. It should not define its own creative
style schema, vocabulary registry, banned-word registry, account naming system,
or publishing truth.

Canonical flow:

```text
ContentBase root API
  -> DataBase creative/content/identity contract
  -> generation or publishing execution
  -> quality verification
  -> DataBase writeback
```

### RAGFlow

Role:

```text
document parsing, chunking, retrieval, reranking, grounded citations
```

RAGFlow may own its internal index. DataBase owns the durable evidence contract:

```text
source document identity
retrieved citation usage
query run record
which generated artifact used which evidence
```

RAGFlow should be attached as an `EvidenceProvider`, not as a replacement for
DataBase.

### Dify

Role:

```text
workflow orchestration, model selection, prompt experiment surface
```

Dify may orchestrate multi-step generation:

```text
topic analysis
evidence retrieval
conceptual entrance planning
draft generation
revision
```

Dify does not own work state, author model, vocabulary, banned words, publishing
state, or final quality verdicts.

### sub2api

Role:

```text
OpenAI-compatible model gateway
```

sub2api provides model execution. It does not define writing policy. Provider
identity and model selection must remain explicit in the calling contract. A
successful generation result is not proof that the requested provider was used
unless provider authenticity is verified through the canonical execution path.

## Writing System Chain

The target chain is:

```text
content context
+ author contract
+ evidence pack
-> generation
-> quality gate
-> revision
-> database writeback
-> publish candidate
-> platform execution
-> platform verification
-> database writeback
```

The generation input should converge to one canonical object:

```text
WritingContext
```

Required parts:

- work identity
- chapter or task target
- world and character context when relevant
- continuity context
- author contract
- evidence pack when the task makes factual or historical claims
- target channel or platform constraints

The output should converge to one canonical object:

```text
WritingArtifact
```

Required parts:

- generated text
- task type
- source evidence usage
- style contract version
- model execution metadata
- quality result
- revision lineage

## Evidence Pack Contract

RAG-backed writing should pass evidence as a structured pack:

```json
{
  "query": "topic or chapter question",
  "citations": [
    {
      "sourceId": "stable source id",
      "title": "source title",
      "chunkId": "retrieval chunk id",
      "excerpt": "short supporting passage",
      "reason": "why this citation is relevant"
    }
  ]
}
```

The exact storage tables can evolve, but the ownership does not:

```text
DataBase owns evidence identity, citation usage, and query-run records.
RAGFlow owns retrieval mechanics and its internal index.
```

The detailed evidence object contract is canonicalized in:

```text
docs/contracts/evidence-contract.md
```

The higher-level literary retrieval and semantic graph architecture is
canonicalized in:

```text
docs/architecture/civilization-semantic-writing-system.md
```

## Author Model Contract

The author contract is already active through:

```text
GET /creative/style-contract?protocol=immersive_historical_synthetic_narrative
```

The contract currently includes:

- author profile
- narrative techniques
- task types
- interest clusters
- lexicon lifecycle
- conceptual entry model
- quality rules
- preferred vocabulary
- banned words

The current important narrative mechanism is:

```text
Image-Concept Entry / 意象-概念入口
```

Mechanism:

```text
语言符号 -> 历史沉积 -> 认知错位 -> 文明位置 -> 身份不稳定 -> 主题显影
```

The rule is:

```text
start from a word, title, place name, object, building, ritual, smell, or
institutional trace; let the theme appear after the symbol has carried history
and cognitive tension
```

This is an author rule, not a local ContentBase prompt fragment.

## Boundary Rules

The following boundaries are structural:

- DataBase owns schema and durable contracts.
- ContentBase consumes generated contracts and Gateway APIs.
- RAGFlow provides retrieval, not author truth.
- Dify provides orchestration, not business truth.
- sub2api provides model execution, not writing policy.
- Publishing workers perform side effects, not candidate policy ownership.

Forbidden outcomes:

- a second local vocabulary registry in ContentBase
- a second banned-word source in ContentBase
- Dify owning canonical prompt policy
- RAGFlow becoming the only record of used evidence
- publishing state stored only in browser automation logs
- model substitution without explicit provider verification

## Next Structural Milestones

1. Add an evidence contract under DataBase.

   Target concepts:

   ```text
   evidence_sources
   evidence_chunks
   evidence_citations
   evidence_query_runs
   ```

2. Add a ContentBase `EvidenceProvider` consumer.

   It should return an `EvidencePack` to the existing generation pipeline.

3. Add Dify as optional workflow executor.

   Dify may run the workflow, but ContentBase still validates the result and
   DataBase still owns the contract state.

4. Standardize `WritingContext` and `WritingArtifact`.

   These should become the common objects across fiction, historical short
   video scripts, current-affairs commentary, and business copywriting.

5. Record provider identity in generation metadata.

   The requested provider, requested model, observed endpoint, and verification
   result must be recorded together.

## Verification

Before claiming a change to this architecture is active, verify the concrete
execution path:

```text
DataBase contract row exists
Gateway exposes it
ContentBase consumes it
generation or quality output shows the effect
database writeback records the result
```

Build success alone is not enough for user-visible writing behavior.

```


---

## docs\architecture\canonical-content-system.md

```md
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

```


---

## docs\architecture\civilization-semantic-writing-system.md

```md
# Civilization Semantic Writing System

This document defines the target architecture for a growing literary and
civilizational semantic writing system.

It extends the author operating database and evidence contract. It is not a
generic RAG design.

## Core Claim

The target is not a writing AI.

The target is:

```text
a style-controlled, evidence-grounded, civilization-semantic writing system
```

Ordinary RAG usually answers:

```text
which text chunk is similar to this query
```

This system must answer:

```text
which semantic position, civilizational relation, image resonance, historical
tension, and citation posture should be used here
```

The system retrieves literary and conceptual function, not just information.

## First Principle

Do not model a book as a file.

Model a book as:

```text
a semantic ecosystem
```

The durable unit is not the document. The durable unit is:

```text
SemanticUnit
```

A semantic unit may be a paragraph, scene, quote, note, image, term, event,
ritual, building, object, title, or institutional trace.

## SemanticUnit

The minimum unit should carry both evidence identity and literary function.

Canonical shape:

```yaml
id: semantic_unit_000231

source:
  source_id: source_mishima_kinkakuji
  author: 三岛由纪夫
  title: 金阁寺
  locator: page 83

text:
  excerpt: short excerpt or paraphrase pointer

image_tags:
  - 金阁
  - 光
  - 火

concept_tags:
  - 绝对美
  - 不可抵达
  - 现实失败

civilization_tags:
  - 日本现代性
  - 战后精神

emotion_tags:
  - 扭曲
  - 崇高
  - 空洞

narrative_functions:
  - 观念物化
  - 哲学象征

style_tags:
  - 三岛式
  - 高张力
  - 冷美学

usable_for:
  - opening
  - aesthetic_argument
  - civilizational_decay

related:
  - 本雅明_灵韵
  - 柏拉图_理念论
```

The excerpt must remain an evidence excerpt. It must not become a copied source
archive.

## Tag Layers

The system needs explicit semantic tag layers. Embedding is only one signal.

### Image Tags

Examples:

- 黄昏
- 海
- 雨
- 金阁
- 铁轨
- 封蜡
- 税册
- 军靴

Image tags support symbolic entrance and sensory continuity.

### Concept Tags

Examples:

- 近代性
- 帝国衰败
- 身份漂移
- 绝对美
- 不可抵达
- 制度腐败
- 文明裂缝

Concept tags support argument and thematic construction.

### Civilization Tags

Examples:

- 日本近代
- 东亚秩序
- 欧洲凝视
- 满蒙经营
- 战后精神
- 民族国家

Civilization tags locate a unit inside historical and cultural position.

### Emotion Tags

Examples:

- 疲劳
- 冷静
- 绝望
- 崇高
- 空洞
- 克制

Emotion tags should describe temperature, not instruct the prose to emote.

### Narrative Function Tags

Examples:

- 观念入口
- 延迟点题
- 认知裂缝
- 观念物化
- 事实并置
- 结尾悬置

Narrative function tags answer:

```text
where can this unit work inside an article or chapter
```

### Style Tags

Examples:

- 漱石式
- 三岛式
- 石黑式
- 本雅明式
- 博尔赫斯式
- 冷文书感

Style tags are retrieval hints, not imitation licenses. The final voice remains
the DataBase author contract.

## Narrative Position

Every semantic unit should be eligible for narrative position tagging:

```text
opening
transition
climax
fadeout
argument
counterpoint
definition
image_return
```

This is necessary because citations have position. A source that works as an
opening may be clumsy as an ending. A theory paragraph that works as a
transition may ruin an image-driven opening.

## Multi-Layer Search

The target retrieval system is hybrid and layered:

```text
keyword / BM25
+ embedding
+ tag filters
+ graph expansion
+ temporal filters
+ style filters
+ narrative-position filters
+ reranking
```

The query should not go directly to generation.

It should first produce:

```text
SemanticSearchPlan
```

Example:

```yaml
task_type: current_affairs_commentary
topic: 中华意味着什么
desired_entry: name_drift
narrative_position: opening
concept_targets:
  - 身份不稳定
  - 文明裂缝
image_targets:
  - 称谓
  - 地名
civilization_targets:
  - 东亚秩序
  - 民族国家
retrieval_modes:
  - bm25
  - embedding
  - graph_expansion
rerank_goal: symbolic entrance with evidence support
```

## Concept Graph

The graph layer connects:

```text
image -> concept -> civilization -> author -> source -> narrative function
```

Example:

```text
海
  -> 帝国
  -> 康拉德
  -> 边界
  -> 漂泊
  -> opening / fadeout
```

Another example:

```text
China
  -> 契丹
  -> 支那
  -> 命名
  -> 外部凝视
  -> 身份不稳定
  -> image_concept_entry
```

The point is not that the graph is always correct automatically. The point is
that the system records the relation being used, so later writing can be audited
and improved.

## Literary Retrieval

Ordinary information retrieval returns relevant text.

Literary retrieval returns:

```text
usable semantic posture
```

A good result explains:

- why this source is relevant
- which image or concept it activates
- which narrative position it fits
- what civilizational relation it carries
- what claim it can support
- what it must not be used to claim

This is why the evidence contract has `claimRole` and why this document adds
semantic tags and narrative positions.

## Generation Flow

The target flow is:

```text
1. classify writing task
2. choose entrance type
3. build SemanticSearchPlan
4. retrieve semantic units
5. expand concept graph
6. rerank by narrative function and evidence fit
7. build EvidencePack
8. build ConceptualPlan
9. generate draft under author contract
10. verify evidence and style
11. write artifact and citation usage back to DataBase
```

Generation should not begin until the system knows:

- what kind of writing this is
- which entrance type it uses
- what evidence supports the entrance
- what concepts should appear
- what concepts must stay implicit
- where citations fit in the narrative

## ConceptualPlan

The system should produce a planning object before prose.

Canonical shape:

```ts
type ConceptualPlan = {
  taskType: string;
  entranceType: "word" | "title" | "place" | "object" | "building" | "ritual" | "smell" | "institutional_trace" | string;
  entranceSymbol: string;
  delayedTheme: string;
  semanticPath: string[];
  narrativePositions: {
    opening: string[];
    transition: string[];
    climax?: string[];
    fadeout: string[];
  };
  evidenceCitationIds: string[];
  forbiddenClaims: string[];
};
```

Example path:

```text
China -> 契丹 -> 支那 -> 命名 -> 外部凝视 -> 民族国家 -> 身份不稳定
```

The plan is not a user-facing outline. It is a control object for generation and
verification.

## Accumulation Loop

The system must grow through review, not silent mutation.

Allowed loop:

```text
source ingestion
-> semantic unit extraction
-> tag proposal
-> human or approved model review
-> active semantic index
-> writing usage
-> artifact evaluation
-> candidate tag refinement
```

Forbidden loop:

```text
model invents tags
-> tags silently become active
-> future generation treats them as author truth
```

Candidate tags must have:

- source
- excerpt or locator
- proposed tag
- proposed relation
- confidence
- reviewer or promotion event

This mirrors the existing lexicon lifecycle: candidate material does not become
active truth without promotion.

## Suggested Technical Placement

These are placements, not immediate migration commands.

### DataBase

Owns:

- semantic unit identity
- tag taxonomy
- active/candidate tag lifecycle
- graph relation records
- evidence/citation usage
- author contract linkage

### RAGFlow

Owns:

- document parsing
- OCR/layout extraction
- retrieval implementation
- internal index

### Graph Layer

Possible implementation:

```text
Neo4j or a graph-shaped relational schema
```

The canonical truth still belongs to DataBase. A graph database may be a
projection or specialized query surface until explicitly promoted.

### Vector Layer

Possible implementation:

```text
pgvector / Qdrant / RAGFlow internal vector store
```

Vector search is a retrieval surface, not the semantic truth.

### Models

Recommended roles:

- embedding model: semantic retrieval signal
- reranker: narrative and evidence fit
- LLM: tag proposal, ConceptualPlan proposal, prose generation

Model output must be reviewable and contract-shaped.

## Minimal Future Tables

If implemented in MySQL first, converge toward:

```text
semantic_units
semantic_unit_tags
semantic_tag_taxonomy
semantic_relations
semantic_search_runs
conceptual_plans
semantic_unit_promotions
```

Do not create provider-specific truth tables such as:

```text
ragflow_semantic_truth
dify_semantic_memory
contentbase_local_tags
```

Provider ids belong in external reference mappings.

## Relationship To Existing Docs

This document defines the semantic architecture.

Related canonical docs:

```text
docs/architecture/author-operating-database.md
docs/contracts/evidence-contract.md
schemas/creative/creative-style-contract.ts
gateway/sql/003_creative_style_registry.sql
```

The author contract decides style. The evidence contract decides source
traceability. This document decides semantic retrieval and literary positioning.

## Verification

Before claiming this system is active, prove:

```text
semantic unit exists
tag layers exist
evidence source and chunk links exist
semantic search run is recorded
ConceptualPlan is generated
EvidencePack is generated
ContentBase consumes both
artifact records citation and semantic unit usage
quality checks inspect both evidence and style
```

If generation only uses raw retrieved chunks in a prompt, the civilization
semantic system is not active.

```


---

## docs\contracts\anchor-location-contract.md

```md
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

```


---

## docs\contracts\annotation-graph-contract.md

```md
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

```


---

## docs\contracts\asset-graph-contract.md

```md
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

```


---

## docs\contracts\backstage-catalog-export.md

```md
# Backstage Catalog Export

This repository can export `catalog/ecosystem/repos.json` into a
Backstage-compatible catalog projection.

## Why This Exists

The repo registry already knows the stable truth:

- repository names
- visibility
- role
- upstream
- preferred source
- canonical doc
- machine-readable entry

Backstage can consume that truth as catalog entities without re-modeling the
ecosystem by hand.

## Export Input

- `catalog/ecosystem/repos.json`

## Export Output

- `catalog/backstage/*.catalog-info.yaml`

## Export Command

```powershell
.\scripts\catalog\export-backstage-catalog.ps1
```

## Rule

The export is a projection, not a second truth source.


```


---

## docs\contracts\backstage-mapping.md

```md
# Backstage Mapping

This repository uses `project.json` as the canonical manifest and can project it
into Backstage software catalog entities.

## Why This Exists

Backstage already solves the project catalog problem:

- entity identity
- ownership
- lifecycle
- relations
- catalog ingestion
- developer portal browsing

DataBase keeps its own manifest and directory table as truth, then exports a
Backstage-compatible projection for ecosystem reuse.

## Source of Truth

- `project.json` is canonical
- `inventories/` provide supporting snapshots
- `scripts/project/sync-project-directory.ps1` syncs MySQL
- `scripts/catalog/export-backstage-entity.ps1` emits a catalog entity

## Mapping Rules

| DataBase field | Backstage field |
| --- | --- |
| `projectName` | `metadata.name` |
| `githubRepo` | `metadata.annotations.backstage.io/source-location` |
| `owner` | `spec.owner` |
| `type` | `kind` or `spec.type` depending on the project role |
| `status` | `spec.lifecycle` |
| `sourceOfTruth` | annotation |
| `runtimeLocation` | annotation |
| `deploymentTarget` | annotation |
| `consumerInterfaces` | annotation |
| `documentation` | annotation |

## Default Kind Strategy

- `service` projects map to `kind: Component` with `spec.type: service`
- `client` projects map to `kind: Component` with `spec.type: library`
- `package` projects map to `kind: Component` with `spec.type: library`
- `adapter` projects map to `kind: Component` with `spec.type: library`
- `script` projects map to `kind: Component` with `spec.type: tool`
- `data-infrastructure-map` stays as a cataloged documentation artifact and can
  be represented as `kind: Component` with `spec.type: documentation`

## Repository Usage

The generated `catalog-info.yaml` should live beside `project.json` or in a
documented export directory and should never drift from the manifest without a
regeneration step.


```


---

## docs\contracts\backstage-relation-mapping.md

```md
# Backstage Relation Mapping

This repository only emits Backstage dependency relations when a registry value
can be resolved to a real repository name.

## Rule

- string references that look like repository names are resolved directly
- GitHub URLs are normalized to repository names
- unresolved concepts are kept as annotations, not fake relations

## Why This Exists

Relations are stronger than labels. If they are wrong, the catalog lies.
The export must prefer omission over invention.

## Current Sources

- `consumes`
- `consumedBy`

## Current Behavior

- `consumes` can emit `dependsOn` when the target repository exists in the
  registry
- `consumedBy` is treated the same way when it resolves to a registered repo

## Future Extension

Add an explicit relation vocabulary only after the registry owns stable entity
references.


```


---

## docs\contracts\backstage-relationships.md

```md
# Backstage Relationships

This repository can project its ecosystem registry into Backstage relationship
entities.

## Relationship Shape

- `Group` represents the human or organizational owner
- `System` represents a bounded runtime or product surface
- `Component` represents an individual repository or service

## Minimal Relationship Model

```text
Group
  -> owns
System
  -> contains
Component
```

## Current Projection

- `emptyinkpot` becomes the owning `Group`
- `DataBase Ecosystem` becomes the umbrella `System`
- each repository in `catalog/ecosystem/repos.json` becomes a `Component`

## Rule

Keep relationship entities generated from the registry, not hand-maintained in
multiple places.


```


---

## docs\contracts\canonical-content-graph.md

```md
---
title: Canonical Content Graph
status: canonical
owner: DataBase
---

# Canonical Content Graph

This document defines the graph-level content truth for the emptyinkpot
publishing ecosystem.

The Canonical Document Model (CDM) is the ordered document-structure subgraph of
this larger Canonical Content Graph (CCG). CDM answers containment and order:

```text
Document -> Section -> Section -> Block -> InlineSpan
```

CCG answers relationship and derivation:

```text
entity references, citations, evidence, annotations, anchors, projections,
reader runtime locations, and derived artifacts
```

A mature content system is not a file system. It is a structured graph with
multiple projections.

## Core Model

```text
Canonical Content Graph
  -> Document Structure Tree
  -> Entity Graph
  -> Reference Graph
  -> Annotation Graph
  -> Projection Graph
  -> Reader Runtime Graph
```

The document tree is one view of the graph. It is important, but it is not the
whole truth.

## Node Classes

| Node class | Meaning | Examples |
| --- | --- | --- |
| `document` | Top-level content object. | novel, article, note, paper, world file |
| `section` | Ordered structural node in a document. | chapter, scene, appendix, argument section |
| `block` | Canonical editing/generation unit. | paragraph, dialogue, evidence, quote |
| `inline` | Inline semantic or formatting span. | citation ref, person ref, emphasis |
| `entity` | Semantic object referenced by content. | person, place, concept, work, source |
| `citation` | Structured citation reference. | source locator, bibliography entry |
| `evidence` | Evidence fragment or supporting artifact. | excerpt, image, log, source fragment |
| `annotation` | Human or AI note attached to another node. | highlight, comment, editorial note |
| `anchor` | Stable location reference across projections. | document/block offset, reader location |
| `projection` | Generated output artifact node. | HTML, MDX, EPUB, PDF, Fanqie, search index |

## Edge Classes

| Edge class | Meaning |
| --- | --- |
| `contains` | Ordered containment from Document to Section to Block to Inline. |
| `references` | Content node references an Entity or another content node. |
| `cites` | Content node cites a Citation or Evidence node. |
| `supports` | Evidence supports a claim/block/section. |
| `annotates` | Annotation attaches to a target node or anchor. |
| `projects_to` | Canonical node or graph version produced a projection artifact. |
| `derived_from` | Node or artifact was derived from a source node/artifact/version. |
| `located_by` | Reader/runtime location resolves to a stable Anchor. |
| `supersedes` | New node/version replaces an older node/version. |
| `related_to` | Explicit semantic relation that is not containment. |

Edges are first-class. Do not hide semantic relations in Markdown text or
projection-only metadata.

## Structure Tree

The ordered structure tree is represented by `contains` edges:

```text
document contains section
section contains section
section contains block
block contains inline
```

TOC, EPUB nav, PDF outline, HTML sidebar, breadcrumbs, and heading lists are all
projections from this ordered containment subgraph.

## Asset Graph

Asset/media graph rules are defined in `docs/contracts/asset-graph-contract.md`. Assets are graph nodes backed by raw artifacts; image blocks reference assets instead of inlining bytes.

## Entity Graph

Entities are semantic nodes independent of any one document.

Common entity types:

```text
person
place
concept
work
source
organization
event
object
style_profile
```

Content nodes may reference entities. The entity graph lets a concept, person,
source, or place appear across many documents without duplicating identity in
each file or projection.

## Reference And Evidence Graph

Citations and evidence are graph nodes, not footnote strings.

```text
block cites citation
citation references source
block cites evidence
evidence supports claim
```

Footnote numbering, bibliography order, hover cards, side notes, and evidence
panels are projections.

## Raw Artifact Layer

Raw source bytes live below the graph as immutable artifacts. The contract is:

```text
docs/contracts/raw-artifact-store-contract.md
schemas/document/raw-artifact.schema.json
```

CCG nodes reference raw artifacts through lineage, asset, evidence, and
projection edges. AST edits create new graph versions; they do not mutate raw
artifacts.

## Annotation Graph

Annotation overlay rules are defined in `docs/contracts/annotation-graph-contract.md`.


Annotations attach to nodes or anchors.

Examples:

```text
highlight annotates anchor
comment annotates block
AI note annotates section
editorial mark annotates inline span
```

Annotations must not change canonical content unless promoted through a review
or ingestion path.

## Anchor And Location Model

Stable anchor and projection-specific location rules are defined in `docs/contracts/anchor-location-contract.md`.


Page number is not canonical truth.

The stable unit is an anchor:

```yaml
Anchor:
  id:
  targetNodeId:
  selector:
  offset:
  projectionHints:
```

Reader runtime can map anchors to pages, scroll positions, percentages, or
platform locations. These are runtime/layout projections:

```text
Anchor
  -> layout engine
  -> page number / scroll offset / EPUB CFI / reader progress
```

## Public Surface Writes

MyBlog and reader surfaces may collect comments, highlights, owner edits,
illustration proposals, and moderation actions. These writes enter the graph
system as public edit intake records, not direct CCG mutations.

```text
projection surface
  -> public edit intake
  -> annotation overlay or reviewed graph edit
```

The contract is `docs/contracts/public-surface-edit-intake-contract.md`.

## Graph Versioning

Graph changes are governed by `docs/contracts/graph-versioning-edit-contract.md`.
Raw artifacts are immutable; graph edits produce new graph versions through
explicit edit operations.

## Reader Runtime And Projection Packages

Reader/projection package boundaries are defined in `docs/contracts/reader-runtime-projection-contract.md`. Projection packages are rebuildable artifacts derived from graph versions; reader runtime state points back to anchors and graph versions.

## Projection Graph

Projection artifacts are graph nodes connected by `projects_to` and
`derived_from` edges.

Examples:

```text
document graph version projects_to html bundle
section tree projects_to EPUB nav
citation graph projects_to bibliography
block graph projects_to search chunks
anchor graph projects_to reader progress map
```

Every projection node should carry a projection manifest with:

- source graph version
- producer
- generated-at time
- projection type
- output artifact path/hash
- input contracts
- warnings

## Cross-Repo Roles

| Repository | Graph role |
| --- | --- |
| DataBase | Owns Canonical Content Graph schema, node identity, edge classes, graph versions, and projection contracts. |
| ContentBase | Generates, repairs, audits, and publishes graph nodes through DataBase contracts. |
| MyBlog | Renders public projection artifacts and reader runtime surfaces from approved graph projections. |

ContentBase and MyBlog may hold projection/runtime artifacts. They must not own
canonical graph identity.

## Content Ingestion Constitution

All imports into CCG/CDM must follow:

```text
docs/contracts/content-ingestion-constitution.md
schemas/document/content-import-manifest.schema.json
```

The core law is `import != convert`: raw artifacts are immutable, extracted
structure is evidence, canonical graph objects are normalized truth, and
projections are derived artifacts.

## EPUB Ingestion

EPUB is an import source artifact, not document truth. The canonical EPUB import
path is defined in:

```text
docs/contracts/epub-ingestion-contract.md
schemas/document/epub-ingestion-manifest.schema.json
```

The preferred direction is EPUB -> Pandoc AST or XHTML/HAST -> CDM -> CCG. Do
not use EPUB -> Markdown as the canonical ingestion path.

## Import And Runtime Flow

Target flow:

```text
Markdown / EPUB / HTML / external source
  -> importer
  -> Canonical Content Graph
  -> projection engine
  -> web / reader / PDF / EPUB / Fanqie / search / AI context
```

AI generation should operate on graph operations:

```yaml
insert:
  node:
    class: block
    type: evidence
link:
  from: block:...
  to: entity:concept.civilization
  edge: references
cite:
  from: block:...
  to: evidence:...
```

This is the semantic publishing operating system substrate.

## Non-Goals

- Do not migrate storage in this document.
- Do not implement a graph database in this document.
- Do not add ContractGuard gates yet.
- Do not require MyBlog to stop reading current content roots in this step.
- Do not treat the graph schema as a replacement for the CDM section tree; it
  contextualizes CDM as the ordered containment subgraph.

```


---

## docs\contracts\canonical-document-model.md

```md
---
title: Canonical Document Model
status: canonical
owner: DataBase
---

# Canonical Document Model

This document defines the ordered document-structure subgraph of the emptyinkpot
content ecosystem. The graph-level canonical content truth is defined in
`docs/contracts/canonical-content-graph.md`.

The goal is not EPUB support. CDM is the DataBase-owned structure tree inside
the larger Canonical Content Graph (CCG). EPUB, PDF, HTML, MDX, Astro pages,
Fanqie payloads, search indexes, reader locations, and print layouts are
projections from the graph.

```text
Canonical Document AST
  -> projection engine
  -> EPUB / PDF / HTML / MDX / Astro / Fanqie / print
```

Markdown is an import/export format. It is not the long-term canonical document
truth.

## Machine Contract

The first machine-readable CDM contract is:

```text
schemas/document/canonical-document.schema.json
```

A minimal example lives at:

```text
examples/document/minimal-cdm-document.json
```

This schema is intentionally a first boundary contract, not a storage migration.
It makes Document, Section, Block, Inline span, Citation, layout hints, and
ProjectionManifest machine-readable before any EPUB/PDF/MyBlog/Fanqie pipeline
implementation.

## Ownership

DataBase owns the canonical document model because it owns domain truth,
semantic graph, projection contracts, and cross-repo artifact grammar.

ContentBase may generate, repair, audit, and publish document objects.

MyBlog may render public projection packages.

Neither ContentBase nor MyBlog should become the owner of document structure.

## Structure First

The CDM is hierarchy-first:

```text
Document
  -> Section
    -> Section
      -> Block
        -> InlineSpan
```

A document is a tree before it is a rendered page, Markdown file, EPUB chapter,
PDF outline, or Astro route. `Section` is a structural node, not just a heading
string.

This means a table of contents is not manually authored and not regex-parsed
from Markdown headings. TOC is a projection from the section tree:

```text
Document.sections
  -> traverse Section.children
  -> TOC / EPUB nav / PDF outline / HTML sidebar
```

A projection may choose which section levels to expose, but it must not become a
second source of structural truth.

## Core Principle

A document is not a string and not a file. It is a structured object that can be:

- paginated
- rearranged
- cited
- semantically indexed
- projected into multiple formats
- partially regenerated at block or section level
- reconciled against source and projection artifacts

Page numbers are not canonical truth. Page numbers belong to a projection.

## Model Levels

| Level | Unit | Role |
| --- | --- | --- |
| 0 | Document | Work, article, note, paper, story, world file, or other complete document object. |
| 1 | Section | Chapter, introduction, scene group, argument section, appendix, or other structural unit. |
| 2 | Block | Canonical editing and generation unit. Paragraph, dialogue, evidence, quote, code, image, table, footnote, aside, scene break, and similar units. |
| 3 | Inline span | Emphasis, link, citation reference, person/name marker, concept tag, footnote reference, or semantic inline annotation. |

Block is the critical unit. Files are storage/projection containers; blocks are
where editing, generation, semantic tagging, citation, and layout hints converge.

## Document

A Document is the top-level canonical object.

Required shape:

```yaml
Document:
  id:
  type:
  title:
  authors:
  status:
  sourceLineage:
  styleProfile:
  semanticTags:
  projectionPolicy:
  projections:
  sections:
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `id` | Stable DataBase-owned document identity. |
| `type` | `novel`, `article`, `note`, `paper`, `world_file`, `evidence_file`, or another DataBase-approved document type. |
| `title` | Canonical title, independent of projection-specific display title. |
| `authors` | Canonical author/person references. |
| `status` | Draft, reviewed, published, archived, or another lifecycle state. |
| `sourceLineage` | Import source, source commit/version, ingest command, or external origin. |
| `styleProfile` | Reference to style/rhetorical profile used by projections or generation. |
| `semanticTags` | Document-level tags and graph references. |
| `projectionPolicy` | Which projections are allowed and what each may expose. |
| `projections` | Known projection artifacts and freshness metadata. |
| `sections` | Ordered section objects. |

## Section

A Section is a structural unit within a Document.

Required shape:

```yaml
Section:
  id:
  documentId:
  parentSectionId:
  order:
  level:
  title:
  semanticRole:
  references:
  blocks:
  sections:
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `id` | Stable section identity. |
| `documentId` | Owning Document. |
| `parentSectionId` | Optional parent section. |
| `order` | Canonical order within parent. |
| `level` | Structural depth used to generate TOC/nav/outline projections. |
| `title` | Section title. |
| `semanticRole` | Chapter, scene, argument, appendix, evidence, etc. |
| `references` | Section-level references and source links. |
| `blocks` | Ordered block objects directly owned by this Section. |
| `sections` | Ordered child Section objects; this is the canonical structure tree used for TOC/nav/outline projection. |

A table of contents is projected by traversing the section tree. It is not
manually maintained as separate truth, and it is not parsed from heading text as
canonical structure.


### TOC Projection

Conceptual projection:

```ts
function buildTOC(section: Section): TocNode {
  return {
    id: section.id,
    title: section.title,
    level: section.level,
    children: section.sections.map(buildTOC),
  };
}
```

The same section traversal can produce EPUB nav, PDF outline, HTML sidebar,
reader breadcrumbs, and search facets. These are projection artifacts.

## Block

A Block is the canonical editing unit.

Required shape:

```yaml
Block:
  id:
  documentId:
  sectionId:
  order:
  type:
  content:
  annotations:
  citations:
  references:
  layoutHints:
  semanticTags:
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `id` | Stable block identity. |
| `documentId` | Owning Document. |
| `sectionId` | Owning Section. |
| `order` | Canonical order within Section. |
| `type` | Block kind. |
| `content` | Structured block payload, not necessarily plain string. |
| `annotations` | Editorial, semantic, quality, or AI annotations. |
| `citations` | Citation references attached to this block. |
| `references` | Links to evidence, entities, media, or graph nodes. |
| `layoutHints` | Projection hints such as break/keep/orphan behavior. |
| `semanticTags` | Block-level semantic tags and graph references. |

Recommended block types:

```text
paragraph
quote
dialogue
narration
inner_monologue
poetry
code
image
table
footnote
aside
epigraph
scene_break
evidence
claim
argument
reflection
```

Block types are semantic and editorial. They are not just CSS classes.

## Inline Span

Inline spans are structured nodes inside a block payload.

Common inline span types:

```text
text
emphasis
strong
link
citation_ref
footnote_ref
person_ref
concept_ref
entity_ref
code_span
ruby
annotation
```

Inline spans enable semantic linking, citations, knowledge graph references,
reader annotations, and projection-specific formatting without flattening the
block into plain Markdown.

## Citation

A Citation links document content to a source or evidence fragment.

Required shape:

```yaml
Citation:
  id:
  sourceId:
  fragmentId:
  locator:
  citationStyle:
  note:
```

Citations are canonical references. Footnote numbering, bibliography order, and
reader-visible citation layout are projections.

## Layout Hints

Layout hints are canonical hints, not final layout truth.

Recommended shape:

```yaml
layoutHints:
  pageBreakBefore:
  pageBreakAfter:
  keepWithNext:
  keepTogether:
  orphanControl:
  widowControl:
  preferredFloat:
  projectionOverrides:
```

Page numbers are never stored as canonical truth because page numbers depend on
font, paper, viewport, reader engine, output format, and accessibility settings.

## Projection Manifest

Each generated output should have a ProjectionManifest.

Required shape:

```yaml
ProjectionManifest:
  documentId:
  sourceDocumentVersion:
  projectionType:
  projectionVersion:
  producer:
  generatedAt:
  inputContracts:
  outputArtifacts:
  warnings:
```

Projection types include:

```text
epub
pdf
html
mdx
astro
fanqie
print
search
semantic_chunks
```

Projection manifests are how MyBlog, ContentBase, and operators verify
freshness without turning projection output into source truth.

## Import And Projection Flow

Target flow:

```text
Obsidian Markdown / existing Markdown / external source
  -> importer
  -> Canonical Document AST in DataBase
  -> projection engine
  -> EPUB / PDF / HTML / MDX / Astro / Fanqie / search / semantic chunks
```

Importers must preserve source lineage. Projections must declare source document
version and generated-at time.

## Pandoc And Typst Placement

Pandoc is the primary reference for AST shape and multi-format conversion.
Pandoc JSON AST should be studied before inventing custom block/inline syntax.

Typst is the primary reference for programmable print/PDF layout.
Typst belongs in the projection layer, not as canonical truth.

Placement:

| System | Role |
| --- | --- |
| Pandoc AST | Reference model and possible import/export bridge for blocks/inlines. |
| Typst | PDF/print projection engine candidate. |
| Markdown | Authoring/import/export format. |
| EPUB | Projection artifact. |
| PDF | Projection artifact. |
| HTML/MDX/Astro | Projection artifacts for public web. |
| Fanqie payload | Projection artifact for platform publishing. |

## Cross-Repo Boundary

| Repository | Allowed role | Forbidden role |
| --- | --- | --- |
| DataBase | Own CDM schema, document AST, citations, semantic graph links, projection contracts, projection manifests. | Workflow execution, public UI rendering. |
| ContentBase | Generate, repair, audit, and publish Document/Section/Block objects through DataBase contracts. | Own canonical document schema or keep hand-maintained duplicate document types. |
| MyBlog | Render public projection packages from DataBase/CDM projections. | Read raw Markdown as long-term truth, own CDM schema, or infer private workflow state. |

Future MyBlog should consume projection packages such as:

```text
public-content-bundle/
  document.ast.public.json
  document.mdx
  document.toc.json
  document.search.json
  projection-manifest.json
```

This replaces the long-term pattern of treating `apps/web/src/content/**/*.md`
as the source of document truth.

## AST-Level Generation

AI generation should target structured document units instead of large Markdown
strings.

Preferred generation target:

```yaml
generate:
  documentId:
  sectionId:
  blocks:
    - type: dialogue
    - type: evidence
    - type: reflection
```

This makes generation compatible with:

- pagination
- table of contents
- citation projection
- semantic indexing
- block-level repair
- partial regeneration
- multi-format publishing

## Non-Goals

- Do not implement EPUB/PDF generation in this document.
- Do not add ContractGuard gates for CDM yet.
- Do not migrate MyBlog away from Markdown in this step.
- Do not create placeholder schema files until DataBase chooses the concrete
  schema storage path and versioning strategy.
- Do not treat projection page numbers as canonical truth.

```


---

## docs\contracts\content-ingestion-constitution.md

```md
---
title: Content Ingestion Constitution
status: canonical
owner: DataBase
---

# Content Ingestion Constitution

This document defines the constitutional rules for importing external content
into the DataBase-owned Canonical Content Graph (CCG) and Canonical Document
Model (CDM).

The central law:

```text
import != convert
```

Import means preserving the source artifact, extracting structure, reporting
loss, and normalizing into canonical graph objects without silent semantic
degradation.

Conversion means producing another format. Conversion output is never canonical
truth by itself.

## Canonical Import Law

Raw source artifacts are immutable.

Examples:

```text
book.epub
scan.pdf
obsidian.md
image.png
archive.zip
docx
html
```

The original artifact must never disappear because an AI or importer produced a
cleaner-looking Markdown file, AST, summary, or projection.

Canonical AST/graph objects are normalized representations derived from the
source. They do not erase source lineage.

## Four-Layer Ingestion Model

```text
Layer 0 Raw Artifact
  -> Layer 1 Extracted Structure
  -> Layer 2 Canonical AST / Canonical Content Graph
  -> Layer 3 Projection
```

| Layer | Name | Responsibility | Truth status |
| --- | --- | --- | --- |
| 0 | Raw Artifact | Immutable source bytes and metadata. | Source artifact truth. |
| 1 | Extracted Structure | Parser/OCR/DOM/Pandoc/HAST/PDF layout extraction results. | Extraction evidence, not canonical content truth. |
| 2 | Canonical AST / CCG | Normalized Document/Section/Block/Inline and graph nodes/edges. | DataBase canonical content truth. |
| 3 | Projection | HTML, MDX, EPUB, PDF, Astro, search, reader runtime, platform payloads. | Derived artifact truth only. |

A pipeline may regenerate Layer 1, 2, or 3. It must not mutate Layer 0.

## AI Role Boundary

AI may assist with:

- extraction
- normalization
- annotation
- linking
- entity candidate identification
- loss report drafting
- unresolved warning classification

AI must not silently:

- rewrite source text
- summarize source text as a replacement
- merge duplicated text
- deduplicate semantically distinct content
- rename canonical source artifacts
- flatten hierarchy
- discard layout intent
- discard footnotes
- discard anchors
- discard image relationships
- rewrite encoding
- convert EPUB/PDF/DOCX to Markdown and treat it as truth

If an AI cannot preserve structure, it must return a warning or blocked import,
not a cleaned-up substitute.

## Import Job

Every ingestion task must produce an ImportJob/ImportManifest record.

The generic schema is:

```text
schemas/document/content-import-manifest.schema.json
```

Format-specific manifests may extend or specialize it:

```text
schemas/document/epub-ingestion-manifest.schema.json
```

Required concepts:

```yaml
ImportJob:
  sourceArtifact:
  extractor:
  parser:
  normalizationPolicy:
  imagePolicy:
  outputPolicy:
  lossReport:
  unresolvedWarnings:
  status:
```

## Loss Report

No silent degradation is allowed.

A LossReport records:

```yaml
LossReport:
  unsupportedFeatures:
  downgraded:
  unresolved:
  blockedReasons:
```

Examples:

```text
floating-image
embedded-font
ruby-annotation
epub-footnote-inline
malformed-html
pdf-reading-order-uncertain
ocr-low-confidence
missing-image-asset
broken-anchor
```

If loss affects structure, citation, anchor, evidence, image relationships, or
semantic meaning, the import should be marked `blocked` or `review_required`.

## Raw Artifact Store

Layer 0 storage is governed by:

```text
docs/contracts/raw-artifact-store-contract.md
schemas/document/raw-artifact.schema.json
```

OpenList-backed storage may hold raw bytes, but DataBase owns artifact identity,
hash, lineage, retention, and references. The raw artifact store is
content-addressed and immutable.

## Source Artifact

A SourceArtifact record must include:

```yaml
SourceArtifact:
  id:
  originalPath:
  sha256:
  mime:
  sizeBytes:
  source:
  importedAt:
  immutable: true
```

The hash is part of source identity. A changed file is a new artifact version,
not an in-place rewrite.

## Asset Graph

Images and media are assets, not inline base64 text.

Required shape:

```yaml
Asset:
  id:
  sourceArtifactId:
  sha256:
  mime:
  width:
  height:
  originalPath:
```

Image blocks should reference assets:

```yaml
Block:
  type: image
  assetId:
  caption:
```

This preserves image identity, layout relation, evidence relation, and future
projection choices.

## PDF Import Rule

PDF is a rendered artifact, not a document truth format.

PDF import must preserve the raw PDF and use a dual-track extraction:

```text
Raw PDF
  -> text/OCR layer
  -> layout layer with page boxes, coordinates, anchors
  -> extracted structure
  -> canonical graph candidates
```

PDF page numbers and bounding boxes are extraction/layout evidence. They are not
canonical document structure by themselves.

Recommended technologies to evaluate:

| Format | Mature extraction route |
| --- | --- |
| EPUB | Pandoc JSON AST; XHTML/HAST via unified/rehype. |
| HTML/Markdown | unified/rehype/remark. |
| PDF | unstructured.io, OCR, layout-aware extraction. |
| OCR | PaddleOCR, Tesseract, or equivalent OCR workers. |

## Import Workers

Do not build one universal parser.

Use bounded workers:

```text
epub-import-worker
pdf-import-worker
markdown-import-worker
obsidian-import-worker
html-import-worker
image-import-worker
docx-import-worker
```

Each worker emits extracted structure plus an import manifest. The normalizer
then converts extracted structure into CCG/CDM nodes.

## Blocked Import

The correct response to unsafe import is `blocked`, not silent repair.

Block when:

- source artifact hash is missing
- raw artifact cannot be retained
- parser route is unknown
- TOC/section hierarchy cannot be recovered with confidence
- footnotes/citations are dropped
- image relationships are dropped
- anchors cannot be represented
- PDF reading order is uncertain and no review path is recorded
- OCR confidence is below policy threshold
- output would flatten meaningful structure

## Cross-Repo Roles

| Repository | Role |
| --- | --- |
| DataBase | Owns ingestion constitution, source artifact identity, import manifests, loss reports, canonical CCG/CDM objects. |
| ContentBase | May run import workflows and AI-assisted normalization under this constitution. |
| MyBlog | May consume public projections after import; it must not canonicalize raw files by rendering them. |

## Non-Goals

- Do not implement import workers in this document.
- Do not move existing files.
- Do not let AI organize files without a manifest and loss report.
- Do not create Markdown as an intermediate canonical layer.
- Do not add enforcement gates yet.

```


---

## docs\contracts\cross-repo-artifact-contracts.md

```md
---
title: Cross-Repo Artifact Contracts
status: canonical
owner: DataBase
---

# Cross-Repo Artifact Contracts

This document defines the artifact grammar between DataBase, ContentBase, and
MyBlog.

It refines `docs/contracts/three-repo-topology-constitution.md`. The
constitution defines repository identity; this document defines what may cross
repository boundaries.

The rule is simple:

```text
repositories exchange artifacts, not implementation ownership
```

ContractGuard is not the owner of this grammar. It may validate selected
contracts later, but DataBase owns the topology and artifact language.

## Contract Fields

Every cross-repo artifact must be describable with these fields:

| Field | Meaning |
| --- | --- |
| Owner | Repository that owns the artifact's meaning and lifecycle. |
| Producer | Runtime, command, or repo path that creates the artifact. |
| Consumers | Repositories or systems allowed to read the artifact. |
| Canonical path | Preferred path or URL. If the path is not implemented yet, mark it planned. |
| Format | OpenAPI, JSON, JSONL, Markdown, static files, generated package, or directory tree. |
| Freshness rule | How consumers decide whether the artifact is current enough. |
| Forbidden use | What consumers must not infer or do from the artifact. |
| Promotion path | How artifact facts become durable DataBase truth, if they ever should. |

If a proposed cross-repo artifact cannot fill these fields, it is not ready to
be a boundary contract.

## Artifact Classes

| Class | Direction | Purpose |
| --- | --- | --- |
| Domain contract | DataBase -> ContentBase | Stable access to durable content and creative truth. |
| Projection contract | DataBase -> MyBlog, ContentBase -> MyBlog | Public, renderable content shape. |
| Workflow evidence | ContentBase -> DataBase, ContentBase -> operator | Runtime proof of generation, repair, audit, and publish execution. |
| Public shell artifact | MyBlog -> public web | Static and runtime projection output. |
| Public edit intake | MyBlog -> DataBase | Structured comments, highlights, moderation actions, and edit proposals from public/reader surfaces. |
| Catalog artifact | DataBase -> operators and agents | Topology, ownership, and ecosystem navigation. |
| Publishing projection | DataBase -> MyBlog, ContentBase -> platforms | Projection from canonical Document AST into EPUB, PDF, HTML, MDX, Astro, Fanqie, search, or print artifacts. |

## DataBase Export Contracts



### Canonical Content Graph

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase graph schema/model authorship and future importers/projection engines |
| Consumers | ContentBase workflow runtime, MyBlog projection tooling, reader runtime, publishing projection engines |
| Canonical path | `docs/contracts/canonical-content-graph.md`, `schemas/document/canonical-content-graph.schema.json`, `examples/document/minimal-content-graph.json` |
| Format | Markdown model document plus JSON Schema-backed node/edge graph |
| Freshness rule | Projection manifests must declare source graph version, projection node, producer, generated-at time, and output artifacts. |
| Forbidden use | Consumers must not hide entity, citation, evidence, annotation, anchor, or projection relationships inside Markdown strings or projection-only metadata. |
| Promotion path | Imported/generated content becomes durable only after conversion into DataBase-owned graph nodes and edges. |

The CCG is the top-level content truth. CDM is its ordered structure-tree
subgraph.




### Raw Artifact Record

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Raw artifact store/import pipeline |
| Consumers | DataBase ingestion, ContentBase import workflows, MyBlog public projections after publication approval |
| Canonical path | `docs/contracts/raw-artifact-store-contract.md`, `schemas/document/raw-artifact.schema.json`, `examples/document/minimal-raw-artifact.json` |
| Format | Markdown contract plus JSON artifact record |
| Freshness rule | Artifact identity is content-addressed by SHA-256; storage URI must resolve to bytes matching the recorded hash. |
| Forbidden use | Do not overwrite, rename, delete, duplicate, or replace raw artifacts with converted Markdown/projections. |
| Promotion path | Raw artifacts become CCG evidence/source/asset references through import manifests and graph edges. |




### Reader Runtime Projection Package

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Projection engine / reader package builder |
| Consumers | MyBlog, reader runtime, search, EPUB/PDF/HTML/Astro/Fanqie projection consumers |
| Canonical path | `docs/contracts/reader-runtime-projection-contract.md`, `schemas/document/projection-package.schema.json`, `schemas/document/reader-runtime-state.schema.json` |
| Format | Markdown contract plus JSON projection package and reader runtime state |
| Freshness rule | Projection package must reference graph id/version, producer, generated-at time, rendered content, TOC, anchor map, asset map, annotation overlay, and search chunks. |
| Forbidden use | Projection package and reader state must not become canonical content truth or raw source artifacts. |
| Promotion path | Projection packages are regenerated from graph versions; reader annotations/progress point back to anchors. |

### Public Surface Edit Intake

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | MyBlog reader/editor UI, reader runtime, future public surface adapters |
| Consumers | DataBase intake processor, Annotation Graph, graph review/edit workflow, ContentBase review assistance |
| Canonical path | `docs/contracts/public-surface-edit-intake-contract.md`, `schemas/document/public-edit-intake.schema.json`, `examples/document/minimal-public-edit-intake.json` |
| Format | Markdown contract plus JSON intake record |
| Freshness rule | Intake must reference graph id/version, projection package id, target node/anchor/asset/projection id, actor, surface, payload, review policy, and created-at time. |
| Forbidden use | MyBlog must not mutate canonical CCG/CDM nodes, raw artifacts, or DataBase tables directly from public UI actions. |
| Promotion path | Annotation intake creates annotation overlays; edit proposals require review and become graph edit operations plus new graph versions. |

### Graph Version And Edit Operation

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase graph editor/importer/review workflow |
| Consumers | ContentBase workflow runtime, MyBlog projection consumers, projection engines, review tools |
| Canonical path | `docs/contracts/graph-versioning-edit-contract.md`, `schemas/document/graph-edit-operation.schema.json`, `schemas/document/graph-version-manifest.schema.json` |
| Format | Markdown contract plus JSON edit operation and graph version manifests |
| Freshness rule | Consumers must reference graph version ids; projection manifests must point to source graph versions. |
| Forbidden use | Do not mutate canonical graph in place, do not treat annotations as edits, and do not modify raw artifacts through graph edits. |
| Promotion path | Reviewed edit operations create new graph versions; projections are regenerated from graph versions. |

### Asset Graph

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Import pipeline, asset registration, projection engines |
| Consumers | CDM/CCG, ContentBase workflows, MyBlog projections, annotation/evidence surfaces |
| Canonical path | `docs/contracts/asset-graph-contract.md`, `schemas/document/asset-graph.schema.json`, `examples/document/minimal-asset-graph.json` |
| Format | Markdown contract plus JSON asset graph |
| Freshness rule | Asset records must reference rawArtifactId and sha256; projection derivatives must not replace source assets. |
| Forbidden use | Do not inline asset bytes as canonical content or infer semantic role only from filenames. |
| Promotion path | Assets become canonical graph nodes through import/registration and graph relations such as illustrates/evidence_for/cover_of. |

### Anchor And Location Map

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Import pipeline, projection engines, reader runtime |
| Consumers | Annotation graph, reader runtime, MyBlog projections, EPUB/PDF/HTML/search mappings |
| Canonical path | `docs/contracts/anchor-location-contract.md`, `schemas/document/anchor-location.schema.json`, `examples/document/minimal-anchor-location.json` |
| Format | Markdown contract plus JSON anchor/location map |
| Freshness rule | Runtime locations must reference stable anchor ids and declare projection type and generated-at time. |
| Forbidden use | Do not store page numbers, scroll offsets, or EPUB CFI as canonical content structure. |
| Promotion path | Anchors become canonical location references; projection-specific locations are regenerated from anchors. |

### Annotation Graph

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Reader runtime, editor workflow, AI annotation workflow, import review |
| Consumers | MyBlog reader surfaces, ContentBase review workflows, DataBase graph review |
| Canonical path | `docs/contracts/annotation-graph-contract.md`, `schemas/document/annotation-graph.schema.json`, `examples/document/minimal-annotation-graph.json` |
| Format | Markdown contract plus JSON annotation graph |
| Freshness rule | An annotation must target a stable node or anchor id and declare visibility, author, created-at time, and status. |
| Forbidden use | Annotations must not mutate source artifacts or canonical content nodes directly. |
| Promotion path | Correction candidates become canonical content only through reviewed edit operations that create a new graph version. |

### Content Import Manifest

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Format-specific import workers and future normalization pipeline |
| Consumers | DataBase ingestion review, ContentBase import workflows, future projection pipelines |
| Canonical path | `docs/contracts/content-ingestion-constitution.md`, `schemas/document/content-import-manifest.schema.json`, `examples/document/minimal-content-import-manifest.json` |
| Format | Markdown constitution plus JSON import manifest |
| Freshness rule | Manifest must include immutable source artifact identity, extractor/parser route, normalization/image/output policies, loss report, unresolved warnings, outputs, and generated-at time. |
| Forbidden use | AI or import workers must not silently rewrite, summarize, merge, deduplicate, flatten, rename, or convert source artifacts into canonical truth. |
| Promotion path | Imported content becomes durable only after raw artifact preservation, extraction, loss reporting, normalization, and review/promotion into CCG/CDM. |

This is the parent contract for EPUB/PDF/Markdown/HTML/image/DOCX import workers.

### EPUB Ingestion Manifest

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | Future DataBase EPUB importer |
| Consumers | DataBase ingestion review, ContentBase workflows that request EPUB import, MyBlog only after public projection |
| Canonical path | `docs/contracts/epub-ingestion-contract.md`, `schemas/document/epub-ingestion-manifest.schema.json`, `examples/document/minimal-epub-ingestion-manifest.json` |
| Format | Markdown contract plus JSON ingestion manifest |
| Freshness rule | Manifest must declare source EPUB artifact, importer/version, parser route, target document id, target graph id/version, generated-at time, and outputs. |
| Forbidden use | Consumers must not treat EPUB files or EPUB-to-Markdown output as canonical document truth. |
| Promotion path | EPUB content becomes durable only after conversion into CDM Document/Section/Block tree and CCG nodes/edges. |

EPUB is already structured. The importer should preserve OPF metadata, spine,
nav/toc tree, XHTML blocks, footnotes, anchors, and assets where possible.

### Canonical Document Model

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase document schema/model authorship and future importers |
| Consumers | ContentBase workflow runtime, MyBlog projection tooling, publishing projection engines |
| Canonical path | `docs/contracts/canonical-document-model.md`, `schemas/document/canonical-document.schema.json`, `examples/document/minimal-cdm-document.json` |
| Format | Markdown model document plus JSON Schema-backed Document/Section/Block/Inline AST |
| Freshness rule | Projection manifests must declare source document version, projection type, producer, and generated-at time. |
| Forbidden use | Consumers must not treat Markdown, EPUB, PDF, HTML, MDX, Astro content files, or Fanqie payloads as canonical document truth. |
| Promotion path | Imported Markdown or generated text becomes durable only after conversion into DataBase-owned Document/Section/Block objects. |

The CDM makes EPUB, PDF, HTML, MDX, Astro, search, and Fanqie output projection
artifacts rather than source truth.


### DataBase Gateway OpenAPI

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase Gateway source and OpenAPI generation path |
| Consumers | ContentBase, MyBlog server-side adapters when explicitly approved, operator tooling, AI adapters |
| Canonical path | `gateway/openapi.yaml` |
| Format | OpenAPI YAML |
| Freshness rule | Must match the deployed Gateway routes and generated client version used by consumers. |
| Forbidden use | Consumers must not infer raw table ownership, service account rights, or undocumented routes from this file. |
| Promotion path | API changes become durable only after DataBase schema/storage contract and Gateway route are updated together. |

The OpenAPI contract describes access. It does not transfer DataBase schema
ownership to consumers.

### Generated DataBase Client

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase generated client build from `gateway/openapi.yaml` |
| Consumers | ContentBase workflow runtime, approved service adapters |
| Canonical path | `generated/` or the published generated client package for the Gateway |
| Format | Generated client source/package |
| Freshness rule | Client version must be generated from the OpenAPI contract that matches the target Gateway. |
| Forbidden use | Consumers must not hand-edit generated types or fork them into manual domain DTOs. |
| Promotion path | Missing client fields must be fixed in DataBase OpenAPI/Gateway, then regenerated. |

Generated client usage is the preferred boundary for ContentBase. Manual
schema duplication in ContentBase is drift.

### Content Schema Contracts

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase schema and contract authorship |
| Consumers | ContentBase, MyBlog projection tooling, operator tooling |
| Canonical path | `schemas/content/` |
| Format | JSON Schema or future schema language chosen by DataBase |
| Freshness rule | Schema version must match the DataBase Gateway/projection that exposes it. |
| Forbidden use | Consumers must not create parallel durable schema files for the same facts. |
| Promotion path | Consumer-discovered fields enter DataBase schema review before becoming canonical. |

### Creative Contract Artifacts

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase creative source and Gateway projections |
| Consumers | ContentBase generation, audit, and repair workflows |
| Canonical path | `schemas/creative/`, `creative-contracts/`, and related Gateway routes |
| Format | JSON/Markdown/schema-backed contract artifacts |
| Freshness rule | ContentBase generation must use the current DataBase-projected contract for the target work/author. |
| Forbidden use | ContentBase must not maintain detached author, vocabulary, style, or banned-term truth. |
| Promotion path | Workflow discoveries become candidate suggestions until DataBase accepts them into canonical creative truth. |

### Semantic Graph Snapshot

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase semantic graph projection/export command |
| Consumers | ContentBase context hydration, MyBlog public knowledge projection, operator analysis |
| Canonical path | `semantic-graph.snapshot.json` or `schemas/semantic/` backed snapshot path |
| Format | JSON snapshot with declared schema/version |
| Freshness rule | Consumers must record or compare snapshot version when producing downstream artifacts. |
| Forbidden use | A snapshot is read-only projection; consumers must not treat it as the graph owner. |
| Promotion path | Consumer graph annotations return as explicit DataBase ingestion candidates, not direct snapshot edits. |

### Public Projection Schema

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase projection contract authorship |
| Consumers | MyBlog, public bundle generators, search index builders |
| Canonical path | `public-projection.schema.json` or the DataBase-owned replacement path |
| Format | JSON Schema or future DataBase schema format |
| Freshness rule | Public bundles and MyBlog indexes must declare the schema version they were built from. |
| Forbidden use | MyBlog must not infer private workflow or raw domain fields from public projection fields. |
| Promotion path | Public rendering needs that require new fields start as projection schema changes in DataBase. |

### Ecosystem Catalog Artifacts

| Field | Value |
| --- | --- |
| Owner | DataBase |
| Producer | DataBase catalog, ecosystem, and repository metadata files |
| Consumers | Operators, agents, future Backstage/catalog surfaces |
| Canonical path | `ECOSYSTEM_MAP.md`, `catalog/`, `catalog-info.yaml`, `ecosystem/` |
| Format | Markdown, YAML, JSON |
| Freshness rule | Update when a repository identity, owner, production root, or cross-repo dependency changes. |
| Forbidden use | Catalog metadata must not become a second runtime config source for deployed services. |
| Promotion path | Runtime discoveries become catalog updates only after canonical owner/path verification. |

## ContentBase Export Contracts

### Runtime Capability Metadata

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | ContentBase runtime capability metadata and generated docs projection |
| Consumers | Operators, AI clients, DataBase topology docs when summarizing capabilities |
| Canonical path | `product/novel/app/runtime-capabilities.ts` and generated projection such as `docs/api/generated/runtime-capabilities.md` |
| Format | Executable metadata plus generated Markdown/JSON projection |
| Freshness rule | Generated projection must be rebuilt from executable metadata after capability changes. |
| Forbidden use | Capability metadata must not define DataBase domain truth or public MyBlog presentation behavior. |
| Promotion path | DataBase may catalog the capability, but the executable owner remains ContentBase. |

### Workflow Capability Report

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | ContentBase workflow/runtime reporting command or API |
| Consumers | Operators, AI assistants, DataBase catalog summaries |
| Canonical path | planned `workflow-capabilities.json` |
| Format | JSON |
| Freshness rule | Report must include generated-at time, ContentBase commit, and DataBase client/schema version. |
| Forbidden use | Do not treat a capability report as a stable API contract or domain schema. |
| Promotion path | Stable recurring capabilities may be summarized in DataBase catalog artifacts. |

### Quality Report

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | Generation/audit quality workflows |
| Consumers | Operators, DataBase ingestion review, MyBlog only if explicitly public |
| Canonical path | planned `quality-report.json` per run or release bundle |
| Format | JSON |
| Freshness rule | Must include target work/chapter identifiers, DataBase contract version, workflow version, and generated-at time. |
| Forbidden use | MyBlog must not render private quality reports unless they are explicitly published as public evidence. |
| Promotion path | Accepted corrections or semantic facts become DataBase ingestion candidates. Raw report remains workflow evidence. |

### Repair Trace

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | Repair workflow runtime |
| Consumers | Operators, audit review, DataBase ingestion review when durable facts change |
| Canonical path | planned `repair-trace.json` per repair operation |
| Format | JSON or JSONL |
| Freshness rule | Must link to the input artifact, repair command, model/provider if used, and output version. |
| Forbidden use | Repair trace must not silently overwrite DataBase durable truth without an explicit DataBase write contract. |
| Promotion path | Repair output becomes durable only through DataBase Gateway/write facade or approved ingestion command. |

### Publish Manifest

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | Publish command service/orchestrator |
| Consumers | Operators, MyBlog public projection tooling only after publication, DataBase platform binding review |
| Canonical path | planned `publish-manifest.json` per publish run |
| Format | JSON |
| Freshness rule | Must include platform, target account/work/chapter identifiers, source artifact versions, and confirmation status. |
| Forbidden use | Browser click success is not publish truth; MyBlog must not infer publication truth from unconfirmed manifests. |
| Promotion path | Confirmed platform facts enter DataBase platform binding/publication records through explicit contract. |

### Audit Evidence

| Field | Value |
| --- | --- |
| Owner | ContentBase |
| Producer | Audit workflows and evidence collectors |
| Consumers | Operators, DataBase review, MyBlog public evidence library only after publication approval |
| Canonical path | planned `audit-evidence/` bundle path |
| Format | Directory tree containing JSON, logs, screenshots, or text artifacts with manifest |
| Freshness rule | Bundle must include manifest, generated-at time, ContentBase commit, and DataBase contract version. |
| Forbidden use | Evidence bundles must not contain secrets, cookies, private provider keys, or unpublished private runtime data. |
| Promotion path | Public evidence is copied/projected into MyBlog only after privacy and publication review. Durable facts enter DataBase first. |

## MyBlog Artifact Contracts

### Public Content Bundle

| Field | Value |
| --- | --- |
| Owner | DataBase for domain meaning; MyBlog for rendering bundle layout |
| Producer | DataBase projection/export or approved public bundle generator |
| Consumers | MyBlog public shell |
| Canonical path | planned `public-content-bundle/` |
| Format | Directory tree with manifest and public content JSON/Markdown assets |
| Freshness rule | Bundle manifest must declare DataBase projection schema version and generated-at time. |
| Forbidden use | MyBlog must not treat bundle layout as durable domain schema. |
| Promotion path | Rendering needs that require domain changes go back to DataBase projection schema. |

### Generated MDX

| Field | Value |
| --- | --- |
| Owner | MyBlog for presentation; DataBase or authoring source for content meaning |
| Producer | Public projection or authoring pipeline |
| Consumers | MyBlog Astro site |
| Canonical path | planned `generated-mdx/` or existing MyBlog content projection path |
| Format | MDX/Markdown files with manifest |
| Freshness rule | Manifest must identify source content version and generation command. |
| Forbidden use | Generated MDX must not become the only durable content truth if source content belongs to DataBase or authoring vault. |
| Promotion path | Edits discovered in generated MDX return to the owning source, then regenerate MDX. |

### Evidence Library

| Field | Value |
| --- | --- |
| Owner | MyBlog for public presentation; ContentBase/DataBase for source evidence meaning |
| Producer | Approved public evidence publishing path |
| Consumers | MyBlog readers and search/index tooling |
| Canonical path | `public-data/evidence-library` or MyBlog's active evidence-library path |
| Format | Directory tree with public files and manifest |
| Freshness rule | Manifest must declare source, publication approval, and generated-at time. |
| Forbidden use | Do not publish private audit evidence, cookies, provider data, or unpublished runtime traces. |
| Promotion path | Public evidence references may be indexed by MyBlog; durable factual claims belong in DataBase. |

### Search Index

| Field | Value |
| --- | --- |
| Owner | MyBlog |
| Producer | MyBlog build/indexing command |
| Consumers | MyBlog public search UI |
| Canonical path | `search-index/` or the active MyBlog index output path |
| Format | Static index files |
| Freshness rule | Rebuild after public content bundle, generated MDX, or public evidence changes. |
| Forbidden use | Search index must not become content truth or private metadata storage. |
| Promotion path | Search quality signals may inform DataBase metadata only through explicit review/ingestion. |

### Runtime Content Index

| Field | Value |
| --- | --- |
| Owner | MyBlog |
| Producer | MyBlog runtime content projector |
| Consumers | MyBlog reader/home/search projection |
| Canonical path | `runtime/content-index.json` in the active MyBlog runtime output root |
| Format | JSON |
| Freshness rule | Must identify source mirror/version and generated-at time where supported. |
| Forbidden use | Runtime index is a projection, not source content, workflow state, or database authority. |
| Promotion path | Missing or corrected source facts go back to the owning source, then regenerate the index. |

### Static Dist

| Field | Value |
| --- | --- |
| Owner | MyBlog |
| Producer | MyBlog build command |
| Consumers | Nginx/static hosting and public readers |
| Canonical path | `apps/web/dist/` before deploy; production root `/srv/myblog/site` |
| Format | Static web files |
| Freshness rule | Built from the deploy-authoritative workspace after workspace and build checks pass. |
| Forbidden use | Static dist must not be edited as source truth. |
| Promotion path | Fixes go to MyBlog source, then rebuild and redeploy. |

## Promotion Rules

Workflow or projection artifacts do not automatically become durable truth.

Use this path:

```text
runtime artifact
  -> review or validation
  -> DataBase ingestion/write contract
  -> DataBase durable truth
  -> regenerated projection/client/bundle
```

Forbidden path:

```text
runtime artifact
  -> copied into consumer repo
  -> treated as schema/domain truth
```

## Freshness Rules

A cross-repo artifact is current enough only when its consumer can identify:

- source repository and commit or version
- generated-at time when generated
- schema or contract version when schema-backed
- producer command or runtime when relevant
- target DataBase Gateway/client version when DataBase-backed

If a consumer cannot prove freshness for a high-impact operation, it should stop
and request a regenerated artifact instead of guessing.

## Forbidden Crossings

- ContentBase must not create durable domain schema because a DataBase artifact
  is missing a field.
- MyBlog must not fetch ContentBase private workflow APIs for public rendering.
- MyBlog must not read raw DataBase tables or infer private schema from public
  bundles.
- DataBase must not depend on ContentBase implementation modules or MyBlog UI
  components.
- Generated artifacts must not be hand-edited as if they were source truth.
- Catalog artifacts must not become runtime config for deployed services.

## Adding A New Artifact

Before adding a cross-repo artifact, update this document with:

1. artifact name and class
2. owner
3. producer
4. consumers
5. canonical path
6. format
7. freshness rule
8. forbidden use
9. promotion path

Then update only the owning repository's implementation or docs needed for that
artifact. Do not create matching placeholder files in all three repositories.

```


---

## docs\contracts\cross-repo-artifact-inventory.md

```md
---
title: Cross-Repo Artifact Inventory
status: canonical
owner: DataBase
---

# Cross-Repo Artifact Inventory

This document is the current-state inventory for the artifact grammar defined in
`docs/contracts/cross-repo-artifact-contracts.md`.

It is a projection of reality, not a new rule system. Use it to see which
DataBase / ContentBase / MyBlog artifacts already exist, which are partial, and
which are still planned.

Status values:

| Status | Meaning |
| --- | --- |
| `implemented` | Artifact exists on the canonical branch/path and has a usable producer/consumer story. |
| `partial` | Artifact or producer exists, but path, schema, freshness, or consumer contract is incomplete. |
| `planned` | Artifact is named in the contract but not implemented at the canonical path. |
| `blocked` | Artifact cannot safely be implemented until an ownership or source-truth problem is resolved. |
| `deprecated` | Artifact exists but should not be used as the forward path. |

## Snapshot

Inventory date: 2026-05-13.

Evidence surfaces checked:

- DataBase clean worktree at `origin/main` commit `c74891b`.
- ContentBase Windows checkout on `refactor/codex/canonical-database-consumer` after commit `7903afc8`.
- MyBlog production workspace at `server-124:/srv/myblog/repo`.

The ContentBase and MyBlog worktrees both contain unrelated dirty work. This
inventory only records artifact existence and boundary risk; it does not claim
those worktrees are otherwise clean.

## DataBase Artifacts

| Artifact | Status | Evidence | Gap / risk | Next action |
| --- | --- | --- | --- | --- |
| Gateway OpenAPI | `implemented` | `gateway/openapi.yaml` exists on DataBase `origin/main`. | Freshness still depends on route/build discipline; consumers must match deployed Gateway version. | Keep OpenAPI as the access contract and require generated clients to declare source version. |
| Generated DataBase client | `planned` on `origin/main`; active work exists elsewhere | `generated/` is absent on clean `origin/main`; DataBase main worktree currently has untracked `generated/` and generator files. | Generated client is not yet a stable committed artifact on the canonical branch. ContentBase use may outrun DataBase publication. | Promote generated client through a dedicated DataBase commit after source/schema review. |
| Content schema contracts | `planned` on `origin/main`; active work exists elsewhere | `schemas/content/` is absent on clean `origin/main`; DataBase main worktree currently has untracked `schemas/content/`. | Consumer code can start depending on schema paths that are not yet canonical. | Land content schemas with owner/version/freshness fields before expanding consumers. |
| Creative schema/contracts | `partial` | `schemas/creative/` and `creative-contracts/` are absent on clean `origin/main`; ContentBase runtime capability docs reference `@emptyinkpot/database-creative-contracts:runCreativeRules`. | ContentBase already names a DataBase creative contract package, but the DataBase canonical artifact path is not fully committed on `origin/main`. | Decide whether the canonical artifact is a schema path, package, Gateway route, or all three; then publish it from DataBase. |
| Semantic graph snapshot | `planned` | `semantic-graph.snapshot.json` and `schemas/semantic/` are absent on clean `origin/main`; DataBase main worktree currently has untracked `schemas/semantic/`. | No stable snapshot/version contract for ContentBase context hydration or MyBlog knowledge projection. | Define snapshot schema and freshness fields before first consumer dependency. |
| Public projection schema | `planned` | `public-projection.schema.json` is absent on clean `origin/main`. | MyBlog can consume runtime/public data without a DataBase-owned projection schema. | Create schema before standardizing public content bundles. |
| Canonical Content Graph | `partial` | `docs/contracts/canonical-content-graph.md`, `schemas/document/canonical-content-graph.schema.json`, and `examples/document/minimal-content-graph.json` define the first graph-level boundary. | No graph storage, importer, projection engine, anchor resolver, or reader runtime exists yet. | Use CCG as the parent model before extending CDM or adding projection pipelines. |
| Raw artifact store contract | `partial` | `docs/contracts/raw-artifact-store-contract.md`, `schemas/document/raw-artifact.schema.json`, and `examples/document/minimal-raw-artifact.json` define immutable content-addressed source artifact records. | No OpenList storage layout implementation, registry table, dedupe command, retention review, or GC workflow exists yet. | Implement raw artifact registry before import workers move or archive files. |
| Reader runtime/projection package contract | `partial` | `docs/contracts/reader-runtime-projection-contract.md`, `schemas/document/projection-package.schema.json`, `schemas/document/reader-runtime-state.schema.json`, and examples define graph-versioned projection packages and reader state. | No projection engine, MyBlog consumer, reader UI, pagination engine, or search package builder exists yet. | Implement projection package builder before replacing MyBlog content roots or adding reader comments/highlights. |
| Public surface edit intake contract | `partial` | `docs/contracts/public-surface-edit-intake-contract.md`, `schemas/document/public-edit-intake.schema.json`, and `examples/document/minimal-public-edit-intake.json` define MyBlog write intake for comments, highlights, moderation, and edit proposals. | No MyBlog UI, auth boundary, intake processor, spam/moderation store, or graph edit promotion workflow exists yet. | Implement intake API/queue before enabling MyBlog-side edits or comments against public projection packages. |
| Graph versioning/edit contract | `partial` | `docs/contracts/graph-versioning-edit-contract.md`, `schemas/document/graph-edit-operation.schema.json`, `schemas/document/graph-version-manifest.schema.json`, and examples define versioned graph edits. | No graph storage, editor, merge/conflict handling, or projection rebuild trigger exists yet. | Implement before allowing AST edits, illustration insertion, or correction promotion in runtime. |
| Asset graph contract | `partial` | `docs/contracts/asset-graph-contract.md`, `schemas/document/asset-graph.schema.json`, and `examples/document/minimal-asset-graph.json` define media/asset node relationships. | No asset registry, image processing, OpenList storage integration, or projection derivative policy implementation exists yet. | Implement asset registry before adding illustration workflows. |
| Anchor/location contract | `partial` | `docs/contracts/anchor-location-contract.md`, `schemas/document/anchor-location.schema.json`, and `examples/document/minimal-anchor-location.json` define stable anchors and runtime locations. | No anchor resolver, projection location map producer, reader runtime, or pagination engine exists yet. | Implement anchors before comments/highlights/pagination. |
| Annotation graph contract | `partial` | `docs/contracts/annotation-graph-contract.md`, `schemas/document/annotation-graph.schema.json`, and `examples/document/minimal-annotation-graph.json` define annotation overlays. | No reader/editor UI, comments database, anchor resolver, or public/private projection policy implementation exists yet. | Add only after anchor/node identity is stable enough for reader runtime. |
| Content ingestion constitution | `partial` | `docs/contracts/content-ingestion-constitution.md`, `schemas/document/content-import-manifest.schema.json`, and `examples/document/minimal-content-import-manifest.json` define the no-silent-loss import boundary. | No import workers, raw artifact store, normalizer, or review workflow exists yet. | Implement format workers only after raw artifact preservation and loss report storage are chosen. |
| EPUB ingestion contract | `partial` | `docs/contracts/epub-ingestion-contract.md`, `schemas/document/epub-ingestion-manifest.schema.json`, and `examples/document/minimal-epub-ingestion-manifest.json` define the import boundary. | No importer command, Pandoc/HAST transform, asset extraction, or CDM/CCG persistence exists yet. | Build importer only after choosing parser route and output manifest location. |
| Canonical Document Model | `partial` | `docs/contracts/canonical-document-model.md`, `schemas/document/canonical-document.schema.json`, and `examples/document/minimal-cdm-document.json` define the first machine-readable boundary. | No storage tables, importer, projection engine, or projection manifest producer exists yet; Markdown/content roots still act as practical source formats in current repos. | Implement importer/projection manifest strategy before EPUB/PDF/MDX/Fanqie pipelines. |
| Ecosystem catalog | `implemented` | `ECOSYSTEM_MAP.md`, `catalog-info.yaml`, `catalog/`, and `ecosystem/` exist. | Catalog is topology metadata only; it must not become runtime config. | Keep as navigation and ownership source; update when repo identity or dependency changes. |

## ContentBase Artifacts

| Artifact | Status | Evidence | Gap / risk | Next action |
| --- | --- | --- | --- | --- |
| Runtime capability metadata | `implemented` | `product/novel/app/runtime-capabilities.ts` exists. | It lives on a feature branch with broader runtime work; branch delivery must remain scoped. | Keep executable metadata as source; do not duplicate in docs by hand. |
| Runtime capability documentation projection | `implemented` | `docs/api/generated/runtime-capabilities.md` exists and says it is generated from `product/novel/app/runtime-capabilities.ts`. | Generated doc is currently in an untracked/dirty area in the local checkout; verify branch publication before relying on it from DataBase. | Ensure generated projection and source metadata land together. |
| Runtime capability OpenAPI projection | `partial` | `runtime-capabilities.md` links `contentbase-runtime.openapi.json`, but inventory did not verify that file as canonical. | Link may drift from generated file availability. | Verify or generate the machine-readable projection in the same delivery as capability docs. |
| Workflow capability report | `planned` | `workflow-capabilities.json` not found at repo root. | No machine-readable report summarizing executable workflow graph/capabilities. | Add only after executable workflow metadata has a source owner. |
| Quality report | `planned` | `quality-report.json` not found. | Quality outcomes may remain internal runtime responses without reusable evidence artifact. | Define per-run output path and manifest fields before publishing outside ContentBase. |
| Repair trace | `planned` | `repair-trace.json` not found. | Repair results could be confused with DataBase durable truth if exported informally. | Define trace schema and promotion path before cross-repo consumption. |
| Publish manifest | `planned` | `publish-manifest.json` not found. | Publication truth can drift between browser action, ContentBase runtime, and DataBase platform binding. | Make confirmed/unconfirmed status explicit in a manifest before MyBlog consumes publish output. |
| Audit evidence bundle | `planned` | `audit-evidence/` not found. | Evidence may be scattered across logs/screenshots without privacy/publication review. | Create bundle manifest first; only public-approved artifacts can flow to MyBlog. |

## MyBlog Artifacts

| Artifact | Status | Evidence | Gap / risk | Next action |
| --- | --- | --- | --- | --- |
| Public content bundle | `planned` | `public-content-bundle/` not found. | MyBlog has content/runtime sources, but no named cross-repo public bundle boundary. | Define bundle manifest after DataBase public projection schema exists. |
| Generated MDX | `planned` | `generated-mdx/` not found. Existing content roots include `apps/web/src/content/notes`, `apps/web/src/content/projects`, and `apps/web/src/content/pages`. | Existing content roots are presentation/source paths, not a cross-repo generated artifact contract. | Do not rename existing roots yet; first define whether generated MDX is needed. |
| Evidence library | `implemented` | `public-data/evidence-library` exists. | Public approval/freshness manifest was not verified in this inventory. | Add or verify manifest fields before accepting ContentBase audit evidence. |
| Search index | `planned` or build-output-local | `search-index/` not found at repo root. | Search output may exist under build output or Pagefind paths, but it is not named as a stable cross-repo artifact. | Identify actual search index output path and document it before external producers depend on it. |
| Runtime content index | `implemented` | `public-data/runtime/content-index.json` exists and is large. | It is a projection; source version/freshness fields were not verified. | Add/verify generated-at and source mirror/version fields where possible. |
| Public edit intake output | `planned` | No MyBlog intake artifact/API path verified yet. | MyBlog can become a shadow editor if comments, highlights, or corrections are stored only in presentation code or ad-hoc JSON. | Implement only as structured `public-edit-intake` records that reference DataBase graph versions and projection package ids. |
| Static dist | `implemented` | `apps/web/dist/` exists. | Dist is deploy artifact, not source truth. Current MyBlog workspace has unrelated dirty docs/contracts. | Continue treating dist as output only; fixes go through source/build/deploy. |

## Highest-Risk Gaps

1. **Generated DataBase client is not yet cleanly canonical on `origin/main`.**
   ContentBase is already converging on generated/Gateway consumption. The
   client publication path should be stabilized before more workflow code depends
   on new generated contracts.

2. **Creative contract path is semantically referenced before it is fully
   visible as a DataBase artifact.** ContentBase capability metadata names
   `@emptyinkpot/database-creative-contracts:runCreativeRules`; DataBase should
   make the canonical creative contract artifact explicit.

3. **MyBlog has real projection artifacts but no DataBase-owned public
   projection schema.** `public-data/runtime/content-index.json` and evidence
   library exist, but the cross-repo contract for public bundle shape is still
   planned.

4. **MyBlog-side writes need intake before UI implementation.** Comments,
   highlights, owner edits, and illustration changes should not be stored as
   ad-hoc presentation files or direct DataBase writes.

5. **Workflow evidence artifacts are planned, not implemented.** Quality report,
   repair trace, publish manifest, and audit evidence are the next likely source
   of drift if ad-hoc JSON/log/screenshot exports start crossing repos.

6. **Freshness metadata is inconsistent.** Existing artifacts may work, but many
   do not yet declare source commit, generated-at time, schema version, or
   DataBase Gateway/client version in a standard way.

7. **Canonical document truth is still format-bound in practice.** Markdown,
   runtime JSON, MDX/content roots, EPUB/PDF/Fanqie outputs, and search indexes
   are still practical formats rather than projections from a DataBase-owned
   Document AST. CDM schema and projection manifests are the next publishing
   boundary to define before adding EPUB/PDF workflows.


## Recommended Convergence Order

1. **DataBase generated client publication**
   - Land generated client path or package on DataBase `origin/main`.
   - Declare source OpenAPI version and regeneration command.
   - Make ContentBase consume only that published contract.

2. **DataBase creative contract artifact**
   - Decide canonical path/package/route for `database-creative-contracts`.
   - Publish schema/version/freshness fields.
   - Align ContentBase runtime capability references with that canonical owner.

3. **DataBase public projection schema**
   - Define the shape MyBlog can consume.
   - Add freshness/version fields before standardizing public content bundles.

4. **MyBlog runtime content index freshness**
   - Verify or add generated-at/source/version metadata.
   - Keep it as projection only.

5. **MyBlog public edit intake**
   - Add an intake API/queue/artifact that emits `public-edit-intake.v1`.
   - Route comments/highlights to Annotation Graph and edits to reviewed Graph
     Edit Operations.

6. **ContentBase workflow evidence bundle family**
   - Start with `publish-manifest.json`, because publication truth is the most
     likely cross-repo ambiguity.
   - Then add `quality-report.json`, `repair-trace.json`, and `audit-evidence/`
     only as produced artifacts with manifests.

## Non-Goals

- Do not add ContractGuard gates for these gaps yet.
- Do not create placeholder files in ContentBase or MyBlog just to satisfy this
  inventory.
- Do not move DataBase-generated artifacts into consumer repositories as manual
  truth.
- Do not treat MyBlog dist/runtime output as source.

```


---

## docs\contracts\environment-branch-runbook.md

```md
# Environment Branch Runbook

This runbook explains how to use the three-branch debugging contract.

## Branches

```text
main        integration truth
local       local Windows debug lane
remote-ide  remote IDE debug lane
```

## Local Debug

```powershell
git fetch origin
git switch local
git merge --ff-only origin/main
```

Use this lane for Windows-only reproduction, local browser/CDP behavior, local
filesystem issues, and machine-specific Codex or MCP problems.

When a local fix becomes durable, create a normal task branch from `main` and
cherry-pick or reapply the scoped patch there.

## Remote IDE Debug

```bash
git fetch origin
git switch remote-ide
git merge --ff-only origin/main
```

Use this lane for server-like dependency versions, code-server behavior,
Linux-only paths, remote services, and deployment-adjacent reproduction.

When a remote IDE fix becomes durable, create a normal task branch from `main`
and promote the scoped patch there.

## Promotion

```text
local or remote-ide
  -> task branch from main
  -> checks
  -> main
```

Do not merge environment branches wholesale into `main`. Promote only the
intentional patch. Environment-only logs, temporary probes, debug flags, and
machine paths must be removed before promotion.

## First Rollout Repositories

- `https://github.com/emptyinkpot/DataBase`
- `https://github.com/emptyinkpot/Atramenti-Console`

Both repositories now have:

```text
main
local
remote-ide
```

```


---

## docs\contracts\epub-ingestion-contract.md

```md
---
title: EPUB Ingestion Contract
status: canonical
owner: DataBase
---

# EPUB Ingestion Contract

This document defines how EPUB enters the DataBase-owned Canonical Content Graph
(CCG) and Canonical Document Model (CDM). It specializes the broader `docs/contracts/content-ingestion-constitution.md`.

The goal is not to store EPUB as document truth. EPUB is an import source
artifact. The canonical target is structured content:

```text
EPUB
  -> EPUB importer
  -> Pandoc AST or XHTML/HAST intermediate AST
  -> Canonical Document Model
  -> Canonical Content Graph
  -> projection artifacts
```

Do not use this path:

```text
EPUB -> Markdown -> parse Markdown -> canonical truth
```

Markdown is an import/export format and loses too much structure when used as an
intermediate truth layer.

## EPUB Is Already Structured

EPUB is a package, usually a zip archive containing:

```text
META-INF/container.xml
content.opf
nav.xhtml or toc.ncx
chapter XHTML files
images/
css/
fonts/
metadata
```

Important EPUB structures:

| EPUB structure | Canonical target |
| --- | --- |
| OPF metadata | Document metadata and sourceLineage. |
| OPF manifest | Import source artifact inventory. |
| OPF spine | Reading order / ordered Section source order. |
| nav.xhtml or toc.ncx | Section tree candidate. |
| XHTML headings | Section nodes or section labels. |
| XHTML paragraphs/lists/quotes/images/tables | Block nodes. |
| XHTML inline tags/links | InlineSpan nodes and references. |
| Footnotes/endnotes | Citation/evidence/reference graph nodes. |
| Internal anchors | Anchor nodes and located_by edges. |
| Images/media | Evidence/entity/media references. |

## Import Pipeline

Required conceptual stages:

```text
1. Identify EPUB package
2. Read container.xml
3. Read OPF package document
4. Extract metadata, manifest, and spine
5. Read nav.xhtml or toc.ncx
6. Read spine XHTML in order
7. Convert XHTML DOM to intermediate AST
8. Normalize intermediate AST to CDM section tree
9. Emit CCG nodes and edges
10. Emit ingestion manifest
```

The importer may use either or both mature AST routes:

| Route | Use |
| --- | --- |
| Pandoc | EPUB -> Pandoc JSON AST; strong multi-format bridge. |
| unified/rehype/HAST | XHTML DOM -> HAST -> normalized AST; strong HTML transform pipeline. |

The importer must not use regex over EPUB files as the canonical parse method.

## Section Tree Recovery

EPUB TOC is a structure source, not a display-only sidebar.

Preferred section recovery order:

1. `nav.xhtml` TOC tree.
2. `toc.ncx` navMap tree.
3. OPF spine order plus XHTML heading hierarchy.
4. Last-resort generated sections from spine documents.

The resulting canonical structure must be:

```text
Document
  -> Section
    -> Section
      -> Block
```

TOC projection later comes from the Section tree. It is not copied as a second
manual TOC truth.

## Block Normalization

Common XHTML/Pandoc/HAST structures map to CDM blocks:

| Source | CDM block |
| --- | --- |
| `p` / Pandoc `Para` | `paragraph` |
| `blockquote` / Pandoc `BlockQuote` | `quote` |
| heading / Pandoc `Header` | `section` candidate, not paragraph text |
| `pre code` / Pandoc `CodeBlock` | `code` |
| `img` / Pandoc `Image` | `image` |
| `table` / Pandoc `Table` | `table` |
| thematic break / scene divider | `scene_break` |
| note/aside landmarks | `aside` or `footnote` |

Dialogue, narration, evidence, claim, argument, and reflection may require
semantic enrichment after structural import. Do not guess these with brittle
regex during the base import.

## Anchor Model

EPUB is reflowable. It does not provide stable canonical page numbers.

The importer should create anchors from stable source locations:

```yaml
Anchor:
  sourceHref:
  sourceFragment:
  cfi:
  targetNodeId:
  offset:
```

Reader page numbers, progress bars, scroll offsets, and device locations are
runtime layout projections from anchors.

## Ingestion Manifest

Each EPUB import must produce an ingestion manifest.

Required shape is defined at:

```text
schemas/document/epub-ingestion-manifest.schema.json
```

The manifest records:

- input EPUB artifact identity
- importer and version
- parser route used
- OPF path
- nav/toc path
- spine item count
- generated Document id
- generated graph id/version
- warnings and losses
- output artifacts

Warnings are important. EPUBs vary widely, and an honest importer must record
structure loss, unsupported nodes, missing TOC, broken anchors, or media issues.

## Promotion Rule

EPUB content becomes durable only after conversion into CDM/CCG:

```text
EPUB artifact
  -> ingestion manifest
  -> CDM Document/Section/Block tree
  -> CCG nodes and edges
  -> DataBase durable truth
```

Forbidden promotion:

```text
EPUB artifact
  -> Markdown conversion
  -> treated as canonical truth
```

## Cross-Repo Roles

| Repository | Role |
| --- | --- |
| DataBase | Owns EPUB ingestion contract, CDM/CCG target schema, ingestion manifests, and durable graph truth. |
| ContentBase | May request/import EPUBs as workflow input and may enrich imported blocks, but cannot own imported document truth. |
| MyBlog | May render public projection packages derived from imported EPUBs, but must not read EPUB files as public content truth. |

## Non-Goals

- Do not implement the importer in this document.
- Do not pick only one parser library yet.
- Do not store EPUB files as canonical document truth.
- Do not convert EPUB to Markdown as the canonical path.
- Do not infer final page numbers during import.

```


---

## docs\contracts\evidence-contract.md

```md
# Evidence Contract

This document defines the canonical evidence contract for grounded writing.

It exists to prevent RAGFlow, Dify, ContentBase, and future writing tools from
creating parallel evidence systems.

## Purpose

Grounded writing needs more than retrieved text. It needs durable evidence
identity, query traces, citation usage, and final artifact linkage.

The canonical chain is:

```text
source material
-> indexed chunk
-> retrieval query run
-> selected citation
-> writing artifact
-> quality verification
```

DataBase owns this chain as durable contract state.

## Ownership

### DataBase Owns

- source identity
- source metadata
- evidence chunk identity
- retrieval query run records
- selected citation records
- evidence pack shape
- generated artifact to citation linkage
- quality and citation verification result

### RAGFlow Owns

- document parsing
- OCR and layout extraction
- internal chunking mechanics
- vector/BM25/hybrid retrieval implementation
- reranking implementation
- internal index lifecycle

### Dify Owns

- workflow orchestration
- prompt step ordering
- model selection inside approved execution contracts
- intermediate workflow variables

### ContentBase Owns

- product-facing generation API
- writing task execution
- quality checks
- final writeback into DataBase
- publish candidate creation

ContentBase consumes the evidence contract. It must not create a second evidence
schema as product truth.

## Canonical Objects

### EvidenceSource

Represents a durable source material.

Required fields:

```ts
type EvidenceSource = {
  id: string;
  title: string;
  sourceType: "book" | "article" | "paper" | "note" | "web" | "archive" | "image" | "audio" | "video" | string;
  origin: string;
  author?: string;
  publishedAt?: string;
  language?: string;
  storageRef?: string;
  externalRefs: EvidenceExternalRef[];
  trustLevel: "primary" | "secondary" | "tertiary" | "personal_note" | "unknown";
  createdAt: string;
  updatedAt: string;
};
```

`origin` is the human-readable origin. `storageRef` points to the local or remote
file record when DataBase controls the storage metadata.

### EvidenceExternalRef

Represents an external system mapping.

Required fields:

```ts
type EvidenceExternalRef = {
  system: "ragflow" | "openlist" | "qmd" | "url" | "manual" | string;
  externalId: string;
  url?: string;
  metadata?: Record<string, unknown>;
};
```

Rules:

- RAGFlow document ids belong here.
- URLs belong here.
- OpenList or file gateway ids belong here.
- External refs are mappings, not source truth.

### EvidenceChunk

Represents a stable chunk that may be cited.

Required fields:

```ts
type EvidenceChunk = {
  id: string;
  sourceId: string;
  text: string;
  location: EvidenceLocation;
  chunkHash: string;
  externalRefs: EvidenceExternalRef[];
  createdAt: string;
};
```

`chunkHash` protects against silent source drift.

### EvidenceLocation

Represents where a chunk came from.

Required fields:

```ts
type EvidenceLocation = {
  page?: number;
  chapter?: string;
  section?: string;
  startOffset?: number;
  endOffset?: number;
  locatorText?: string;
};
```

If a precise page or offset is unavailable, `locatorText` must describe the
location enough for later review.

### EvidenceQueryRun

Represents one retrieval request.

Required fields:

```ts
type EvidenceQueryRun = {
  id: string;
  query: string;
  taskType: "fiction_chapter" | "historical_short_video" | "current_affairs_commentary" | "business_copywriting" | string;
  requester: "contentbase" | "dify" | "manual" | string;
  retrievalProvider: "ragflow" | "qmd" | "manual" | string;
  retrievalMode: "vector" | "bm25" | "hybrid" | "graph" | "manual" | string;
  filters: Record<string, unknown>;
  resultCount: number;
  createdAt: string;
};
```

The query run records what was asked and which retrieval provider answered.

### EvidenceCitation

Represents a selected evidence item used by a writing artifact.

Required fields:

```ts
type EvidenceCitation = {
  id: string;
  queryRunId: string;
  sourceId: string;
  chunkId: string;
  title: string;
  excerpt: string;
  reason: string;
  claimRole: "fact" | "context" | "contrast" | "terminology" | "image_concept_entry" | "style_reference" | string;
  confidence: number;
};
```

Rules:

- `excerpt` must be short enough to avoid turning the database into a copied
  source archive.
- `reason` explains why the citation was selected.
- `claimRole` explains how the citation supports the generated text.

### EvidencePack

This is the object passed into generation.

Required fields:

```ts
type EvidencePack = {
  queryRunId: string;
  query: string;
  taskType: string;
  citations: EvidenceCitation[];
  constraints: EvidenceConstraint[];
};
```

### EvidenceConstraint

Represents a source-backed constraint for generation.

Required fields:

```ts
type EvidenceConstraint = {
  id: string;
  rule: string;
  sourceCitationIds: string[];
  severity: "info" | "warn" | "block";
};
```

Example:

```json
{
  "id": "do_not_invent_dates",
  "rule": "Do not invent exact dates not present in the evidence pack.",
  "sourceCitationIds": ["citation_001"],
  "severity": "block"
}
```

## Writing Integration

The canonical generation input is:

```text
WritingContext
```

It contains:

```text
content context
author contract
evidence pack
target platform constraints
model execution request
```

The author contract decides style. The evidence pack decides grounded claims.
They are separate and must not be merged into one prompt blob as product truth.

## Conceptual Entry Use

For `Image-Concept Entry / 意象-概念入口`, evidence should support the chosen
entry symbol.

Good evidence roles:

- terminology
- image_concept_entry
- historical context
- contrast

Example:

```text
Query:
  "China 支那 契丹 南越 名称变化 文明身份"

Evidence roles:
  terminology -> explains name usage
  contrast -> shows competing external names
  image_concept_entry -> supports the opening symbol
```

The generator may then open from the term or name. It must not claim unsupported
etymology, chronology, or motive.

## RAGFlow Placement

RAGFlow integration should be represented as an evidence provider:

```text
EvidenceProvider.search(query, filters) -> EvidencePackDraft
```

The provider may return RAGFlow document ids and chunk ids, but DataBase stores
the durable mapping and selected usage.

Do not allow this:

```text
RAGFlow result -> final prompt -> generated text
```

Use this:

```text
RAGFlow result
-> DataBase evidence mapping
-> EvidencePack
-> ContentBase generation
-> DataBase artifact writeback
```

## Dify Placement

Dify may orchestrate:

```text
topic analysis
retrieval request
evidence compression
conceptual entrance planning
draft generation
revision
```

But Dify must receive DataBase contracts and return structured results. It must
not become the only place where workflow state, citation usage, or author rules
exist.

## Minimal Table Direction

Future migrations should converge toward these table concepts:

```text
evidence_sources
evidence_external_refs
evidence_chunks
evidence_query_runs
evidence_citations
writing_artifact_citations
```

This document does not create those tables by itself. It defines the contract
they must satisfy when implemented.

## Gateway Direction

Future Gateway endpoints should be narrow and contract-shaped:

```text
GET  /evidence/sources
POST /evidence/query-runs
POST /evidence/citations
GET  /evidence/packs/:id
```

Write endpoints must use idempotency keys. Read endpoints must not expose secret
or credential material.

## Quality Rules

Grounded writing must enforce these rules:

- factual claims must map to evidence citations when the task is historical,
  political, technical, or current-affairs related
- unsupported dates, names, figures, and quotes must block publication
- citation snippets must remain excerpts, not copied source bodies
- source trust level must be visible to the generation pipeline
- evidence cannot override the author contract
- author style cannot override evidence facts

## Forbidden Structures

Do not create:

- `ragflow_cache` as product truth
- local ContentBase citation tables that duplicate DataBase ownership
- Dify-only workflow memory for citation usage
- prompt-only citation strings without durable citation ids
- generated text that embeds fake citations
- provider-specific evidence objects as the public contract

## Verification

Before claiming evidence integration is active, prove:

```text
source exists in DataBase
external provider mapping exists
query run is recorded
selected citations are recorded
EvidencePack is passed into generation
generated artifact records citation usage
quality check can inspect the citation links
```

Build success is not evidence integration proof.

```


---

## docs\contracts\git-workflow.md

```md
# Git Workflow Contract

This repository uses GitHub Flow plus two environment debug branches.

## Stable Branches

```text
main        stable integration and release truth
local       local Windows debugging lane
remote-ide  remote IDE / code-server debugging lane
```

`main` is the only durable integration branch. `local` and `remote-ide` are
allowed to diverge for debugging, but their changes are not product truth until
promoted through a task branch or pull request.

## Task Branches

Use short-lived task branches for durable work:

```text
agent/<agent-id>/<task-slug>
fix/<agent-id>/<task-slug>
docs/<agent-id>/<task-slug>
refactor/<agent-id>/<task-slug>
```

## Pull Before Push

Before pushing any durable change:

```powershell
git fetch origin --prune
git switch main
git pull --ff-only origin main
```

Before working in an environment branch:

```powershell
git fetch origin --prune
git switch local
git merge --ff-only origin/main
```

or:

```powershell
git fetch origin --prune
git switch remote-ide
git merge --ff-only origin/main
```

## Promotion Rule

Do not merge `local` or `remote-ide` wholesale into `main`.

Promote only the intentional patch:

```text
local / remote-ide
  -> task branch from origin/main
  -> checks
  -> pull request or scoped direct merge
  -> main
```

Environment-only logging, debug probes, machine paths, and temporary config must
be removed before promotion.

## Commit Style

Prefer Conventional Commits:

```text
feat:
fix:
docs:
refactor:
chore:
test:
ci:
perf:
```

For repository governance, use:

```text
docs:
chore:
ci:
```

## Branch Protection Target

Protect `main` in GitHub:

- require pull request review for non-trivial changes
- require status checks to pass
- require branches to be up to date before merge
- block force pushes
- block branch deletion

`local` and `remote-ide` should also block force pushes unless an operator is
intentionally resetting the environment lane.

```


---

## docs\contracts\graph-versioning-edit-contract.md

```md
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

```


---

## docs\contracts\mcp-security-policy.md

```md
# MCP Security Policy

MCP servers are capability surfaces. Treat them as privileged integration code,
not as harmless plugins.

## Source Of Truth

- MCP registration for Codex lives in `C:\Users\ASUS-KL\.codex\config.toml`.
- cc-switch may manage and sync MCP entries, but it must not become a second
  hidden truth for server paths.
- DataBase records topology, policy, and ownership; it must not store raw
  secrets or copied browser credentials.

## Allowed MCP Classes

Prefer mature, narrow tools:

```text
filesystem     restricted paths only
git/github     repository status, PR, Actions, scoped delivery
database       readonly or API-mediated access
browser/fetch  page reading and verification
workspace      repository and environment inspection
quality        contract, lint, and policy gates
```

## Required Controls

- Use allowlisted roots for filesystem and repository tools.
- Prefer readonly database credentials.
- Route database writes through a reviewed HTTP API or explicit mutation
  endpoint, not arbitrary SQL tools.
- Keep secrets in registered secret surfaces, never in MCP config text.
- Do not give third-party MCPs broad filesystem write access.
- Do not register a server whose command path points at a retired checkout,
  backup directory, cache directory, or unverified clone.
- Remove or disable MCPs that duplicate a more canonical tool unless the
  duplicate has a documented compatibility reason.

## Browser Automation

Prefer official browser control routes:

```text
Chromium/Edge remote debugging port
Playwright connectOverCDP
browser-use or equivalent agent wrapper
```

Do not build cookie extraction, SQLite cookie reads, or DPAPI decryption paths
as the normal automation route.

## Review Checklist

Before adding or enabling an MCP:

- What exact task does it enable?
- What paths, network endpoints, or credentials can it touch?
- Is the command path under a canonical root?
- Is there a narrower existing MCP that already covers the need?
- Does it need to be enabled for Codex, Claude, Gemini, OpenCode, Hermes, or
  only one app?
- Can it be disabled without breaking the repository contract?

```


---

## docs\contracts\project-contract-pipeline.md

```md
# Project Contract Pipeline

This repository should enforce project rules through a single validation and
projection pipeline.

## Why This Exists

Manual discipline is not a durable contract. The same checks should run on
every change.

## Pipeline Order

1. validate `project.json` against schema
2. check project standard
3. export Backstage entity
4. export Backstage catalog
5. sync MySQL project directory

## Mature Reference Pattern

This matches the common pattern used by catalog and portal systems:

- a canonical manifest
- generated projections
- CI validation before merge
- a central catalog for discovery

## Rule

If a change breaks any projection or the manifest schema, it must fail before
merge.


```


---

## docs\contracts\project-creation-standard.md

```md
# Project Creation Standard

This standard defines how new projects should be created in the operator
ecosystem.

## Machine-Readable Identity

```json
{
  "schemaVersion": 1,
  "name": "project-creation-standard",
  "purpose": "Define the minimum contract for creating reusable projects in the operator ecosystem.",
  "scaffoldType": "script",
  "status": "active",
  "scaffoldCommand": ".\\scripts\\init-project.ps1 -Name MyProject -Root \"E:\\My Project\\MyProject\"",
  "validationCommand": ".\\scripts\\check-project-standard.ps1 -Root \"E:\\My Project\\MyProject\""
}
```

## Why This Exists

Package-style encapsulation is not decoration. It is a normal path from scripts
to stable products:

```text
script
  -> module
  -> client
  -> adapter
  -> package
  -> service boundary
```

This standard exists so future projects start with clear ownership, runtime
boundaries, documentation, and reusable access layers.

## Minimum Project Shape

Every serious project should define:

- identity
- source of truth
- runtime location
- deployment location
- consumer interfaces
- configuration surfaces
- secret surfaces
- docs/read order
- verification commands
- package or adapter boundaries

## Required Files

Recommended baseline:

```text
README.md
project.json
CONTRIBUTING.md
SECURITY.md
SUPPORT.md
docs/
schemas/
services/
scripts/
```

Use fewer files only for genuinely small one-off tools.

## Required Boundaries

### Source Boundary

Document where canonical source lives:

```text
local clone
remote development workspace
GitHub repository
deployment target
```

### Runtime Boundary

Document what runs where:

```text
service name
systemd/docker/pm2
bind address
health endpoint
log command
restart command
```

### Consumer Boundary

Do not let downstream apps call raw internals. Provide:

- API
- client
- adapter
- package
- documented import path

## Productization Ladder

Use this ladder to decide the next engineering step:

| Stage | Shape | Next Step |
| --- | --- | --- |
| Script | one command works | add docs and env example |
| Module | functions are reusable | add typed inputs/outputs |
| Client | remote API wrapper exists | add errors/request id |
| Adapter | consumer-specific wrapper exists | add verification |
| Package | stable exports exist | add versioning and changelog |
| Service | runtime deployed | add health, logs, operations docs |

## Acceptance Checklist

A project is considered stable enough for reuse when:

- `README.md` explains what it is
- `project.json` records machine-readable identity
- docs say where to edit and where to deploy
- secrets are not guessed
- a smoke or verify command exists
- external consumers use a client/adapter/API, not raw internals
- package boundaries exist when code is reused by more than one consumer

## Repository Rules

- `README.md` is the first human entry point.
- `project.json` is the first machine entry point.
- `docs/contracts/project-creation-standard.md` is the canonical prose policy.
- `packages/schemas/project/creation-standard.schema.json` is the machine schema.
- `scripts/project/init-project.ps1` is the scaffold generator.
- `scripts/project/check-project-standard.ps1` is the validation gate.
- `scripts/project/project-standards.ps1` persists the standard into MySQL.
- New projects must not invent a parallel identity format unless they also
  define a migration path back to this standard.

## DataBase Record

This standard is also stored in MySQL through:

```text
scripts/project/project-standards.ps1
```

The database copy is for query and retrieval. The markdown file remains the
human-readable canonical policy text.

## Scaffold Command

Use the project initializer to create a new project skeleton that follows this
standard:

```powershell
.\scripts\project\init-project.ps1 -Name MyProject -Root "E:\My Project\MyProject"
```

Supported project types:

- `script`
- `package`
- `client`
- `adapter`
- `service`

Example:

```powershell
.\scripts\project\init-project.ps1 -Name MyService -Root "E:\My Project\MyService" -Type service
```

Generated baseline files:

- `README.md`
- `project.json`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `.gitignore`
- `docs/`
- `schemas/`
- `services/`
- `scripts/`

Type-specific extras:

- `package` adds `src/` and `tests/`
- `client` adds `src/` and `examples/`
- `adapter` adds `src/`
- `service` adds `src/` and `ops/`

Validation command:

```powershell
.\scripts\project\check-project-standard.ps1 -Root "E:\My Project\MyProject"
```

Manifest validation command:

```powershell
python .\scripts\project\validate-project-manifest.py .\packages\schemas\project\project-manifest.schema.json .\project.json
```

## Default Project JSON Shape

New projects should at minimum carry these fields in `project.json`:

```json
{
  "name": "MyProject",
  "projectName": "MyProject",
  "canonicalDoc": "README.md",
  "machineReadableEntry": "project.json",
  "githubRepo": "https://github.com/emptyinkpot/MyProject",
  "visibility": "private",
  "type": "project",
  "status": "active",
  "canonicalPurpose": "Describe the canonical purpose here.",
  "readOrder": [
    "README.md",
    "project.json",
    "docs/",
    "schemas/"
  ]
}
```

```


---

## docs\contracts\project-directory-table.md

```md
# Project Directory Table

This repository stores project manifests in MySQL as a queryable directory
layer.

## Purpose

Git files remain the human-readable source. MySQL keeps a normalized directory
view so projects can be listed, filtered, compared, and audited without reading
every repository by hand.

## Table Name

`project_directory`

## Record Scope

Each row represents one project manifest snapshot.

## Required Columns

- `project_id`
- `name`
- `project_name`
- `github_repo`
- `visibility`
- `project_type`
- `status`
- `canonical_doc`
- `machine_readable_entry`
- `source_of_truth`
- `runtime_location`
- `deployment_target`
- `manifest_json`
- `manifest_version`
- `updated_at`

## Recommended Indexes

- primary key on `project_id`
- unique key on `github_repo`
- secondary key on `project_type`
- secondary key on `status`
- secondary key on `visibility`

## Sync Rule

The table should be updated by a dedicated sync script from each repository's
`project.json`.

## Query Rule

External tools should query the directory table for overview and discovery,
then open the repository only when they need the full human-readable contract.


```


---

## docs\contracts\project-manifest-template.md

```md
# Project Manifest Template

This document defines the canonical `project.json` shape for generated
projects.

## Purpose

The manifest is the machine-readable contract for project identity, ownership,
runtime, and verification.

## Minimum Fields

```json
{
  "name": "MyProject",
  "projectName": "MyProject",
  "canonicalDoc": "README.md",
  "machineReadableEntry": "project.json",
  "githubRepo": "https://github.com/emptyinkpot/MyProject",
  "visibility": "private",
  "type": "script",
  "status": "active",
  "canonicalPurpose": "Describe the canonical purpose here.",
  "owner": "emptyinkpot",
  "sourceOfTruth": "local git repository",
  "runtimeLocation": "workspace or server path",
  "deploymentTarget": "server or cloud target",
  "consumerInterfaces": ["README.md", "docs/"],
  "configurationSurfaces": ["project.json"],
  "secretSurfaces": [],
  "verificationCommands": [],
  "documentation": ["README.md"],
  "readOrder": ["README.md", "project.json", "docs/", "schemas/"]
}
```

## Required Interpretation

- `sourceOfTruth` describes where the editable truth lives.
- `runtimeLocation` describes where the project runs while active.
- `deploymentTarget` describes where the project is deployed.
- `consumerInterfaces` lists the stable surfaces that downstream users should
  rely on.
- `configurationSurfaces` lists the files or endpoints that configure the
  project.
- `secretSurfaces` lists credential locations without guessing values.
- `verificationCommands` lists the commands used to confirm the project is
  healthy.
- `documentation` lists the user-facing docs that define the project.

## Rule

If a project cannot describe these fields yet, it should stay at the smallest
possible type and not pretend to be more mature than it is.

## Repository Exception

This repository uses `data-infrastructure-map` as its own current truth type.
Generated projects should use one of the template types unless they explicitly
define and document a new type.

```


---

## docs\contracts\project-type-readmes.md

```md
# Project Type README Templates

This document defines the default README sections generated for each project
type.

## Common Sections

Every generated project README should include:

- identity card
- purpose
- source of truth
- runtime / deployment boundary
- read order
- verification commands
- ownership
- configuration surfaces
- secret surfaces

## script

Use for glue code and one-off automation.

Suggested sections:

- what it automates
- inputs and outputs
- run command
- verification command

## package

Use for reusable libraries or shared modules.

Suggested sections:

- exported surface
- install or import usage
- local development
- tests

## client

Use for API wrappers and remote service access.

Suggested sections:

- target API
- authentication surface
- example calls
- error handling

## adapter

Use for consumer-specific compatibility layers.

Suggested sections:

- target consumer
- adapted behavior
- mapping rules
- fallback behavior

## service

Use for deployed runtimes.

Suggested sections:

- runtime location
- health endpoint
- restart procedure
- log location
- operational notes

## Recommended Default Blocks

### Identity Card

Keep project identity and type on the first screen.

### Boundary Summary

Explain what the project owns, what it consumes, and what it never stores.

### Verification

List the commands used to confirm the project still matches its contract.

```


---

## docs\contracts\project-type-templates.md

```md
# Project Type Templates

This document defines the default project templates used by the shared project
initializer.

## Purpose

Project creation should not start from an empty folder. Each type should begin
with a predictable surface so the project can move from script to package
without reinvention.

## Supported Types

### script

Use for one-off utilities, maintenance commands, and automation glue.

Baseline additions:

- `scripts/`
- `docs/`
- `schemas/`
- `README.md`
- `project.json`

### package

Use for reusable libraries or shared modules.

Baseline additions:

- `src/`
- `tests/`
- `docs/`
- `schemas/`
- `README.md`
- `project.json`

### client

Use for API wrappers, SDKs, and remote service clients.

Baseline additions:

- `src/`
- `examples/`
- `docs/`
- `README.md`
- `project.json`

### adapter

Use for consumer-specific compatibility layers.

Baseline additions:

- `src/`
- `docs/`
- `README.md`
- `project.json`

### service

Use for deployable runtimes with health and operations concerns.

Baseline additions:

- `src/`
- `ops/`
- `docs/`
- `schemas/`
- `README.md`
- `project.json`

## Template Selection Rule

Choose the smallest type that reflects the current truth.

- if the project only automates tasks, use `script`
- if the project exports reusable code, use `package`
- if the project wraps a remote API, use `client`
- if the project customizes a consumer boundary, use `adapter`
- if the project runs as a service, use `service`

## Required Metadata

Each generated project should store the selected type in `project.json` and in
the identity card inside `README.md`.


```


---

## docs\contracts\public-surface-edit-intake-contract.md

```md
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
```


---

## docs\contracts\raw-artifact-store-contract.md

```md
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

```


---

## docs\contracts\reader-runtime-projection-contract.md

```md
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

```


---

## docs\contracts\remote-workspace-boundary.md

```md
# Remote Workspace And Environment Branch Boundary

This repository supports three stable environment branches so local debugging
and remote IDE debugging can both stay visible without creating hidden
worktrees.

## Branch Roles

```text
main        stable integration and release truth
local       local-machine debugging lane
remote-ide  remote IDE / code-server debugging lane
```

`main` remains the only durable integration branch. `local` and `remote-ide`
are environment branches: they may contain temporary diagnostics, environment
patches, logging, or work-in-progress needed to reproduce an issue in that
environment.

## Rule

- Do not treat `local` or `remote-ide` as product truth.
- Do not deploy from `local` or `remote-ide` unless an incident runbook
  explicitly says to test that lane.
- Promote useful changes through a normal task branch or pull request into
  `main`.
- Keep secrets, `.env`, runtime logs, local databases, and generated caches out
  of all three branches.
- If `local` and `remote-ide` diverge, use `main` as the merge base and record
  the environment-specific reason before carrying changes across.

## Current Canonical Boundary

- canonical integration truth: `main`
- local debug branch: `local`
- remote IDE debug branch: `remote-ide`
- canonical repository: GitHub origin
- remote IDE workspace: `server-170:/home/ubuntu/workspaces/DataBase`
- local Windows checkout: `E:\My Project\DataBase`

## Recommended Flow

```text
main
  -> local       reproduce or patch on local Windows
  -> remote-ide  reproduce or patch on server/code-server
  -> task branch / PR
  -> main
```

For small documentation-only changes, committing directly to `main` is still
acceptable when no active claim overlaps. For runtime, deployment, API,
database, or cross-environment changes, use a task branch and mention which
environment branch was used for validation.

## Initial Rollout

The first repositories using this branch contract are:

| Repository | main | local | remote-ide |
| --- | --- | --- | --- |
| `emptyinkpot/DataBase` | `main` | `local` | `remote-ide` |
| `emptyinkpot/Atramenti-Console` | `main` | `local` | `remote-ide` |

`Atramenti-Console` keeps its source checkout in the remote IDE workspace, while
this DataBase repository records the topology and branch contract.

## Why This Matters

The model gives the operator two fast debugging surfaces without losing a single
integration truth. Environment branches are visible in GitHub, so agents can
compare local and remote IDE state explicitly instead of guessing from private
worktree drift.

```


---

## docs\contracts\repository-structure.md

```md
# 仓库结构规范

本文件定义 `emptyinkpot/DataBase` 的正规项目结构边界。它的目的不是把仓库变小，而是防止 DataBase 在继续扩展时变成“文档、运行产物、临时状态、服务源码混在一起但没有规则”的仓库。

## 项目定位

DataBase 不是普通 database dump 仓库，也不是单一 Node 服务仓库。

它的正规定位是：

```text
Data Platform / Data Ops Monorepo
```

也就是：

- 保存数据生态的说明书和契约。
- 保存公网 DataBase Gateway 的源码和部署配置。
- 保存内部 memory / experience / MCP 相关服务的源码或说明。
- 保存 inventory、schema、catalog、项目创建规范等机器可读资产。
- 记录哪些系统是真源，哪些系统只是消费面或投影面。

## 目录分层

```text
DataBase/
├── apps/          # 可部署应用；gateway 是 DataBase HTTP API 服务
├── packages/      # SDK、schema、可复用机器契约
├── services/      # 内部服务与适配层
├── docs/          # 平台级文档，不直接作为运行服务源码
├── scripts/       # 操作员脚本和自动化入口
├── evidence/      # 当前状态快照、claims、integration queue、timeline
├── catalog/
│   ├── ecosystem/ # 跨仓库/跨系统生态关系真源
│   └── backstage/ # 从 ecosystem registry 生成的 Backstage catalog 投影
└── .github/       # GitHub 治理和 CI
```

## 源码和运行产物边界

### `gateway/src/`

`gateway/src/` 是 Gateway 的源码真源。

新增 API、修改业务逻辑、修改认证、修改数据库访问，都应该先改这里。

### `gateway/dist/`

`gateway/dist/` 是 TypeScript 编译产物。

当前暂时保留在仓库中，原因是生产目录 `/srv/database-gateway` 直接运行 `dist/index.js`，并且当前部署链还没有完全 CI/CD 化。

保留条件：

- 每次修改 `gateway/src/` 后必须运行 `npm run build`。
- 提交时必须让 `gateway/src/` 和 `gateway/dist/` 同步。
- 后续如果部署链改成生产机执行 `npm run build`，可以删除 `gateway/dist/` 并加入 `.gitignore`。

### `node_modules/`

`node_modules/` 永远不进入 Git。

远程 IDE 工作区里出现 `node_modules/` 只属于本地依赖缓存，可以随时删除并通过 `npm install` 重建。

## 文档边界

### `docs/gateway/`

平台级 Gateway 文档。

用于解释：

- 为什么要做 DataBase Gateway。
- Gateway 在 DataBase 生态里的位置。
- 外部消费者如何接入。
- RBAC、NocoDB、Directus、DreamFactory 等参考方案。
- 运维策略和长期路线。

### `gateway/docs/`

Gateway 子项目内文档。

用于解释：

- 当前 Gateway 服务如何调用。
- 当前公网 Gateway 如何部署。
- 和 `gateway/API.md`、`gateway/openapi.yaml` 直接相关的使用说明。

### 规则

如果文档描述的是“平台哲学、生态关系、路线、治理”，放在：

```text
docs/gateway/
```

如果文档描述的是“这个 Gateway 服务如何运行、如何调用、如何部署”，放在：

```text
gateway/docs/
```

## `.runtime/` 边界

`.runtime/` 当前用于记录 Agent 协作状态，包括：

- claims
- integration queue
- timeline events

它不是业务数据真源，也不是生产运行数据库。

当前允许提交的原因：

- 这是仓库级协作历史的一部分。
- 它帮助多个 Agent 理解当前谁改过什么、哪些任务完成、哪些任务待整合。

长期更正规做法：

```text
.runtime/examples/      # 可提交的示例和模板
.runtime/live/          # 不提交的实时运行态
```

后续如果协作频率提高，应把实时状态迁到数据库或专门 runtime service，不再长期写入 Git。

## `inventories/` 边界

`inventories/` 保存当前资产快照，例如：

- MySQL 表清单
- 服务器路径清单
- 本机有价值数据候选
- 仓库归档扫描结果

它们是“可再生成的快照”，不是唯一真源。

要求：

- 每个 inventory 应能追溯生成脚本或生成来源。
- 大型 dump 不放在这里。
- 敏感数据不放在这里。

## `services/` 边界

`services/` 放 DataBase 生态里的内部服务和适配层。

当前包含：

- `memory/`: DataBase Memory Service facade。
- `experience-manager/`: 经验、笔记、记忆服务实现层。
- `database-ops-mcp/`: 数据库运维和巡检 MCP。
- `qmd-adapter/`: QMD 适配层。
- `gateway-client-adapters/`: MyBlog、Mortis 等消费者的 Gateway 适配器。
- `gateway-mcp/`: MCP adapter，把现有 DataBase Gateway HTTP API 暴露成 AI tools，不直连 MySQL，不暴露 raw SQL。

当前这些服务各自有 `package.json`，但还不是统一 workspace。

长期正规化方向：

```text
package.json
pnpm-workspace.yaml
```

把 `gateway/` 和 `services/*` 纳入统一 workspace，由根目录统一执行 lint、test、build。

当前 CI 已单独验证 `gateway/` 和 `services/gateway-mcp/`。`gateway-mcp/` 的原则是复用 Gateway HTTP API，不重复实现通用 MySQL MCP。

## 配置和密钥边界

允许提交：

```text
.env.example
**/.env.example
*.schema.json
公开文档中的占位符
```

`.env.example` 是环境变量模板，必须使用占位符，不得填真实密码。`.gitignore` 必须保留 `!.env.example` 和 `!**/.env.example`，避免模板被误忽略。

禁止提交：

```text
.env
*.pem
*.key
真实密码
真实 token
真实 cookie
数据库 dump
node_modules/
```

真实凭据应记录在 `docs/storage/secrets-surfaces.md` 中，但凭据值本身只进入明确允许的 secrets surface。

## 当前已知不够正规的地方

这些不是立即故障，但需要有意识地收口。

### 1. `gateway/dist/` 被提交

这是为了当前部署链稳定暂时保留。后续 CI/CD 完整后，建议改为构建时生成。

### 2. `.runtime/` 是 live state 和历史记录混合

短期可接受；长期应拆成 examples/live 或迁到数据库。

### 3. `docs/gateway/` 和 `gateway/docs/` 容易混淆

本文件已定义边界，后续新增文档必须按边界放置。

### 4. `services/` 尚未 workspace 化

短期保持各服务独立；长期统一成 workspace。

## 下一步结构整改顺序

建议按以下顺序推进：

1. 保持 `node_modules/` 不进 Git，定期清理远程 IDE 工作区。
2. 为 `gateway/dist/` 增加 CI 检查，确保它与 `src/` 同步。当前已由 `.github/workflows/project-contracts.yml` 执行 `npm ci`、`npm run build` 和 `git diff --exit-code -- gateway/dist`。
3. 清理 `.runtime/`，把已完成 claim 标记完成或归档。
4. 整合 `docs/gateway/` 与 `gateway/docs/` 的交叉内容，避免重复真源。
5. 评估是否引入 npm/pnpm workspace 管理 `gateway/` 和 `services/*`。

```


---

## docs\contracts\storage-contract.md

```md
# Storage Contract

## Contract Principles

1. Every data family has exactly one canonical owner.
2. Access gateways are not data owners unless explicitly declared.
3. Inventories are snapshots, not live truth.
4. Runtime paths must be classified before cleanup.
5. Credentials must have explicit surfaces and operator intent.

## Canonical Owners

| Data Family | Canonical Owner | Notes |
| --- | --- | --- |
| Novel records | MySQL | `works`, `chapters`, outlines, characters |
| Vocabulary | MySQL | `vocabulary`, `banned_words` |
| Creative writing style contracts | MySQL | `creative_style_protocols`, `creative_style_modules`, `creative_editing_steps`, `creative_quality_rules`, `creative_source_materials`; exposed through `GET /creative/style-contract` |
| Account imports | MySQL | `imported_accounts`, `imported_browser_cookies` |
| Personal secrets | MySQL / local secret files | Depends on requested surface |
| Large assets | S3-compatible object store / OpenList backend / Quark | Long-term target is a replaceable S3-compatible object truth; MySQL may store metadata/reference only |
| Source code | GitHub + remote source roots | Remote-first repos declare their own roots |
| AI artifacts | Runtime workspace | Promote explicitly before treating as source |

## Integration Pattern

Applications should depend on this repository for:

- topology lookup
- schema awareness
- recovery procedure
- storage boundary decisions

Applications should not depend on this repository for:

- live data reads
- credential retrieval
- runtime queue state
- file serving

## Long-Term File Object Rule

New durable file-object capabilities should prefer this order:

1. S3-compatible object store as the object truth.
2. OpenList as access projection over that backend.
3. rclone for migration, sync, check, and inventory.
4. DataBase Gateway for metadata, references, permissions, and lifecycle state.

Do not implement object storage primitives inside DataBase. If POSIX semantics
are required, add JuiceFS as an explicit access layer and register its metadata
engine before promotion.


```


---

## docs\contracts\three-repo-topology-constitution.md

```md
---
title: Three-Repo Topology Constitution
status: canonical
owner: DataBase
---

# Three-Repo Topology Constitution

This document defines the long-term architecture boundary between DataBase,
ContentBase, and MyBlog.

It is a topology constitution, not an implementation plan and not a gate
expansion. ContractGuard may validate parts of this topology later, but it is
not the center of this system. DataBase is the center because it owns the
domain truth, ecosystem topology, and cross-repo contracts.

## Canonical Chain

```text
DataBase
  -> exports domain and projection contracts
ContentBase
  -> executes workflow against those contracts
MyBlog
  -> renders public projection artifacts
```

Repositories exchange artifacts. They must not exchange implementation
ownership.

## Repository Identities

| Repository | Identity | Owns | Must never become |
| --- | --- | --- | --- |
| `emptyinkpot/DataBase` | Creative Domain Platform | Domain schema, semantic graph, creative contracts, authoritative metadata, projection contracts, generated clients, ecosystem topology | Workflow runtime, public rendering shell, UI orchestration surface |
| `emptyinkpot/ContentBase` | Workflow Runtime | Generation, quality checks, repair, publish, audit, workflow state, runtime capabilities, platform execution | Domain truth owner, schema mirror, public projection shell, manual duplicate of DataBase types |
| `emptyinkpot/emptyinkpot.github.io` / MyBlog | Projection Shell | Presentation, reading UX, search, navigation, public collections, public static/runtime projections | Workflow runtime, private runtime API client, direct database consumer, domain truth owner |

Each repository should become more like itself over time. A repository crossing
these boundaries is architectural drift, even if the immediate feature works.

## DataBase Constitution

DataBase is the Creative Domain Platform and topology control plane.

DataBase owns:

- durable domain schema
- canonical content and creative records
- semantic graph snapshots and contracts
- author and vocabulary contracts
- platform binding truth
- public projection schemas
- generated API/client contracts
- ecosystem topology and cross-repo ownership maps

DataBase exports:

- `gateway/openapi.yaml`
- generated gateway/client packages
- semantic graph snapshots
- creative contracts
- public projection schemas
- ecosystem and catalog metadata

DataBase must not own:

- generation workflow execution
- publish workflow orchestration
- browser automation
- public reading UI
- MyBlog presentation state

## ContentBase Constitution

ContentBase is the Workflow Runtime.

ContentBase owns:

- generation command flow
- quality and continuity checks
- repair loops
- publish orchestration
- audit workflows
- workflow state and runtime capabilities
- platform execution evidence

ContentBase consumes:

- DataBase generated client or Gateway contracts
- DataBase creative contracts
- DataBase canonical content and platform binding projections

ContentBase exports:

- runtime capability metadata
- workflow capability reports
- quality reports
- repair traces
- publish manifests
- audit evidence

ContentBase must not own:

- durable content schema
- author model truth
- vocabulary truth
- platform binding truth
- public reading projection ownership
- copied DataBase domain types maintained by hand

## MyBlog Constitution

MyBlog is the Projection Shell.

MyBlog owns:

- public presentation
- reading UX
- search UX
- navigation and collection lenses
- public static artifacts
- public runtime projection surfaces

MyBlog consumes:

- public content bundles
- public projection artifacts
- generated MDX or static content projections
- public evidence library artifacts
- search indexes

MyBlog exports:

- static site build output
- public runtime JSON
- search index artifacts
- public evidence and collection surfaces
- structured public edit intake records for comments, highlights, moderation,
  and edit proposals

MyBlog must not own:

- private workflow logic
- direct database access
- DataBase table assumptions
- ContentBase generation or publish orchestration
- private runtime API dependencies for public rendering

MyBlog may provide editing and discussion UI, but these writes must be
structured intake records governed by
`docs/contracts/public-surface-edit-intake-contract.md`. MyBlog initiates
interaction; DataBase owns canonical acceptance, annotation promotion, graph
edit operations, and graph versions.

## Cross-Repo Artifact Grammar

### DataBase Outputs

```text
gateway/openapi.yaml
generated/
schemas/content/
schemas/creative/
schemas/semantic/
semantic-graph.snapshot.json
creative-contracts/
public-projection.schema.json
```

Meaning:

- API contracts define access, not storage internals.
- Generated clients are the preferred dependency surface for workflow runtimes.
- Schemas and snapshots are projection contracts, not permission to mirror
  DataBase ownership in consumers.

### ContentBase Outputs

```text
runtime-capabilities.generated.md
workflow-capabilities.json
quality-report.json
repair-trace.json
publish-manifest.json
audit-evidence/
```

Meaning:

- Workflow artifacts describe execution and evidence.
- They do not become domain truth unless DataBase ingests them through an
  explicit contract.
- Runtime capability metadata describes what ContentBase can execute, not what
  DataBase owns.

### MyBlog Inputs And Outputs

```text
public-content-bundle/
evidence-library/
generated-mdx/
search-index/
runtime/content-index.json
apps/web/dist/
public-edit-intake.jsonl
```

Meaning:

- MyBlog renders public artifacts.
- It may index and present projected content.
- It may submit structured edit/comment/highlight/moderation intake.
- It must not infer or own private workflow state from public artifacts.

## Dependency Direction

Allowed direction:

```text
MyBlog
  consumes public projections from DataBase or published ContentBase artifacts

ContentBase
  consumes DataBase generated clients and contracts

DataBase
  records canonical domain truth and exported contracts
```

Forbidden direction:

```text
DataBase -> ContentBase workflow implementation
ContentBase -> MyBlog presentation internals
MyBlog -> ContentBase private runtime API
MyBlog -> DataBase raw database tables
ContentBase -> hand-maintained duplicate DataBase schema
```

## Drift Smells

Block or redesign when any of these appear:

- ContentBase adds durable domain tables for work, chapter, author model,
  vocabulary, creative contract, or platform binding truth.
- ContentBase introduces manual domain DTOs that duplicate generated DataBase
  contracts.
- MyBlog fetches private workflow APIs to render the public site.
- MyBlog adds direct MySQL access or depends on DataBase table names.
- DataBase starts orchestrating generation, browser publishing, or public UI
  behavior.
- A repo adds a registry, catalog, map, or metadata file that has no canonical
  owner and no execution consumer.

## Change Rule

Architecture changes between these three repositories must name exactly one
primary change axis:

- domain truth change in DataBase
- workflow runtime change in ContentBase
- projection shell change in MyBlog
- artifact contract change between repositories

If a task touches more than one axis, split it unless the cross-repo contract is
the explicit task.

## Reading Rule

Before changing cross-repo behavior, read:

1. This document.
2. The target repository `SYSTEM_IDENTITY.md`.
3. The target repository `project.json`.
4. The target repository boundary doc:
   - DataBase: `ECOSYSTEM_MAP.md`
   - ContentBase: `ARCHITECTURE.md` and `docs/contracts/DATA_CONTRACT.md`
   - MyBlog: `ARCHITECTURE.md` and `SYSTEM_TOPOLOGY.md`

## Governance Placement

ContractGuard is a utility. It may validate contracts and detect drift, but it
must not become the architecture center.

The canonical topology center is DataBase. The workflow runtime center is
ContentBase. The public projection center is MyBlog.

```


---

## schemas\document\anchor-location.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/anchor-location.schema.json",
  "title": "Anchor And Location Map",
  "description": "Stable anchors and projection-specific runtime locations for reader annotations, highlights, progress, and pagination.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "mapId", "anchors"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "anchor-location.v1" },
    "mapId": { "$ref": "#/$defs/stableId" },
    "anchors": {
      "type": "array",
      "items": { "$ref": "#/$defs/anchor" },
      "default": []
    },
    "locations": {
      "type": "array",
      "items": { "$ref": "#/$defs/runtimeLocation" },
      "default": []
    }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "anchor": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "targetNodeId", "targetNodeType"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "targetNodeId": { "$ref": "#/$defs/stableId" },
        "targetNodeType": { "type": "string", "enum": ["document", "section", "block", "inline", "asset", "evidence", "projection"] },
        "selector": { "type": "object", "additionalProperties": true },
        "offsets": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "start": { "type": "integer", "minimum": 0 },
            "end": { "type": "integer", "minimum": 0 }
          }
        },
        "sourceLocator": { "type": "object", "additionalProperties": true }
      }
    },
    "runtimeLocation": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "anchorId", "projectionType", "locator"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "anchorId": { "$ref": "#/$defs/stableId" },
        "projectionType": { "type": "string", "enum": ["epub", "pdf", "html", "mdx", "astro", "reader_runtime", "search", "fanqie"] },
        "locator": { "type": "object", "additionalProperties": true },
        "generatedAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}

```


---

## schemas\document\annotation-graph.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/annotation-graph.schema.json",
  "title": "Annotation Graph",
  "description": "Annotation overlay graph for comments, highlights, reviews, editorial notes, and AI notes attached to CCG nodes or anchors.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "graphId", "annotations"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "annotation-graph.v1" },
    "graphId": { "$ref": "#/$defs/stableId" },
    "annotations": {
      "type": "array",
      "items": { "$ref": "#/$defs/annotation" },
      "default": []
    }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "annotation": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "type", "target", "authorId", "visibility", "content", "createdAt"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "type": { "type": "string", "enum": ["highlight", "comment", "review", "editorial_note", "ai_note", "correction_candidate"] },
        "target": { "$ref": "#/$defs/annotationTarget" },
        "authorId": { "$ref": "#/$defs/stableId" },
        "visibility": { "type": "string", "enum": ["private", "public", "editorial", "shared"] },
        "content": { "type": "object", "additionalProperties": true },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" },
        "status": { "type": "string", "enum": ["active", "resolved", "archived"], "default": "active" },
        "source": { "type": "string", "enum": ["human", "ai", "import", "system"] }
      }
    },
    "annotationTarget": {
      "type": "object",
      "additionalProperties": false,
      "required": ["targetType", "targetId"],
      "properties": {
        "targetType": { "type": "string", "enum": ["document", "section", "block", "inline", "anchor", "projection"] },
        "targetId": { "$ref": "#/$defs/stableId" },
        "selector": { "type": "object", "additionalProperties": true }
      }
    }
  }
}

```


---

## schemas\document\asset-graph.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/asset-graph.schema.json",
  "title": "Asset Graph",
  "description": "Asset records and relations for media referenced by the Canonical Content Graph.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "graphId", "assets"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "asset-graph.v1" },
    "graphId": { "$ref": "#/$defs/stableId" },
    "assets": {
      "type": "array",
      "items": { "$ref": "#/$defs/asset" },
      "default": []
    },
    "relations": {
      "type": "array",
      "items": { "$ref": "#/$defs/assetRelation" },
      "default": []
    }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "asset": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "rawArtifactId", "sha256", "mime", "role"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "rawArtifactId": { "$ref": "#/$defs/stableId" },
        "sha256": { "type": "string", "minLength": 1 },
        "mime": { "type": "string", "minLength": 1 },
        "width": { "type": "integer", "minimum": 0 },
        "height": { "type": "integer", "minimum": 0 },
        "originalPath": { "type": "string" },
        "role": { "type": "string", "enum": ["illustration", "cover", "embedded_media", "evidence", "scan", "thumbnail", "projection", "other"] },
        "metadata": { "type": "object", "additionalProperties": true }
      }
    },
    "assetRelation": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "type", "assetId", "targetId"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "type": { "type": "string", "enum": ["illustrates", "embedded_in", "evidence_for", "thumbnail_of", "cover_of", "projection_of"] },
        "assetId": { "$ref": "#/$defs/stableId" },
        "targetId": { "$ref": "#/$defs/stableId" },
        "targetType": { "type": "string", "enum": ["document", "section", "block", "inline", "entity", "evidence", "asset", "projection"] },
        "payload": { "type": "object", "additionalProperties": true }
      }
    }
  }
}

```


---

## schemas\document\canonical-content-graph.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/canonical-content-graph.schema.json",
  "title": "Canonical Content Graph",
  "description": "DataBase-owned content graph schema. CDM is the ordered document-structure subgraph; projections, entities, citations, evidence, annotations, and anchors are graph nodes and edges.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "graphId", "graphVersion", "nodes", "edges"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "ccg.v1" },
    "graphId": { "$ref": "#/$defs/stableId" },
    "graphVersion": { "type": "string", "minLength": 1 },
    "generatedAt": { "type": "string", "format": "date-time" },
    "nodes": {
      "type": "array",
      "items": { "$ref": "#/$defs/node" },
      "minItems": 1
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "#/$defs/edge" },
      "default": []
    },
    "projectionManifests": {
      "type": "array",
      "items": { "$ref": "#/$defs/projectionManifest" },
      "default": []
    }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "node": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "class"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "class": {
          "type": "string",
          "enum": ["document", "section", "block", "inline", "entity", "citation", "evidence", "annotation", "anchor", "projection"]
        },
        "type": { "type": "string" },
        "title": { "type": "string" },
        "payload": { "type": "object", "additionalProperties": true },
        "sourceLineage": { "type": "object", "additionalProperties": true },
        "semanticTags": {
          "type": "array",
          "items": { "type": "string" },
          "default": []
        }
      }
    },
    "edge": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "type", "from", "to"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "type": {
          "type": "string",
          "enum": ["contains", "references", "cites", "supports", "annotates", "projects_to", "derived_from", "located_by", "supersedes", "related_to"]
        },
        "from": { "$ref": "#/$defs/stableId" },
        "to": { "$ref": "#/$defs/stableId" },
        "order": { "type": "integer", "minimum": 0 },
        "role": { "type": "string" },
        "payload": { "type": "object", "additionalProperties": true }
      }
    },
    "projectionManifest": {
      "type": "object",
      "additionalProperties": false,
      "required": ["projectionNodeId", "sourceGraphVersion", "projectionType", "producer", "generatedAt", "outputArtifacts"],
      "properties": {
        "projectionNodeId": { "$ref": "#/$defs/stableId" },
        "sourceGraphVersion": { "type": "string", "minLength": 1 },
        "projectionType": {
          "type": "string",
          "enum": ["epub", "pdf", "html", "mdx", "astro", "fanqie", "print", "search", "semantic_chunks", "toc", "reader_runtime"]
        },
        "producer": { "type": "string", "minLength": 1 },
        "generatedAt": { "type": "string", "format": "date-time" },
        "outputArtifacts": {
          "type": "array",
          "items": { "$ref": "#/$defs/artifactRef" }
        },
        "warnings": {
          "type": "array",
          "items": { "type": "string" },
          "default": []
        }
      }
    },
    "artifactRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path", "format"],
      "properties": {
        "path": { "type": "string", "minLength": 1 },
        "format": { "type": "string", "minLength": 1 },
        "hash": { "type": "string" }
      }
    }
  }
}

```


---

## schemas\document\canonical-document.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/canonical-document.schema.json",
  "title": "Canonical Document Model",
  "description": "DataBase-owned canonical Document AST. Markdown, EPUB, PDF, HTML, MDX, Astro, Fanqie, search, and print outputs are projections of this model.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "id",
    "type",
    "title",
    "authors",
    "status",
    "sourceLineage",
    "projectionPolicy",
    "sections"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "const": "cdm.v1"
    },
    "id": {
      "$ref": "#/$defs/stableId"
    },
    "type": {
      "type": "string",
      "enum": [
        "novel",
        "article",
        "note",
        "paper",
        "world_file",
        "evidence_file",
        "other"
      ]
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "authors": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/reference"
      },
      "default": []
    },
    "status": {
      "type": "string",
      "enum": [
        "draft",
        "reviewed",
        "published",
        "archived"
      ]
    },
    "sourceLineage": {
      "$ref": "#/$defs/sourceLineage"
    },
    "styleProfile": {
      "$ref": "#/$defs/reference"
    },
    "semanticTags": {
      "$ref": "#/$defs/tagList"
    },
    "projectionPolicy": {
      "$ref": "#/$defs/projectionPolicy"
    },
    "projections": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/projectionManifest"
      },
      "default": []
    },
    "sections": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/section"
      }
    }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "reference": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "type"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/stableId"
        },
        "type": {
          "type": "string",
          "minLength": 1
        },
        "label": {
          "type": "string"
        },
        "uri": {
          "type": "string"
        }
      }
    },
    "tagList": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "default": []
    },
    "sourceLineage": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "sourceType",
        "sourceId"
      ],
      "properties": {
        "sourceType": {
          "type": "string",
          "enum": [
            "markdown",
            "database",
            "import",
            "generated",
            "manual",
            "external"
          ]
        },
        "sourceId": {
          "type": "string",
          "minLength": 1
        },
        "sourcePath": {
          "type": "string"
        },
        "sourceVersion": {
          "type": "string"
        },
        "ingestedAt": {
          "type": "string",
          "format": "date-time"
        },
        "producer": {
          "type": "string"
        }
      }
    },
    "projectionPolicy": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "allowedProjectionTypes"
      ],
      "properties": {
        "allowedProjectionTypes": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/projectionType"
          },
          "uniqueItems": true
        },
        "publicFields": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "privateByDefault": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "projectionType": {
      "type": "string",
      "enum": [
        "epub",
        "pdf",
        "html",
        "mdx",
        "astro",
        "fanqie",
        "print",
        "search",
        "semantic_chunks"
      ]
    },
    "projectionManifest": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "documentId",
        "sourceDocumentVersion",
        "projectionType",
        "projectionVersion",
        "producer",
        "generatedAt",
        "outputArtifacts"
      ],
      "properties": {
        "documentId": {
          "$ref": "#/$defs/stableId"
        },
        "sourceDocumentVersion": {
          "type": "string",
          "minLength": 1
        },
        "projectionType": {
          "$ref": "#/$defs/projectionType"
        },
        "projectionVersion": {
          "type": "string",
          "minLength": 1
        },
        "producer": {
          "type": "string",
          "minLength": 1
        },
        "generatedAt": {
          "type": "string",
          "format": "date-time"
        },
        "inputContracts": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        },
        "outputArtifacts": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/artifactRef"
          }
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": []
        }
      }
    },
    "artifactRef": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "path",
        "format"
      ],
      "properties": {
        "path": {
          "type": "string",
          "minLength": 1
        },
        "format": {
          "type": "string",
          "minLength": 1
        },
        "hash": {
          "type": "string"
        }
      }
    },
    "section": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "documentId",
        "order",
        "level",
        "title",
        "semanticRole",
        "blocks"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/stableId"
        },
        "documentId": {
          "$ref": "#/$defs/stableId"
        },
        "parentSectionId": {
          "$ref": "#/$defs/stableId"
        },
        "order": {
          "type": "integer",
          "minimum": 0
        },
        "level": {
          "type": "integer",
          "minimum": 1,
          "maximum": 6
        },
        "title": {
          "type": "string"
        },
        "semanticRole": {
          "type": "string",
          "enum": [
            "chapter",
            "scene",
            "introduction",
            "argument",
            "appendix",
            "evidence",
            "section",
            "other"
          ]
        },
        "references": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/reference"
          },
          "default": []
        },
        "blocks": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/block"
          }
        },
        "sections": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/section"
          },
          "default": []
        }
      }
    },
    "block": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "documentId",
        "sectionId",
        "order",
        "type",
        "content"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/stableId"
        },
        "documentId": {
          "$ref": "#/$defs/stableId"
        },
        "sectionId": {
          "$ref": "#/$defs/stableId"
        },
        "order": {
          "type": "integer",
          "minimum": 0
        },
        "type": {
          "type": "string",
          "enum": [
            "paragraph",
            "quote",
            "dialogue",
            "narration",
            "inner_monologue",
            "poetry",
            "code",
            "image",
            "table",
            "footnote",
            "aside",
            "epigraph",
            "scene_break",
            "evidence",
            "claim",
            "argument",
            "reflection"
          ]
        },
        "content": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "$ref": "#/$defs/inlineList"
            },
            {
              "type": "object"
            }
          ]
        },
        "annotations": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/annotation"
          },
          "default": []
        },
        "citations": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/citation"
          },
          "default": []
        },
        "references": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/reference"
          },
          "default": []
        },
        "layoutHints": {
          "$ref": "#/$defs/layoutHints"
        },
        "semanticTags": {
          "$ref": "#/$defs/tagList"
        }
      }
    },
    "inlineList": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/inlineSpan"
      }
    },
    "inlineSpan": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "text",
            "emphasis",
            "strong",
            "link",
            "citation_ref",
            "footnote_ref",
            "person_ref",
            "concept_ref",
            "entity_ref",
            "code_span",
            "ruby",
            "annotation"
          ]
        },
        "text": {
          "type": "string"
        },
        "target": {
          "type": "string"
        },
        "children": {
          "$ref": "#/$defs/inlineList"
        },
        "attrs": {
          "type": "object",
          "additionalProperties": true
        }
      }
    },
    "annotation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type",
        "value"
      ],
      "properties": {
        "type": {
          "type": "string"
        },
        "value": {},
        "source": {
          "type": "string"
        }
      }
    },
    "citation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "sourceId"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/stableId"
        },
        "sourceId": {
          "$ref": "#/$defs/stableId"
        },
        "fragmentId": {
          "$ref": "#/$defs/stableId"
        },
        "locator": {
          "type": "string"
        },
        "citationStyle": {
          "type": "string"
        },
        "note": {
          "type": "string"
        }
      }
    },
    "layoutHints": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "pageBreakBefore": {
          "type": "boolean"
        },
        "pageBreakAfter": {
          "type": "boolean"
        },
        "keepWithNext": {
          "type": "boolean"
        },
        "keepTogether": {
          "type": "boolean"
        },
        "orphanControl": {
          "type": "boolean"
        },
        "widowControl": {
          "type": "boolean"
        },
        "preferredFloat": {
          "type": "string",
          "enum": [
            "none",
            "top",
            "bottom",
            "left",
            "right"
          ]
        },
        "projectionOverrides": {
          "type": "object",
          "additionalProperties": true
        }
      }
    }
  }
}

```


---

## schemas\document\content-import-manifest.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/content-import-manifest.schema.json",
  "title": "Content Import Manifest",
  "description": "Generic manifest for constrained, loss-visible imports into DataBase CDM/CCG.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "manifestId",
    "status",
    "sourceArtifact",
    "extractor",
    "parser",
    "normalizationPolicy",
    "imagePolicy",
    "outputPolicy",
    "lossReport",
    "generatedAt"
  ],
  "properties": {
    "schemaVersion": { "type": "string", "const": "content-import.v1" },
    "manifestId": { "$ref": "#/$defs/stableId" },
    "status": {
      "type": "string",
      "enum": ["extracted", "normalized", "review_required", "blocked", "completed"]
    },
    "sourceArtifact": { "$ref": "#/$defs/sourceArtifact" },
    "extractor": { "$ref": "#/$defs/toolRef" },
    "parser": { "$ref": "#/$defs/parserRef" },
    "normalizationPolicy": { "$ref": "#/$defs/policyRef" },
    "imagePolicy": { "$ref": "#/$defs/policyRef" },
    "outputPolicy": { "$ref": "#/$defs/policyRef" },
    "lossReport": { "$ref": "#/$defs/lossReport" },
    "unresolvedWarnings": {
      "type": "array",
      "items": { "$ref": "#/$defs/importWarning" },
      "default": []
    },
    "outputs": {
      "type": "array",
      "items": { "$ref": "#/$defs/outputArtifact" },
      "default": []
    },
    "generatedAt": { "type": "string", "format": "date-time" }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "sourceArtifact": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "originalPath", "sha256", "mime", "source", "importedAt", "immutable"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "originalPath": { "type": "string", "minLength": 1 },
        "sha256": { "type": "string", "minLength": 1 },
        "mime": { "type": "string", "minLength": 1 },
        "sizeBytes": { "type": "integer", "minimum": 0 },
        "source": { "type": "string", "minLength": 1 },
        "importedAt": { "type": "string", "format": "date-time" },
        "immutable": { "type": "boolean", "const": true }
      }
    },
    "toolRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "version": { "type": "string", "minLength": 1 },
        "command": { "type": "string" }
      }
    },
    "parserRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["route"],
      "properties": {
        "route": {
          "type": "string",
          "enum": ["pandoc-json", "xhtml-hast", "remark-mdast", "pdf-layout", "ocr-layout", "image-metadata", "hybrid"]
        },
        "details": { "type": "object", "additionalProperties": true }
      }
    },
    "policyRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "version": { "type": "string" },
        "rules": {
          "type": "array",
          "items": { "type": "string" },
          "default": []
        }
      }
    },
    "lossReport": {
      "type": "object",
      "additionalProperties": false,
      "required": ["unsupportedFeatures", "downgraded", "unresolved", "blockedReasons"],
      "properties": {
        "unsupportedFeatures": {
          "type": "array",
          "items": { "type": "string" }
        },
        "downgraded": {
          "type": "array",
          "items": { "$ref": "#/$defs/lossItem" }
        },
        "unresolved": {
          "type": "array",
          "items": { "$ref": "#/$defs/lossItem" }
        },
        "blockedReasons": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "lossItem": {
      "type": "object",
      "additionalProperties": false,
      "required": ["code", "message"],
      "properties": {
        "code": { "type": "string", "minLength": 1 },
        "message": { "type": "string", "minLength": 1 },
        "sourcePath": { "type": "string" },
        "targetNodeId": { "type": "string" },
        "severity": { "type": "string", "enum": ["info", "warning", "error", "blocking"] }
      }
    },
    "importWarning": {
      "type": "object",
      "additionalProperties": false,
      "required": ["code", "message"],
      "properties": {
        "code": { "type": "string", "minLength": 1 },
        "message": { "type": "string", "minLength": 1 },
        "severity": { "type": "string", "enum": ["info", "warning", "error"] }
      }
    },
    "outputArtifact": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path", "format", "role"],
      "properties": {
        "path": { "type": "string", "minLength": 1 },
        "format": { "type": "string", "minLength": 1 },
        "role": {
          "type": "string",
          "enum": ["raw-artifact", "extracted-structure", "canonical-document", "content-graph", "projection", "manifest", "loss-report", "asset"]
        },
        "hash": { "type": "string" }
      }
    }
  }
}

```


---

## schemas\document\epub-ingestion-manifest.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/epub-ingestion-manifest.schema.json",
  "title": "EPUB Ingestion Manifest",
  "description": "Manifest emitted when an EPUB source artifact is imported into DataBase CDM/CCG.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "manifestId",
    "sourceArtifact",
    "importer",
    "parserRoute",
    "packageDocument",
    "spineItemCount",
    "targetDocumentId",
    "targetGraphId",
    "targetGraphVersion",
    "generatedAt",
    "outputs"
  ],
  "properties": {
    "schemaVersion": { "type": "string", "const": "epub-ingestion.v1" },
    "manifestId": { "$ref": "#/$defs/stableId" },
    "sourceArtifact": { "$ref": "#/$defs/sourceArtifact" },
    "importer": { "$ref": "#/$defs/importer" },
    "parserRoute": {
      "type": "string",
      "enum": ["pandoc-json", "xhtml-hast", "hybrid"]
    },
    "packageDocument": { "type": "string", "minLength": 1 },
    "navDocument": { "type": "string" },
    "tocDocument": { "type": "string" },
    "spineItemCount": { "type": "integer", "minimum": 0 },
    "targetDocumentId": { "$ref": "#/$defs/stableId" },
    "targetGraphId": { "$ref": "#/$defs/stableId" },
    "targetGraphVersion": { "type": "string", "minLength": 1 },
    "generatedAt": { "type": "string", "format": "date-time" },
    "outputs": {
      "type": "array",
      "items": { "$ref": "#/$defs/outputArtifact" },
      "minItems": 1
    },
    "warnings": {
      "type": "array",
      "items": { "$ref": "#/$defs/importWarning" },
      "default": []
    }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "sourceArtifact": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path", "format"],
      "properties": {
        "path": { "type": "string", "minLength": 1 },
        "format": { "type": "string", "const": "epub" },
        "hash": { "type": "string" },
        "sizeBytes": { "type": "integer", "minimum": 0 }
      }
    },
    "importer": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "version": { "type": "string", "minLength": 1 },
        "command": { "type": "string" }
      }
    },
    "outputArtifact": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path", "format", "role"],
      "properties": {
        "path": { "type": "string", "minLength": 1 },
        "format": { "type": "string", "minLength": 1 },
        "role": {
          "type": "string",
          "enum": ["cdm-document", "content-graph", "intermediate-ast", "asset-copy", "manifest", "log"]
        },
        "hash": { "type": "string" }
      }
    },
    "importWarning": {
      "type": "object",
      "additionalProperties": false,
      "required": ["code", "message"],
      "properties": {
        "code": { "type": "string", "minLength": 1 },
        "message": { "type": "string", "minLength": 1 },
        "sourcePath": { "type": "string" },
        "severity": { "type": "string", "enum": ["info", "warning", "error"] }
      }
    }
  }
}

```


---

## schemas\document\graph-edit-operation.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/graph-edit-operation.schema.json",
  "title": "Graph Edit Operation",
  "description": "Explicit edit operation that transforms one CCG version into another without mutating raw artifacts.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "operationId", "graphId", "parentVersionId", "operationType", "actor", "reason", "changes", "createdAt"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "graph-edit-operation.v1" },
    "operationId": { "$ref": "#/$defs/stableId" },
    "graphId": { "$ref": "#/$defs/stableId" },
    "parentVersionId": { "$ref": "#/$defs/stableId" },
    "operationType": {
      "type": "string",
      "enum": ["insert_node", "update_node", "tombstone_node", "insert_edge", "remove_edge", "insert_asset_block", "attach_annotation", "replace_projection", "promote_correction"]
    },
    "actor": { "$ref": "#/$defs/actor" },
    "reason": { "type": "string", "minLength": 1 },
    "sourceAnnotationId": { "$ref": "#/$defs/stableId" },
    "sourceArtifactIds": {
      "type": "array",
      "items": { "$ref": "#/$defs/stableId" },
      "default": []
    },
    "changes": {
      "type": "array",
      "items": { "$ref": "#/$defs/change" },
      "minItems": 1
    },
    "createdAt": { "type": "string", "format": "date-time" },
    "review": { "$ref": "#/$defs/review" }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "actor": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "type"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "type": { "type": "string", "enum": ["human", "ai", "system", "importer"] },
        "label": { "type": "string" }
      }
    },
    "change": {
      "type": "object",
      "additionalProperties": false,
      "required": ["action"],
      "properties": {
        "action": { "type": "string", "enum": ["insert_node", "update_node", "tombstone_node", "insert_edge", "remove_edge", "attach_asset", "attach_annotation", "replace_projection"] },
        "targetId": { "$ref": "#/$defs/stableId" },
        "node": { "type": "object", "additionalProperties": true },
        "edge": { "type": "object", "additionalProperties": true },
        "patch": { "type": "object", "additionalProperties": true },
        "tombstoneReason": { "type": "string" }
      }
    },
    "review": {
      "type": "object",
      "additionalProperties": false,
      "required": ["status"],
      "properties": {
        "status": { "type": "string", "enum": ["not_required", "pending", "approved", "rejected"] },
        "reviewerId": { "$ref": "#/$defs/stableId" },
        "reviewedAt": { "type": "string", "format": "date-time" },
        "notes": { "type": "string" }
      }
    }
  }
}

```


---

## schemas\document\graph-version-manifest.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/graph-version-manifest.schema.json",
  "title": "Graph Version Manifest",
  "description": "Version manifest for a DataBase-owned Canonical Content Graph version.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "graphId", "versionId", "operationIds", "producer", "createdAt"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "graph-version-manifest.v1" },
    "graphId": { "$ref": "#/$defs/stableId" },
    "versionId": { "$ref": "#/$defs/stableId" },
    "parentVersionId": { "$ref": "#/$defs/stableId" },
    "operationIds": {
      "type": "array",
      "items": { "$ref": "#/$defs/stableId" },
      "default": []
    },
    "producer": { "type": "string", "minLength": 1 },
    "createdAt": { "type": "string", "format": "date-time" },
    "sourceArtifacts": {
      "type": "array",
      "items": { "$ref": "#/$defs/stableId" },
      "default": []
    },
    "projections": {
      "type": "array",
      "items": { "$ref": "#/$defs/projectionRef" },
      "default": []
    },
    "notes": { "type": "string" }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "projectionRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["projectionId", "projectionType"],
      "properties": {
        "projectionId": { "$ref": "#/$defs/stableId" },
        "projectionType": { "type": "string", "enum": ["epub", "pdf", "html", "mdx", "astro", "fanqie", "print", "search", "semantic_chunks", "toc", "reader_runtime"] },
        "path": { "type": "string" }
      }
    }
  }
}

```


---

## schemas\document\projection-package.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/projection-package.schema.json",
  "title": "Projection Package",
  "description": "Rebuildable projection package derived from a DataBase CCG graph version for reader/runtime/search/public surfaces.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "packageId", "graphId", "graphVersionId", "projectionType", "producer", "generatedAt", "manifest", "renderedContent"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "projection-package.v1" },
    "packageId": { "$ref": "#/$defs/stableId" },
    "graphId": { "$ref": "#/$defs/stableId" },
    "graphVersionId": { "$ref": "#/$defs/stableId" },
    "projectionType": { "type": "string", "enum": ["html", "mdx", "astro", "epub", "pdf", "fanqie", "search", "reader_runtime"] },
    "producer": { "type": "string", "minLength": 1 },
    "generatedAt": { "type": "string", "format": "date-time" },
    "manifest": { "$ref": "#/$defs/packageManifest" },
    "renderedContent": { "type": "array", "items": { "$ref": "#/$defs/artifactRef" } },
    "toc": { "type": "array", "items": { "$ref": "#/$defs/tocNode" }, "default": [] },
    "anchorMap": { "type": "array", "items": { "$ref": "#/$defs/anchorMapping" }, "default": [] },
    "assetMap": { "type": "array", "items": { "$ref": "#/$defs/assetMapping" }, "default": [] },
    "annotationOverlay": { "type": "array", "items": { "$ref": "#/$defs/stableId" }, "default": [] },
    "searchChunks": { "type": "array", "items": { "$ref": "#/$defs/searchChunk" }, "default": [] }
  },
  "$defs": {
    "stableId": { "type": "string", "minLength": 1, "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$" },
    "artifactRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path", "format"],
      "properties": {
        "path": { "type": "string", "minLength": 1 },
        "format": { "type": "string", "minLength": 1 },
        "hash": { "type": "string" }
      }
    },
    "packageManifest": {
      "type": "object",
      "additionalProperties": false,
      "required": ["sourceGraphVersion", "inputContracts"],
      "properties": {
        "sourceGraphVersion": { "$ref": "#/$defs/stableId" },
        "inputContracts": { "type": "array", "items": { "type": "string" } },
        "warnings": { "type": "array", "items": { "type": "string" }, "default": [] }
      }
    },
    "tocNode": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "title", "level", "anchorId"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "title": { "type": "string" },
        "level": { "type": "integer", "minimum": 1 },
        "anchorId": { "$ref": "#/$defs/stableId" },
        "children": { "type": "array", "items": { "$ref": "#/$defs/tocNode" }, "default": [] }
      }
    },
    "anchorMapping": {
      "type": "object",
      "additionalProperties": false,
      "required": ["anchorId", "locator"],
      "properties": {
        "anchorId": { "$ref": "#/$defs/stableId" },
        "locator": { "type": "object", "additionalProperties": true }
      }
    },
    "assetMapping": {
      "type": "object",
      "additionalProperties": false,
      "required": ["assetId", "path"],
      "properties": {
        "assetId": { "$ref": "#/$defs/stableId" },
        "path": { "type": "string", "minLength": 1 },
        "hash": { "type": "string" }
      }
    },
    "searchChunk": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "sourceNodeId", "anchorId", "text"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "sourceNodeId": { "$ref": "#/$defs/stableId" },
        "anchorId": { "$ref": "#/$defs/stableId" },
        "text": { "type": "string" },
        "metadata": { "type": "object", "additionalProperties": true }
      }
    }
  }
}

```


---

## schemas\document\public-edit-intake.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/public-edit-intake.schema.json",
  "title": "Public Edit Intake",
  "description": "Structured write intake from public projection surfaces such as MyBlog. Intake may create annotations or reviewed graph edit operations, but never directly mutates canonical graph truth.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "intakeId",
    "sourceSurface",
    "actor",
    "graphId",
    "graphVersionId",
    "packageId",
    "intakeClass",
    "target",
    "payload",
    "reviewPolicy",
    "createdAt"
  ],
  "properties": {
    "schemaVersion": { "type": "string", "const": "public-edit-intake.v1" },
    "intakeId": { "$ref": "#/$defs/stableId" },
    "sourceSurface": { "$ref": "#/$defs/sourceSurface" },
    "actor": { "$ref": "#/$defs/actor" },
    "graphId": { "$ref": "#/$defs/stableId" },
    "graphVersionId": { "$ref": "#/$defs/stableId" },
    "packageId": { "$ref": "#/$defs/stableId" },
    "intakeClass": {
      "type": "string",
      "enum": ["interaction", "annotation", "edit_proposal", "moderation"]
    },
    "target": { "$ref": "#/$defs/target" },
    "payload": { "$ref": "#/$defs/payload" },
    "clientContext": { "$ref": "#/$defs/clientContext" },
    "reviewPolicy": { "$ref": "#/$defs/reviewPolicy" },
    "createdAt": { "type": "string", "format": "date-time" },
    "status": {
      "type": "string",
      "enum": ["submitted", "accepted", "needs_rebase", "needs_review", "rejected", "archived"],
      "default": "submitted"
    },
    "result": { "$ref": "#/$defs/result" }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "sourceSurface": {
      "type": "object",
      "additionalProperties": false,
      "required": ["repo", "surface", "projectionType"],
      "properties": {
        "repo": { "type": "string", "minLength": 1 },
        "surface": { "type": "string", "enum": ["myblog", "reader_runtime", "admin_preview", "external_embed"] },
        "route": { "type": "string" },
        "projectionType": { "type": "string", "enum": ["html", "mdx", "astro", "epub", "pdf", "fanqie", "search", "reader_runtime"] },
        "buildId": { "type": "string" }
      }
    },
    "actor": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "type"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "type": { "type": "string", "enum": ["owner", "authenticated_user", "anonymous_user", "ai", "system"] },
        "displayName": { "type": "string" },
        "authContext": { "type": "object", "additionalProperties": true }
      }
    },
    "target": {
      "type": "object",
      "additionalProperties": false,
      "required": ["targetType", "targetId"],
      "properties": {
        "targetType": { "type": "string", "enum": ["document", "section", "block", "inline", "anchor", "asset", "projection"] },
        "targetId": { "$ref": "#/$defs/stableId" },
        "anchorId": { "$ref": "#/$defs/stableId" },
        "selector": { "type": "object", "additionalProperties": true }
      }
    },
    "payload": {
      "type": "object",
      "additionalProperties": false,
      "required": ["intent"],
      "properties": {
        "intent": {
          "type": "string",
          "enum": [
            "comment",
            "reply",
            "highlight",
            "private_note",
            "correction",
            "rewrite_block",
            "insert_asset_block",
            "replace_asset",
            "update_caption",
            "reorder_section",
            "moderate",
            "reaction",
            "bookmark"
          ]
        },
        "text": { "type": "string" },
        "richText": { "type": "object", "additionalProperties": true },
        "proposedPatch": { "type": "object", "additionalProperties": true },
        "assetRefs": {
          "type": "array",
          "items": { "$ref": "#/$defs/assetRef" },
          "default": []
        },
        "visibility": { "type": "string", "enum": ["private", "public", "editorial", "shared"] },
        "moderationAction": { "type": "string", "enum": ["hide", "show", "pin", "unpin", "resolve", "archive", "report"] },
        "reason": { "type": "string" }
      }
    },
    "assetRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["assetId"],
      "properties": {
        "assetId": { "$ref": "#/$defs/stableId" },
        "rawArtifactId": { "$ref": "#/$defs/stableId" },
        "role": { "type": "string", "enum": ["illustration", "cover", "figure", "inline_image", "evidence", "replacement"] }
      }
    },
    "clientContext": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "locator": { "type": "object", "additionalProperties": true },
        "selectedText": { "type": "string" },
        "userAgent": { "type": "string" },
        "viewport": { "type": "object", "additionalProperties": true },
        "locale": { "type": "string" }
      }
    },
    "reviewPolicy": {
      "type": "object",
      "additionalProperties": false,
      "required": ["required"],
      "properties": {
        "required": { "type": "boolean" },
        "reason": { "type": "string" },
        "allowedResultTypes": {
          "type": "array",
          "items": { "type": "string", "enum": ["annotation", "graph_edit_operation", "runtime_state", "moderation_state", "none"] },
          "default": []
        }
      }
    },
    "result": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "annotationId": { "$ref": "#/$defs/stableId" },
        "operationId": { "$ref": "#/$defs/stableId" },
        "newGraphVersionId": { "$ref": "#/$defs/stableId" },
        "readerStateId": { "$ref": "#/$defs/stableId" },
        "notes": { "type": "string" }
      }
    }
  }
}
```


---

## schemas\document\raw-artifact.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/raw-artifact.schema.json",
  "title": "Raw Artifact",
  "description": "Immutable source artifact record for DataBase ingestion. Bytes may live in OpenList-backed storage; identity and lifecycle metadata belong to DataBase.",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "artifactId",
    "sha256",
    "mime",
    "sizeBytes",
    "originalName",
    "originalPath",
    "sourceUri",
    "storageUri",
    "importedAt",
    "immutable",
    "retentionPolicy"
  ],
  "properties": {
    "schemaVersion": { "type": "string", "const": "raw-artifact.v1" },
    "artifactId": { "$ref": "#/$defs/stableId" },
    "sha256": { "type": "string", "pattern": "^(sha256:)?[a-fA-F0-9]{64}$" },
    "mime": { "type": "string", "minLength": 1 },
    "sizeBytes": { "type": "integer", "minimum": 0 },
    "originalName": { "type": "string", "minLength": 1 },
    "originalPath": { "type": "string", "minLength": 1 },
    "sourceUri": { "type": "string", "minLength": 1 },
    "storageUri": { "type": "string", "minLength": 1 },
    "importedAt": { "type": "string", "format": "date-time" },
    "immutable": { "type": "boolean", "const": true },
    "retentionPolicy": { "$ref": "#/$defs/retentionPolicy" },
    "derivatives": {
      "type": "array",
      "items": { "$ref": "#/$defs/derivativeRef" },
      "default": []
    },
    "referencedBy": {
      "type": "array",
      "items": { "$ref": "#/$defs/reference" },
      "default": []
    },
    "metadata": { "type": "object", "additionalProperties": true }
  },
  "$defs": {
    "stableId": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
    },
    "retentionPolicy": {
      "type": "object",
      "additionalProperties": false,
      "required": ["status"],
      "properties": {
        "status": { "type": "string", "enum": ["retain", "archive", "candidate_gc", "legal_hold"] },
        "reason": { "type": "string" },
        "reviewAfter": { "type": "string", "format": "date-time" }
      }
    },
    "derivativeRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["artifactId", "role"],
      "properties": {
        "artifactId": { "$ref": "#/$defs/stableId" },
        "role": { "type": "string", "enum": ["extracted-structure", "canonical-document", "content-graph", "projection", "asset", "thumbnail", "ocr-text", "layout-map"] },
        "path": { "type": "string" }
      }
    },
    "reference": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "type"],
      "properties": {
        "id": { "$ref": "#/$defs/stableId" },
        "type": { "type": "string", "minLength": 1 },
        "role": { "type": "string" }
      }
    }
  }
}

```


---

## schemas\document\reader-runtime-state.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://database.tengokukk.com/schemas/document/reader-runtime-state.schema.json",
  "title": "Reader Runtime State",
  "description": "User/session reader runtime state pointing to graph versions and anchors, not canonical document truth.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "stateId", "userId", "packageId", "graphVersionId", "currentAnchorId", "progress", "layoutProfile", "updatedAt"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "reader-runtime-state.v1" },
    "stateId": { "$ref": "#/$defs/stableId" },
    "userId": { "$ref": "#/$defs/stableId" },
    "packageId": { "$ref": "#/$defs/stableId" },
    "graphVersionId": { "$ref": "#/$defs/stableId" },
    "currentAnchorId": { "$ref": "#/$defs/stableId" },
    "progress": { "$ref": "#/$defs/progress" },
    "layoutProfile": { "$ref": "#/$defs/layoutProfile" },
    "runtimeLocations": { "type": "array", "items": { "$ref": "#/$defs/runtimeLocationRef" }, "default": [] },
    "annotationRefs": { "type": "array", "items": { "$ref": "#/$defs/stableId" }, "default": [] },
    "updatedAt": { "type": "string", "format": "date-time" }
  },
  "$defs": {
    "stableId": { "type": "string", "minLength": 1, "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$" },
    "progress": {
      "type": "object",
      "additionalProperties": false,
      "required": ["percentage"],
      "properties": {
        "percentage": { "type": "number", "minimum": 0, "maximum": 1 },
        "displayLabel": { "type": "string" }
      }
    },
    "layoutProfile": {
      "type": "object",
      "additionalProperties": false,
      "required": ["fontScale", "lineHeight", "theme", "viewport"],
      "properties": {
        "fontScale": { "type": "number", "minimum": 0.1 },
        "lineHeight": { "type": "number", "minimum": 0.1 },
        "theme": { "type": "string" },
        "viewport": { "type": "object", "additionalProperties": true }
      }
    },
    "runtimeLocationRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["anchorId", "projectionType", "locator"],
      "properties": {
        "anchorId": { "$ref": "#/$defs/stableId" },
        "projectionType": { "type": "string" },
        "locator": { "type": "object", "additionalProperties": true }
      }
    }
  }
}

```
