
# TableInventoryItem


## Properties

Name | Type
------------ | -------------
`name` | string
`visibility` | string
`approximateRows` | number
`dataBytes` | number
`updatedAt` | Date

## Example

```typescript
import type { TableInventoryItem } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "visibility": null,
  "approximateRows": null,
  "dataBytes": null,
  "updatedAt": null,
} satisfies TableInventoryItem

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TableInventoryItem
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
