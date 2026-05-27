---
title: DataBase System Identity
status: canonical
owner: DataBase
---

# DataBase System Identity

DataBase is the Creative Domain Platform and topology control plane for the
emptyinkpot content ecosystem.

It is not a workflow runtime, a public rendering shell, or a UI orchestration
repo.

## Fundamental Identity

DataBase owns the durable domain truth:

- domain schema
- canonical content records
- semantic graph
- creative contracts
- author and vocabulary contracts
- platform binding truth
- authoritative metadata
- projection contracts
- generated DataBase Gateway clients
- ecosystem topology

## Export Boundary

DataBase exports contracts and artifacts for other systems:

```text
gateway/openapi.yaml
generated/
schemas/content/
schemas/creative/
schemas/semantic/
semantic-graph.snapshot.json
creative-contracts/
public-projection.schema.json
```

Consumers should use the Gateway, generated clients, and projection artifacts.
They must not learn raw storage internals unless the task is explicit database
administration.

## Must Never Become

DataBase must not become:

- ContentBase workflow execution
- generation orchestration
- publish orchestration
- browser automation
- MyBlog presentation logic
- a public frontend shell
- a second copy of consumer runtime state

## Dependency Rule

DataBase defines domain and projection contracts. Workflow runtimes and public
shells depend on those contracts. DataBase must not depend on consumer
implementation internals.

The cross-repo constitution is:

```text
docs/contracts/three-repo-topology-constitution.md
```
