
# VocabularyItem


## Properties

Name | Type
------------ | -------------
`id` | [WorkId](WorkId.md)
`content` | string
`type` | string
`category` | string
`note` | string
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { VocabularyItem } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "content": null,
  "type": null,
  "category": null,
  "note": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies VocabularyItem

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as VocabularyItem
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
