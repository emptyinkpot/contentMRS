# Cloneable Solutions

This registry records mature open-source components that DataBase can adopt
instead of hand-building equivalent layers.

Machine-readable registry:

```text
ecosystem/cloneable-solutions.json
```

Validation:

```powershell
.\scripts\check-cloneable-solutions.ps1
.\scripts\check-cloneable-solutions.ps1 -Json
```

## Preferred Stack

| Layer | Solution | Role |
| --- | --- | --- |
| Table admin | NocoDB | Practical operator-facing CRUD and source browsing |
| Admin API | Directus | API-first admin surface when needed |
| Catalog | OpenMetadata | Ownership, lineage, glossary, classification |
| Sync | Airbyte | Source ingestion and replication |
| Workflow | n8n | Operator-driven orchestration and glue automation |
| Keyword search | Meilisearch | Fast indexed lookup |
| Vector search | Qdrant | Semantic recall and embedding retrieval |
| Analytics | Apache Superset | Dashboards and operational reporting |
| Generated REST | DreamFactory | Optional REST facade for compatible database setups |

## Adoption Rule

- Adopt proven components first.
- Keep MySQL as the truth source.
- Keep DataBase as topology and contract registry, not as the runtime
  implementation of all external tools.

## Recommended Mapping

| DataBase Need | Candidate |
| --- | --- |
| Current table administration | NocoDB |
| Generalized admin API | Directus |
| Ownership and lineage map | OpenMetadata |
| Source ingestion | Airbyte |
| Agent workflows | n8n |
| Keyword search projection | Meilisearch |
| Vector memory projection | Qdrant |
| Reporting | Superset |
| REST facade | DreamFactory |

## Notes

- `NocoDB` is already deployed and is the current practical table-admin
  surface.
- `Directus` remains a fallback if NocoDB becomes too limited for a specific
  workflow.
- `DreamFactory` is only useful if its database dialect support fits the MySQL
  runtime in use.
- `OpenMetadata`, `Airbyte`, `Meilisearch`, `Qdrant`, and `Superset` are
  adoption candidates, not current truth sources.

