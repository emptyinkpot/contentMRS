
# CreativeStyleContractResponseLexicon


## Properties

Name | Type
------------ | -------------
`preferred` | [Array&lt;CreativeStyleContractResponseLexiconPreferredInner&gt;](CreativeStyleContractResponseLexiconPreferredInner.md)
`banned` | [Array&lt;CreativeStyleContractResponseLexiconBannedInner&gt;](CreativeStyleContractResponseLexiconBannedInner.md)

## Example

```typescript
import type { CreativeStyleContractResponseLexicon } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "preferred": null,
  "banned": null,
} satisfies CreativeStyleContractResponseLexicon

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeStyleContractResponseLexicon
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
