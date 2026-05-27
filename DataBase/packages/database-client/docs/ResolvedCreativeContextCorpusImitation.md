
# ResolvedCreativeContextCorpusImitation


## Properties

Name | Type
------------ | -------------
`sourcePassages` | [Array&lt;ResolvedCreativeContextCorpusImitationSourcePassagesInner&gt;](ResolvedCreativeContextCorpusImitationSourcePassagesInner.md)
`reusableImages` | Array&lt;string&gt;
`sentenceRhythms` | Array&lt;string&gt;
`punctuationProfile` | [ResolvedCreativeContextCorpusImitationPunctuationProfile](ResolvedCreativeContextCorpusImitationPunctuationProfile.md)
`hookPatterns` | Array&lt;string&gt;
`sceneryPatterns` | Array&lt;string&gt;
`forbiddenImitationRules` | Array&lt;string&gt;
`transformationInstructions` | Array&lt;string&gt;

## Example

```typescript
import type { ResolvedCreativeContextCorpusImitation } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "sourcePassages": null,
  "reusableImages": null,
  "sentenceRhythms": null,
  "punctuationProfile": null,
  "hookPatterns": null,
  "sceneryPatterns": null,
  "forbiddenImitationRules": null,
  "transformationInstructions": null,
} satisfies ResolvedCreativeContextCorpusImitation

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextCorpusImitation
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
