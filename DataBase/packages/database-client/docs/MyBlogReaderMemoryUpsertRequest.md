
# MyBlogReaderMemoryUpsertRequest


## Properties

Name | Type
------------ | -------------
`id` | string
`objectId` | string
`objectType` | string
`type` | string
`title` | string
`href` | string
`progress` | number
`percent` | number
`location` | any
`scrollTop` | number
`lastReadAt` | number
`updatedAt` | number

## Example

```typescript
import type { MyBlogReaderMemoryUpsertRequest } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "objectId": null,
  "objectType": null,
  "type": null,
  "title": null,
  "href": null,
  "progress": null,
  "percent": null,
  "location": null,
  "scrollTop": null,
  "lastReadAt": null,
  "updatedAt": null,
} satisfies MyBlogReaderMemoryUpsertRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogReaderMemoryUpsertRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
