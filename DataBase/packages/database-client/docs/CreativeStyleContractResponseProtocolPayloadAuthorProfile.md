
# CreativeStyleContractResponseProtocolPayloadAuthorProfile


## Properties

Name | Type
------------ | -------------
`id` | string
`stance` | string
`voice` | Array&lt;string&gt;
`narrativeTechniques` | Array&lt;string&gt;
`preferredDiction` | Array&lt;string&gt;
`rejectedDiction` | Array&lt;string&gt;
`qualityNorthStar` | string

## Example

```typescript
import type { CreativeStyleContractResponseProtocolPayloadAuthorProfile } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "stance": null,
  "voice": null,
  "narrativeTechniques": null,
  "preferredDiction": null,
  "rejectedDiction": null,
  "qualityNorthStar": null,
} satisfies CreativeStyleContractResponseProtocolPayloadAuthorProfile

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeStyleContractResponseProtocolPayloadAuthorProfile
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
