# Configuration Boundary

ContentMRS root no longer owns runtime configuration.

Dify owns orchestration. Each module owns its own environment, secrets, SDK configuration, and deployment configuration.

## Current Rule

- DataBase owns Gateway/database configuration.
- ContentBase owns generation/runtime/model configuration.
- web-evidence-provider owns web evidence provider configuration.
- ContentAdmin owns admin UI/session configuration.
- ContentMRS root does not materialize `.runtime/local.env` as a current workflow.

## Removed

The old root runtime flow using `runtime/src/cli.mjs materialize-env` and `runtime/src/cli.mjs start` has been removed. Dify workflows replace root orchestration.

See:

- `../MODULES.md`
- `dify-orchestration.md`
