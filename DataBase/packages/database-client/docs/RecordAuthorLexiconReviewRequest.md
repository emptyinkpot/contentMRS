
# RecordAuthorLexiconReviewRequest


## Properties

Name | Type
------------ | -------------
`requestId` | string
`actor` | string
`payload` | [RecordAuthorLexiconReviewPayload](RecordAuthorLexiconReviewPayload.md)

## Example

```typescript
import type { RecordAuthorLexiconReviewRequest } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "requestId": null,
  "actor": null,
  "payload": null,
} satisfies RecordAuthorLexiconReviewRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordAuthorLexiconReviewRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
