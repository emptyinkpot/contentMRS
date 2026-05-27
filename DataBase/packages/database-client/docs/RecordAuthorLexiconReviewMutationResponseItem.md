
# RecordAuthorLexiconReviewMutationResponseItem


## Properties

Name | Type
------------ | -------------
`reviewId` | number
`authorProfileId` | string
`term` | string
`decision` | string
`sourceKind` | string
`sourceRef` | string
`promotionApplied` | boolean
`promotedTable` | string
`activeRecordId` | string
`activeSummary` | string

## Example

```typescript
import type { RecordAuthorLexiconReviewMutationResponseItem } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "reviewId": null,
  "authorProfileId": null,
  "term": null,
  "decision": null,
  "sourceKind": null,
  "sourceRef": null,
  "promotionApplied": null,
  "promotedTable": null,
  "activeRecordId": null,
  "activeSummary": null,
} satisfies RecordAuthorLexiconReviewMutationResponseItem

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordAuthorLexiconReviewMutationResponseItem
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
