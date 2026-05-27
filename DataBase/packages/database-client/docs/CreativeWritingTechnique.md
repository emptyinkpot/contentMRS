
# CreativeWritingTechnique


## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`layer` | string
`description` | string
`mechanism` | string
`suitableForJson` | Array&lt;string&gt;
`avoidWhenJson` | Array&lt;string&gt;
`promptInstruction` | string
`qualityCheck` | string
`status` | string

## Example

```typescript
import type { CreativeWritingTechnique } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "layer": null,
  "description": null,
  "mechanism": null,
  "suitableForJson": null,
  "avoidWhenJson": null,
  "promptInstruction": null,
  "qualityCheck": null,
  "status": null,
} satisfies CreativeWritingTechnique

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeWritingTechnique
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
