
# RecordAuthorLexiconReviewPayload


## Properties

Name | Type
------------ | -------------
`authorProfileId` | string
`term` | string
`decision` | string
`sourceKind` | string
`sourceRef` | string
`reason` | string
`category` | string
`note` | string
`alternative` | string
`tags` | Array&lt;string&gt;

## Example

```typescript
import type { RecordAuthorLexiconReviewPayload } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "authorProfileId": null,
  "term": null,
  "decision": null,
  "sourceKind": null,
  "sourceRef": null,
  "reason": null,
  "category": null,
  "note": null,
  "alternative": null,
  "tags": null,
} satisfies RecordAuthorLexiconReviewPayload

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordAuthorLexiconReviewPayload
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
