# ContentMRS Root Contract

ContentMRS root is a module workspace and inventory. It is not the orchestrator and not a business runtime.

## Root Rules

| Rule | Meaning |
|---|---|
| No root orchestration | Dify owns workflow orchestration. |
| No central SDK | Each module owns its own SDK and API contract. |
| No copied API truth | The root must not keep a second copy of module OpenAPI schemas, generated clients, or request models. |
| No business data access | Data access belongs to the module that owns the API, especially DataBase for business data. |
| No generation logic | Generation logic belongs to ContentBase or future module owners, not root scripts. |
| Inventory only | Root files may document module boundaries, inventory, and migration status. |

## Module Ownership

| Module | Owns |
|---|---|
| DataBase | Gateway API, database access, Research API, FactPack/EvidencePack, grounding, citation, DataBase SDK |
| ContentBase | AuthorContract, BriefComposer, Writer, Editor, MinimalGate, generation runtime, ContentBase SDK |
| ContentAdmin | human admin UI and UI adapters |
| web-evidence-provider | web evidence API and SDK after independent packaging |
| fanqie-service | Fanqie publishing execution |
| OpenList | file storage surface |
| MyBlog | static blog publishing |

## Dify Boundary

Dify composes modules through public APIs or module-owned SDKs.

```text
Dify
  -> module-owned SDK/API
  -> module-owned runtime
```

Dify workflows may encode orchestration policy. ContentMRS root must not duplicate that workflow as scripts, generated state, or hidden runtime config.

## Frozen Writer Topology

This is the accepted long-term boundary for article generation:

| Layer | Module | Final Responsibility | Explicitly Forbidden |
|---|---|---|---|
| L0 | Dify | input, module calls, status, output | writing prose, owning style, metaphor, history, or style routing |
| L1 | DataBase Research API | search, retrieval, rerank, grounding, citation, fact grouping | explaining literature, explaining historical temperament, emitting Mishima/Xingwang/style writing guidance |
| L2 | FactPack | pass real-world facts, sources, dates, institutions, and numbers to ContentBase | carrying writing advice |
| L3 | ContentBase Author System | author contract, brief, writing, editing, revision, minimal release checks | allowing workflow, StylePack, or historical material to seize authorial control |
| L4 | sub2api/qwen-plus | execute generation and rewrite calls | opening a parallel model path in Dify |
| L5 | Job/Storage | save job, article, citations, and reports | saving a second protocol truth |

ContentBase owns the internal author system:

| Module | Authority | Role |
|---|---:|---|
| AuthorContract | highest | author protocol: worldview, syntax, rhythm, banned phrases, judgment style |
| BriefComposer | medium | convert FactPack into writable brief: fact ordering, compression, real-world anchors, historical demotion |
| Writer | highest execution | the only prose generator |
| Editor | high | revision: remove fake profundity, abstract piles, historical takeover, AI philosophy sentences, platform political tone |
| MinimalGate | low with veto | check factual red lines, author cleanliness, and delivery completeness |

Frozen data flow:

```text
User Topic
  -> Dify
  -> DataBase Research API
  -> FactPack
  -> ContentBase Author System
  -> AuthorContract + BriefComposer
  -> Writer
  -> Editor / Revision
  -> MinimalGate
  -> Article
```

Frozen principle:

```text
The world provides material. The author decides meaning. The editor removes falsehood. The gate only guards the floor.
```

## Removed Root Runtime

The former root federation runtime has been removed:

- `runtime/`
- `.runtime/`
- `Start ContentMRS.cmd`
- `Install ContentMRS.cmd`
- runtime-member orchestration previously stored in `MANIFEST.yaml`

Do not recreate these paths as a second orchestration system.

## Still Valid Cross-Module Principle

Even when Dify orchestrates modules, module ownership still matters:

- DataBase remains the owner of DataBase contracts.
- ContentBase remains the owner of generation contracts.
- ContentAdmin may adapt SDKs for UI/session concerns but must not become the source of SDK truth.
- Root documentation may point to module contracts but must not replace them.
