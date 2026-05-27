# DataBase Gateway Client Usage

## Base URLs

Local production loopback:

```text
http://127.0.0.1:18090
```

Planned public gateway:

```text
https://database.tengokukk.com
```

## Authentication

Public probes do not require an API key:

```bash
curl https://database.tengokukk.com/health
curl https://database.tengokukk.com/status
```

Data route authentication is controlled by `DATABASE_GATEWAY_AUTH_REQUIRED`. The default is `false`, so data routes do not require a key unless the switch is enabled.

When enabled, routes require:

```text
X-DataBase-Api-Key: <key>
```

Example:

```bash
curl https://database.tengokukk.com/inventory/tables
```

If auth is enabled:

```bash
curl https://database.tengokukk.com/inventory/tables \
  -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY"
```

## Core Read APIs

### Inventory

```bash
curl https://database.tengokukk.com/inventory/tables
```

### Works

```bash
curl "https://database.tengokukk.com/content/works?limit=20"
```

### Work Chapters

```bash
curl "https://database.tengokukk.com/content/works/1/chapters?limit=200"
```

### Vocabulary Search

```bash
curl "https://database.tengokukk.com/vocabulary/search?q=test&limit=20"
```

### Full Search

```bash
curl "https://database.tengokukk.com/search?q=test&limit=10"
```

## Write API Pattern

Write routes always require an idempotency header. The API key header is required only when `DATABASE_GATEWAY_AUTH_REQUIRED=true`.

```text
X-DataBase-Idempotency-Key: <stable unique key>
```

Example vocabulary upsert:

```bash
curl -X POST https://database.tengokukk.com/writes/upsert-vocabulary-item \
  -H "Content-Type: application/json" \
  -H "X-DataBase-Idempotency-Key: vocab-demo-001" \
  -d '{
    "requestId": "manual-demo",
    "actor": "operator",
    "payload": {
      "content": "example term",
      "type": "vocabulary",
      "category": "demo",
      "note": "Inserted through DataBase Gateway",
      "tags": ["demo", "gateway"]
    }
}'
```

### Create Work

```bash
curl -X POST https://database.tengokukk.com/writes/create-work \
  -H "Content-Type: application/json" \
  -H "X-DataBase-Idempotency-Key: work-demo-001" \
  -d '{
    "requestId": "manual-demo",
    "actor": "operator",
    "payload": {
      "title": "Demo Work",
      "description": "Created through DataBase Gateway",
      "targetChapters": 1,
      "status": "draft",
      "platform": "database-gateway"
    }
  }'
```

### Append Chapter

```bash
curl -X POST https://database.tengokukk.com/writes/append-chapter \
  -H "Content-Type: application/json" \
  -H "X-DataBase-Idempotency-Key: chapter-demo-001" \
  -d '{
    "requestId": "manual-demo",
    "actor": "operator",
    "payload": {
      "workId": 1,
      "volumeNumber": 1,
      "chapterNumber": 1,
      "title": "Demo Chapter",
      "content": "Chapter body",
      "status": "draft"
    }
  }'
```

### Record Note

```bash
curl -X POST https://database.tengokukk.com/writes/record-note \
  -H "Content-Type: application/json" \
  -H "X-DataBase-Idempotency-Key: note-demo-001" \
  -d '{
    "requestId": "manual-demo",
    "actor": "operator",
    "payload": {
      "title": "Demo Note",
      "content": "Stored in notes",
      "category": "gateway",
      "tags": ["demo", "gateway"]
    }
  }'
```

### Record Experience

```bash
curl -X POST https://database.tengokukk.com/writes/record-experience \
  -H "Content-Type: application/json" \
  -H "X-DataBase-Idempotency-Key: experience-demo-001" \
  -d '{
    "requestId": "manual-demo",
    "actor": "operator",
    "payload": {
      "type": "system",
      "title": "Demo Experience",
      "summary": "Stored in experience_records",
      "verification": "Manual API call completed",
      "tags": ["demo", "gateway"]
    }
  }'
```

The required MySQL grants for note and experience writes are documented in:

```text
sql/002_write_facade_permissions.sql
```

The production `database_content_rw` user has these grants as of 2026-05-10.

## JavaScript Client

```js
import { DataBaseGatewayClient } from "./src/clients/database-gateway-client.js";

const client = new DataBaseGatewayClient({
  baseUrl: "https://database.tengokukk.com",
  apiKey: process.env.DATABASE_GATEWAY_API_KEY,
});

const status = await client.status();
const tables = await client.inventoryTables();
const results = await client.searchVocabulary("test", 20);
```

## Safety Rules

- If `DATABASE_GATEWAY_AUTH_REQUIRED=true`, do not expose privileged API keys in browser bundles.
- Use read-only keys for public readers when possible.
- Use separate write keys for trusted operators and automation.
- Keep MySQL credentials private to the gateway runtime.
