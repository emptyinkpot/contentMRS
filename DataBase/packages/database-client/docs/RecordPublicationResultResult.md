
# RecordPublicationResultResult


## Properties

Name | Type
------------ | -------------
`recordId` | string
`targetId` | string
`contentPartId` | string
`chapterId` | number
`chapterNumber` | number
`action` | string
`remotePartId` | string
`observedStatus` | string
`chapterStatus` | string
`contentPartStatus` | string

## Example

```typescript
import type { RecordPublicationResultResult } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "recordId": null,
  "targetId": null,
  "contentPartId": null,
  "chapterId": null,
  "chapterNumber": null,
  "action": null,
  "remotePartId": null,
  "observedStatus": null,
  "chapterStatus": null,
  "contentPartStatus": null,
} satisfies RecordPublicationResultResult

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordPublicationResultResult
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
