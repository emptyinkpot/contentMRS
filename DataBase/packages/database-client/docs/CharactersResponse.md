
# CharactersResponse


## Properties

Name | Type
------------ | -------------
`workId` | string
`count` | number
`characters` | Array&lt;{ [key: string]: any; }&gt;
`requestId` | string

## Example

```typescript
import type { CharactersResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "workId": null,
  "count": null,
  "characters": null,
  "requestId": null,
} satisfies CharactersResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CharactersResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
