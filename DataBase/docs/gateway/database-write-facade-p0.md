# DataBase Write Facade P0

This document defines the first controlled mutation boundary for the DataBase ecosystem.

The goal is not to expose raw SQL or a generic table editor. The goal is to give MyBlog and other approved consumers a small, auditable mutation surface that keeps DataBase as the single storage truth.

## P0 Goal

Create a thin write service with a narrow command set:

```text
POST /writes/create-work
POST /writes/append-chapter
POST /writes/upsert-vocabulary-item
POST /writes/record-note
POST /writes/record-experience
```

All mutation routes must require:

```text
X-DataBase-Api-Key: <key>
X-DataBase-Idempotency-Key: <key>
```

P0 write rules:

- accept only documented payload shapes
- reject missing idempotency keys
- log request id, actor, action, and target
- enforce a dedicated write service account
- keep writes separate from the read gateway
- never expose raw SQL or generic table mutation

## Current Implementation Status

Enabled now:

```text
POST /writes/upsert-vocabulary-item
```

Defined but intentionally not enabled yet:

```text
POST /writes/create-work
POST /writes/append-chapter
POST /writes/record-note
POST /writes/record-experience
```

Disabled routes return `501 not_implemented`. This keeps the public contract visible without pretending unsupported mutations are ready.

## Idempotency Semantics

Every write route requires `X-DataBase-Idempotency-Key`.

The gateway stores write attempts in:

```text
database_gateway_mutations
```

The current behavior is:

- first request with a new key inserts a `started` mutation row
- successful writes update the row to `succeeded` and store the response JSON
- retry with the same key and same payload returns the stored response
- retry with the same key and different payload returns `409 idempotency_conflict`
- retry while a mutation is still `started` returns `409 mutation_in_progress`
- retry after a failed mutation returns `409` with the stored error code

This makes client retries safe without exposing raw database access.

## Schema

The gateway-owned mutation ledger is defined in:

```text
gateway/sql/001_database_gateway_mutations.sql
```

Runtime account policy:

- `database_readonly` is used for read routes only.
- `database_content_rw` is used for approved content writes.
- `database_content_rw` needs `SELECT`, `INSERT`, and `UPDATE` on `database_gateway_mutations`.
- `database_content_rw` must not have schema migration privileges.

Schema changes should be applied by an operator/admin credential, then runtime should continue through the restricted gateway account.

## Recommended Implementation

Use the same stack pattern as the read gateway:

```text
Hono + TypeScript + mysql2
```

But the write facade must use a distinct route namespace and a distinct service account from `database_readonly`.

## Suggested Payload Shapes

### create-work

```json
{
  "requestId": "...",
  "actor": "myblog",
  "payload": {
    "title": "...",
    "description": "...",
    "platform": "..."
  }
}
```

### append-chapter

```json
{
  "requestId": "...",
  "actor": "myblog",
  "payload": {
    "workId": 1,
    "chapterNumber": 1,
    "title": "...",
    "wordCount": 1234
  }
}
```

### upsert-vocabulary-item

```json
{
  "requestId": "...",
  "actor": "myblog",
  "payload": {
    "content": "...",
    "type": "...",
    "category": "...",
    "note": "...",
    "tags": ["..."]
  }
}
```

### record-note / record-experience

These should map to DataBase-owned memory services rather than free-form table writes.

## Consumer Contract

MyBlog should use a dedicated write adapter with explicit methods such as:

```text
createWork()
appendChapter()
upsertVocabularyItem()
recordNote()
recordExperience()
```

The adapter should never accept SQL strings.
