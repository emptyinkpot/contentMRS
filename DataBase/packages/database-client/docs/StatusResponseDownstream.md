
# StatusResponseDownstream


## Properties

Name | Type
------------ | -------------
`mysql` | [StatusResponseDownstreamMysql](StatusResponseDownstreamMysql.md)
`nocodbHealthUrl` | string
`openlistHealthConfigured` | boolean

## Example

```typescript
import type { StatusResponseDownstream } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "mysql": null,
  "nocodbHealthUrl": null,
  "openlistHealthConfigured": null,
} satisfies StatusResponseDownstream

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StatusResponseDownstream
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
