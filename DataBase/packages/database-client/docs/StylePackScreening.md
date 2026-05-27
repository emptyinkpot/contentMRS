
# StylePackScreening


## Properties

Name | Type
------------ | -------------
`version` | string
`requestedLimit` | number
`sourceFilterIds` | Array&lt;string&gt;
`selectedProfileCount` | number
`sourceDiversityCount` | number
`rankingSignals` | Array&lt;string&gt;

## Example

```typescript
import type { StylePackScreening } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "version": null,
  "requestedLimit": null,
  "sourceFilterIds": null,
  "selectedProfileCount": null,
  "sourceDiversityCount": null,
  "rankingSignals": null,
} satisfies StylePackScreening

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StylePackScreening
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
