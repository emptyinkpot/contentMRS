
# MyBlogReaderHighlightResponse


## Properties

Name | Type
------------ | -------------
`ok` | boolean
`item` | [MyBlogReaderHighlight](MyBlogReaderHighlight.md)
`requestId` | string

## Example

```typescript
import type { MyBlogReaderHighlightResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ok": null,
  "item": null,
  "requestId": null,
} satisfies MyBlogReaderHighlightResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyBlogReaderHighlightResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
