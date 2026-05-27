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
