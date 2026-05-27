
# RecordChapterTransitionResult


## Properties

Name | Type
------------ | -------------
`chapterId` | number
`workId` | number
`chapterNumber` | number
`fromState` | string
`toState` | string
`reason` | string
`logged` | boolean

## Example

```typescript
import type { RecordChapterTransitionResult } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "chapterId": null,
  "workId": null,
  "chapterNumber": null,
  "fromState": null,
  "toState": null,
  "reason": null,
  "logged": null,
} satisfies RecordChapterTransitionResult

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordChapterTransitionResult
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
