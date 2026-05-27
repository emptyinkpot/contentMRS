# Gateway Client Adapters

This service layer holds consumer-side adapters for the reusable DataBase
Gateway client.

## Purpose

These adapters are the stable call layer for consumer apps that should not talk
to the Gateway directly from UI or workflow code.

```text
MyBlog / Mortis / n8n
  -> consumer adapter
  -> gateway client
  -> DataBase Gateway
```

## Contents

- `package.json`
- `index.js`
- `base-adapter.ts`
- `base-adapter.js`
- `mortis-adapter.ts`
- `mortis-adapter.js`
- `myblog-adapter.ts`
- `myblog-adapter.js`
- `adapter-example.ts`
- `USAGE.md`
- `PRODUCT_GUIDE.md`
- `verify-adapters.js`
- `.env.example`

## Verify

```bash
npm run verify
```

## Rule

If a consumer needs a Gateway method, expose it here first. Do not duplicate
HTTP logic inside the consumer app.

## Write-Facade Direction

Read consumers and write consumers should stay separate. If MyBlog needs
mutation support, add a distinct write adapter that targets the planned DataBase
write facade instead of extending the read client with ad-hoc SQL behavior.

The contract draft for that facade lives in:

`	ext
docs/gateway/database-write-facade-p0.md
`

Write adapter verbs:

- createWork()
- appendChapter()
- upsertVocabularyItem()
- recordNote()
- recordExperience()

Those methods require an `idempotencyKey` argument and must not accept raw SQL.

## Default Pattern

Prefer extending `DataBaseGatewayAdapter` for new consumer adapters so base URL,
API key, and fetch override stay consistent across apps.

Read `PRODUCT_GUIDE.md` before adding another consumer adapter.
