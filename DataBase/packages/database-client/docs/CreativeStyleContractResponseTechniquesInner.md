
# CreativeStyleContractResponseTechniquesInner


## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`layer` | string
`description` | string
`mechanism` | string
`suitableFor` | Array&lt;string&gt;
`avoidWhen` | Array&lt;string&gt;
`promptInstruction` | string
`qualityCheck` | string
`status` | string

## Example

```typescript
import type { CreativeStyleContractResponseTechniquesInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "layer": null,
  "description": null,
  "mechanism": null,
  "suitableFor": null,
  "avoidWhen": null,
  "promptInstruction": null,
  "qualityCheck": null,
  "status": null,
} satisfies CreativeStyleContractResponseTechniquesInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeStyleContractResponseTechniquesInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
