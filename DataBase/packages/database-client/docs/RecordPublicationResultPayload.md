
# RecordPublicationResultPayload


## Properties

Name | Type
------------ | -------------
`targetId` | string
`platform` | string
`accountId` | string
`bookId` | string
`localWorkId` | [StoryEventId](StoryEventId.md)
`chapterId` | [StoryEventId](StoryEventId.md)
`chapterNumber` | number
`contentPartId` | string
`action` | string
`remotePartId` | string
`observedStatus` | string
`publishedAt` | string
`result` | { [key: string]: any; }

## Example

```typescript
import type { RecordPublicationResultPayload } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "targetId": null,
  "platform": null,
  "accountId": null,
  "bookId": null,
  "localWorkId": null,
  "chapterId": null,
  "chapterNumber": null,
  "contentPartId": null,
  "action": null,
  "remotePartId": null,
  "observedStatus": null,
  "publishedAt": null,
  "result": null,
} satisfies RecordPublicationResultPayload

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordPublicationResultPayload
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
