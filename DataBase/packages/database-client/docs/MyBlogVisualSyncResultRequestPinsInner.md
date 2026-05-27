
# MyBlogVisualSyncResultRequestPinsInner


## Properties

Name | Type
------------ | -------------
`id` | string
`pinId` | string
`pinUrl` | string
`imagePreviewUrl` | string
`image` | string
`title` | string
`description` | string
`boardId` | string
`positionIndex` | number
`raw` | any

## Example

```typescript
import type { MyBlogVisualSyncResultRequestPinsInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "pinId": null,
  "pinUrl": null,
  "imagePreviewUrl": null,
  "image": null,
  "title": null,
  "description": null,
  "boardId": null,
  "positionIndex": null,
  "raw": null,
} satisfies MyBlogVisualSyncResultRequestPinsInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogVisualSyncResultRequestPinsInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
