
# ResolvedCreativeContextPartsInner


## Properties

Name | Type
------------ | -------------
`id` | string
`workId` | string
`parentPartId` | string
`kind` | string
`partOrder` | number
`title` | string
`status` | string
`metadata` | { [key: string]: any; }
`createdAt` | string
`updatedAt` | string

## Example

```typescript
import type { ResolvedCreativeContextPartsInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "workId": null,
  "parentPartId": null,
  "kind": null,
  "partOrder": null,
  "title": null,
  "status": null,
  "metadata": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies ResolvedCreativeContextPartsInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextPartsInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
