# MODEL_CARD - latent-mvp

## Model

- Name: `latent-reranker.v1`
- Base model: `cross-encoder/ms-marco-MiniLM-L-6-v2`
- Task: query-chunk reranking for ContentMRS evidence pipeline

## Training data

- Exporter: `scripts/export-latent-training-corpus.mjs`
- Splits: `training/latent-mvp/data/{train,val,test}.jsonl`
- Label policy: derived from latent retrieval signals + acceptance quality traces

## Metrics

- Output artifact includes `eval-summary.json` (AUC and score separation)
- Rollout KPI: improve `vectorHitsInTop` while preserving quality-block pass rate

## Serving contract

- `GET /health`
- `POST /rerank`: `{ centralClaim, chunks[] }`
- Response contains ranked chunk IDs and scores

## Safety and rollback

- Feature-gated in Gateway (`DATABASE_EVIDENCE_LATENT_RERANK_URL`)
- Any failure falls back to existing fusion + paper-qa path
