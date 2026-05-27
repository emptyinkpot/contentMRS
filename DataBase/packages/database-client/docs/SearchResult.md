
# SearchResult


## Properties

Name | Type
------------ | -------------
`documentId` | string
`sourceTable` | string
`sourceId` | string
`source` | string
`title` | string
`privacyLevel` | string
`chunkIndex` | number
`snippet` | string

## Example

```typescript
import type { SearchResult } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "documentId": null,
  "sourceTable": null,
  "sourceId": null,
  "source": null,
  "title": null,
  "privacyLevel": null,
  "chunkIndex": null,
  "snippet": null,
} satisfies SearchResult

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SearchResult
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
