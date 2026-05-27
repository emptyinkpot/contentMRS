
# ListOpenListTargetFilesRequest


## Properties

Name | Type
------------ | -------------
`password` | string
`page` | number
`perPage` | number
`refresh` | boolean
`subPath` | string

## Example

```typescript
import type { ListOpenListTargetFilesRequest } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "password": null,
  "page": null,
  "perPage": null,
  "refresh": null,
  "subPath": null,
} satisfies ListOpenListTargetFilesRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ListOpenListTargetFilesRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
