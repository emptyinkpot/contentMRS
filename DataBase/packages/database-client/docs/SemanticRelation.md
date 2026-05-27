
# SemanticRelation


## Properties

Name | Type
------------ | -------------
`id` | string
`fromUnitId` | string
`fromTagId` | string
`relationType` | string
`toUnitId` | string
`toTagId` | string
`description` | string
`status` | string
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { SemanticRelation } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "fromUnitId": null,
  "fromTagId": null,
  "relationType": null,
  "toUnitId": null,
  "toTagId": null,
  "description": null,
  "status": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies SemanticRelation

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SemanticRelation
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
