
# StyleRevisionPair


## Properties

Name | Type
------------ | -------------
`id` | string
`sourceId` | string
`sourceTitle` | string
`sourceLocator` | string
`issueType` | string
`ruleId` | string
`severity` | string
`originalText` | string
`revisedText` | string
`reviewerEvidence` | [StylePackRevisionPairsInnerReviewerEvidence](StylePackRevisionPairsInnerReviewerEvidence.md)
`tags` | [Array&lt;SemanticUnitTagsInner&gt;](SemanticUnitTagsInner.md)
`searchScore` | number

## Example

```typescript
import type { StyleRevisionPair } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "sourceId": null,
  "sourceTitle": null,
  "sourceLocator": null,
  "issueType": null,
  "ruleId": null,
  "severity": null,
  "originalText": null,
  "revisedText": null,
  "reviewerEvidence": null,
  "tags": null,
  "searchScore": null,
} satisfies StyleRevisionPair

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StyleRevisionPair
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
