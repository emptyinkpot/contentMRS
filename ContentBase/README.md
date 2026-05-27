# ContentBase

## Vocabulary Rule

一个概念只能有一个名字，能用旧名字就禁止造新名字。严禁出现近义词，非黑即白，词汇永远精简。

ContentBase composes retrieved context and calls one Writer.

## Runtime Constitution

The runtime surface is:

```text
Corpus
-> Retrieval
-> Composition
-> Writer
```

Anything outside this chain is not legal runtime.

## Allowed Owners

| Owner | Allowed responsibility |
| --- | --- |
| DataBase Gateway | durable corpus, EvidencePack, RAGFlow retrieval, source metadata, citations |
| Search/Web provider | temporary current reality material through DataBase |
| ContentBase | request normalization, corpus retrieval, context composition, Writer call |
| Writer | one complete article body |

## Canonical Vocabulary

One concept has one name.

Runtime names:

```text
Corpus
Retrieval
Composition
Writer
```

Corpus categories:

```text
Reality
Literary
Semantic
Lexicon
Structure
Author
```

Definitions:

| Name | Meaning |
| --- | --- |
| Corpus | system-owned material |
| Retrieval | how material is found |
| Composition | how retrieved material becomes context |
| Writer | one generation call |
| Reality | reality corpus |
| Literary | literary corpus |
| Semantic | semantic corpus |
| Lexicon | lexicon corpus |
| Structure | structure corpus |
| Author | long-term personal memory |

Before adding a term, check whether it is only an alias for one of these names. If it can fit an existing name, do not add a new name.

## Hard Boundary

Reality is required. If `DATABASE_GATEWAY_URL` is missing, EvidencePack is missing, or EvidencePack has no usable sources/chunks/citations, generation must fail closed.

The runtime must not fall back to freeform prose.

Reality-only is not the complete article runtime. Reality is the factual floor. Composition must also include corpus material when available:

```text
Reality
+ Literary
+ Semantic
+ Lexicon
+ Structure
+ Author
```

These corpus channels are not gates and not post-processing rules. They enter before the Writer as retrieved context.

## Forbidden Runtime

These are not allowed in ContentBase runtime:

- prose police
- evaluator chain
- revision loop
- rewrite loop
- AST repair
- source excerpt article assembly
- fallback body
- soft generation router
- notebook/material scope fallback
- corpus contract as post-generation control
- semantic/literary/lexicon/structure/author corpus used as prose policing
- local topic/source/category registries
- detached banned-word/preferred-word/prose rule files
- hidden Dify workflow logic
- multi-writer orchestration

## Article Runtime

The only article context builder is:

```text
product/novel/app/article/context-engine.ts
```

It may:

- call DataBase `/evidence/search`
- receive RAGFlow material only through DataBase EvidencePack
- call DataBase `/semantic/units`
- call DataBase `/vocabulary/search`
- call DataBase `/creative/style-contract`
- call DataBase `/content/literature`
- call DataBase `/creative/author-profile`
- call DataBase `/search` (literary corpus full-text search, split by jieba segmentation)
- call DataBase `/search/vector` (literary corpus vector search via RAGFlow)
- require queryRun, screening, sources, chunks and citations
- normalize chunks into context
- compose Reality, Literary, Semantic, Lexicon, Structure and Author channels when retrieval returns them
- rank, dedupe and pack context (jieba-aware term scoring, literary boost)
- build a Writer prompt from composed context
- return diagnostics

It may not:

- invent facts
- call literary, semantic, lexicon, structure or author channels as evaluator/rewrite sidecars
- route through notebook fallback
- treat warnings as success when Reality is absent
- repair or rewrite the article body

## Required Functions

Normal operation requires these functions to be working:

```text
Corpus
Retrieval
Composition
Writer
Ingredient Audit
Public Tooling
HTTP Runtime
Health
Deployment
Project Checks
```

Required Corpus sources:

```text
Reality: DataBase EvidencePack from /evidence/search
Literary: DataBase /content/literature
Semantic: DataBase /semantic/units and corpus contract material
Lexicon: DataBase /vocabulary/search and corpus contract lexicon
Structure: DataBase corpus contract structure material
Author: DataBase /creative/author-profile and corpus contract author material
```

Required Retrieval inputs:

```text
DATABASE_GATEWAY_URL
DATABASE_GATEWAY_API_KEY when the Gateway requires it
includeWeb when current Web material is required
includeRagflow when RAGFlow material is required
ragflowDatasetIds when the run must constrain RAGFlow datasets
```

Required Writer inputs:

```text
CONTENTBASE_LLM_BASE_URL
CONTENTBASE_LLM_API_KEY
CONTENTBASE_LLM_MODEL
```

`SUB2API_NOVEL_BASE_URL`, `SUB2API_NOVEL_API_KEY` and `SUB2API_NOVEL_MODEL` may populate the same Writer inputs when the runtime env provides them.

Required HTTP runtime:

```text
GET /api/health
GET /healthz
GET /api/novel/health
POST /api/content/runtime/generate/article
```

Required project checks:

```text
pnpm run ci
pnpm run structure:check
```

## Context Ingredient Audit

Every generation must make the final context auditable with the existing categories only:

```json
{
  "reality": {
    "loaded": true,
    "chars": 0,
    "sources": 0,
    "fulltext_ratio": 0
  },
  "literary": {
    "loaded": true,
    "units": 0,
    "chars": 0
  },
  "semantic": {
    "loaded": true,
    "units": 0,
    "chars": 0
  },
  "lexicon": {
    "loaded": true,
    "units": 0,
    "chars": 0
  },
  "structure": {
    "loaded": true,
    "patterns": 0
  },
  "author": {
    "loaded": true,
    "chars": 0
  },
  "composition": {
    "order": [
      "reality",
      "literary",
      "semantic",
      "lexicon",
      "structure",
      "author"
    ],
    "truncated": []
  }
}
```

The audit is not a scoring layer. It only proves what reached the final Writer prompt. Retrieval counts are not enough; the final prompt must be inspectable by section:

```text
[REALITY]
...

[LITERARY]
...

[SEMANTIC]
...

[LEXICON]
...

[STRUCTURE]
...

[AUTHOR]
...
```

If a category is retrieved but missing from the final Writer prompt, the runtime wiring is wrong. If Reality is thin, the Writer output must stay narrow.

## Public Tooling

Allowed tools:

```text
product/novel/tools/evidence-pack-smoke.mjs
product/novel/tools/generate-article-mvp.mjs
```

`evidence-pack-smoke.mjs` validates DataBase EvidencePack only.

`generate-article-mvp.mjs` calls the runtime and fails if model invocation, article body, or EvidencePack is missing.

RAGFlow belongs to Retrieval through DataBase Gateway. ContentBase must not call RAGFlow directly. When a run requires RAGFlow, DataBase EvidencePack must contain RAGFlow-backed sources, chunks and citations before Composition.

## Retrieval Architecture

### Current Retrieval Layers

```text
Layer 1: Reality (EvidencePack)
  Source: DataBase /evidence/search
  Method: Web + RAGFlow through Gateway
  Purpose: factual floor, current events, citations

Layer 2: Literary Corpus (hybrid)
  Source: DataBase /search + /search/vector
  Method: jieba segmentation → per-term LIKE query, plus RAGFlow semantic retrieval from contentmrs-literary-corpus
  Purpose: style reference, prose examples, historical parallels, semantic matches without exact character overlap
  Volume: MySQL search projection plus RAGFlow dataset bdcc99c658f111f18aecb3d695a2553d

Layer 3: Literary Corpus (curated)
  Source: DataBase /content/literature
  Method: keyword search on curated literature entries
  Purpose: structured literary reference with metadata

Layer 4: Semantic Units
  Source: DataBase /semantic/units
  Method: keyword search
  Purpose: semantic reference material, thematic context

Layer 5: Lexicon
  Source: DataBase /vocabulary/search + /creative/style-contract lexicon
  Method: direct load
  Purpose: banned words, preferred words, quality rules
  Compression: preferred list capped at 120 items to save budget

Layer 6: Structure
  Source: DataBase /creative/style-contract (modules, editingSteps, qualityRules)
  Method: direct load
  Purpose: writing structure rules, editing constraints

Layer 7: Author
  Source: DataBase /creative/author-profile + /creative/style-contract (authorTechniques)
  Method: direct load
  Purpose: long-term author voice, techniques, preferences
```

### Retrieval Improvements (completed)

1. jieba-wasm segmentation for Chinese query splitting
2. Per-term parallel search on `/search` endpoint (limit ~27 per term)
3. Lexicon compression (preferred 940→120, saving ~51k chars for literary)
4. Improved scoring: literary items with topic-term hits get priority boost
5. Multi-term hit bonus in ranking (2+ hits = +15, 3+ hits = +30)
6. RAGFlow-backed `/search/vector` Gateway route for `contentmrs-literary-corpus`
7. ContentBase context packing now merges LIKE and vector Literary results, with vector items prioritized above lexical hits

### Retrieval Improvements (planned)

1. **Complete full RAGFlow indexing** — continue monitoring `contentmrs-literary-corpus` until all uploaded documents finish parsing and then upload any remaining book chunks not yet present in the dataset.
2. **Query expansion** — use the topic + Reality material to generate secondary search terms that capture related themes not present in the original query.
3. **Cross-encoder reranking** — after retrieval, use a lightweight model to score each chunk's actual relevance to the article topic, dropping noise before packing.
4. **Diverse sampling** — for literary corpus, always include a small set of high-quality prose samples regardless of topic match, ensuring style reference is never zero.

### Budget Allocation Target

```text
Reality:   30-40k chars (factual floor, non-negotiable)
Literary:  30-50k chars (style reference, should be largest corpus channel)
Semantic:  3-5k chars
Lexicon:   10-15k chars (compressed, only critical rules)
Structure: 5-8k chars
Author:    7-10k chars
```

Literary corpus should be the largest non-Reality channel. It provides the prose DNA that distinguishes output from generic LLM text.

## Root Files

Allowed root files are package/workspace metadata, `server.mjs`, `project.json`, scripts that start or validate the allowed runtime, schema files, and DataBase generated artifacts.

All other runtime surfaces must be deleted instead of preserved as compatibility paths.
