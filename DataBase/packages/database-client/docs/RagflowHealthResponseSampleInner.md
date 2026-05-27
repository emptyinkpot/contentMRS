
# RagflowHealthResponseSampleInner


## Properties

Name | Type
------------ | -------------
`id` | string
`datasetId` | string
`documentId` | string
`documentName` | string
`score` | number
`textLength` | number

## Example

```typescript
import type { RagflowHealthResponseSampleInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "datasetId": null,
  "documentId": null,
  "documentName": null,
  "score": null,
  "textLength": null,
} satisfies RagflowHealthResponseSampleInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RagflowHealthResponseSampleInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
