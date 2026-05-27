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
