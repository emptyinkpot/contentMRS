
# ResolvedCreativeContextRecentBlocksInner


## Properties

Name | Type
------------ | -------------
`id` | string
`workId` | string
`partId` | string
`assetId` | string
`kind` | string
`blockOrder` | number
`textContent` | string
`payload` | { [key: string]: any; }
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { ResolvedCreativeContextRecentBlocksInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "workId": null,
  "partId": null,
  "assetId": null,
  "kind": null,
  "blockOrder": null,
  "textContent": null,
  "payload": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies ResolvedCreativeContextRecentBlocksInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextRecentBlocksInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
