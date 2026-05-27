
# ArticleReferenceUsageReportActualUsage


## Properties

Name | Type
------------ | -------------
`score` | number
`threshold` | number
`paragraphCount` | number
`materialBackedParagraphCount` | number
`materialBackedParagraphRatio` | number
`kindCoverage` | { [key: string]: number; }
`matchedAnchorNames` | Array&lt;string&gt;
`paragraphs` | [Array&lt;ArticleReferenceUsageReportActualUsageParagraphsInner&gt;](ArticleReferenceUsageReportActualUsageParagraphsInner.md)

## Example

```typescript
import type { ArticleReferenceUsageReportActualUsage } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "score": null,
  "threshold": null,
  "paragraphCount": null,
  "materialBackedParagraphCount": null,
  "materialBackedParagraphRatio": null,
  "kindCoverage": null,
  "matchedAnchorNames": null,
  "paragraphs": null,
} satisfies ArticleReferenceUsageReportActualUsage

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ArticleReferenceUsageReportActualUsage
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
