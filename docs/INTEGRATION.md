# Module Integration Boundary

ContentMRS root is not the integration runtime.

The old root-level vendor-in and federation wiring have been retired. The
current integration rule is:

```text
Dify workflow
  -> module public API or module-owned SDK
  -> module-owned runtime
```

## Ownership

| Area | Owner |
|------|-------|
| retrieval, scope, evidence, MySQL access | DataBase |
| generation runtime, writer/reviewer, model route consumption | ContentBase |
| admin UI adapters | ContentAdmin |
| web search provider | web-evidence-provider |
| publishing surfaces | MyBlog / fanqie-service |

## Root Responsibilities

The root may keep:

- module inventory
- boundary documentation
- high-level architecture notes
- sibling repository clone helper

The root must not keep:

- service orchestration
- deployment scripts
- production verification scripts
- central SDK packages
- copied OpenAPI schemas or generated clients
- vendor-in scripts that copy executable code into modules
- hidden runtime state

## Dify Contract

Dify composes modules through public module contracts. If a workflow needs an
SDK, that SDK belongs to the module that owns the API, not to the root.

For article generation, Dify is frozen as a thin input/status/output layer:

```text
Dify
  -> DataBase Research API
  -> FactPack
  -> ContentBase Author System
  -> Article
```

Dify must not request or interpret StylePack, author contracts, historical
temperament, metaphor rules, or prose rules. Those belong inside ContentBase.
DataBase may retrieve, ground, cite, rerank, and group facts; it must not tell
ContentBase how the article should sound.

ContentBase is the only author system. Its internal owner split is:

| Module | Responsibility |
|--------|----------------|
| AuthorContract | author personality, judgment, syntax, rhythm, banned phrases |
| BriefComposer | FactPack ordering, compression, current-fact emphasis, historical demotion |
| Writer | only prose generation point |
| Editor | real revision and deletion of fake depth, concept piles, historical takeover, and AI political tone |
| MinimalGate | factual red lines, author cleanliness, delivery completeness |

## Historical Notes

Older documents described root-level vendor cloning, vendor-in copying,
runtime-member orchestration, and production scripts. Those paths have been
removed to keep a single responsibility boundary:

```text
ContentMRS root = folder / inventory / boundary docs
Dify = orchestration
Each module = independent service + own SDK + own deployment
```
