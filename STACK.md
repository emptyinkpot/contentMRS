# ContentMRS Module Stack

ContentMRS root is no longer the runtime stack owner. It is a flat workspace that keeps independent modules together.

Dify owns orchestration. Each module owns its service, API, SDK, deployment, and environment.

## Modules

| Module | Path | Responsibility | SDK Owner |
|---|---|---|---|
| DataBase | `DataBase/` | Gateway API, data access, EvidencePack, StylePack | DataBase |
| ContentBase | `ContentBase/` | generation runtime, writer/reviewer | ContentBase |
| ContentAdmin | `ContentAdmin/` | human admin UI and UI adapters | ContentAdmin |
| web-evidence-provider | `DataBase/apps/web-evidence-provider/` | Tavily/web evidence provider | web-evidence-provider |
| fanqie-service | `fanqie-service/` | Fanqie publish execution on Alibaba Cloud ECS | fanqie-service |
| OpenList | `OpenList/` | file storage surface | OpenList |
| MyBlog | `MyBlog/` | static blog publishing | MyBlog |

## Dify Runtime Shape

```text
Dify workflow
  -> DataBase Gateway API / SDK
  -> ContentBase Runtime API / SDK
  -> web-evidence-provider API / SDK
  -> fanqie-service / MyBlog APIs
```

Current public publishing endpoint:

```text
fanqie-service: https://fanqie.tengokukk.com/fanqie
```

## Root Non-Responsibilities

The root does not:

- start all services
- define a service dependency chain
- own generated SDKs
- own module deployment
- own article generation logic
- store database truth

## Removed Root Runtime

The previous federation runtime has been removed:

- `runtime/`
- `.runtime/`
- `Start ContentMRS.cmd`
- `Install ContentMRS.cmd`

Do not recreate these paths. Dify replaces root-level runtime orchestration.
