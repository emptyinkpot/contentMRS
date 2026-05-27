# Data Flow

## Current Flow

```text
Operator
  -> MyBlog Admin / CLI / Mortis
  -> MySQL structured records

Operator
  -> OpenList
  -> mounted backend
  -> Quark Drive / registered server file roots / other explicit file object truth

MyBlog
  -> reads MySQL and file surfaces
  -> publishes site output

Mortis
  -> reads topology and runtime state
  -> dispatches AI work
  -> may create artifacts in workspaces
```

## Design Goal

Separate data truth from access surfaces:

- MySQL owns structured records.
- OpenList owns file access projection.
- Quark owns large file persistence for Quark-backed objects.
- Registered server file roots own persistence only for paths explicitly designated as durable file storage.
- Runtime caches, deploy outputs, and workspace artifacts are not file object truth unless explicitly promoted.
- GitHub owns schema and topology knowledge.

## Stability Rules

- Do not create hidden parallel source roots.
- Do not make local Windows clones deployment authorities for remote-first repos.
- Do not use generated deploy output as source.
- Do not treat runtime artifacts as persistent source unless explicitly promoted.

