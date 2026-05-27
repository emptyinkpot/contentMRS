
# ArticleReferenceUsageReport


## Properties

Name | Type
------------ | -------------
`version` | string
`articlePlanVersion` | string
`topic` | string
`target` | string
`referenceWeaveVersion` | string
`anchors` | [Array&lt;ArticleReferenceUsageReportAnchorsInner&gt;](ArticleReferenceUsageReportAnchorsInner.md)
`sourcePassages` | [Array&lt;ArticleReferenceUsageReportSourcePassagesInner&gt;](ArticleReferenceUsageReportSourcePassagesInner.md)
`sectionUsage` | [Array&lt;ArticleReferenceUsageReportSectionUsageInner&gt;](ArticleReferenceUsageReportSectionUsageInner.md)
`actualUsage` | [ArticleReferenceUsageReportActualUsage](ArticleReferenceUsageReportActualUsage.md)
`contextSources` | [ArticleReferenceUsageReportContextSources](ArticleReferenceUsageReportContextSources.md)
`warnings` | Array&lt;string&gt;

## Example

```typescript
import type { ArticleReferenceUsageReport } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "version": null,
  "articlePlanVersion": null,
  "topic": null,
  "target": null,
  "referenceWeaveVersion": null,
  "anchors": null,
  "sourcePassages": null,
  "sectionUsage": null,
  "actualUsage": null,
  "contextSources": null,
  "warnings": null,
} satisfies ArticleReferenceUsageReport

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ArticleReferenceUsageReport
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
