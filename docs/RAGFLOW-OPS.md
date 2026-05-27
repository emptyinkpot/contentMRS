# RAGFlow Operations Boundary

Root-level RAGFlow operations are deprecated as orchestration truth.

If RAGFlow remains part of the evidence path, the owning module should document and operate it. Dify should call the module API, not root scripts.

## Current Rule

- DataBase/Gateway owns evidence retrieval integration.
- RAGFlow dataset and retrieval configuration should be documented under the owning module.
- ContentMRS root may keep inventory links only.
- Dify owns orchestration.

See:

- `../MODULES.md`
- `dify-orchestration.md`
