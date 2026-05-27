
# EvidencePackQueryRunRoundsInner


## Properties

Name | Type
------------ | -------------
`query` | string
`tokenCount` | number
`resultCount` | number
`provider` | string
`sourceFilterCount` | number

## Example

```typescript
import type { EvidencePackQueryRunRoundsInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "query": null,
  "tokenCount": null,
  "resultCount": null,
  "provider": null,
  "sourceFilterCount": null,
} satisfies EvidencePackQueryRunRoundsInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EvidencePackQueryRunRoundsInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
