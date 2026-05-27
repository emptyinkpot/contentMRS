
# OpenListFsListResponse


## Properties

Name | Type
------------ | -------------
`content` | [Array&lt;OpenListFsListResponseContentInner&gt;](OpenListFsListResponseContentInner.md)
`total` | number
`readme` | string
`header` | string
`write` | boolean
`writeContentBypass` | boolean
`provider` | string
`directUploadTools` | Array&lt;string&gt;
`requestId` | string

## Example

```typescript
import type { OpenListFsListResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "content": null,
  "total": null,
  "readme": null,
  "header": null,
  "write": null,
  "writeContentBypass": null,
  "provider": null,
  "directUploadTools": null,
  "requestId": null,
} satisfies OpenListFsListResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OpenListFsListResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
