# Architecture Inspirations

DataBase is influenced by mature systems across data cataloging, database migration, object storage, backup, observability, and personal knowledge infrastructure.

This repository does not clone any single project. It records what is borrowed conceptually, what is adapted, and what is explicitly not copied.

## Reference Map

| Domain | References | Borrowed Concept |
| --- | --- | --- |
| Data catalog | DataHub, OpenMetadata | Dataset inventory, ownership, lineage, searchable metadata |
| Database migration | Flyway, Liquibase, Prisma Migrate | Versioned schema, migration discipline, schema as contract |
| Object/file storage | MinIO, Rclone, OpenList, Nextcloud | Storage abstraction, file gateway, backend separation |
| Backup and restore | BorgBackup, Restic, GitLab backup docs | Restore-first thinking, snapshot inventory, recovery drills |
| Observability | Grafana, Prometheus, OpenTelemetry | Health facts, metrics mindset, current-state snapshots |
| Secrets surfaces | 1Password, Bitwarden, Vault | Secret surface registry and access boundary clarity |
| Knowledge graph | Obsidian, Quartz, AFFiNE | Human-readable maps, linked docs, durable operator memory |
| Infrastructure docs | Kubernetes docs, Terraform registry | Explicit ownership, declarative topology, environment boundaries |

## What DataBase Is

- A canonical topology and contract repository for personal data systems.
- A machine-readable inventory layer.
- A recovery and operations handbook.
- A shared context source for MyBlog, Mortis, OpenList, MySQL, and local operator tools.

## What DataBase Is Not

- Not a full database backup repository.
- Not a file mirror for OpenList or Quark.
- Not a runtime queue.
- Not a replacement for MySQL, OpenList, or application repos.
- Not a generic data platform product.

