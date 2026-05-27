
# RecordStoryMemoryResult


## Properties

Name | Type
------------ | -------------
`workId` | number
`chapterNumber` | number
`events` | number
`characterGrowth` | number
`importantItems` | number

## Example

```typescript
import type { RecordStoryMemoryResult } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "workId": null,
  "chapterNumber": null,
  "events": null,
  "characterGrowth": null,
  "importantItems": null,
} satisfies RecordStoryMemoryResult

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecordStoryMemoryResult
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
