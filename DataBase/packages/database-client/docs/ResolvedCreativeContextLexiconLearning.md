
# ResolvedCreativeContextLexiconLearning


## Properties

Name | Type
------------ | -------------
`recentReviews` | [Array&lt;ResolvedCreativeContextLexiconLearningRecentReviewsInner&gt;](ResolvedCreativeContextLexiconLearningRecentReviewsInner.md)
`counts` | [ResolvedCreativeContextLexiconLearningCounts](ResolvedCreativeContextLexiconLearningCounts.md)
`summary` | string

## Example

```typescript
import type { ResolvedCreativeContextLexiconLearning } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "recentReviews": null,
  "counts": null,
  "summary": null,
} satisfies ResolvedCreativeContextLexiconLearning

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextLexiconLearning
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
