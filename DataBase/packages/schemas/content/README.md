# Content Contracts

This directory contains the machine-readable contract package for the canonical
content system.

Canonical architecture:

```text
docs/architecture/canonical-content-system.md
```

Executable schema entry:

```text
gateway/sql/005_canonical_content_schema.sql
```

This package is not a runtime database client. It exports Zod schemas, inferred
TypeScript types, and parse helpers so DataBase Gateway, ContentBase, and future
UI surfaces do not invent separate content shapes for novels, articles, blogs,
comics, and publishing records.

Local package:

```text
@emptyinkpot/database-content-contracts
```
