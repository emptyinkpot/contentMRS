
# OpenListMount


## Properties

Name | Type
------------ | -------------
`id` | string
`mountPath` | string
`driver` | string
`remark` | string
`openlistStatus` | string
`disabled` | boolean
`source` | string
`metadata` | { [key: string]: any; }
`lastSyncedAt` | string
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { OpenListMount } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "mountPath": null,
  "driver": null,
  "remark": null,
  "openlistStatus": null,
  "disabled": null,
  "source": null,
  "metadata": null,
  "lastSyncedAt": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies OpenListMount

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OpenListMount
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
