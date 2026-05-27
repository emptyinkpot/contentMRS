
# CanonicalContentListResponse


## Properties

Name | Type
------------ | -------------
`count` | number
`works` | Array&lt;{ [key: string]: any; }&gt;
`parts` | Array&lt;{ [key: string]: any; }&gt;
`blocks` | Array&lt;{ [key: string]: any; }&gt;
`assets` | Array&lt;{ [key: string]: any; }&gt;
`publicationTargets` | Array&lt;{ [key: string]: any; }&gt;
`workId` | string
`partId` | string
`requestId` | string

## Example

```typescript
import type { CanonicalContentListResponse } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "count": null,
  "works": null,
  "parts": null,
  "blocks": null,
  "assets": null,
  "publicationTargets": null,
  "workId": null,
  "partId": null,
  "requestId": null,
} satisfies CanonicalContentListResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CanonicalContentListResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
