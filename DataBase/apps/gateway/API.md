# DataBase Gateway API Reference

DataBase Gateway is the stable service boundary for the DataBase ecosystem. External applications such as MyBlog should use this HTTP API for reads and writes instead of connecting to MySQL directly.

External consumers must not query DataBase-owned MySQL tables directly. For
creative writing style, vocabulary, and banned-word data, the canonical read
path is `GET /creative/style-contract`; table names such as
`creative_style_protocols`, `creative_style_modules`, `creative_quality_rules`,
`vocabulary`, and `banned_words` are internal Gateway implementation details.

For novels, blog posts, essays, short-video scripts, comics, visual pages, and
manuscript assets, the canonical content read path is `/content/canonical/*`.
Legacy `/content/works` and `/content/works/:id/chapters` remain the current
source for existing novel records until those records are promoted into the
canonical content tables.

## Base URLs

Local or internal runtime:

```text
http://127.0.0.1:18090
```

Public runtime:

```text
https://database.tengokukk.com
```

Machine-readable contract:

```text
GET /openapi.yaml
```

Human-readable API document:

```text
GET /docs/api
```

## HTTP Endpoint Index

Use the public base URL when calling from external applications:

```text
https://database.tengokukk.com
```

Use the local base URL only from the gateway host or an internal tunnel:

```text
http://127.0.0.1:18090
```

Full public HTTP URLs:

| Method | Public URL | Purpose |
| --- | --- | --- |
| `GET` | `https://database.tengokukk.com/` | Service identity. |
| `GET` | `https://database.tengokukk.com/health` | Runtime health check. |
| `GET` | `https://database.tengokukk.com/status` | Runtime status and dependency identity. |
| `GET` | `https://database.tengokukk.com/openapi.yaml` | OpenAPI YAML contract. |
| `GET` | `https://database.tengokukk.com/docs/api` | Markdown API reference. |
| `GET` | `https://database.tengokukk.com/inventory/tables` | List database table inventory. |
| `GET` | `https://database.tengokukk.com/content/canonical/works?limit=50` | List canonical works across novels, articles, scripts, comics, and manuscripts. |
| `GET` | `https://database.tengokukk.com/content/canonical/works/{id}/parts?limit=200` | List canonical parts for one work. |
| `GET` | `https://database.tengokukk.com/content/canonical/parts/{id}/blocks?limit=500` | List typed blocks for one content part. |
| `GET` | `https://database.tengokukk.com/content/canonical/assets?limit=100` | List canonical asset references. |
| `GET` | `https://database.tengokukk.com/content/canonical/publication-targets?platform=fanqie` | List platform publication mappings. |
| `GET` | `https://database.tengokukk.com/content/works?limit=50` | List works. |
| `GET` | `https://database.tengokukk.com/content/works/{id}/chapters?limit=200` | List chapters for one work. |
| `GET` | `https://database.tengokukk.com/creative/author-profile?id=emptyinkpot_primary_author` | Read reusable author profile, interest clusters, and technique weights. |
| `GET` | `https://database.tengokukk.com/creative/style-contract?protocol=immersive_historical_synthetic_narrative` | Read the creative writing style contract from MySQL. |
| `GET` | `https://database.tengokukk.com/creative/context?workId=...` | Resolve one canonical creative context snapshot for generation and review. |
| `GET` | `https://database.tengokukk.com/semantic/units?limit=50` | List active civilization semantic units. |
| `GET` | `https://database.tengokukk.com/semantic/tags?limit=200` | List semantic tag taxonomy. |
| `GET` | `https://database.tengokukk.com/semantic/relations?limit=100` | List semantic graph relations. |
| `GET` | `https://database.tengokukk.com/vocabulary/search?q={query}&limit=20` | Search vocabulary. |
| `GET` | `https://database.tengokukk.com/search?q={query}&limit=10` | Search indexed content chunks. |
| `POST` | `https://database.tengokukk.com/writes/create-work` | Create a work. |
| `POST` | `https://database.tengokukk.com/writes/append-chapter` | Append a chapter to a work. |
| `POST` | `https://database.tengokukk.com/writes/upsert-vocabulary-item` | Create or update a vocabulary item. |
| `POST` | `https://database.tengokukk.com/writes/record-note` | Record a note. |
| `POST` | `https://database.tengokukk.com/writes/record-experience` | Record an experience entry. |
| `POST` | `https://database.tengokukk.com/writes/project-obsidian-markdown` | Project one Obsidian Markdown file into canonical content tables. |

Minimal HTTP example:

```bash
curl "https://database.tengokukk.com/health"
```

Authenticated HTTP example when `DATABASE_GATEWAY_AUTH_REQUIRED=true`:

```bash
curl \
  -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" \
  "https://database.tengokukk.com/content/works?limit=10"
```

Write HTTP example:

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-DataBase-Idempotency-Key: example-vocab-001" \
  -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" \
  -d '{"actor":"myblog","payload":{"content":"gateway facade","type":"term","category":"api"}}' \
  "https://database.tengokukk.com/writes/upsert-vocabulary-item"
```

## Common Conventions

### Request ID

Every response includes a `requestId` field and an `X-Request-Id` response header.

Clients may provide their own request id:

```text
X-Request-Id: <client-generated-correlation-id>
```

If omitted, the gateway generates one.

### Authentication

Data route authentication is controlled by runtime configuration.

Default:

```env
DATABASE_GATEWAY_AUTH_REQUIRED=false
```

When authentication is disabled, data routes do not require `X-DataBase-Api-Key`.

When authentication is enabled:

```env
DATABASE_GATEWAY_AUTH_REQUIRED=true
DATABASE_GATEWAY_API_KEY=<key>
```

Clients must send:

```text
X-DataBase-Api-Key: <key>
```

If the key is missing or invalid, the gateway returns `401 unauthorized`.

### Write Idempotency

All write endpoints require:

```text
X-DataBase-Idempotency-Key: <stable-unique-key>
```

Rules:

- First request with a new key executes the mutation.
- Retrying the same key with the same payload returns the saved response.
- Reusing the same key with a different payload returns `409 idempotency_conflict`.
- If the original mutation is still marked as running, the gateway returns `409 mutation_in_progress`.
- If the original mutation failed, the gateway returns `409` with the stored error code.

The idempotency key must be non-empty and at most 191 characters.

### Write Envelope

All write endpoints use the same top-level JSON envelope:

```json
{
  "requestId": "optional-client-request-id",
  "actor": "myblog",
  "payload": {}
}
```

Fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | string | no | Client-side correlation id stored in the mutation ledger. |
| `actor` | string | no | Calling system or operator. Defaults to `unknown`. |
| `payload` | object | yes | Endpoint-specific write payload. |

### Error Response

All errors use this shape:

```json
{
  "ok": false,
  "error": "invalid_payload",
  "message": "Request body must include a payload object",
  "requestId": "..."
}
```

Common errors:

| Status | Error | Meaning |
| --- | --- | --- |
| `400` | `invalid_json` | Request body is not valid JSON. |
| `400` | `invalid_payload` | Payload is missing or does not match the endpoint contract. |
| `400` | `missing_idempotency_key` | Write request is missing a valid idempotency key. |
| `401` | `unauthorized` | API key is missing or invalid when auth is enabled. |
| `404` | `not_found` | Route does not exist. |
| `409` | `idempotency_conflict` | Idempotency key was reused with a different payload or action. |
| `409` | `mutation_in_progress` | A mutation with this idempotency key is already in progress. |
| `409` | `mutation_failed` | A previous mutation with this key failed. |
| `500` | `internal_error` | Unhandled server error. |
| `503` | health response | One or more required health checks failed. |

## Public Endpoints

### `GET /`

Returns service identity and documentation links.

Response `200`:

```json
{
  "service": "database-gateway",
  "version": "0.1.0",
  "docs": "/docs/api",
  "openapi": "/openapi.yaml",
  "requestId": "..."
}
```

### `GET /health`

Checks downstream runtime dependencies.

Response `200` or `503`:

```json
{
  "ok": true,
  "service": "database-gateway",
  "checks": {
    "mysql": "ok",
    "nocodb": "ok",
    "openlist": "unknown"
  },
  "requestId": "..."
}
```

Status code is `200` when required checks pass, otherwise `503`.

### `GET /status`

Returns runtime configuration and downstream identity. Secrets are never returned.

Response `200`:

```json
{
  "ok": true,
  "service": "database-gateway",
  "version": "0.1.0",
  "mode": "read-only",
  "bind": {
    "host": "127.0.0.1",
    "port": 18090
  },
  "auth": {
    "dataRoutes": "none",
    "header": "X-DataBase-Api-Key",
    "required": false
  },
  "downstream": {
    "mysql": {
      "database": "cloudbase-4glvyyq9f61b19cd",
      "user": "database_readonly"
    },
    "nocodbHealthUrl": "http://127.0.0.1:18088/api/v1/health",
    "openlistHealthConfigured": false
  },
  "contracts": {
    "openapi": "gateway/openapi.yaml",
    "operations": "docs/gateway/database-gateway-operations.md"
  },
  "requestId": "..."
}
```

Note: the current `mode` value is still `read-only` for compatibility, even though controlled write facade routes exist.

### `GET /openapi.yaml`

Returns the OpenAPI YAML document.

Response `200` content type:

```text
application/yaml; charset=utf-8
```

### `GET /docs/api`

Returns this Markdown API document.

Response `200` content type:

```text
text/markdown; charset=utf-8
```

## Read Endpoints

### `GET /inventory/tables`

Lists MySQL tables in the configured database and marks each table as `allowed` or `hidden` according to the gateway visibility policy.

Headers:

| Header | Required | Description |
| --- | --- | --- |
| `X-DataBase-Api-Key` | only when auth is enabled | API key. |

Response `200`:

```json
{
  "database": "cloudbase-4glvyyq9f61b19cd",
  "count": 3,
  "tables": [
    {
      "name": "works",
      "visibility": "allowed",
      "approximateRows": 12,
      "dataBytes": 16384,
      "updatedAt": "2026-05-10T08:00:00.000Z"
    }
  ],
  "requestId": "..."
}
```

Table item fields:

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Table name. |
| `visibility` | `allowed` or `hidden` | Whether the table is considered safe to expose through inventory. |
| `approximateRows` | number or null | MySQL table row estimate. |
| `dataBytes` | number or null | Approximate data size. |
| `updatedAt` | string or null | MySQL table update time when available. |

### `GET /content/canonical/works`

Lists canonical works across novels, blog posts, essays, short-video scripts,
comics, image collections, and manuscripts.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `kind` | string | no | empty | - | Filters by canonical work kind, such as `novel`, `blog_post`, or `comic_series`. |
| `status` | string | no | empty | - | Filters by content status. |
| `search` | string | no | empty | - | Searches title and subtitle. |
| `limit` | integer | no | `50` | `200` | Maximum number of works to return. |

Response `200`:

```json
{
  "count": 1,
  "works": [
    {
      "id": "work_example",
      "kind": "comic_series",
      "title": "Example Comic",
      "subtitle": null,
      "status": "draft",
      "author_profile_id": "emptyinkpot_primary_author",
      "metadata_json": {},
      "updated_at": "2026-05-12T00:00:00.000Z",
      "created_at": "2026-05-12T00:00:00.000Z"
    }
  ],
  "requestId": "req_..."
}
```

### `GET /content/canonical/works/:id/parts`

Lists ordered canonical parts inside one work.

Examples include chapters, scenes, article sections, script segments, comic
episodes, comic page references, appendices, and volumes.

### `GET /content/canonical/parts/:id/blocks`

Lists typed blocks inside one canonical part.

Examples include paragraphs, headings, quotes, images, comic panels, dialogue,
captions, evidence citations, and semantic-unit references.

### `GET /content/canonical/assets`

Lists asset references. DataBase stores metadata and pointers only; the actual
file bytes belong to the configured storage backend.

### `GET /content/canonical/publication-targets`

Lists platform mappings between canonical local works and remote platform works.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `platform` | string | no | empty | - | Filters by platform, such as `fanqie`. |
| `account_identity` | string | no | empty | - | Filters by stable platform account identity. |
| `local_work_id` | string | no | empty | - | Filters by canonical local work id. |
| `limit` | integer | no | `100` | `500` | Maximum number of mappings. |

### `GET /content/works`

Lists works ordered by latest update.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `limit` | integer | no | `50` | `200` | Maximum number of works to return. |

Response `200`:

```json
{
  "count": 1,
  "works": [
    {
      "id": 1,
      "title": "Example Work",
      "description_preview": "First 500 characters...",
      "status": "outline",
      "platform": "myblog",
      "current_chapters": 2,
      "target_chapters": 20,
      "updated_at": "2026-05-10T08:00:00.000Z",
      "created_at": "2026-05-10T08:00:00.000Z"
    }
  ],
  "requestId": "..."
}
```

### `GET /content/works/:id/chapters`

Lists chapters for one work ordered by volume, chapter number, and id.

Path parameters:

| Name | Type | Description |
| --- | --- | --- |
| `id` | string or integer | Work id. |

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `limit` | integer | no | `200` | `500` | Maximum number of chapters to return. |

Response `200`:

```json
{
  "workId": "1",
  "count": 1,
  "chapters": [
    {
      "id": 10,
      "work_id": 1,
      "volume_number": 1,
      "chapter_number": 1,
      "title": "Chapter 1",
      "word_count": 1200,
      "status": "draft",
      "audit_status": "pending",
      "updated_at": "2026-05-10T08:00:00.000Z",
      "created_at": "2026-05-10T08:00:00.000Z"
    }
  ],
  "requestId": "..."
}
```

### `GET /vocabulary/search`

Searches vocabulary by `content`, `type`, `category`, or `note` using SQL `LIKE`.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `q` | string | yes | empty | - | Search text. If empty, returns no items. |
| `limit` | integer | no | `20` | `100` | Maximum number of items to return. |

Response `200`:

```json
{
  "query": "gateway",
  "count": 1,
  "items": [
    {
      "id": 909,
      "content": "database-gateway-smoke-upsert",
      "type": "system-smoke",
      "category": "gateway",
      "note": "Inserted by DataBase Gateway smoke test",
      "created_at": "2026-05-10T08:00:00.000Z",
      "updated_at": "2026-05-10T08:00:00.000Z"
    }
  ],
  "requestId": "..."
}
```

### `GET /creative/style-contract`

Reads the creative writing style contract from MySQL. This is the executable entrypoint for fiction blueprint modules, immersive historical editing protocol, preferred vocabulary, banned words, quality rules, and source material references.

Query parameters:

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `protocol` | string | no | `immersive_historical_synthetic_narrative` | Protocol id from `creative_style_protocols`. |

Response `200`:

```json
{
  "protocol": {
    "id": "immersive_historical_synthetic_narrative",
    "name": "沉浸式历史合成叙事体",
    "domain": "historical_narrative"
  },
  "modules": [],
  "editingSteps": [],
  "qualityRules": [],
  "sourceMaterials": [],
  "lexicon": {
    "preferred": [],
    "banned": []
  },
  "counts": {
    "modules": 47,
    "editingSteps": 6,
    "qualityRules": 9,
    "sourceMaterials": 12,
    "preferredTerms": 80,
    "bannedTerms": 34
  },
  "requestId": "req_..."
}
```

### `GET /creative/context`

Resolves the canonical creative context snapshot that product runtimes use for
generation and review. This is a domain capability endpoint, not table CRUD. It
assembles the work, optional current part, recent blocks, author model, creative
style contract, semantic units, and publication targets from the DataBase truth
tables.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `workId` | string | yes | - | - | Canonical `content_works.id`. |
| `partId` | string | no | empty | - | Optional canonical `content_parts.id`. |
| `protocol` | string | no | `immersive_historical_synthetic_narrative` | - | Creative protocol id. |
| `semanticSearch` | string | no | work title/subtitle | - | Semantic unit search text. |
| `semanticLimit` | integer | no | `12` | `50` | Maximum semantic units. |

Response `200`:

```json
{
  "ok": true,
  "contextVersion": "creative-context.v1",
  "work": {
    "id": "fanqie_work_7600575059215780926",
    "kind": "novel",
    "title": "枪与凋零之花"
  },
  "currentPart": null,
  "parts": [],
  "recentBlocks": [],
  "authorProfile": {
    "profile": {
      "id": "emptyinkpot_primary_author"
    },
    "interestClusters": [],
    "authorTechniques": []
  },
  "styleContract": {
    "protocol": {
      "id": "immersive_historical_synthetic_narrative"
    },
    "lexicon": {
      "preferred": [],
      "banned": []
    }
  },
  "semanticContext": {
    "query": "枪与凋零之花",
    "units": []
  },
  "publicationTargets": [],
  "snapshot": {
    "workId": "fanqie_work_7600575059215780926",
    "partId": null,
    "authorProfileId": "emptyinkpot_primary_author",
    "protocol": "immersive_historical_synthetic_narrative",
    "semanticLimit": 12,
    "resolvedAt": "2026-05-12T00:00:00.000Z"
  },
  "counts": {
    "parts": 104,
    "recentBlocks": 8,
    "semanticUnits": 4,
    "publicationTargets": 1,
    "preferredTerms": 80,
    "bannedTerms": 34,
    "qualityRules": 9,
    "techniques": 12
  },
  "requestId": "req_..."
}
```

### `GET /creative/author-profile`

Reads the reusable author model. This endpoint exposes the active author
profile, interest clusters, and writing technique weights. It does not replace
`GET /creative/style-contract`; it is the smaller author-model entrypoint for
frontends and generation runtimes that do not need the whole style contract.

Query parameters:

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | string | no | `emptyinkpot_primary_author` | Author profile id. |

Response `200`:

```json
{
  "profile": {
    "id": "emptyinkpot_primary_author",
    "display_name": "emptyinkpot primary author",
    "stance": "有限视角、制度压力、物质细节和历史冷感优先；不以作者口吻裁判人物。",
    "voice_json": ["冷静", "克制"],
    "status": "active"
  },
  "interestClusters": [],
  "authorTechniques": [],
  "counts": {
    "interestClusters": 4,
    "authorTechniques": 12
  },
  "requestId": "req_..."
}
```

### `GET /semantic/units`

Lists active semantic units for the civilization semantic writing system. These
are semantic cards, not raw document chunks.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no | `active` | - | Unit status. |
| `search` | string | no | empty | - | Searches source title, excerpt, and summary. |
| `tag` | string | no | empty | - | Filters by active tag value. |
| `limit` | integer | no | `50` | `200` | Maximum number of units. |

Response `200`:

```json
{
  "count": 1,
  "units": [
    {
      "id": "sem_name_china_khitai_shina",
      "source_id": "source_manual_civilization_names",
      "source_title": "China、契丹、支那与文明命名",
      "source_author": "operator",
      "source_locator": "manual seed",
      "excerpt": "China、契丹、支那、南越这类称谓不是普通名词，而是外部凝视、历史路径和文明位置的残留。",
      "summary": "用于从名称漂移进入身份不稳定和文明裂缝。",
      "status": "active",
      "tags": [],
      "updated_at": "2026-05-12T00:00:00.000Z",
      "created_at": "2026-05-12T00:00:00.000Z"
    }
  ],
  "filters": {
    "status": "active",
    "search": "",
    "tag": ""
  },
  "requestId": "req_..."
}
```

### `GET /semantic/tags`

Lists the semantic tag taxonomy used by semantic units.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no | `active` | - | Tag status. |
| `layer` | string | no | empty | - | Filter by tag layer, such as `concept`, `image`, `civilization`, `narrative_function`, `style`, or `narrative_position`. |
| `limit` | integer | no | `200` | `500` | Maximum number of tags. |

Response `200`:

```json
{
  "count": 1,
  "tags": [
    {
      "id": "concept_identity_instability",
      "tag_layer": "concept",
      "tag_value": "身份不稳定",
      "description": "命名、归属和自我理解发生摇晃。",
      "status": "active",
      "updated_at": "2026-05-12T00:00:00.000Z",
      "created_at": "2026-05-12T00:00:00.000Z"
    }
  ],
  "filters": {
    "status": "active",
    "layer": "concept"
  },
  "requestId": "req_..."
}
```

### `GET /semantic/relations`

Lists active semantic graph relations.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `status` | string | no | `active` | - | Relation status. |
| `type` | string | no | empty | - | Relation type, such as `supports_entrance` or `materializes`. |
| `unit` | string | no | empty | - | Filters relations connected to a unit id. |
| `limit` | integer | no | `100` | `300` | Maximum number of relations. |

Response `200`:

```json
{
  "count": 1,
  "relations": [
    {
      "id": "rel_name_to_identity_instability",
      "from_unit_id": "sem_name_china_khitai_shina",
      "from_tag_id": null,
      "relation_type": "supports_entrance",
      "to_unit_id": null,
      "to_tag_id": "concept_identity_instability",
      "description": "名称漂移支撑身份不稳定的意象-概念入口。",
      "status": "active",
      "updated_at": "2026-05-12T00:00:00.000Z",
      "created_at": "2026-05-12T00:00:00.000Z"
    }
  ],
  "filters": {
    "status": "active",
    "type": "supports_entrance",
    "unit": "sem_name_china_khitai_shina"
  },
  "requestId": "req_..."
}
```

### `GET /search`

Searches indexed text chunks across `search_documents` and `search_chunks`.

Query parameters:

| Name | Type | Required | Default | Max | Description |
| --- | --- | --- | --- | --- | --- |
| `q` | string | yes | empty | - | Search text. If empty, returns no results. |
| `limit` | integer | no | `10` | `50` | Maximum number of results to return. |

Response `200`:

```json
{
  "query": "server",
  "count": 1,
  "results": [
    {
      "document_id": "doc-1",
      "source_table": "notes",
      "source_id": "12",
      "source": "myblog",
      "title": "Server Notes",
      "privacy_level": "private",
      "chunk_index": 0,
      "snippet": "First 300 characters of the matching chunk..."
    }
  ],
  "requestId": "..."
}
```

Only chunks with `privacy_level` in `public` or `private` are returned.

## Write Endpoints

All write responses share this base shape:

```json
{
  "ok": true,
  "action": "create_work",
  "idempotencyKey": "myblog-work-123",
  "actor": "myblog",
  "result": {
    "affectedRows": 1,
    "insertId": 123,
    "warningStatus": 0
  },
  "item": {},
  "requestId": "..."
}
```

`item` is endpoint-specific.

### `POST /writes/create-work`

Creates a row in `works`.

Headers:

| Header | Required | Description |
| --- | --- | --- |
| `Content-Type: application/json` | yes | JSON request body. |
| `X-DataBase-Idempotency-Key` | yes | Stable unique mutation key. |
| `X-DataBase-Api-Key` | only when auth is enabled | API key. |

Payload fields:

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | string | yes | - | Work title. |
| `description` | string | no | null | Full description. |
| `alternativeTitles` | array of strings or string | no | null | Stored as JSON or string depending on input. |
| `tags` | array of strings or string | no | null | Stored as JSON or string depending on input. |
| `style` | string | no | null | Style note. |
| `targetChapters` | integer | no | `0` | Planned chapter count. |
| `currentChapters` | integer | no | `0` | Current chapter count. |
| `status` | string | no | `outline` | Work status. |
| `platform` | string | no | null | Source platform or app. |

Request example:

```json
{
  "requestId": "myblog-create-work-001",
  "actor": "myblog",
  "payload": {
    "title": "Example Work",
    "description": "Long description",
    "tags": ["fiction", "draft"],
    "targetChapters": 20,
    "platform": "myblog"
  }
}
```

Response `200`:

```json
{
  "ok": true,
  "action": "create_work",
  "idempotencyKey": "myblog-create-work-001",
  "actor": "myblog",
  "result": {
    "affectedRows": 1,
    "insertId": 123,
    "warningStatus": 0
  },
  "item": {
    "id": 123,
    "title": "Example Work",
    "description": "Long description",
    "status": "outline",
    "platform": "myblog",
    "current_chapters": 0,
    "target_chapters": 20,
    "created_at": "2026-05-10T08:00:00.000Z",
    "updated_at": "2026-05-10T08:00:00.000Z"
  },
  "requestId": "..."
}
```

### `POST /writes/append-chapter`

Creates a row in `chapters` and updates `works.current_chapters` to at least the submitted chapter number.

Payload fields:

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `workId` | integer | yes | - | Target work id. |
| `volumeNumber` | integer | no | `1` | Volume number. |
| `chapterNumber` | integer | yes | - | Chapter number. |
| `title` | string | no | null | Chapter title. |
| `content` | string | no | null | Chapter body. |
| `plotSummary` | string | no | null | Plot summary. |
| `wordCount` | integer | no | `content.length` or `0` | Word count. |
| `status` | string | no | `draft` | Chapter status. |
| `auditStatus` | string | no | `pending` | Audit status. |
| `auditIssues` | any JSON value | no | `[]` | Stored as JSON. |

Request example:

```json
{
  "requestId": "myblog-append-chapter-001",
  "actor": "myblog",
  "payload": {
    "workId": 123,
    "volumeNumber": 1,
    "chapterNumber": 1,
    "title": "Chapter 1",
    "content": "Chapter body",
    "status": "draft"
  }
}
```

Response `200` item:

```json
{
  "id": 456,
  "work_id": 123,
  "volume_number": 1,
  "chapter_number": 1,
  "title": "Chapter 1",
  "word_count": 12,
  "status": "draft",
  "audit_status": "pending",
  "created_at": "2026-05-10T08:00:00.000Z",
  "updated_at": "2026-05-10T08:00:00.000Z"
}
```

### `POST /writes/upsert-vocabulary-item`

Creates or updates a vocabulary row. The unique identity is `content`.

Payload fields:

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `content` | string | yes | - | Vocabulary content. |
| `type` | string | no | `vocabulary` | Vocabulary type. |
| `category` | string | no | `通用` | Category. |
| `note` | string | no | null | Free-form note. |
| `tags` | array of strings | no | null | Stored as JSON. Must be an array when provided. |

Request example:

```json
{
  "requestId": "myblog-vocab-001",
  "actor": "myblog",
  "payload": {
    "content": "idempotency",
    "type": "engineering-term",
    "category": "gateway",
    "note": "Safe retry contract",
    "tags": ["api", "write"]
  }
}
```

Response `200` item:

```json
{
  "id": 909,
  "content": "idempotency",
  "type": "engineering-term",
  "category": "gateway",
  "note": "Safe retry contract",
  "created_at": "2026-05-10T08:00:00.000Z",
  "updated_at": "2026-05-10T08:00:00.000Z"
}
```

### `POST /writes/record-note`

Creates a row in `notes`.

Payload fields:

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | string | yes | - | Note title. |
| `content` | string | no | null | Note body. |
| `category` | string | no | `general` | Note category. |
| `tags` | array of strings | no | null | Stored as JSON. Must be an array when provided. |

Request example:

```json
{
  "requestId": "myblog-note-001",
  "actor": "myblog",
  "payload": {
    "title": "Gateway integration note",
    "content": "MyBlog should call DataBase Gateway instead of MySQL.",
    "category": "architecture",
    "tags": ["myblog", "database"]
  }
}
```

Response `200` item:

```json
{
  "id": 321,
  "title": "Gateway integration note",
  "content": "MyBlog should call DataBase Gateway instead of MySQL.",
  "category": "architecture",
  "tags": ["myblog", "database"],
  "created_at": "2026-05-10T08:00:00.000Z",
  "updated_at": "2026-05-10T08:00:00.000Z"
}
```

### `POST /writes/record-experience`

Creates a row in `experience_records`.

Payload fields:

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `type` | string | no | `note` | Experience type. |
| `title` | string | yes | - | Record title. |
| `description` | string | no | null | Description. |
| `userQuery` | string | no | null | Original user request. |
| `solution` | string | no | null | Solution or action taken. |
| `summary` | string | no | null | Short summary. |
| `rootCause` | string | no | null | Root cause when applicable. |
| `verification` | string | no | empty string | Verification evidence. |
| `sourceText` | string | no | null | Original source text. |
| `cloudText` | string | no | null | Cloud-side text or reference. |
| `tags` | array of strings | no | `[]` | Stored as JSON and comma-joined into `tags_text`. |
| `experienceApplied` | any JSON value | no | `[]` | Prior experience used. |
| `experienceGained` | any JSON value | no | `[]` | New experience learned. |
| `difficulty` | integer | no | `1` | Difficulty score. |
| `xpGained` | integer | no | `50` | XP score. |

Request example:

```json
{
  "requestId": "myblog-exp-001",
  "actor": "myblog",
  "payload": {
    "type": "integration",
    "title": "MyBlog DataBase Gateway write path",
    "summary": "Added gateway write facade usage.",
    "verification": "Smoke test passed.",
    "tags": ["myblog", "gateway"],
    "difficulty": 2,
    "xpGained": 80
  }
}
```

Response `200` item:

```json
{
  "id": 654,
  "type": "integration",
  "title": "MyBlog DataBase Gateway write path",
  "summary": "Added gateway write facade usage.",
  "root_cause": null,
  "verification": "Smoke test passed.",
  "tags_text": "myblog,gateway",
  "created_at": "2026-05-10T08:00:00.000Z",
  "updated_at": "2026-05-10T08:00:00.000Z"
}
```

### `POST /writes/project-obsidian-markdown`

Projects one Obsidian Markdown file into the canonical content model.

This endpoint is the DataBase-owned write path for structured Vault projection.
It does not claim ownership of the Markdown file body. The Vault remains the
human-editable file truth; DataBase owns the canonical identity, structure,
relations, assets, and generation context derived from that file.

Required behavior:

- Caller must provide stable ids for the work, part, blocks, assets, and relations.
- Caller must provide source identity and content hash.
- The endpoint replaces blocks for the submitted `part.id`.
- The endpoint replaces Obsidian-derived relations for the submitted source path.
- The endpoint never infers a work from title or path.

Payload shape:

```json
{
  "requestId": "obsidian-project-001",
  "actor": "myblog-runtime-projector",
  "payload": {
    "source": {
      "provider": "obsidian-vault",
      "sourcePath": "docs/blog/example.md",
      "sourceUri": "obsidian://vault/Obsidian/docs/blog/example.md",
      "sha256": "64-character-source-hash",
      "mtime": "2026-05-13T00:00:00.000Z",
      "frontmatter": {
        "title": "Example"
      }
    },
    "work": {
      "id": "obsidian_work_example",
      "kind": "blog_post",
      "title": "Example",
      "status": "active",
      "authorProfileId": "emptyinkpot_primary_author",
      "metadata": {}
    },
    "part": {
      "id": "obsidian_part_example",
      "kind": "article_section",
      "partOrder": 1,
      "title": "Example",
      "status": "active",
      "metadata": {}
    },
    "assets": [],
    "blocks": [
      {
        "id": "obsidian_block_example_1",
        "kind": "paragraph",
        "blockOrder": 1,
        "textContent": "Paragraph body.",
        "payload": {}
      }
    ],
    "relations": []
  }
}
```

Response `200` item:

```json
{
  "workId": "obsidian_work_example",
  "partId": "obsidian_part_example",
  "sourceProvider": "obsidian-vault",
  "sourcePath": "docs/blog/example.md",
  "sourceUri": "obsidian://vault/Obsidian/docs/blog/example.md",
  "sourceSha256": "64-character-source-hash",
  "blocks": 1,
  "assets": 0,
  "relations": 2
}
```

## Curl Examples

Read works:

```bash
curl https://database.tengokukk.com/content/works?limit=10
```

Read works with API key enabled:

```bash
curl \
  -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" \
  "https://database.tengokukk.com/content/works?limit=10"
```

Read the creative style contract:

```bash
curl \
  -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" \
  "https://database.tengokukk.com/creative/style-contract?protocol=immersive_historical_synthetic_narrative"
```

Write a vocabulary item:

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-DataBase-Idempotency-Key: vocab-idempotency-001" \
  -H "X-DataBase-Api-Key: $DATABASE_GATEWAY_API_KEY" \
  -d '{
    "requestId": "example-001",
    "actor": "myblog",
    "payload": {
      "content": "gateway facade",
      "type": "engineering-term",
      "category": "database",
      "note": "A controlled API boundary over MySQL",
      "tags": ["api", "database"]
    }
  }' \
  https://database.tengokukk.com/writes/upsert-vocabulary-item
```

## Runtime and Permission Model

The gateway uses separate database accounts for separate responsibilities:

| Account | Purpose |
| --- | --- |
| `database_readonly` | Read routes only. |
| `database_content_rw` | Approved write facade mutations. |

Operational rules:

- The gateway does not expose raw SQL.
- Consumers must not connect directly to MySQL for normal application reads or writes.
- Schema changes are performed by an operator/admin credential, not the runtime service account.
- Write mutation metadata is stored in `database_gateway_mutations`.
- Write facade permission grants are documented in `sql/002_write_facade_permissions.sql`.
