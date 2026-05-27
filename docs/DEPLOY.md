# Deployment Boundary

ContentMRS root no longer deploys the stack as one runtime.

Dify owns orchestration. Each module owns its own deployment process.

## Module Deployment Owners

| Module | Deployment Owner |
|---|---|
| DataBase | DataBase |
| ContentBase | ContentBase |
| ContentAdmin | ContentAdmin |
| web-evidence-provider | web-evidence-provider |
| fanqie-service | fanqie-service on Alibaba Cloud ECS |
| OpenList | OpenList |
| MyBlog | MyBlog |

## Root Rule

Root deployment scripts must not become the executable source of orchestration truth. Root docs may link to module deployment docs and Dify workflows.

## Current Cloud Services

| Module | Platform | Public URL | Verification |
|---|---|---|---|
| fanqie-service | Alibaba Cloud ECS `i-bp1e1lcototdd38ss8q2` | `https://fanqie.tengokukk.com/fanqie` | `GET /health`, `POST /publish/tomato` dry-run |

## Removed

Former root-level deployment and double-click startup instructions have been removed:

- `Start ContentMRS.cmd`
- `Install ContentMRS.cmd`
- `runtime/src/cli.mjs`
- root-level `runtime.members`
