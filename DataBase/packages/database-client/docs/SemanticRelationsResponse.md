
# SemanticRelationsResponse


## Properties

Name | Type
------------ | -------------
`count` | number
`relations` | [Array&lt;SemanticRelation&gt;](SemanticRelation.md)
`filters` | [SemanticRelationsResponseFilters](SemanticRelationsResponseFilters.md)
`requestId` | string

## Example

```typescript
import type { SemanticRelationsResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "count": null,
  "relations": null,
  "filters": null,
  "requestId": null,
} satisfies SemanticRelationsResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SemanticRelationsResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
