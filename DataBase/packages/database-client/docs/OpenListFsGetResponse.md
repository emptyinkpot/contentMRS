
# OpenListFsGetResponse


## Properties

Name | Type
------------ | -------------
`item` | [OpenListFsListResponseContentInner](OpenListFsListResponseContentInner.md)
`requestId` | string

## Example

```typescript
import type { OpenListFsGetResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "item": null,
  "requestId": null,
} satisfies OpenListFsGetResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OpenListFsGetResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
