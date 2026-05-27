
# MyBlogVisualSource


## Properties

Name | Type
------------ | -------------
`id` | string
`sourceType` | string
`provider` | string
`sourceUrl` | string
`boardId` | string
`providerConfig` | { [key: string]: any; }
`title` | string
`collectionTitle` | string
`partitionPattern` | any
`syncIntervalSeconds` | number
`lastCursor` | string
`lastSyncedAt` | number
`syncStatus` | string
`pinsSnapshotHash` | string
`lastError` | string
`pinCount` | number
`createdAt` | number
`updatedAt` | number

## Example

```typescript
import type { MyBlogVisualSource } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "sourceType": null,
  "provider": null,
  "sourceUrl": null,
  "boardId": null,
  "providerConfig": null,
  "title": null,
  "collectionTitle": null,
  "partitionPattern": null,
  "syncIntervalSeconds": null,
  "lastCursor": null,
  "lastSyncedAt": null,
  "syncStatus": null,
  "pinsSnapshotHash": null,
  "lastError": null,
  "pinCount": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies MyBlogVisualSource

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogVisualSource
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
