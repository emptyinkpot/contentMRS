# DataBase Gateway Consumer Adapters

This document defines how downstream applications should wrap the reusable
Gateway client.

## Goal

Keep consumer code thin:

```text
consumer app
  -> consumer adapter
  -> DataBaseGatewayClient
  -> DataBase Gateway
```

Do not call raw `fetch` from random UI components or workflow nodes if the same
request pattern is used in more than one place.

## MyBlog Adapter Shape

Recommended methods:

```ts
getGatewayStatus()
getWorks(limit?)
getWorkChapters(workId, limit?)
searchVocabulary(query, limit?)
searchKnowledge(query, limit?)
```

MyBlog should treat `getWorks()` and `getWorkChapters()` as contract reads, not
as direct database projections.

## Mortis Adapter Shape

Recommended methods:

```ts
getRuntimeStatus()
getInventoryTables()
search(query, limit?)
health()
```

Mortis should use these methods to feed its runtime cards, timeline panels, and
search surfaces.

## Adapter Example

```ts
import { DataBaseGatewayClient } from "@/gateway/database-gateway-client";

export class MortisDataBaseAdapter {
  constructor(private readonly client = new DataBaseGatewayClient()) {}

  getRuntimeStatus() {
    return this.client.status();
  }

  getInventoryTables() {
    return this.client.inventoryTables();
  }

  search(query: string, limit = 10) {
    return this.client.search(query, limit);
  }
}
```

## Error Policy

Adapters should:

- surface `requestId`
- preserve the upstream status code where possible
- map transport errors into consumer-specific error boundaries only once
- avoid swallowing API key failures

## Integration Rule

If MyBlog or Mortis needs a new Gateway method, add it to the shared client
first, then expose it through the adapter. Do not implement one-off request code
inside the consumer.
