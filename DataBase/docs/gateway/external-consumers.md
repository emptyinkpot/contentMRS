# DataBase Gateway External Consumers

This document defines the stable consumer posture for systems that read the
DataBase ecosystem.

## Consumer Map

```text
MyBlog
  -> DataBase Gateway
  -> read-only content APIs

Mortis
  -> DataBase Gateway
  -> runtime status, inventory, search, content projections

n8n
  -> DataBase Gateway
  -> /health and /status for diagnostics
  -> authenticated read routes when workflows need rows

Local Operator
  -> NocoDB UI for manual inspection
  -> DataBase Gateway for stable API reads
  -> MySQL only for maintenance and service operations
```

## Stable Principle

External consumers should talk to gateways, not raw storage, unless they are
explicitly trusted maintenance tools.

## Consumer Rules

- MyBlog must not depend on raw MySQL schema details.
- Mortis must use `/status` as the runtime card entrypoint.
- Mortis should use `/search` for generic retrieval over the safe search
  projection.
- n8n should use unauthenticated `/health` for uptime checks.
- any route that returns data rows must require `X-DataBase-Api-Key`.
- no consumer should require direct access to privileged MySQL credentials.

## Reused Contract Files

```text
gateway/openapi.yaml
docs/gateway/database-gateway-operations.md
docs/gateway/external-integration-contract.md
docs/gateway/client-usage.md
docs/gateway/consumer-adapters.md
gateway/src/clients/database-gateway-client.ts
```

## Recommended Access Pattern

```text
consumer -> gateway client -> DataBase Gateway -> MySQL/NocoDB/OpenList
```

The client wrapper should handle:

- base URL
- API key injection
- request id capture
- JSON parsing
- simple error shaping

The client should not hide the HTTP contract or invent a new domain model.
