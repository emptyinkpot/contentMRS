# Corpus Ops

Corpus Ops is the DataBase Gateway operations module for reusable corpus work:
source-book intake, OCR, MySQL `literature` writes, RAGFlow indexing, retrieval
smoke checks, and generated-article corpus feedback.

It owns the operator workflow. It does not own Writer prompts, ContentBase
generation policy, or RAGFlow internals.

## Boundary

Canonical owner:

- MySQL durable source: `literature`
- Search projection: `search_documents`, `search_chunks`
- Vector projection: RAGFlow dataset configured by
  `DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS`
- Gateway retrieval surface: `/evidence/search`, `/search/vector`,
  `/search/unified`

Not owned here:

- Original copyrighted books
- `.codex-secrets`
- RAGFlow database files
- ContentBase generated bodies except when explicitly imported as author corpus

## Required Secrets

Load these from local secret files or process env before write operations:

```text
C:\Users\ASUS-KL\.codex-secrets\mysql\database_service_users.env
C:\Users\ASUS-KL\.codex-secrets\mysql\myblog.cnf
C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env
```

Required variables:

```text
MYSQL_HOST / host
MYSQL_PORT / port
MYSQL_USER / user
MYSQL_PASSWORD / password
MYSQL_DATABASE / database
DATABASE_READONLY_USER
DATABASE_READONLY_PASSWORD
DATABASE_CONTENT_RW_USER
DATABASE_CONTENT_RW_PASSWORD
DATABASE_GATEWAY_URL
DATABASE_GATEWAY_API_KEY
DATABASE_EVIDENCE_RAGFLOW_URL
DATABASE_EVIDENCE_RAGFLOW_API_KEY
DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS
```

Secrets and source books must never be committed.

## Source Manifest

`apps/gateway/scripts/import-manifest.json` lists local source files and metadata:

```json
{
  "path": "C:\\Users\\...\\Downloads\\book.epub",
  "title": "Book Title",
  "author": "Author",
  "category": "literary-style-reference"
}
```

The manifest is an operator inventory, not a guarantee that another machine has
the same files. A full reproduction needs either the same source files or a
database/RAGFlow export.

## Canonical Commands

Run from `DataBase/apps/gateway`.

```powershell
pnpm run corpus:import:books
pnpm run corpus:import:books -- --apply

pnpm run corpus:import:remaining
pnpm run corpus:import:remaining -- --apply

pnpm run corpus:ocr:pdfs
pnpm run corpus:ocr:pdfs -- --apply

pnpm run corpus:index:ragflow
pnpm run corpus:index:ragflow -- --apply

pnpm run corpus:import:baseline-articles
pnpm run smoke:ragflow-evidence -- --envFile "C:\Users\ASUS-KL\.codex-secrets\database-gateway\database_gateway.env" --query "满洲人 征服 中国"
```

Downstream ContentBase checks run from `ContentBase`.

```powershell
node product/novel/tools/evidence-pack-smoke.mjs --gatewayUrl "https://database.tengokukk.com" --query "满洲人 征服 中国" --includeRagflow true
node product/novel/tools/generate-article-mvp.mjs --topic "满洲人征服中国的历史" --targetWordCount 1000
node product/novel/baseline/baseline-run.mjs
node product/novel/baseline/quality-diff.mjs product/novel/baseline/scorecard.jsonl product/novel/baseline/scorecard.jsonl
```

## Workflow

1. Start Gateway and downstreams.
2. Verify secrets are loaded and RAGFlow is reachable.
3. Dry-run book import.
4. Apply book import into `literature`.
5. OCR scanned PDFs only when extracted text is too thin.
6. Index `literature` into RAGFlow.
7. Run RAGFlow smoke retrieval.
8. Run ContentBase EvidencePack smoke if ContentBase generation depends on it.
9. Generate article or run baseline.

## Script Catalog

Gateway-owned corpus scripts:

| Script | Purpose | Status |
|---|---|---|
| `batch-import-literature.mjs` | EPUB/PDF/MOBI/AZW3 manifest import into `literature` | canonical for bulk source import |
| `batch-import-remaining.py` | Python fallback for PDF/MOBI/AZW3 extraction | supported fallback |
| `ocr-scanned-pdfs.py` | OCR scanned PDFs and update `literature` | canonical OCR path |
| `index-literature-to-ragflow.py` | Upload `literature` content to RAGFlow | canonical RAGFlow indexing path |
| `index-literature-to-ragflow.mjs` | Node RAGFlow indexing prototype | deprecated; keep only for comparison until removed |
| `import-baseline-articles-as-corpus.mjs` | Import ContentBase baseline bodies as semantic/vocabulary material | optional feedback path |
| `import-ragflow-literary-corpus.mjs` | Older RAGFlow literary import workflow | legacy; do not extend without consolidating |
| `import-remaining.sh` | One-off local shell import | forbidden; ignored and not reusable |

Gateway support scripts:

| Script | Purpose | Status |
|---|---|---|
| `start-local-dev.ps1` | Start local Gateway and web evidence provider with local secrets | local runtime helper |
| `smoke.mjs` | General Gateway smoke suite | canonical Gateway smoke |
| `smoke-ragflow-evidence.mjs` | RAGFlow readiness and retrieval smoke | canonical RAGFlow evidence smoke |
| `smoke-research-query.mjs` | Research query route smoke | diagnostic |
| `prepare-ragflow-evidence.mjs` | Prepare minimal RAGFlow smoke dataset | setup helper |
| `generate-openapi.mjs` | Generate Gateway OpenAPI document | API artifact helper |
| `clean-generated-client.mjs` | Clean generated TypeScript client output | API artifact helper |

Downstream ContentBase scripts:

| Script | Purpose | Status |
|---|---|---|
| `ContentBase/product/novel/tools/evidence-pack-smoke.mjs` | Verify Gateway EvidencePack from ContentBase side | downstream smoke |
| `ContentBase/product/novel/tools/generate-article-mvp.mjs` | Generate an article through ContentBase runtime | downstream generation smoke |
| `ContentBase/product/novel/baseline/baseline-run.mjs` | Serial baseline generation run | downstream regression driver |
| `ContentBase/product/novel/baseline/quality-scorecard.mjs` | Deterministic quality metrics | downstream metric helper |
| `ContentBase/product/novel/baseline/quality-diff.mjs` | Compare two baseline scorecards | downstream regression helper |

## Completion Evidence

A corpus operation is not complete until there is observed evidence:

- import count or dry-run count printed by the import script
- no committed secrets or logs
- RAGFlow smoke returns real chunks
- Gateway typecheck passes after code changes
- generated article report, when testing ContentBase, records the expected
  provider/model/base URL

## Reproduction Limits

GitHub can reproduce scripts and contracts. It cannot reproduce local private
state by itself. A second machine needs:

- source books listed in `import-manifest.json`, or an approved database dump
- RAGFlow running with a working embedding provider
- configured DataBase Gateway secrets
- MySQL schema and service users
- optional ContentBase secrets for generation smoke tests
