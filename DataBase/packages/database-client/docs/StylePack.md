
# StylePack


## Properties

Name | Type
------------ | -------------
`version` | string
`query` | string
`mode` | string
`sourceIds` | Array&lt;string&gt;
`profiles` | [Array&lt;StylePackProfilesInner&gt;](StylePackProfilesInner.md)
`syntaxProfiles` | Array&lt;string&gt;
`rhetoricalMoves` | Array&lt;string&gt;
`imageryClusters` | Array&lt;string&gt;
`paragraphMoves` | Array&lt;string&gt;
`revisionPairs` | [Array&lt;StylePackRevisionPairsInner&gt;](StylePackRevisionPairsInner.md)
`constraints` | Array&lt;string&gt;
`counts` | [StylePackCounts](StylePackCounts.md)
`screening` | [StylePackScreening](StylePackScreening.md)
`requestId` | string

## Example

```typescript
import type { StylePack } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "version": null,
  "query": null,
  "mode": null,
  "sourceIds": null,
  "profiles": null,
  "syntaxProfiles": null,
  "rhetoricalMoves": null,
  "imageryClusters": null,
  "paragraphMoves": null,
  "revisionPairs": null,
  "constraints": null,
  "counts": null,
  "screening": null,
  "requestId": null,
} satisfies StylePack

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StylePack
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
