# latent-mvp training package

Minimal cloud-GPU package for the 1-2 week latent MVP:

- `train_reranker.py`: trains a lightweight cross-encoder reranker.
- `train_controller.py`: trains an optional style/fact blend controller head.
- `serve_reranker.py`: serves `/health` and `/rerank` via FastAPI.
- `MODEL_CARD.md`: artifact and reproducibility metadata.

## 1) Export training corpus

```bash
node scripts/export-latent-training-corpus.mjs --limit 10000
```

## 2) Train reranker

Build explicit views first:

```bash
python training/latent-mvp/build_training_views.py
```

Use `views/author-reranker` when training retrieval for ContentMRS writing. It
contains book original-text positives plus HC3 ChatGPT negatives. Use
`views/ai-flavor-reviewer` only for AI-flavor detection; its HC3 human rows are
not literary style positives.

`views/personal-style` is reserved for verified self-authored message samples.
It is built from `external/personal-style/qq-self/qq-self-style.jsonl` when that
file exists. It is intentionally separate from book positives and the default
author reranker view.

Convert an already verified self-message export with:

```bash
python training/latent-mvp/convert_personal_messages_to_reranker.py \
  --input path/to/verified-self-messages.jsonl \
  --self-uin 1915791855
```

The converter refuses rows that do not identify the sender as self. It preserves
message text verbatim and does not rewrite, paraphrase, or synthesize content.

```bash
python training/latent-mvp/train_reranker.py \
  --train training/latent-mvp/data/train.jsonl \
  --val training/latent-mvp/data/val.jsonl \
  --output training/latent-mvp/artifacts/reranker-v1
```

## 3) Optional controller head

```bash
python training/latent-mvp/train_controller.py \
  --train training/latent-mvp/data/train.jsonl \
  --val training/latent-mvp/data/val.jsonl \
  --output training/latent-mvp/artifacts/controller-v1
```

## 4) Serve reranker

```bash
python training/latent-mvp/serve_reranker.py \
  --model training/latent-mvp/artifacts/reranker-v1 \
  --controller training/latent-mvp/artifacts/controller-v1/controller.json
```

Set Gateway to the service root or rerank endpoint:

```bash
DATABASE_EVIDENCE_LATENT_RERANK_URL=http://127.0.0.1:8765/rerank
```
