
# RecordArticleReferenceUsageReportPayload


## Properties

Name | Type
------------ | -------------
`workId` | number
`chapterId` | number
`chapterNumber` | number
`partId` | string
`reportId` | string
`report` | [ArticleReferenceUsageReport](ArticleReferenceUsageReport.md)
`operator` | string
`metadata` | { [key: string]: any; }

## Example

```typescript
import type { RecordArticleReferenceUsageReportPayload } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "workId": null,
  "chapterId": null,
  "chapterNumber": null,
  "partId": null,
  "reportId": null,
  "report": null,
  "operator": null,
  "metadata": null,
} satisfies RecordArticleReferenceUsageReportPayload

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordArticleReferenceUsageReportPayload
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
