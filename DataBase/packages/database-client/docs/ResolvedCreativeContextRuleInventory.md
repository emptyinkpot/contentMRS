
# ResolvedCreativeContextRuleInventory


## Properties

Name | Type
------------ | -------------
`rules` | [Array&lt;ResolvedCreativeContextRuleInventoryRulesInner&gt;](ResolvedCreativeContextRuleInventoryRulesInner.md)
`languageRules` | [Array&lt;ResolvedCreativeContextRuleInventoryRulesInner&gt;](ResolvedCreativeContextRuleInventoryRulesInner.md)
`narrativeRules` | [Array&lt;ResolvedCreativeContextRuleInventoryRulesInner&gt;](ResolvedCreativeContextRuleInventoryRulesInner.md)
`styleRules` | [Array&lt;ResolvedCreativeContextRuleInventoryRulesInner&gt;](ResolvedCreativeContextRuleInventoryRulesInner.md)
`corpusRules` | [Array&lt;ResolvedCreativeContextRuleInventoryRulesInner&gt;](ResolvedCreativeContextRuleInventoryRulesInner.md)
`qualityRules` | [Array&lt;ResolvedCreativeContextRuleInventoryRulesInner&gt;](ResolvedCreativeContextRuleInventoryRulesInner.md)

## Example

```typescript
import type { ResolvedCreativeContextRuleInventory } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "rules": null,
  "languageRules": null,
  "narrativeRules": null,
  "styleRules": null,
  "corpusRules": null,
  "qualityRules": null,
} satisfies ResolvedCreativeContextRuleInventory

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResolvedCreativeContextRuleInventory
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
