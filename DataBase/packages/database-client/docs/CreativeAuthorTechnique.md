
# CreativeAuthorTechnique


## Properties

Name | Type
------------ | -------------
`authorProfileId` | string
`techniqueId` | string
`weight` | number
`priority` | string
`taskTypesJson` | Array&lt;string&gt;
`triggerText` | string
`constraintText` | string
`status` | string

## Example

```typescript
import type { CreativeAuthorTechnique } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "authorProfileId": null,
  "techniqueId": null,
  "weight": null,
  "priority": null,
  "taskTypesJson": null,
  "triggerText": null,
  "constraintText": null,
  "status": null,
} satisfies CreativeAuthorTechnique

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeAuthorTechnique
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
