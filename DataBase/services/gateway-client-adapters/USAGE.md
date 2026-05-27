# Gateway Client Adapters Usage

This guide shows how to use the consumer adapter layer.

## Local Shape

```text
consumer app
  -> adapter
  -> DataBaseGatewayClient
  -> DataBase Gateway
```

For multiple consumers, extend `DataBaseGatewayAdapter` instead of instantiating
the client in each method body.

You can verify the adapter layer locally with:

```bash
cd services/gateway-client-adapters
npm run verify
```

## Mortis

```ts
import { MortisDataBaseAdapter } from "@emptyinkpot/database-gateway-client-adapters";

const mortis = new MortisDataBaseAdapter();
const status = await mortis.getRuntimeStatus();
const tables = await mortis.getInventoryTables();
const results = await mortis.search("runtime", 10);
```

Suggested UI usage:

- `getRuntimeStatus()` for operator cards
- `getInventoryTables()` for storage inspection panels
- `search()` for generic retrieval

## MyBlog

```ts
import { MyBlogDataBaseAdapter } from "@emptyinkpot/database-gateway-client-adapters";

const myblog = new MyBlogDataBaseAdapter();
const works = await myblog.listWorks(20);
const chapters = await myblog.listChapters(1, 100);
const vocab = await myblog.searchVocabulary("词条", 20);
const creative = await myblog.creativeStyleContract();
```

Suggested UI usage:

- `listWorks()` for content catalogs
- `listChapters()` for chapter pages
- `searchVocabulary()` for writing and editorial tools
- `creativeStyleContract()` for creative style, vocabulary, banned terms, and quality rules
- `searchKnowledge()` for broader retrieval

## If Used In Another Repo

If MyBlog or Mortis lives elsewhere, copy the adapter files or extract the
shared client and adapter layer into a package. Keep the adapter names and
method names stable.

If you want direct Node execution without a TS toolchain, use the `.js`
adapter files in the same directory.

## Error Handling

Keep the upstream `requestId` visible in logs or error cards when a Gateway call
fails.
