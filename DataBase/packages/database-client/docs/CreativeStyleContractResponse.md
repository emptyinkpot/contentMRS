
# CreativeStyleContractResponse


## Properties

Name | Type
------------ | -------------
`protocol` | [CreativeStyleContractResponseProtocol](CreativeStyleContractResponseProtocol.md)
`modules` | [Array&lt;CreativeStyleContractResponseModulesInner&gt;](CreativeStyleContractResponseModulesInner.md)
`editingSteps` | [Array&lt;CreativeStyleContractResponseEditingStepsInner&gt;](CreativeStyleContractResponseEditingStepsInner.md)
`qualityRules` | [Array&lt;CreativeStyleContractResponseQualityRulesInner&gt;](CreativeStyleContractResponseQualityRulesInner.md)
`sourceMaterials` | [Array&lt;CreativeStyleContractResponseSourceMaterialsInner&gt;](CreativeStyleContractResponseSourceMaterialsInner.md)
`techniques` | [Array&lt;CreativeStyleContractResponseTechniquesInner&gt;](CreativeStyleContractResponseTechniquesInner.md)
`authorTechniques` | [Array&lt;CreativeStyleContractResponseAuthorTechniquesInner&gt;](CreativeStyleContractResponseAuthorTechniquesInner.md)
`lexicon` | [CreativeStyleContractResponseLexicon](CreativeStyleContractResponseLexicon.md)
`counts` | [CreativeStyleContractResponseCounts](CreativeStyleContractResponseCounts.md)
`requestId` | string

## Example

```typescript
import type { CreativeStyleContractResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "protocol": null,
  "modules": null,
  "editingSteps": null,
  "qualityRules": null,
  "sourceMaterials": null,
  "techniques": null,
  "authorTechniques": null,
  "lexicon": null,
  "counts": null,
  "requestId": null,
} satisfies CreativeStyleContractResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeStyleContractResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
