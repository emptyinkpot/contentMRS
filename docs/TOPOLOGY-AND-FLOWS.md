# Topology And Flows

ContentMRS root is a module inventory folder.

The old topology based on a root federation control plane has been retired from current documentation. Dify should own executable orchestration. Each module should expose public APIs and module-owned SDKs.

## Current Topology

```text
ContentMRS/
  DataBase/          owns Gateway API + DataBase SDK
  ContentBase/       owns generation runtime + ContentBase SDK
  ContentAdmin/      owns admin UI + UI adapters
  fanqie-service/    owns Fanqie publishing, deployed on Alibaba Cloud ECS
  OpenList/          owns file storage surface
  MyBlog/            owns static blog publishing
```

## Dify Flow

```text
Dify
  -> DataBase API / SDK
  -> ContentBase API / SDK
  -> web-evidence-provider API / SDK
  -> publishing modules
```

Current publishing module endpoint:

```text
fanqie-service -> https://fanqie.tengokukk.com/fanqie
```

## Root Non-Role

The root does not define:

- service startup order
- runtime member graph
- SDK truth
- article generation pipeline
- database truth

See:

- `../MODULES.md`
- `dify-orchestration.md`
