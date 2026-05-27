
# StateTransitionsResponse


## Properties

Name | Type
------------ | -------------
`count` | number
`transitions` | Array&lt;{ [key: string]: any; }&gt;
`requestId` | string

## Example

```typescript
import type { StateTransitionsResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "count": null,
  "transitions": null,
  "requestId": null,
} satisfies StateTransitionsResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StateTransitionsResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
