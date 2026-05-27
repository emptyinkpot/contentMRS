
# OpenListFileObject


## Properties

Name | Type
------------ | -------------
`name` | string
`size` | number
`isDir` | boolean
`modified` | string
`created` | string
`sign` | string
`thumb` | string
`type` | number
`hashinfo` | string
`hashInfo` | { [key: string]: string; }

## Example

```typescript
import type { OpenListFileObject } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "size": null,
  "isDir": null,
  "modified": null,
  "created": null,
  "sign": null,
  "thumb": null,
  "type": null,
  "hashinfo": null,
  "hashInfo": null,
} satisfies OpenListFileObject

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OpenListFileObject
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
