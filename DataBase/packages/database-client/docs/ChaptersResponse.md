
# ChaptersResponse


## Properties

Name | Type
------------ | -------------
`workId` | string
`count` | number
`chapters` | [Array&lt;Chapter&gt;](Chapter.md)
`requestId` | string

## Example

```typescript
import type { ChaptersResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "workId": null,
  "count": null,
  "chapters": null,
  "requestId": null,
} satisfies ChaptersResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ChaptersResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
