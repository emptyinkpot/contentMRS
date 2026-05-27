
# MyBlogVisualSyncResultRequest


## Properties

Name | Type
------------ | -------------
`sourceId` | string
`provider` | string
`ok` | boolean
`runId` | string
`snapshotHash` | string
`error` | string
`pins` | [Array&lt;MyBlogVisualSyncResultRequestPinsInner&gt;](MyBlogVisualSyncResultRequestPinsInner.md)

## Example

```typescript
import type { MyBlogVisualSyncResultRequest } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "sourceId": null,
  "provider": null,
  "ok": null,
  "runId": null,
  "snapshotHash": null,
  "error": null,
  "pins": null,
} satisfies MyBlogVisualSyncResultRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogVisualSyncResultRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
