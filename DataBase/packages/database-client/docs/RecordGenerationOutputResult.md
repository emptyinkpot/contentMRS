
# RecordGenerationOutputResult


## Properties

Name | Type
------------ | -------------
`workId` | number
`chapterId` | number
`chapterNumber` | number
`partId` | string
`blockId` | string
`status` | string
`canonicalStatus` | string
`wordCount` | number

## Example

```typescript
import type { RecordGenerationOutputResult } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "workId": null,
  "chapterId": null,
  "chapterNumber": null,
  "partId": null,
  "blockId": null,
  "status": null,
  "canonicalStatus": null,
  "wordCount": null,
} satisfies RecordGenerationOutputResult

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordGenerationOutputResult
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
