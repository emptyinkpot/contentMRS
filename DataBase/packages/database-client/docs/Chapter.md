
# Chapter


## Properties

Name | Type
------------ | -------------
`id` | [WorkId](WorkId.md)
`workId` | [WorkId](WorkId.md)
`volumeNumber` | number
`chapterNumber` | number
`title` | string
`wordCount` | number
`status` | string
`auditStatus` | string
`auditIssues` | Array&lt;{ [key: string]: any; }&gt;
`suggestedAction` | string
`publishedAt` | Date
`updatedAt` | Date
`createdAt` | Date

## Example

```typescript
import type { Chapter } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "workId": null,
  "volumeNumber": null,
  "chapterNumber": null,
  "title": null,
  "wordCount": null,
  "status": null,
  "auditStatus": null,
  "auditIssues": null,
  "suggestedAction": null,
  "publishedAt": null,
  "updatedAt": null,
  "createdAt": null,
} satisfies Chapter

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Chapter
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
