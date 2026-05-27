
# ResolvedCreativeContext


## Properties

Name | Type
------------ | -------------
`ok` | boolean
`contextVersion` | string
`work` | [ResolvedCreativeContextWork](ResolvedCreativeContextWork.md)
`narrativeState` | [ResolvedCreativeContextNarrativeState](ResolvedCreativeContextNarrativeState.md)
`semanticState` | [ResolvedCreativeContextSemanticState](ResolvedCreativeContextSemanticState.md)
`styleState` | [ResolvedCreativeContextStyleState](ResolvedCreativeContextStyleState.md)
`corpusImitation` | [ResolvedCreativeContextCorpusImitation](ResolvedCreativeContextCorpusImitation.md)
`ruleInventory` | [ResolvedCreativeContextRuleInventory](ResolvedCreativeContextRuleInventory.md)
`publicationState` | [ResolvedCreativeContextPublicationState](ResolvedCreativeContextPublicationState.md)
`runtimeSnapshot` | [ResolvedCreativeContextRuntimeSnapshot](ResolvedCreativeContextRuntimeSnapshot.md)
`lexiconLearning` | [ResolvedCreativeContextLexiconLearning](ResolvedCreativeContextLexiconLearning.md)
`currentPart` | [ResolvedCreativeContextCurrentPart](ResolvedCreativeContextCurrentPart.md)
`parts` | [Array&lt;ResolvedCreativeContextPartsInner&gt;](ResolvedCreativeContextPartsInner.md)
`recentBlocks` | [Array&lt;ResolvedCreativeContextRecentBlocksInner&gt;](ResolvedCreativeContextRecentBlocksInner.md)
`authorProfile` | [ResolvedCreativeContextAuthorProfile](ResolvedCreativeContextAuthorProfile.md)
`styleContract` | [ResolvedCreativeContextStyleContract](ResolvedCreativeContextStyleContract.md)
`semanticContext` | [ResolvedCreativeContextSemanticContext](ResolvedCreativeContextSemanticContext.md)
`publicationTargets` | [Array&lt;ResolvedCreativeContextPublicationStateTargetsInner&gt;](ResolvedCreativeContextPublicationStateTargetsInner.md)
`snapshot` | [ResolvedCreativeContextSnapshot](ResolvedCreativeContextSnapshot.md)
`counts` | [ResolvedCreativeContextCounts](ResolvedCreativeContextCounts.md)
`requestId` | string

## Example

```typescript
import type { ResolvedCreativeContext } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ok": null,
  "contextVersion": null,
  "work": null,
  "narrativeState": null,
  "semanticState": null,
  "styleState": null,
  "corpusImitation": null,
  "ruleInventory": null,
  "publicationState": null,
  "runtimeSnapshot": null,
  "lexiconLearning": null,
  "currentPart": null,
  "parts": null,
  "recentBlocks": null,
  "authorProfile": null,
  "styleContract": null,
  "semanticContext": null,
  "publicationTargets": null,
  "snapshot": null,
  "counts": null,
  "requestId": null,
} satisfies ResolvedCreativeContext

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContext
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
