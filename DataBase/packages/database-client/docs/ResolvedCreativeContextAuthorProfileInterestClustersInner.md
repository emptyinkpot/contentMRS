
# ResolvedCreativeContextAuthorProfileInterestClustersInner


## Properties

Name | Type
------------ | -------------
`id` | string
`authorProfileId` | string
`name` | string
`terms` | Array&lt;string&gt;
`appliesTo` | Array&lt;string&gt;
`evidence` | { [key: string]: any; }
`status` | string
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { ResolvedCreativeContextAuthorProfileInterestClustersInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "authorProfileId": null,
  "name": null,
  "terms": null,
  "appliesTo": null,
  "evidence": null,
  "status": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies ResolvedCreativeContextAuthorProfileInterestClustersInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextAuthorProfileInterestClustersInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
