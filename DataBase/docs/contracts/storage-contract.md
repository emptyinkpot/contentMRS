# Storage Contract

## Contract Principles

1. Every data family has exactly one canonical owner.
2. Access gateways are not data owners unless explicitly declared.
3. Inventories are snapshots, not live truth.
4. Runtime paths must be classified before cleanup.
5. Credentials must have explicit surfaces and operator intent.

## Canonical Owners

| Data Family | Canonical Owner | Notes |
| --- | --- | --- |
| Novel records | MySQL | `works`, `chapters`, outlines, characters |
| Vocabulary | MySQL | `vocabulary`, `banned_words` |
| Creative writing style contracts | MySQL | `creative_style_protocols`, `creative_style_modules`, `creative_editing_steps`, `creative_quality_rules`, `creative_source_materials`; exposed through `GET /creative/style-contract` |
| Account imports | MySQL | `imported_accounts`, `imported_browser_cookies` |
| Personal secrets | MySQL / local secret files | Depends on requested surface |
| Large assets | S3-compatible object store / OpenList backend / Quark | Long-term target is a replaceable S3-compatible object truth; MySQL may store metadata/reference only |
| Source code | GitHub + remote source roots | Remote-first repos declare their own roots |
| AI artifacts | Runtime workspace | Promote explicitly before treating as source |

## Integration Pattern

Applications should depend on this repository for:

- topology lookup
- schema awareness
- recovery procedure
- storage boundary decisions

Applications should not depend on this repository for:

- live data reads
- credential retrieval
- runtime queue state
- file serving

## Long-Term File Object Rule

New durable file-object capabilities should prefer this order:

1. S3-compatible object store as the object truth.
2. OpenList as access projection over that backend.
3. rclone for migration, sync, check, and inventory.
4. DataBase Gateway for metadata, references, permissions, and lifecycle state.

Do not implement object storage primitives inside DataBase. If POSIX semantics
are required, add JuiceFS as an explicit access layer and register its metadata
engine before promotion.

