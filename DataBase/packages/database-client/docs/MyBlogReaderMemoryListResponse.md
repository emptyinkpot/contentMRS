
# MyBlogReaderMemoryListResponse


## Properties

Name | Type
------------ | -------------
`ok` | boolean
`items` | [Array&lt;MyBlogReaderMemory&gt;](MyBlogReaderMemory.md)
`requestId` | string

## Example

```typescript
import type { MyBlogReaderMemoryListResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ok": null,
  "items": null,
  "requestId": null,
} satisfies MyBlogReaderMemoryListResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogReaderMemoryListResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
