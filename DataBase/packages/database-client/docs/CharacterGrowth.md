
# CharacterGrowth


## Properties

Name | Type
------------ | -------------
`id` | [StoryEventId](StoryEventId.md)
`workId` | [StoryEventId](StoryEventId.md)
`characterName` | string
`chapterNumber` | number
`growthType` | string
`before` | string
`after` | string
`description` | string
`createdAt` | string

## Example

```typescript
import type { CharacterGrowth } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "workId": null,
  "characterName": null,
  "chapterNumber": null,
  "growthType": null,
  "before": null,
  "after": null,
  "description": null,
  "createdAt": null,
} satisfies CharacterGrowth

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CharacterGrowth
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
