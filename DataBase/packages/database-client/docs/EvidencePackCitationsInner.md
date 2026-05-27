
# EvidencePackCitationsInner


## Properties

Name | Type
------------ | -------------
`id` | string
`sourceId` | string
`chunkId` | string
`title` | string
`excerpt` | string
`locator` | string
`relevanceScore` | number
`metadata` | { [key: string]: any; }

## Example

```typescript
import type { EvidencePackCitationsInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "sourceId": null,
  "chunkId": null,
  "title": null,
  "excerpt": null,
  "locator": null,
  "relevanceScore": null,
  "metadata": null,
} satisfies EvidencePackCitationsInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EvidencePackCitationsInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
