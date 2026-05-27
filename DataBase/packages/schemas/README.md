# DataBase Schemas

This directory is the repository-level entrypoint for DataBase-owned machine
readable contracts.

DataBase is the domain contract authority. Product repositories and automation
surfaces consume these contracts through generated clients, exported types,
Gateway OpenAPI, or explicit adapter packages. They do not redefine DataBase
domain models locally.

## Owned Domains

The schema surface covers more than SQL tables:

- `content/`: canonical content projection contracts for works, parts, blocks,
  assets, relations, author profiles, and publication records.
- `creative/`: author model, style contract, writing techniques, preferred
  vocabulary, banned vocabulary, and quality rules.
- `data-curation/`: model-assisted labeling and curation output contracts.
- `search/`: search and indexing policy contracts.
- `agent-coordination/`: local repository collaboration contracts.
- `project/`: project manifest and project creation contracts.

Future domain schema additions should land here or under a clearly owned
subdirectory before consumers depend on them.

## Consumer Rule

Allowed outside DataBase:

```text
UI form schemas
view models
local editor state
adapter input/output wrappers
```

Not allowed outside DataBase:

```text
CanonicalWork
SemanticUnit
PublicationTarget
AuthorProfile
StyleContract
ResolvedCreativeContext
GenerationSnapshot
```

If a consumer needs one of these shapes, it must import or generate it from
DataBase-owned contracts.

## Current Contract Outputs

Current generated and executable outputs:

```text
apps/gateway/openapi.yaml
packages/database-client/
services/gateway-mcp/
services/gateway-client-adapters/
```

The long-term target is:

```text
schema-first contract
  -> runtime validation
  -> OpenAPI
  -> TypeScript types
  -> generated API/RPC client
  -> Python types when needed
  -> domain event schema
```

Do not use ORM entities as the public contract. Persistence schema, retrieval
indexes, graph projections, object storage metadata, and API payloads are
related surfaces, not interchangeable truth owners.
