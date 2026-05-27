
# MyBlogReaderHighlight


## Properties

Name | Type
------------ | -------------
`id` | string
`articleId` | string
`objectId` | string
`objectType` | string
`title` | string
`text` | string
`color` | string
`note` | string
`anchor` | any
`createdAt` | number
`updatedAt` | number

## Example

```typescript
import type { MyBlogReaderHighlight } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "articleId": null,
  "objectId": null,
  "objectType": null,
  "title": null,
  "text": null,
  "color": null,
  "note": null,
  "anchor": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies MyBlogReaderHighlight

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogReaderHighlight
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
