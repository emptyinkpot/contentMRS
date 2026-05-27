
# EvidencePack


## Properties

Name | Type
------------ | -------------
`version` | string
`query` | string
`mode` | string
`queryRun` | [EvidencePackQueryRun](EvidencePackQueryRun.md)
`sources` | [Array&lt;EvidencePackSourcesInner&gt;](EvidencePackSourcesInner.md)
`chunks` | [Array&lt;EvidencePackChunksInner&gt;](EvidencePackChunksInner.md)
`citations` | [Array&lt;EvidencePackCitationsInner&gt;](EvidencePackCitationsInner.md)
`constraints` | Array&lt;string&gt;
`counts` | [EvidencePackCounts](EvidencePackCounts.md)
`screening` | [EvidencePackScreening](EvidencePackScreening.md)
`requestId` | string

## Example

```typescript
import type { EvidencePack } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "version": null,
  "query": null,
  "mode": null,
  "queryRun": null,
  "sources": null,
  "chunks": null,
  "citations": null,
  "constraints": null,
  "counts": null,
  "screening": null,
  "requestId": null,
} satisfies EvidencePack

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EvidencePack
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
