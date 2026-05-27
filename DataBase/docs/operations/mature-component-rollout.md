# Mature Component Rollout

This repository should prefer cloning proven open-source components instead of
hand-building every layer.

## Recommended Stack

### Management Surface

- NocoDB for lightweight table administration and operator editing
- Directus when a more general API-first admin surface is needed

### Governance And Catalog

- OpenMetadata for ownership, catalog, lineage, and classification thinking
- Backstage for project discovery and repo/service projection

### Sync And Ingestion

- Airbyte for source ingestion and replication when data must move between
  systems
- n8n for operator-driven workflows and glue automation

### Search And Retrieval

- Meilisearch for keyword search and fast indexed lookup
- Qdrant for vector retrieval and semantic recall

### Analytics

- Apache Superset for dashboards and operational reporting

### API Facade

- DreamFactory only when a generated REST layer is useful and the database
  dialect constraints are acceptable

## What To Clone Instead Of Hand-Supporting

- database admin UI
- catalog and ownership registry
- source-to-target sync jobs
- keyword search index
- vector memory index
- dashboard/reporting surface

## DataBase Role In This Stack

DataBase should keep:

- the canonical topology
- the source-of-truth map
- the service contracts
- the deployment and recovery notes
- the inventory of what is stored where

DataBase should not become the runtime implementation of every external
component.

## Suggested Rollout Order

1. Keep MySQL as the structured truth source.
2. Keep NocoDB as the current practical table-admin surface.
3. Add OpenMetadata-style catalog records in DataBase docs and JSON first.
4. Use Meilisearch and Qdrant only after the truth tables and access policy are
   stable.
5. Add Airbyte or n8n only when an actual sync path is needed.
6. Use Superset last for reporting and review.

## References

- https://nocodb.com/docs/self-hosting
- https://docs.directus.io/self-hosted/quickstart
- https://docs.open-metadata.org/
- https://docs.airbyte.com/
- https://www.meilisearch.com/docs/learn/self_hosted
- https://qdrant.tech/
- https://superset.apache.org/
- https://docs.dreamfactory.com/introduction/

