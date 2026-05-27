# Noise Baseline

This root-level noise baseline is deprecated.

Runtime and acceptance noise should move to the module that owns the capability, or to Dify workflow evaluation if the noise belongs to orchestration.

## Ownership

| Noise Type | Owner |
|---|---|
| Gateway/database | DataBase |
| generation/model output | ContentBase |
| web evidence | web-evidence-provider |
| admin UI/session | ContentAdmin |
| workflow orchestration | Dify |

The old root runtime references are historical only.
