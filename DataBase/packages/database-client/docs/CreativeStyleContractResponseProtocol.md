
# CreativeStyleContractResponseProtocol


## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`domain` | string
`perspectiveRule` | string
`toneRule` | string
`executionRule` | string
`payload` | [CreativeStyleContractResponseProtocolPayload](CreativeStyleContractResponseProtocolPayload.md)

## Example

```typescript
import type { CreativeStyleContractResponseProtocol } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "domain": null,
  "perspectiveRule": null,
  "toneRule": null,
  "executionRule": null,
  "payload": null,
} satisfies CreativeStyleContractResponseProtocol

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeStyleContractResponseProtocol
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
