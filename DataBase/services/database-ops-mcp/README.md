# Database Ops MCP

`database-ops-mcp` is the DataBase-owned database inspection capability.

## Role

- Inspect database health and schema context.
- Provide operational context to Codex and Mortis.
- Stay separate from product/business APIs.
- Avoid storing database dumps, credentials, or raw private data.

## Current Source

```yaml
sourceRepository: https://github.com/emptyinkpot/my-project-database-ops-mcp
sourceExtractedFrom: https://github.com/emptyinkpot/Atramenti-Console
sourceBaselineCommit: d9f2700e59daefb6a352c5d563f6910d652ccd0a
status: split-and-registered
```

The standalone repo remains useful as an MCP package/source mirror. DataBase owns the ecosystem contract, schemas, runtime policy, and consumer relationship.
