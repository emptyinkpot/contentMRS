# novel

## Vocabulary Rule

一个概念只能有一个名字，能用旧名字就禁止造新名字。严禁出现近义词，非黑即白，词汇永远精简。

`product/novel` owns the article runtime surface for ContentBase.

## Allowed Chain

```text
Corpus
-> Retrieval
-> Composition
-> Writer
```

## Allowed Files

```text
app/article/context-engine.ts
tools/evidence-pack-smoke.mjs
tools/generate-article-mvp.mjs
package.json
tsconfig.json
README.md
```

## Context Engine Contract

`app/article/context-engine.ts` is the only article context owner.

It must:

- require `DATABASE_GATEWAY_URL`
- load DataBase EvidencePack from `/evidence/search`
- receive RAGFlow material only through DataBase EvidencePack
- load Semantic from `/semantic/units`
- load Lexicon from `/vocabulary/search`
- load Structure and Author material from `/creative/style-contract`
- load Literary from `/content/literature`
- load Author from `/creative/author-profile`
- fail when queryRun, screening, sources, chunks or citations are missing
- compose retrieved context
- include Reality as the factual floor
- include Literary, Semantic, Lexicon, Structure and Author corpus material when retrieval returns it
- return diagnostics

It must not:

- use notebook scope fallback
- use corpus contract as a post-generation controller
- use semantic/literary/lexicon/structure/author corpus as post police
- use local topic/category/source registries
- allow missing Reality to continue into Writer
- rewrite, polish, repair or replace body text

## Composition Contract

The runtime must not confuse deletion of governance with deletion of corpus.

Allowed corpus channels:

```text
reality
literary
semantic
lexicon
structure
author
```

These channels must be packed into the final Writer prompt before model invocation. Lexicon is context, not a banned-word checker. Literary is corpus material.

If only Reality/Web evidence is present, the runtime may still generate a narrow analyst note. It must not pretend that thin evidence supports a long literary or geopolitical essay.

## Ingredient Audit

Every generation must expose the final context by the existing categories:

```text
[REALITY]
[LITERARY]
[SEMANTIC]
[LEXICON]
[STRUCTURE]
[AUTHOR]
```

The audit must report only these categories:

```json
{
  "reality": { "loaded": true, "chars": 0, "sources": 0, "fulltext_ratio": 0 },
  "literary": { "loaded": true, "units": 0, "chars": 0 },
  "semantic": { "loaded": true, "units": 0, "chars": 0 },
  "lexicon": { "loaded": true, "units": 0, "chars": 0 },
  "structure": { "loaded": true, "patterns": 0 },
  "author": { "loaded": true, "chars": 0 },
  "composition": {
    "order": ["reality", "literary", "semantic", "lexicon", "structure", "author"],
    "truncated": []
  }
}
```

Retrieval counts do not prove composition. The final Writer prompt is the only acceptance surface for whether a category was actually eaten by the Writer.

## Tool Contract

`generate-article-mvp.mjs` is only a smoke runner for the canonical runtime. It must fail when the runtime response lacks a body, real model invocation, or EvidencePack.

`evidence-pack-smoke.mjs` is only a DataBase EvidencePack validator. It does not generate prose.

RAGFlow belongs to Retrieval through DataBase Gateway. It is valid only when its material appears inside DataBase EvidencePack before Composition.

Normal operation also requires the Writer inputs:

```text
CONTENTBASE_LLM_BASE_URL
CONTENTBASE_LLM_API_KEY
CONTENTBASE_LLM_MODEL
```

The public HTTP generation entry is:

```text
POST /api/content/runtime/generate/article
```

## Deleted Surfaces

The product does not retain:

- legacy generation routes
- revision or rewrite tooling
- production acceptance profiles
- article loop tooling
- author style calibration
- soft generation defaults
- material notebook routing
- local topic/source/category registries
- vendored research engines
- golden article fixtures
- prompt baselines
- eval configs
