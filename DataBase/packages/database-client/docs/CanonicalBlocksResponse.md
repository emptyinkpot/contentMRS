
# CanonicalBlocksResponse


## Properties

Name | Type
------------ | -------------
`partId` | string
`count` | number
`blocks` | [Array&lt;ContentBlock&gt;](ContentBlock.md)
`requestId` | string

## Example

```typescript
import type { CanonicalBlocksResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "partId": null,
  "count": null,
  "blocks": null,
  "requestId": null,
} satisfies CanonicalBlocksResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CanonicalBlocksResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
