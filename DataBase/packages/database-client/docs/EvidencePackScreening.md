
# EvidencePackScreening


## Properties

Name | Type
------------ | -------------
`version` | string
`requestedLimit` | number
`queryCount` | number
`sourceFilterIds` | Array&lt;string&gt;
`selectedChunkCount` | number
`selectedCitationCount` | number
`sourceDiversityCount` | number
`droppedDuplicateChunkCount` | number
`rankingSignals` | Array&lt;string&gt;
`rejected` | [Array&lt;EvidencePackScreeningRejectedInner&gt;](EvidencePackScreeningRejectedInner.md)
`excludeQueriesApplied` | Array&lt;string&gt;
`centralClaim` | string
`fusion` | [EvidencePackScreeningFusion](EvidencePackScreeningFusion.md)
`latentRerank` | [EvidencePackScreeningLatentRerank](EvidencePackScreeningLatentRerank.md)

## Example

```typescript
import type { EvidencePackScreening } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "version": null,
  "requestedLimit": null,
  "queryCount": null,
  "sourceFilterIds": null,
  "selectedChunkCount": null,
  "selectedCitationCount": null,
  "sourceDiversityCount": null,
  "droppedDuplicateChunkCount": null,
  "rankingSignals": null,
  "rejected": null,
  "excludeQueriesApplied": null,
  "centralClaim": null,
  "fusion": null,
  "latentRerank": null,
} satisfies EvidencePackScreening

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EvidencePackScreening
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
