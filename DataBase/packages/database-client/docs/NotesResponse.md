
# NotesResponse


## Properties

Name | Type
------------ | -------------
`count` | number
`notes` | Array&lt;{ [key: string]: any; }&gt;
`requestId` | string

## Example

```typescript
import type { NotesResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "count": null,
  "notes": null,
  "requestId": null,
} satisfies NotesResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotesResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
