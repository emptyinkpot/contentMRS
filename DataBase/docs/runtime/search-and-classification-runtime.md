# Search And Classification Runtime

## Current Gap

DataBase currently has real stored data, a callable curation MVP, and a P0
EvidencePack read surface over indexed chunks. NotebookLM-class retrieval can
enter through DataBase-owned EvidenceProvider backends such as RAGFlow, but the
public consumer contract remains one EvidencePack shape.

The missing runtime layer is:

```text
raw source tables
  -> normalized search documents
  -> chunks
  -> keyword index
  -> vector index
  -> AI labels
  -> operator decisions
  -> safe query surfaces
```

## Runtime Principle

MySQL remains the structured data truth.

Search engines and vector stores are projections. They may be rebuilt from
MySQL and object/file storage. They must not become the only copy of personal
data.

## P0 Components

| Component | Owner | Status | Role |
| --- | --- | --- | --- |
| MySQL `search_documents` | DataBase | planned/callable | Canonical searchable document projection metadata |
| MySQL `search_chunks` | DataBase | planned/callable | Chunked text for retrieval and embedding |
| MySQL `search_index_jobs` | DataBase | planned/callable | Rebuild/index job ledger |
| Gateway `GET /evidence/search` | DataBase | P0 active | Wraps indexed chunks and semantic reference units as EvidencePack for ContentBase writing |
| Meilisearch | runtime service | candidate | Fast keyword/facet search API |
| Qdrant | runtime service | candidate | Vector search / semantic retrieval |
| sub2api | model gateway | active | Replaceable embedding/classification model access |
| Mortis | operator runtime | active consumer | Natural-language query/operator surface |

## Recommended Mature Sources To Reuse

### Meilisearch

Repository:

https://github.com/meilisearch/meilisearch

Borrow:

- typo-tolerant keyword search
- faceted filtering
- REST API indexing model
- small service deployment shape

Do not copy:

- custom search engine internals

### Qdrant

Repository:

https://github.com/qdrant/qdrant

Borrow:

- vector collection model
- payload filters
- local Docker deployment pattern
- semantic search API

Do not copy:

- vector database internals

### LlamaIndex

Repository:

https://github.com/run-llama/llama_index

Borrow:

- ingestion pipeline vocabulary
- document/chunk/node model
- retriever abstraction
- metadata-aware RAG patterns

Do not copy:

- full framework dependency unless the pipeline grows beyond simple workers

### Haystack

Repository:

https://github.com/deepset-ai/haystack

Borrow:

- pipeline graph model
- retriever/generator split
- RAG evaluation vocabulary

Do not copy:

- full orchestration stack for P0

### OpenMetadata / DataHub

Repositories:

- https://github.com/open-metadata/OpenMetadata
- https://github.com/datahub-project/datahub

Borrow:

- dataset/source/owner/tag vocabulary
- schema discovery and lineage concepts
- data catalog visibility model

Do not copy:

- full metadata platform as the first step

## Data Domains

Search surfaces must be separated by domain:

| Domain | Searchable by default | Notes |
| --- | --- | --- |
| public/reference | yes | safe for broad search |
| private knowledge | yes, operator-only | notes, documents, writing material |
| sensitive | restricted | requires explicit operator intent |
| secret | no generic search | passwords, cookies, API keys, account exports |
| archive-only | hidden by default | damaged/tiny/low-value records |

Secret tables may be stored in MySQL, but they must not be pushed into generic
Meilisearch/Qdrant indexes.

## P0 MySQL Schema

```text
search_documents
search_chunks
search_index_jobs
```

`search_documents` stores one logical searchable document per source record.

`search_chunks` stores chunked text with privacy metadata. Chunks are safe to
rebuild.

`search_index_jobs` records rebuild attempts and target index status.

## Callable Entry

```powershell
.\scripts\build-search-index.ps1 -Limit 20
.\scripts\build-search-index.ps1 -Limit 20 -Apply
```

Dry-run creates the schema and reports candidate source records.

Apply writes MySQL search projection rows. External Meilisearch/Qdrant push is a
future step and must use explicit service URLs and API keys.

## Local Book Corpus Import

Large local books are durable source material, not prompt snippets. They must be
absorbed into DataBase before ContentBase can reliably use them.

The canonical P0 importer is:

```powershell
cd "E:\My Project\DataBase\apps\gateway"
npm run import:local-book-corpus
npm run import:local-book-corpus -- --apply
```

Default source:

```text
E:\Vaults\Obsidian\docs\books\兴亡的世界史全21卷.md
E:\Vaults\Obsidian\docs\books\original\兴亡的世界史全21卷.epub
```

The importer is intentionally deterministic:

- removes image markdown and extractor notes from searchable text
- preserves heading locator, chapter/section, and source line numbers
- writes one `literature` original record
- replaces one `search_documents` projection for the configured `sourceId`
- replaces all `search_chunks` for that source on rerun
- writes sampled `semantic_units` as reusable document/theory/literary material cards

The current `兴亡的世界史全21卷` dry-run produces roughly 4,000 chunks. This is the
right scale for ContentBase EvidencePack search: the model receives selected
evidence, not the whole book. Qwen or another low-cost model can later be added
as an enrichment pass that reads these chunks and writes more precise semantic
cards under the same `sourceId`; it must not create a ContentBase-local style
registry.

Override example:

```powershell
npm run import:local-book-corpus -- `
  --sourceMd "E:\Vaults\Obsidian\docs\books\兴亡的世界史全21卷.md" `
  --sourceEpub "E:\Vaults\Obsidian\docs\books\original\兴亡的世界史全21卷.epub" `
  --sourceId "book_xingwang_world_history_21" `
  --chunkChars 1800 `
  --semanticSamples 120 `
  --apply
```

Restricted copyright EPUB style reference example:

```powershell
npm run import:local-book-corpus -- `
  --sourceEpub "C:\Users\ASUS-KL\Downloads\金阁寺.epub" `
  --sourceId "book_kinkakuji_restricted_style" `
  --title "金阁寺" `
  --author "三岛由纪夫" `
  --category "restricted-style-reference" `
  --sourceFormat epub `
  --copyrightMode restricted-style-reference `
  --chunkChars 1200 `
  --semanticSamples 80 `
  --apply
```

`restricted-style-reference` is deliberately not a reusable sentence-copy
library. The importer stores the operator-owned original as a private
`literature` record, but the `search_chunks` projection contains derived
style/syntax profiles: sentence-length bands, paragraph density, rhetorical
moves, progression moves, and imagery clusters. Generated output may use these
profiles for syntax, rhetoric, paragraph motion, and imagery relationships. It
must not reproduce sentences or long passages from the original source.

The current local `金阁寺` import uses source id:

```text
book_kinkakuji_restricted_style
```

It writes a restricted private source with style/syntax tags, eleven derived
search chunks, and eleven literary semantic cards. ContentBase should consume it
through StylePack for syntax/rhetoric reference, or through EvidencePack only
when the derived profile itself is needed as evidence that a style source exists.
It must never read the EPUB directly.

After import, verify through the normal evidence surface:

```text
GET /evidence/search?q=文明 亲手 理解&limit=8
```

ContentBase must consume the result as `EvidencePack` / future `StylePack` /
`CitationPack`. It must not read the Obsidian file directly.

## P0 StylePack Query

```text
GET /style/pack?q=<query>&sourceIds=book_kinkakuji_restricted_style&limit=6
```

The response is `style-pack.v1`:

```text
profiles[]
syntaxProfiles[]
rhetoricalMoves[]
imageryClusters[]
paragraphMoves[]
constraints[]
screening
```

This is the DataBase-owned style/syntax projection for ContentBase. It is not a
fact source, not a citation source, and not a reusable sentence-copy library.
Restricted copyright sources must keep a no-copy boundary in `constraints`.
ContentBase should place StylePack beside the creative contract in the prompt,
not mix it into EvidencePack factual material.

## P0 EvidencePack Query

```text
GET /evidence/search?q=<query>&limit=10
```

To constrain a query to an imported corpus, pass comma/space separated
`sourceIds`:

```text
GET /evidence/search?q=<query>&sourceIds=book_xingwang_world_history_21&limit=10
```

This endpoint reads `search_documents` / `search_chunks` and DataBase-owned
`semantic_units`, then returns:

```text
EvidenceSource[]
EvidenceChunk[]
EvidenceCitation[]
EvidencePack.constraints
```

It is the current ContentBase-facing NotebookLM-style boundary. It proves that
writing context came from DataBase material, but it does not make raw OpenList
files searchable by itself. A book or file must still pass through extraction,
chunking, indexing, or the controlled semantic reference material write facade
before it can appear in this EvidencePack.

`semantic_units` are included because reusable reference materials can enter
DataBase through the semantic write facade before the general search projection
is rebuilt. Consumers still receive one public EvidencePack shape: `sources`,
`chunks`, `citations`, `queryRun`, `screening`, and `counts`. They must not query
`semantic_units` directly as a second evidence path.

The route records `screening.sourceFilterIds` and per-round
`sourceFilterCount` when `sourceIds` is present. Ranking favors body chunk text,
then locator/chapter/section metadata, and treats title/source id matches as weak
signals. This prevents a large book title from pushing bibliography, catalogue,
or cover-note chunks ahead of actually relevant passages.

When `includeWeb=true`, the route calls the configured
`DATABASE_EVIDENCE_WEB_SEARCH_URL` and records the round as `web.search`.
Without that provider, the route fails with a configuration error instead of
creating local fallback web evidence.

When `includeRagflow=true`, the same route calls RAGFlow's official
`POST /api/v1/retrieval` endpoint through DataBase Gateway configuration:

```text
DATABASE_EVIDENCE_RAGFLOW_URL
DATABASE_EVIDENCE_RAGFLOW_API_KEY
DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS
DATABASE_EVIDENCE_RAGFLOW_DOCUMENT_IDS            # optional
DATABASE_EVIDENCE_RAGFLOW_SIMILARITY_THRESHOLD   # optional, default 0.2
DATABASE_EVIDENCE_RAGFLOW_VECTOR_WEIGHT          # optional, default 0.3
DATABASE_EVIDENCE_RAGFLOW_TOP_K                  # optional, default 1024
DATABASE_EVIDENCE_RAGFLOW_USE_KG                 # optional, default false
DATABASE_EVIDENCE_RAGFLOW_TOC_ENHANCE            # optional, default false
```

RAGFlow is integrated through its retrieval API contract only; the workspace
no longer keeps a local `_upstreams/ragflow` mirror. Its frontend, document database, queues, and workflow runtime are not
copied into DataBase or ContentBase. The DataBase Gateway maps RAGFlow chunks
into `EvidenceSource`, `EvidenceChunk`, `EvidenceCitation`, and
`queryRun.rounds[].provider = "ragflow.retrieval"`. If the required RAGFlow
configuration is missing, the route fails with a configuration error instead of
falling back to local keyword search.

RAGFlow runtime readiness has a stricter gate than ordinary HTTP readiness:
the configured API key must see the configured dataset, the dataset must expose
a non-empty embedding model, and `POST /api/v1/retrieval` must return at least
one text-bearing chunk for the smoke query. Dataset creation alone is not enough,
because a dataset with no embedding backend cannot build a usable retrieval
index. Use the canonical gateway script:

```powershell
cd "E:\My Project\DataBase\apps\gateway"
npm run smoke:ragflow-evidence -- --envFile "C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env" --query "新地主阶级 通道租"
```

Local Docker RAGFlow can satisfy this by starting RAGFlow with an embedding
backend such as TEI and `COMPOSE_PROFILES` containing `tei-cpu`, or by configuring
a valid external embedding provider through RAGFlow's native model provider
settings. If embedding startup exhausts Docker/WSL resources, stop the local TEI
attempt and use an external provider; do not report `includeRagflow=true` as
complete until the smoke returns chunks.

Current local status: the DataBase Gateway provider code and the smoke entrypoint
are in place, and `DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS` is configured for the
minimal dataset created in RAGFlow. The local Docker/WSL runtime is not currently
stable enough to keep `http://127.0.0.1:9380/healthz` reachable, so the smoke
fails at the transport-readiness gate before dataset retrieval. This is the
correct failure mode. The next runtime step is to restore RAGFlow API health,
then configure a real RAGFlow embedding provider through RAGFlow's native model
settings and re-index a source document until `/api/v1/retrieval` returns chunks.

Gateway health now also reports optional provider reachability:

```text
GET /health
GET /health/dependencies
GET /health/ragflow
```

The first two responses include `optionalDownstreams.ragflow`. Values are
`not_configured`, `misconfigured`, `ok`, or `error`. This is only an HTTP
reachability signal for the RAGFlow provider; it does not replace
`smoke:ragflow-evidence`, which remains the completion gate for dataset
visibility, embedding model readiness, and real chunk retrieval.

`GET /health/ragflow` returns the full DataBase Gateway readiness report for the
RAGFlow provider. By default it checks configuration, `/healthz`, dataset
visibility, and embedding configuration. Add `?retrieval=true` to require real
text-bearing chunks from RAGFlow retrieval:

```text
GET /health/ragflow?retrieval=true&q=新地主阶级%20通道租&limit=10
```

The readiness statuses are:

```text
not_configured
misconfigured
http_error
dataset_error
dataset_missing
embedding_missing
retrieval_empty
retrieval_without_text
ok
```

## Future Runtime Addresses

Recommended internal defaults:

```text
Meilisearch internal: http://127.0.0.1:17700
Qdrant internal: http://127.0.0.1:16333
```

Do not publish these services directly until authentication, backup, and
index-rebuild procedures are documented.

## Mortis Query Path

Target:

```text
operator natural language
  -> Mortis
  -> DataBase search API / script
  -> MySQL + Meilisearch + Qdrant
  -> result artifact
  -> Mortis timeline / Telegram
```

Mortis should not query raw secret tables through generic search. It should call
explicit secret-domain workflows when the operator asks for password/account
data.
