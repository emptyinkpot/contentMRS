
# DependencyHealthResponse


## Properties

Name | Type
------------ | -------------
`ok` | boolean
`mysql` | string
`mysqlLatencyMs` | number
`schemaParseOk` | boolean
`optionalDownstreams` | [HealthResponseOptionalDownstreams](HealthResponseOptionalDownstreams.md)
`schemaVersion` | string
`requestId` | string

## Example

```typescript
import type { DependencyHealthResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "ok": null,
  "mysql": null,
  "mysqlLatencyMs": null,
  "schemaParseOk": null,
  "optionalDownstreams": null,
  "schemaVersion": null,
  "requestId": null,
} satisfies DependencyHealthResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DependencyHealthResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
