
# EvidencePackQueryRun


## Properties

Name | Type
------------ | -------------
`id` | string
`provider` | string
`status` | string
`rounds` | [Array&lt;EvidencePackQueryRunRoundsInner&gt;](EvidencePackQueryRunRoundsInner.md)

## Example

```typescript
import type { EvidencePackQueryRun } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "provider": null,
  "status": null,
  "rounds": null,
} satisfies EvidencePackQueryRun

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EvidencePackQueryRun
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
