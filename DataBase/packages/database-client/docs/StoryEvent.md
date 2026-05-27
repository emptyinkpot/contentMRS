
# StoryEvent


## Properties

Name | Type
------------ | -------------
`id` | [StoryEventId](StoryEventId.md)
`workId` | [StoryEventId](StoryEventId.md)
`chapterNumber` | number
`eventType` | string
`title` | string
`description` | string
`charactersInvolved` | Array&lt;string&gt;
`importance` | string
`createdAt` | string

## Example

```typescript
import type { StoryEvent } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "workId": null,
  "chapterNumber": null,
  "eventType": null,
  "title": null,
  "description": null,
  "charactersInvolved": null,
  "importance": null,
  "createdAt": null,
} satisfies StoryEvent

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StoryEvent
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
