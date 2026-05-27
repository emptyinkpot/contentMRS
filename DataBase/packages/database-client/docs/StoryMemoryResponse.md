
# StoryMemoryResponse


## Properties

Name | Type
------------ | -------------
`workId` | number
`events` | [Array&lt;StoryEvent&gt;](StoryEvent.md)
`characterGrowth` | [Array&lt;CharacterGrowth&gt;](CharacterGrowth.md)
`importantItems` | [Array&lt;ImportantItem&gt;](ImportantItem.md)
`counts` | [StoryMemoryCounts](StoryMemoryCounts.md)
`requestId` | string

## Example

```typescript
import type { StoryMemoryResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "workId": null,
  "events": null,
  "characterGrowth": null,
  "importantItems": null,
  "counts": null,
  "requestId": null,
} satisfies StoryMemoryResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StoryMemoryResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
