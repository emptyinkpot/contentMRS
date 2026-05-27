
# EvidenceSource


## Properties

Name | Type
------------ | -------------
`id` | string
`title` | string
`sourceType` | string
`sourceTable` | string
`sourceId` | string
`source` | string
`externalRefs` | Array&lt;{ [key: string]: any; }&gt;
`metadata` | { [key: string]: any; }

## Example

```typescript
import type { EvidenceSource } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "sourceType": null,
  "sourceTable": null,
  "sourceId": null,
  "source": null,
  "externalRefs": null,
  "metadata": null,
} satisfies EvidenceSource

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EvidenceSource
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
