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
tests/acceptance/validate-writer-contract.mjs
tests/acceptance/validate-novel-action-contract.mjs
tests/acceptance/generate-article-through-runtime.ps1
```

`evidence-pack-smoke.mjs` validates DataBase EvidencePack only.

`generate-article-mvp.mjs` calls the runtime and fails if model invocation, article body, or EvidencePack is missing.

RAGFlow belongs to Retrieval through DataBase Gateway. ContentBase must not call RAGFlow directly. When a run requires RAGFlow, DataBase EvidencePack must contain RAGFlow-backed sources, chunks and citations before Composition.

Acceptance entrypoints:

```text
pnpm run acceptance:writer-contract
pnpm run acceptance:novel-action-contract
pnpm run acceptance:article-runtime
```

`acceptance:writer-contract` is a cheap contract check: the Writer must be pinned by `CONTENTBASE_LLM_MODEL` and must not accept request-provided or fallback models. `acceptance:novel-action-contract` is a fail-closed ownership check for `POST /api/novel/runtime/actions/generate-chapter`; it must stay red until ContentBase owns a real chapter action instead of forcing novel-factory through the article endpoint. `acceptance:article-runtime` is the live check: it calls `POST /api/content/runtime/generate/article`, requires a real model invocation, requires DataBase EvidencePack with RAGFlow evidence, and fails if the returned Writer model is not `claude-sonnet-4-6`.

## Writer Test Suite

Shared diagnostic source: `tests/e2e/diagnostics.mjs`. Both runners import it; banned-word lists, response accessors, product-naming and split rules, and the 8-section diagnostics block live there only.

### Two run paths

```text
Full suite : pnpm test:e2e            (tests/e2e/contentbase-writer-e2e.mjs)
             20 cases / 6 groups. INFRA runs first; if it fails the whole suite aborts.
             Writes baseline/last-run.json, diffs against the previous run for
             regressions / fixes / new cases.
             Exit codes: 0 all pass / 1 any fail / 2 any regression.

Single re-run : node tests/e2e/regenerate-with-diagnostics.mjs "<topic>" [wordCount]
                One topic, full diagnostics block, no pass/fail gate.
```

Both call `POST /api/content/runtime/generate/article` with `authorization: Bearer <cb-key>` and write articles to `C:/Users/ASUS-KL/Downloads/`.

### Product naming and split

```text
Full suite    -> {ID}_{safeName(topic)}.md   e.g. STYLE_001_日本战后宪法第九条的实际约束力.md
Single re-run -> REGEN_{safeName(topic)}.md

ID 001-020 is a global continuous sequence (order cases were added), prefix = group
(STYLE / TOPIC / EDGE / INFRA / ASSOC / POS).
safeName = strip non-CJK / non-\w chars, keep first 30 chars.

File body = article + diagnostics block. The block starts with "---\n## 质量评估"
(markdown horizontal rule + H2) as the split anchor; article above, metrics below.
```

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
8. **Token budget reform**: dynamic from model context window (×0.45), default 57K tokens, hard cap 120K. Eliminates 850K hardcode that caused 524 errors.
9. **Post-packing Reality gate**: generation fails closed if zero Reality items survive context packing. Enforces README hard boundary at the packed-result level, not just API-response level.
10. **Literary channel reform**: removed per-term lexical flooding (12 terms × N results). Now vector-only with limit 5 as topic-aware supplement. Main literary material comes from `/content/literature` and style-contract. Prevents literary channel from drowning Reality.

### Retrieval Architecture Reform

Core principle: **美来自固定的风格锚点，事实来自少量深度材料。** 广撒网策略同时稀释美和淹没事实。

#### Literary Channel: Style Pool, Not Topic Search

Literary 的检索维度是句法密度、意象浓度、段落节奏——跟文章主题无关。一段三岛由纪夫写樱花的文字对满洲征服文章的文体价值，远超一段平庸的满洲史料。

规则：
- Literary 不再用 topic query 搜索。
- 预先标注一批高质量段落作为 style exemplars，按写作协议（immersive_historical 等）调取固定 3-5 段范本。
- 允许少量 topic-aware literary 补充（上限 5 条），但主体是固定风格池。
- Literary 的价值是"怎么写"，不是"写什么"。

#### Reality Channel: Deep Not Wide

现在 evidence search 返回大量浅层 300 字摘要。历史题目需要的不是 50 条 snippet，而是 3-5 条 2000 字的深度段落。

规则：
- Reality 优先返回长文本（fullText >= 1200 chars）。
- 短摘要（< 400 chars）仅作为补充，不计入 Reality 主体。
- RAGFlow 向量检索必须参与 Reality 构建（历史/文学题目的事实来源）。
- Reality 为空时生成必须 fail closed（post-packing gate，不仅是 API response gate）。

#### Lexicon/Structure/Author: Cacheable Fixed Channels

这三个 channel 跟 topic 基本无关——禁用词表、句式偏好、作者人格不因写满洲还是弗洛伊德而变。

规则：
- Lexicon/Structure/Author 可缓存，不必每次 API 调用。
- 优先从本地缓存或 system prompt 固定段读取。
- 仅当 style-contract 版本变更时重新拉取。

#### Token Budget: Dynamic, Not Hardcoded

规则：
- Token budget 从 Writer model 的实际 context window 反推。
- 公式：`usable_budget = model_context_window × 0.45 - system_prompt_tokens - output_reserve`
- 禁止硬编码超过任何已知模型窗口的数字。
- 上限 45-50% 窗口利用率。原因：lost-in-the-middle 效应、成本线性增长、材料稀释。
- 预算收紧后靠 reranker 质量取胜，不靠数量。

#### Post-Packing Reality Gate

`assertEvidencePack` 只验证 API 返回了数据。必须在 `composeByBudget` 之后加第二道门禁：

```text
if packed Reality items == 0 → fail closed
if packed Reality chars < 500 → warn "Reality thin, Writer output must stay narrow"
```

### Budget Allocation Target

```text
Total usable: model_context × 0.45 (e.g. 128K × 0.45 ≈ 57K tokens ≈ 45K chars)

Reality:   35% of usable budget (deep factual material, non-negotiable)
Literary:  25% of usable budget (style exemplars, fixed pool + minimal topic supplement)
Semantic:  10% of usable budget
Lexicon:   12% of usable budget (compressed, only critical rules)
Structure: 8% of usable budget
Author:    10% of usable budget
```

Literary 是最大的非 Reality channel，但它的内容是精选的风格范本，不是主题搜索的洪水。

## Root Files

Allowed root files are package/workspace metadata, `server.mjs`, `project.json`, scripts that start or validate the allowed runtime, schema files, and DataBase generated artifacts.

All other runtime surfaces must be deleted instead of preserved as compatibility paths.
