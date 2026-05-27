---
title: Three-Repo Topology Constitution
status: canonical
owner: DataBase
---

# Three-Repo Topology Constitution

This document defines the long-term architecture boundary between DataBase,
ContentBase, and MyBlog.

It is a topology constitution, not an implementation plan and not a gate
expansion. ContractGuard may validate parts of this topology later, but it is
not the center of this system. DataBase is the center because it owns the
domain truth, ecosystem topology, and cross-repo contracts.

## Canonical Chain

```text
DataBase
  -> exports domain and projection contracts
ContentBase
  -> executes workflow against those contracts
MyBlog
  -> renders public projection artifacts
```

Repositories exchange artifacts. They must not exchange implementation
ownership.

## Repository Identities

| Repository | Identity | Owns | Must never become |
| --- | --- | --- | --- |
| `emptyinkpot/DataBase` | Creative Domain Platform | Domain schema, semantic graph, creative contracts, authoritative metadata, projection contracts, generated clients, ecosystem topology | Workflow runtime, public rendering shell, UI orchestration surface |
| `emptyinkpot/ContentBase` | Workflow Runtime | Generation, quality checks, repair, publish, audit, workflow state, runtime capabilities, platform execution | Domain truth owner, schema mirror, public projection shell, manual duplicate of DataBase types |
| `emptyinkpot/emptyinkpot.github.io` / MyBlog | Projection Shell | Presentation, reading UX, search, navigation, public collections, public static/runtime projections | Workflow runtime, private runtime API client, direct database consumer, domain truth owner |

Each repository should become more like itself over time. A repository crossing
these boundaries is architectural drift, even if the immediate feature works.

## DataBase Constitution

DataBase is the Creative Domain Platform and topology control plane.

DataBase owns:

- durable domain schema
- canonical content and creative records
- semantic graph snapshots and contracts
- author and vocabulary contracts
- platform binding truth
- public projection schemas
- generated API/client contracts
- ecosystem topology and cross-repo ownership maps

DataBase exports:

- `gateway/openapi.yaml`
- generated gateway/client packages
- semantic graph snapshots
- creative contracts
- public projection schemas
- ecosystem and catalog metadata

DataBase must not own:

- generation workflow execution
- publish workflow orchestration
- browser automation
- public reading UI
- MyBlog presentation state

## ContentBase Constitution

ContentBase is the Workflow Runtime.

ContentBase owns:

- generation command flow
- quality and continuity checks
- repair loops
- publish orchestration
- audit workflows
- workflow state and runtime capabilities
- platform execution evidence

ContentBase consumes:

- DataBase generated client or Gateway contracts
- DataBase creative contracts
- DataBase canonical content and platform binding projections

ContentBase exports:

- runtime capability metadata
- workflow capability reports
- quality reports
- repair traces
- publish manifests
- audit evidence

ContentBase must not own:

- durable content schema
- author model truth
- vocabulary truth
- platform binding truth
- public reading projection ownership
- copied DataBase domain types maintained by hand

## MyBlog Constitution

MyBlog is the Projection Shell.

MyBlog owns:

- public presentation
- reading UX
- search UX
- navigation and collection lenses
- public static artifacts
- public runtime projection surfaces

MyBlog consumes:

- public content bundles
- public projection artifacts
- generated MDX or static content projections
- public evidence library artifacts
- search indexes

MyBlog exports:

- static site build output
- public runtime JSON
- search index artifacts
- public evidence and collection surfaces
- structured public edit intake records for comments, highlights, moderation,
  and edit proposals

MyBlog must not own:

- private workflow logic
- direct database access
- DataBase table assumptions
- ContentBase generation or publish orchestration
- private runtime API dependencies for public rendering

MyBlog may provide editing and discussion UI, but these writes must be
structured intake records governed by
`docs/contracts/public-surface-edit-intake-contract.md`. MyBlog initiates
interaction; DataBase owns canonical acceptance, annotation promotion, graph
edit operations, and graph versions.

## Cross-Repo Artifact Grammar

### DataBase Outputs

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

Meaning:

- API contracts define access, not storage internals.
- Generated clients are the preferred dependency surface for workflow runtimes.
- Schemas and snapshots are projection contracts, not permission to mirror
  DataBase ownership in consumers.

### ContentBase Outputs

```text
runtime-capabilities.generated.md
workflow-capabilities.json
quality-report.json
repair-trace.json
publish-manifest.json
audit-evidence/
```

Meaning:

- Workflow artifacts describe execution and evidence.
- They do not become domain truth unless DataBase ingests them through an
  explicit contract.
- Runtime capability metadata describes what ContentBase can execute, not what
  DataBase owns.

### MyBlog Inputs And Outputs

```text
public-content-bundle/
evidence-library/
generated-mdx/
search-index/
runtime/content-index.json
apps/web/dist/
public-edit-intake.jsonl
```

Meaning:

- MyBlog renders public artifacts.
- It may index and present projected content.
- It may submit structured edit/comment/highlight/moderation intake.
- It must not infer or own private workflow state from public artifacts.

## Dependency Direction

Allowed direction:

```text
MyBlog
  consumes public projections from DataBase or published ContentBase artifacts

ContentBase
  consumes DataBase generated clients and contracts

DataBase
  records canonical domain truth and exported contracts
```

Forbidden direction:

```text
DataBase -> ContentBase workflow implementation
ContentBase -> MyBlog presentation internals
MyBlog -> ContentBase private runtime API
MyBlog -> DataBase raw database tables
ContentBase -> hand-maintained duplicate DataBase schema
```

## Drift Smells

Block or redesign when any of these appear:

- ContentBase adds durable domain tables for work, chapter, author model,
  vocabulary, creative contract, or platform binding truth.
- ContentBase introduces manual domain DTOs that duplicate generated DataBase
  contracts.
- MyBlog fetches private workflow APIs to render the public site.
- MyBlog adds direct MySQL access or depends on DataBase table names.
- DataBase starts orchestrating generation, browser publishing, or public UI
  behavior.
- A repo adds a registry, catalog, map, or metadata file that has no canonical
  owner and no execution consumer.

## Change Rule

Architecture changes between these three repositories must name exactly one
primary change axis:

- domain truth change in DataBase
- workflow runtime change in ContentBase
- projection shell change in MyBlog
- artifact contract change between repositories

If a task touches more than one axis, split it unless the cross-repo contract is
the explicit task.

## Reading Rule

Before changing cross-repo behavior, read:

1. This document.
2. The target repository `SYSTEM_IDENTITY.md`.
3. The target repository `project.json`.
4. The target repository boundary doc:
   - DataBase: `ECOSYSTEM_MAP.md`
   - ContentBase: `ARCHITECTURE.md` and `docs/contracts/DATA_CONTRACT.md`
   - MyBlog: `ARCHITECTURE.md` and `SYSTEM_TOPOLOGY.md`

## Governance Placement

ContractGuard is a utility. It may validate contracts and detect drift, but it
must not become the architecture center.

The canonical topology center is DataBase. The workflow runtime center is
ContentBase. The public projection center is MyBlog.
