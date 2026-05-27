
# MyBlogVisualSnapshotResponse


## Properties

Name | Type
------------ | -------------
`ok` | boolean
`version` | number
`mode` | string
`downloaded` | boolean
`generatedAt` | string
`sources` | [Array&lt;MyBlogVisualSource&gt;](MyBlogVisualSource.md)
`pinsBySource` | { [key: string]: Array&lt;MyBlogVisualPin&gt;; }
`requestId` | string

## Example

```typescript
import type { MyBlogVisualSnapshotResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ok": null,
  "version": null,
  "mode": null,
  "downloaded": null,
  "generatedAt": null,
  "sources": null,
  "pinsBySource": null,
  "requestId": null,
} satisfies MyBlogVisualSnapshotResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogVisualSnapshotResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
