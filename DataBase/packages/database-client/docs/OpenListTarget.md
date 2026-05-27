
# OpenListTarget


## Properties

Name | Type
------------ | -------------
`id` | string
`provider` | string
`purpose` | string
`displayName` | string
`mountPath` | string
`remoteDir` | string
`localCachePath` | string
`status` | string
`metadata` | { [key: string]: any; }
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { OpenListTarget } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "provider": null,
  "purpose": null,
  "displayName": null,
  "mountPath": null,
  "remoteDir": null,
  "localCachePath": null,
  "status": null,
  "metadata": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies OpenListTarget

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OpenListTarget
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
