
# TableInventoryResponse


## Properties

Name | Type
------------ | -------------
`database` | string
`count` | number
`tables` | [Array&lt;TableInventoryItem&gt;](TableInventoryItem.md)
`requestId` | string

## Example

```typescript
import type { TableInventoryResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "database": null,
  "count": null,
  "tables": null,
  "requestId": null,
} satisfies TableInventoryResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TableInventoryResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
