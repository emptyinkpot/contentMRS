
# RecordAuditResultResult


## Properties

Name | Type
------------ | -------------
`workId` | number
`chapterId` | number
`chapterNumber` | number
`auditStatus` | string
`suggestedAction` | string
`issueCount` | number

## Example

```typescript
import type { RecordAuditResultResult } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "workId": null,
  "chapterId": null,
  "chapterNumber": null,
  "auditStatus": null,
  "suggestedAction": null,
  "issueCount": null,
} satisfies RecordAuditResultResult

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordAuditResultResult
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
