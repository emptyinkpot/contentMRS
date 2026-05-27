
# ContentSourceSummary


## Properties

Name | Type
------------ | -------------
`id` | string
`sourceId` | string
`title` | string
`kind` | string
`author` | string
`category` | string
`source` | string
`sourceTable` | string
`chunkCount` | number
`semanticUnitCount` | number
`preview` | string
`metadata` | { [key: string]: any; }
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { ContentSourceSummary } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "sourceId": null,
  "title": null,
  "kind": null,
  "author": null,
  "category": null,
  "source": null,
  "sourceTable": null,
  "chunkCount": null,
  "semanticUnitCount": null,
  "preview": null,
  "metadata": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies ContentSourceSummary

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ContentSourceSummary
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
