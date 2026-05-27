
# ResolvedCreativeContextRuleInventoryRulesInner


## Properties

Name | Type
------------ | -------------
`id` | string
`category` | string
`owner` | string
`severity` | string
`appliesTo` | Array&lt;string&gt;
`definition` | string
`detectorId` | string
`enforcement` | string
`failureMode` | string
`rationale` | string

## Example

```typescript
import type { ResolvedCreativeContextRuleInventoryRulesInner } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "category": null,
  "owner": null,
  "severity": null,
  "appliesTo": null,
  "definition": null,
  "detectorId": null,
  "enforcement": null,
  "failureMode": null,
  "rationale": null,
} satisfies ResolvedCreativeContextRuleInventoryRulesInner

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextRuleInventoryRulesInner
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
