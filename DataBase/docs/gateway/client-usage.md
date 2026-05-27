# DataBase Gateway Client Usage

This is the practical usage guide for the reusable Gateway client in
`gateway/src/clients/database-gateway-client.ts`.

## Purpose

The client is a thin HTTP wrapper for consumer apps such as MyBlog and Mortis.
It standardizes:

- base URL handling
- API key injection
- request id propagation
- JSON parsing
- error shaping

It does not replace the HTTP contract. It is only a convenience layer over the
Gateway API.

## Installation Context

The client lives in the same repository as the Gateway service. If you want to
reuse it from another repo, copy the file or extract it into a shared package.

## Initialize

```ts
import { DataBaseGatewayClient } from "./database-gateway-client.js";

const client = new DataBaseGatewayClient({
  baseUrl: process.env.DATABASE_GATEWAY_URL,
  apiKey: process.env.DATABASE_GATEWAY_API_KEY
});
```

Defaults:

- `baseUrl`: `http://127.0.0.1:18090`
- `apiKey`: unset
- `fetchImpl`: global `fetch`

## Unauthenticated Calls

These methods do not require an API key:

```ts
await client.health();
await client.status();
```

Use them for:

- loopback health checks
- runtime cards
- operator dashboards

## Authenticated Calls

These methods require `apiKey`:

```ts
await client.inventoryTables();
await client.search("keyword", 10);
await client.listWorks(10);
await client.listChapters(123, 50);
await client.searchVocabulary("term", 20);
```

If the API key is missing, the client throws before the request is sent.

## Response Shapes

The client returns parsed JSON from the Gateway response.

Important response types:

- `DataBaseGatewayStatusResponse`
- `DataBaseGatewayHealthResponse`
- `DataBaseGatewaySearchResponse`
- `DataBaseGatewayVocabularySearchResponse`

These are good for consumer code that wants typed access to the Gateway
contract without hand-writing interfaces.

## Error Handling

When the Gateway returns a non-2xx response, the client throws an `Error` and
attaches:

- `status`
- `requestId`

Example:

```ts
try {
  await client.search("secret");
} catch (error) {
  console.error(error.message);
  console.error(error.status);
  console.error(error.requestId);
}
```

## Recommended Consumer Pattern

MyBlog and Mortis should use the client in their adapter layer, not directly in
UI components.

```text
UI / workflow
  -> adapter
  -> DataBaseGatewayClient
  -> DataBase Gateway
```

That keeps the HTTP contract in one place.

If a consumer grows beyond one call site, wrap the client in a dedicated
adapter. See:

```text
docs/gateway/consumer-adapters.md
```

## Local Smoke

Run the example or the Gateway smoke check:

```bash
npm run example
npm run smoke
```

`npm run example` expects the Gateway to be reachable on the configured base
URL.
