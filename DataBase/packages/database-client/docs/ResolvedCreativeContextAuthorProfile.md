
# ResolvedCreativeContextAuthorProfile


## Properties

Name | Type
------------ | -------------
`profile` | [ResolvedCreativeContextAuthorProfileProfile](ResolvedCreativeContextAuthorProfileProfile.md)
`interestClusters` | [Array&lt;ResolvedCreativeContextAuthorProfileInterestClustersInner&gt;](ResolvedCreativeContextAuthorProfileInterestClustersInner.md)
`authorTechniques` | [Array&lt;CreativeStyleContractResponseAuthorTechniquesInner&gt;](CreativeStyleContractResponseAuthorTechniquesInner.md)

## Example

```typescript
import type { ResolvedCreativeContextAuthorProfile } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "profile": null,
  "interestClusters": null,
  "authorTechniques": null,
} satisfies ResolvedCreativeContextAuthorProfile

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextAuthorProfile
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
