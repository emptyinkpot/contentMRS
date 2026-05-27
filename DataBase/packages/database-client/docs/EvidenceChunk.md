
# EvidenceChunk


## Properties

Name | Type
------------ | -------------
`id` | string
`sourceId` | string
`chunkIndex` | number
`text` | string
`privacyLevel` | string
`relevanceScore` | number
`location` | { [key: string]: any; }
`metadata` | { [key: string]: any; }

## Example

```typescript
import type { EvidenceChunk } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "sourceId": null,
  "chunkIndex": null,
  "text": null,
  "privacyLevel": null,
  "relevanceScore": null,
  "location": null,
  "metadata": null,
} satisfies EvidenceChunk

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EvidenceChunk
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
