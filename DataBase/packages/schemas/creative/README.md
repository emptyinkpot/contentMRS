# Creative Contracts

This directory is the canonical contract source for DataBase-owned creative
writing contracts.

## Ownership

DataBase owns:

- creative style protocol shape
- author profile shape
- writing task type shape
- interest cluster shape
- lexicon lifecycle shape
- creative vocabulary and banned-word contract shape
- resolved creative context aggregate shape
- article acceptance contract shape and acceptance report shape

Consumers may implement their own repository or transport, but they must not
redefine these contract shapes as local product truth.

## Current Runtime Truth

The persisted truth is MySQL:

- `creative_style_protocols`
- `creative_style_modules`
- `creative_editing_steps`
- `creative_quality_rules`
- `creative_source_materials`
- `vocabulary`
- `banned_words`

The public read facade is:

```text
GET /creative/style-contract?protocol=immersive_historical_synthetic_narrative
GET /creative/context?workId=...
```

External product consumers must read these contracts through the Gateway facade.
They must not query `creative_style_*`, `vocabulary`, `banned_words`,
`content_parts`, `content_blocks`, or legacy narrative material directly when
resolving AI generation context. Direct MySQL access is reserved for
DataBase-owned migration, administration, and Gateway implementation code.

## CreativeContext v1

`ResolvedCreativeContext` is the stable AI-ready prompt aggregate. Its v1
consumer surface is:

- `narrativeState`
- `semanticState`
- `styleState`
- `publicationState`
- `runtimeSnapshot`

The lower-level fields `parts`, `recentBlocks`, `currentPart`,
`semanticContext`, `publicationTargets`, `snapshot`, and `counts` remain for
compatibility and diagnostics, but they are not the preferred generation input
boundary.

## Local Package

The local package name is:

```text
@emptyinkpot/database-creative-contracts
```

It is a schema-first contract package. `creative-style-contract.ts` exports Zod
schemas, inferred TypeScript types, and parse helpers. It must not grow database
clients, model routing, or product logic.

The package artifact is a formal consumer boundary and must publish both module
formats:

- ESM consumers use `exports.import`.
- CommonJS consumers use `exports.require`.

This is not a consumer-side compatibility layer. It is the DataBase-owned
contract package declaring its supported runtime formats so ContentBase and
other products do not need local shims.

Runtime consumers should use the DataBase Gateway contract path above,
preferably through a generated client derived from `gateway/openapi.yaml`. If a
consumer needs runtime validation at an adapter boundary, it may import the Zod
schema from this package instead of redefining the shape locally.

## Article Acceptance Contract

`article-acceptance-contract.ts` is the executable adapter contract for long
article generation acceptance. It does not create a second policy truth. It
combines the DataBase-owned creative rules with task-scoped acceptance input and
returns an `article-acceptance-report.v1` report.

The current v1 gate explicitly covers:

- required and forbidden case coverage
- required source and citation anchor coverage
- visible inline source anchors in body, such as `[S34]`
- per-part minimum non-whitespace character counts
- banned punctuation and leaked internal structure headings
- narrator leakage, AI/business terms, and banned terms
- Europeanized or translation-like syntax patterns
- unsupported concrete imagery patterns
- seamless installment leakage such as visible upper/lower part markers
- preferred term hit minimums

ContentBase may execute this contract through
`@emptyinkpot/database-creative-contracts`, but it must not persist a local
replacement registry for author profile, preferred terms, banned terms,
structure policy, citation policy, imagery policy, or article acceptance rules.
If those policies become durable configuration, their owner is DataBase Gateway
and the schema in this package remains the contract boundary.
