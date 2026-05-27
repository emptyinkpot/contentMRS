
# ResolvedCreativeContextStyleState


## Properties

Name | Type
------------ | -------------
`authorProfileId` | string
`protocol` | string
`preferredTerms` | Array&lt;string&gt;
`bannedTerms` | Array&lt;string&gt;
`qualityRules` | Array&lt;string&gt;
`techniques` | Array&lt;string&gt;

## Example

```typescript
import type { ResolvedCreativeContextStyleState } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "authorProfileId": null,
  "protocol": null,
  "preferredTerms": null,
  "bannedTerms": null,
  "qualityRules": null,
  "techniques": null,
} satisfies ResolvedCreativeContextStyleState

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextStyleState
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
