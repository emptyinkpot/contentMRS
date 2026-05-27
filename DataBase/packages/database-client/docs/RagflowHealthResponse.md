
# RagflowHealthResponse


## Properties

Name | Type
------------ | -------------
`ok` | boolean
`status` | string
`provider` | string
`message` | string
`baseUrl` | string
`datasetCount` | number
`documentFilterCount` | number
`visibleDatasetCount` | number
`missingDatasetIds` | Array&lt;string&gt;
`datasetsWithoutEmbedding` | Array&lt;string&gt;
`failedDocuments` | [Array&lt;RagflowHealthResponseFailedDocumentsInner&gt;](RagflowHealthResponseFailedDocumentsInner.md)
`query` | string
`chunkCount` | number
`sample` | [Array&lt;RagflowHealthResponseSampleInner&gt;](RagflowHealthResponseSampleInner.md)
`retrievalChecked` | boolean
`requestId` | string

## Example

```typescript
import type { RagflowHealthResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ok": null,
  "status": null,
  "provider": null,
  "message": null,
  "baseUrl": null,
  "datasetCount": null,
  "documentFilterCount": null,
  "visibleDatasetCount": null,
  "missingDatasetIds": null,
  "datasetsWithoutEmbedding": null,
  "failedDocuments": null,
  "query": null,
  "chunkCount": null,
  "sample": null,
  "retrievalChecked": null,
  "requestId": null,
} satisfies RagflowHealthResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RagflowHealthResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
