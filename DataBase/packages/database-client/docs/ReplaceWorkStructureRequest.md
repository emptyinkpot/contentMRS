
# ReplaceWorkStructureRequest


## Properties

Name | Type
------------ | -------------
`requestId` | string
`actor` | string
`payload` | [RecordArticleReferenceUsageReportPayload](RecordArticleReferenceUsageReportPayload.md)

## Example

```typescript
import type { ReplaceWorkStructureRequest } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "requestId": null,
  "actor": null,
  "payload": null,
} satisfies ReplaceWorkStructureRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReplaceWorkStructureRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
