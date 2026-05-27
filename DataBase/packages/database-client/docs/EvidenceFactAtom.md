
# EvidenceFactAtom


## Properties

Name | Type
------------ | -------------
`id` | string
`type` | string
`value` | string
`sourceId` | string
`sourceText` | string
`citationId` | string
`blockId` | string

## Example

```typescript
import type { EvidenceFactAtom } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "type": null,
  "value": null,
  "sourceId": null,
  "sourceText": null,
  "citationId": null,
  "blockId": null,
} satisfies EvidenceFactAtom

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EvidenceFactAtom
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
