
# CreativeStyleContractResponseProtocolPayload


## Properties

Name | Type
------------ | -------------
`ideologicalBlend` | { [key: string]: number; }
`narrativeGoal` | string
`macroMicroLine` | string
`authorProfile` | [CreativeStyleContractResponseProtocolPayloadAuthorProfile](CreativeStyleContractResponseProtocolPayloadAuthorProfile.md)
`writingTaskTypes` | [Array&lt;CreativeStyleContractResponseProtocolPayloadWritingTaskTypesInner&gt;](CreativeStyleContractResponseProtocolPayloadWritingTaskTypesInner.md)
`interestClusters` | [Array&lt;CreativeStyleContractResponseProtocolPayloadInterestClustersInner&gt;](CreativeStyleContractResponseProtocolPayloadInterestClustersInner.md)
`lexiconLifecycle` | [CreativeStyleContractResponseProtocolPayloadLexiconLifecycle](CreativeStyleContractResponseProtocolPayloadLexiconLifecycle.md)
`conceptualEntry` | [CreativeStyleContractResponseProtocolPayloadConceptualEntry](CreativeStyleContractResponseProtocolPayloadConceptualEntry.md)
`processPlan` | [CreativeStyleContractResponseProtocolPayloadProcessPlan](CreativeStyleContractResponseProtocolPayloadProcessPlan.md)
`narrativeProtocol` | [CreativeStyleContractResponseProtocolPayloadNarrativeProtocol](CreativeStyleContractResponseProtocolPayloadNarrativeProtocol.md)
`authorialConstitution` | [CreativeStyleContractResponseProtocolPayloadAuthorialConstitution](CreativeStyleContractResponseProtocolPayloadAuthorialConstitution.md)

## Example

```typescript
import type { CreativeStyleContractResponseProtocolPayload } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ideologicalBlend": null,
  "narrativeGoal": null,
  "macroMicroLine": null,
  "authorProfile": null,
  "writingTaskTypes": null,
  "interestClusters": null,
  "lexiconLifecycle": null,
  "conceptualEntry": null,
  "processPlan": null,
  "narrativeProtocol": null,
  "authorialConstitution": null,
} satisfies CreativeStyleContractResponseProtocolPayload

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeStyleContractResponseProtocolPayload
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
