# stable/topic-corpus-pipeline-v1.1

## Summary

- Single canonical `topic-corpus.json` and `category-register.json` under Gateway config
- `sync-topic-corpus.mjs` copies both into ContentBase novel config
- `GET /creative/style-contract?topicId=` applies register-aware lexicon filtering
- `defaultStyleProfileId` and `narrativePerspectiveMode` in topic corpus
- Author lexicon import complete (860 terms) on production Gateway
- SQL `005_vocabulary_category_register.sql` for DB-backed category tags (config fallback if table missing)

## Repos

| Repo | Branch | Tag |
|------|--------|-----|
| DataBase | `refactor/codex/canonical-content-gateway-client` | `stable/topic-corpus-pipeline-v1.1` |
| ContentBase | `refactor/codex/canonical-database-consumer` | `stable/topic-corpus-pipeline-v1.1` |
| ContentAdmin | `master` | `stable/topic-corpus-pipeline-v1.1` |

## Deploy notes

- Gateway: `apps/gateway/scripts/deploy-gateway-production.ps1` (done)
- ContentBase: `scripts/deploy-contentbase-production.ps1` — requires `fanqie-service` sibling or copy `node_modules` from previous release before `pnpm install`
- MySQL: apply `005_vocabulary_category_register.sql` with a user that has CREATE TABLE (content_rw may be denied)

## Verify

```bash
curl -H "X-DataBase-Api-Key: $KEY" https://database.tengokukk.com/research/topics
curl -H "X-DataBase-Api-Key: $KEY" "https://database.tengokukk.com/creative/style-contract?styleProfileId=immersive_historical_synthetic_narrative"
```

ContentBase after deploy:

```bash
curl https://contentbase.tengokukk.com/api/health
# POST runtime.generate.article with explicit notebookId + topic (no preset routing)
```
