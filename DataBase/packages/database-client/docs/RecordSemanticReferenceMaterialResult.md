
# RecordSemanticReferenceMaterialResult


## Properties

Name | Type
------------ | -------------
`unitId` | string
`sourceId` | string
`sourceTitle` | string
`materialKind` | string
`status` | string
`tagCount` | number

## Example

```typescript
import type { RecordSemanticReferenceMaterialResult } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "unitId": null,
  "sourceId": null,
  "sourceTitle": null,
  "materialKind": null,
  "status": null,
  "tagCount": null,
} satisfies RecordSemanticReferenceMaterialResult

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordSemanticReferenceMaterialResult
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
