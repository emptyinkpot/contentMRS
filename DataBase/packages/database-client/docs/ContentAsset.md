
# ContentAsset


## Properties

Name | Type
------------ | -------------
`id` | string
`kind` | string
`title` | string
`storageProvider` | string
`storageUri` | string
`mimeType` | string
`byteSize` | number
`checksumSha256` | string
`metadata` | { [key: string]: any; }
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { ContentAsset } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "kind": null,
  "title": null,
  "storageProvider": null,
  "storageUri": null,
  "mimeType": null,
  "byteSize": null,
  "checksumSha256": null,
  "metadata": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies ContentAsset

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ContentAsset
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
