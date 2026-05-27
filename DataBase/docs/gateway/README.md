# Gateway Layer

DataBase is the control-plane repository for storage topology, schema awareness, inventory, and recovery. It does not directly serve production data.

The communication layer is a runtime gateway:

```text
External Consumers
  -> DreamFactory / DataBase API Gateway
  -> Tencent CynosDB MySQL

External Consumers
  -> OpenList API / Web
  -> Quark Drive / server file roots

DataBase repo
  -> documents topology, contracts, RBAC, recovery, and inventories
```

## Recommended Runtime Stack

```text
DataBase repo
  = topology / contracts / inventories / reference architecture

DreamFactory
  = installed generated API gateway candidate, currently blocked for MySQL service exposure

NocoDB
  = current active table-management and MySQL-facing gateway

Directus
  = blocked candidate database API, admin UI, RBAC, webhooks

Tencent CynosDB MySQL
  = structured data truth

OpenList
  = file gateway

n8n
  = workflow automation and scheduled jobs

Mortis
  = operator runtime and AI workflow consumer
```

## Current Gateway Decision

NocoDB is the active MySQL-facing gateway because it is already connected to CynosDB, has discovered the current models, and has sensitive models disabled.

DreamFactory is installed and initialized, but the active runtime does not expose a MySQL service type. It should stay loopback-only and be treated as a candidate until a MySQL-capable package/runtime is available.

Directus remains a useful candidate, but it is currently blocked by the CynosDB `explicit_defaults_for_timestamp=OFF` behavior.

## Boundary

- NocoDB owns the current MySQL-facing API/UI surface.
- DreamFactory is a candidate generated API gateway, but not the active MySQL API path.
- Directus remains a blocked candidate for richer admin/API use.
- MySQL owns structured records.
- DataBase owns documentation, contracts, inventories, and recovery knowledge.
- OpenList owns file access projection.

## Current Runtime Status

| Gateway | Status | Runtime | Notes |
| --- | --- | --- | --- |
| DreamFactory | active-loopback-blocked-for-mysql | `/srv/dreamfactory` | Installed and initialized; bound to `127.0.0.1:18089`; current runtime has no MySQL service type. |
| Directus | blocked | `/srv/directus` | CynosDB has `explicit_defaults_for_timestamp=OFF`; Directus migration fails on `directus_files.uploaded_on`. |
| NocoDB | active | `/srv/nocodb` | Bound to `127.0.0.1:18088`; metadata uses dedicated local Postgres; CynosDB source connected and models discovered. |
