# ContentMRS Modules

This file is the root inventory for modules kept under `ContentMRS/`.

ContentMRS root does not own module SDKs or runtime orchestration. Each module is responsible for its own API, SDK, deployment, secrets, and tests. Dify composes these modules through their public contracts.

## Module Inventory

| Module | Path | Canonical Responsibility | Public Surface | SDK Ownership |
|---|---|---|---|---|
| DataBase | `DataBase/` | business data, Gateway API, EvidencePack, StylePack, scope resolution | Gateway HTTP API | `DataBase/packages/database-client/` |
| ContentBase | `ContentBase/` | generation runtime, writer, reviewer, trace output | ContentBase runtime API | ContentBase-owned runtime SDK |
| ContentAdmin | `ContentAdmin/` | human admin UI, Directus/public workbench, UI adapters | admin UI and server adapters | ContentAdmin adapters only |
| web-evidence-provider | `DataBase/apps/web-evidence-provider/` | web/Tavily evidence provider | provider HTTP API | should be split or owned by provider package before independent deployment |
| fanqie-service | `fanqie-service/` | Fanqie publishing execution | `https://fanqie.tengokukk.com/fanqie` | fanqie-service |
| OpenList | `OpenList/` | file storage surface | OpenList API | OpenList |
| MyBlog | `MyBlog/` | static blog publishing surface | build/deploy scripts/API | MyBlog |

## Ownership Rules

- DataBase owns DataBase SDKs.
- ContentBase owns ContentBase SDKs.
- web-evidence-provider should own its provider SDK before being independently packaged.
- ContentAdmin may wrap SDKs for UI/session concerns, but it must not become the SDK truth source for DataBase or ContentBase.
- ContentMRS root must not create a central SDK package.
- ContentMRS root must not keep a second copy of API contracts.

## Dify Boundary

Dify should call modules at their public surfaces:

```text
Dify workflow
  -> DataBase SDK/API
  -> ContentBase SDK/API
  -> web-evidence SDK/API
  -> fanqie-service/MyBlog publishing APIs
```

Root documentation may describe recommended Dify flows, but the executable orchestration belongs to Dify.

`fanqie-service` is deployed on Alibaba Cloud ECS. Its Dify-facing publish endpoint is:

```text
POST https://fanqie.tengokukk.com/fanqie/publish/tomato
```

## Migration Notes

The old root runtime control plane has been removed. New work should target module-owned SDKs and Dify orchestration.
