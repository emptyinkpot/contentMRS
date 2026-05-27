
# GatewayMutationResponse


## Properties

Name | Type
------------ | -------------
`ok` | boolean
`action` | string
`idempotencyKey` | string
`actor` | string
`result` | [MutationResultMetadata](MutationResultMetadata.md)
`item` | { [key: string]: any; }
`requestId` | string

## Example

```typescript
import type { GatewayMutationResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ok": null,
  "action": null,
  "idempotencyKey": null,
  "actor": null,
  "result": null,
  "item": null,
  "requestId": null,
} satisfies GatewayMutationResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GatewayMutationResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
