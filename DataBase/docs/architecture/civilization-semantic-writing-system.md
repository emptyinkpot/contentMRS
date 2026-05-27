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
