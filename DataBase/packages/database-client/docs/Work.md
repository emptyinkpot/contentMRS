
# Work


## Properties

Name | Type
------------ | -------------
`id` | [WorkId](WorkId.md)
`title` | string
`descriptionPreview` | string
`status` | string
`platform` | string
`currentChapters` | number
`targetChapters` | number
`updatedAt` | Date
`createdAt` | Date

## Example

```typescript
import type { Work } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "descriptionPreview": null,
  "status": null,
  "platform": null,
  "currentChapters": null,
  "targetChapters": null,
  "updatedAt": null,
  "createdAt": null,
} satisfies Work

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Work
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
