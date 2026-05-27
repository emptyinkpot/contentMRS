# SDK Boundary

ContentAdmin consumes two internal SDK surfaces.

Browser code should prefer ContentAdmin/Directus server endpoints for privileged
queries. The server-side endpoint can hold service credentials and call DataBase
Gateway; the browser must not hold `DATABASE_GATEWAY_API_KEY`.

## DataBase SDK

Used for:

- works, chapters, content parts, content blocks
- source catalog browsing through `listContentSources`
- literature and semantic materials behind Gateway-owned projections
- EvidencePack retrieval
- style contracts and vocabulary contracts
- controlled draft or canonical writes through Gateway

Forbidden:

- direct MySQL canonical writes
- direct Obsidian file reads
- direct OpenList raw-path coupling
- local shadow indexes of DataBase content

Current read chain:

```text
Public Workbench / Directus extension
  -> Directus endpoint
  -> @emptyinkpot/content-admin-database-sdk-adapter
  -> @emptyinkpot/database-gateway-generated-client
  -> DataBase Gateway
```

The workbench can display `ContentSourceSummary`, `EvidencePack`, and topology
projections. It cannot derive source IDs by reading internal tables directly.

## ContentBase SDK

Used for:

- triggering article or chapter generation
- viewing runtime jobs
- viewing model invocation traces
- viewing reviewer reports
- reading generated body readback

Forbidden:

- importing ContentBase internal functions into the frontend
- bypassing ContentBase runtime routes
- treating UI state as generation truth

Current server-side adapter methods:

```text
getCapabilities()
generateArticle(request)
generateChapter(request)
createJob({ capabilityId, input, idempotencyKey, requestedBy })
getJob(jobId)
cancelJob(jobId, reason)
```

Current Directus proxy routes:

```text
GET  /evidence-search/runtime/capabilities
POST /evidence-search/runtime/generate/article
POST /evidence-search/runtime/generate/chapter
POST /evidence-search/runtime/jobs
GET  /evidence-search/runtime/jobs/:jobId
POST /evidence-search/runtime/jobs/:jobId/cancel
```

Preferred article generation request:

```json
{
  "capabilityId": "runtime.generate.article",
  "input": {
    "topic": "string",
    "target": "draft",
    "evidenceQuery": {
      "query": "string",
      "sourceIds": ["source-id"],
      "includeWeb": false,
      "includeRagflow": false,
      "rounds": 4,
      "limit": 8
    },
    "persist": false
  },
  "requestedBy": "content-admin-directus"
}
```

Expected result surface:

```text
job.result.draft.body
job.result.trace.research
job.result.trace.review
job.result.quality
job.result.acceptance
job.result.draft.referenceCoverage
```
