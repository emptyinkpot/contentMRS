# Dify Orchestration Boundary

Dify is the orchestration layer for ContentMRS modules.

The ContentMRS root is only a folder and inventory. It should not start services, hold SDK truth, or encode a hidden runtime workflow.

## Target Flow

```text
Dify
  -> DataBase Gateway API / SDK
  -> ContentBase Runtime API / SDK
  -> web-evidence-provider API / SDK
  -> fanqie-service / MyBlog publish APIs
```

The current `ContentMRS Writer` workflow on remote Dify produces article text
through DataBase and ContentBase. It does not yet include a publish node.
Publishing should be added as a separate explicit step that calls:

```text
POST https://fanqie.tengokukk.com/fanqie/publish/tomato
```

Dify may pass title, content, account, book, and chapter identifiers, but it
must not own Fanqie cookies, browser sessions, or platform selectors.

## Module Contracts

Each module owns its own contract:

- DataBase owns Gateway API and generated client.
- ContentBase owns generation runtime API and generated client.
- web-evidence-provider owns web evidence API and generated client once split for independent deployment.
- ContentAdmin owns UI adapters only.

## What Must Not Live In Root

- generated SDKs
- copied API schemas
- module secrets
- service startup dependency chains
- Dify workflow state
- article-generation business logic

## Migration Steps

1. Keep `MANIFEST.yaml` as inventory only.
2. Stop adding behavior to `runtime/`.
3. Move every service client to the service that owns the API.
4. Let Dify workflows call service-owned SDKs or stable HTTP APIs.
5. Delete the root runtime once Dify orchestration is stable.
