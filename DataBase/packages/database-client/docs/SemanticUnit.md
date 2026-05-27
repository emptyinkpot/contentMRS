
# SemanticUnit


## Properties

Name | Type
------------ | -------------
`id` | string
`sourceId` | string
`sourceTitle` | string
`sourceAuthor` | string
`sourceLocator` | string
`excerpt` | string
`summary` | string
`materialKind` | string
`status` | string
`tags` | [Array&lt;SemanticUnitTagsInner&gt;](SemanticUnitTagsInner.md)
`searchScore` | number
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { SemanticUnit } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "sourceId": null,
  "sourceTitle": null,
  "sourceAuthor": null,
  "sourceLocator": null,
  "excerpt": null,
  "summary": null,
  "materialKind": null,
  "status": null,
  "tags": null,
  "searchScore": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies SemanticUnit

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SemanticUnit
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
