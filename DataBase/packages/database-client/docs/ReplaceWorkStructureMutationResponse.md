
# ReplaceWorkStructureMutationResponse


## Properties

Name | Type
------------ | -------------
`ok` | boolean
`action` | string
`idempotencyKey` | string
`actor` | string
`result` | [RecordStoryMemoryMutationResponseResult](RecordStoryMemoryMutationResponseResult.md)
`item` | [ReplaceWorkStructureResult](ReplaceWorkStructureResult.md)
`requestId` | string

## Example

```typescript
import type { ReplaceWorkStructureMutationResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ok": null,
  "action": null,
  "idempotencyKey": null,
  "actor": null,
  "result": null,
  "item": null,
  "requestId": null,
} satisfies ReplaceWorkStructureMutationResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReplaceWorkStructureMutationResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
