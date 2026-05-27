
# OpenListStoragesResponseStoragesInner


## Properties

Name | Type
------------ | -------------
`id` | number
`mountPath` | string
`order` | number
`driver` | string
`cacheExpiration` | number
`status` | string
`addition` | string
`remark` | string
`disabled` | boolean

## Example

```typescript
import type { OpenListStoragesResponseStoragesInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "mountPath": null,
  "order": null,
  "driver": null,
  "cacheExpiration": null,
  "status": null,
  "addition": null,
  "remark": null,
  "disabled": null,
} satisfies OpenListStoragesResponseStoragesInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OpenListStoragesResponseStoragesInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
