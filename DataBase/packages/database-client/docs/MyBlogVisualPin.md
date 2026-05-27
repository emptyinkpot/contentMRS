
# MyBlogVisualPin


## Properties

Name | Type
------------ | -------------
`id` | string
`pinId` | string
`sourceId` | string
`pinUrl` | string
`imagePreviewUrl` | string
`title` | string
`description` | string
`boardId` | string
`positionIndex` | number
`downloaded` | boolean
`raw` | any
`firstSeenAt` | number
`lastSeenAt` | number
`deletedAt` | number

## Example

```typescript
import type { MyBlogVisualPin } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "pinId": null,
  "sourceId": null,
  "pinUrl": null,
  "imagePreviewUrl": null,
  "title": null,
  "description": null,
  "boardId": null,
  "positionIndex": null,
  "downloaded": null,
  "raw": null,
  "firstSeenAt": null,
  "lastSeenAt": null,
  "deletedAt": null,
} satisfies MyBlogVisualPin

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogVisualPin
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
