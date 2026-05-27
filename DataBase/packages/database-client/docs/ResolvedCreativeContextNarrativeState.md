
# ResolvedCreativeContextNarrativeState


## Properties

Name | Type
------------ | -------------
`currentChapter` | [ResolvedCreativeContextNarrativeStateCurrentChapter](ResolvedCreativeContextNarrativeStateCurrentChapter.md)
`previousChapters` | [Array&lt;ResolvedCreativeContextNarrativeStatePreviousChaptersInner&gt;](ResolvedCreativeContextNarrativeStatePreviousChaptersInner.md)
`nextChapters` | [Array&lt;ResolvedCreativeContextNarrativeStatePreviousChaptersInner&gt;](ResolvedCreativeContextNarrativeStatePreviousChaptersInner.md)
`characters` | [Array&lt;ResolvedCreativeContextNarrativeStateCharactersInner&gt;](ResolvedCreativeContextNarrativeStateCharactersInner.md)
`worldRules` | [Array&lt;ResolvedCreativeContextNarrativeStateWorldRulesInner&gt;](ResolvedCreativeContextNarrativeStateWorldRulesInner.md)
`continuityBrief` | string

## Example

```typescript
import type { ResolvedCreativeContextNarrativeState } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "currentChapter": null,
  "previousChapters": null,
  "nextChapters": null,
  "characters": null,
  "worldRules": null,
  "continuityBrief": null,
} satisfies ResolvedCreativeContextNarrativeState

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextNarrativeState
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
