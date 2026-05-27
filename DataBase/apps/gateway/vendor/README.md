# Gateway vendored upstream

```powershell
pwsh -File "E:\My Project\ContentMRS\scripts\sync-vendor-into-products.ps1"
```

| Path | Wired in |
|------|----------|
| `knowledge_storm/` | `src/vendor/storm/evidence-query-expansion.ts` → `/evidence/search` multi-query |
| `ragflow-api/` | RAGFlow retrieval adapter (existing env config) |
| `lightrag/` | graph+vector retrieval reference |
