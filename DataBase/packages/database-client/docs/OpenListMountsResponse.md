
# OpenListMountsResponse


## Properties

Name | Type
------------ | -------------
`count` | number
`mounts` | [Array&lt;OpenListMount&gt;](OpenListMount.md)
`requestId` | string

## Example

```typescript
import type { OpenListMountsResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "count": null,
  "mounts": null,
  "requestId": null,
} satisfies OpenListMountsResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OpenListMountsResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
