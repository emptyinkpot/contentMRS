
# CreativeStyleContractResponseProtocolPayloadProcessPlan


## Properties

Name | Type
------------ | -------------
`series` | string
`episode` | string
`timeBoundary` | string
`viewpointBoundary` | string
`knowledgeBoundary` | string
`sceneEntrances` | Array&lt;string&gt;
`eventSequence` | Array&lt;string&gt;
`narrativeMoves` | Array&lt;string&gt;
`imageMotifs` | Array&lt;string&gt;
`pacingRules` | Array&lt;string&gt;
`dictionRules` | Array&lt;string&gt;
`forbiddenMoves` | Array&lt;string&gt;
`endingHook` | string
`required` | boolean

## Example

```typescript
import type { CreativeStyleContractResponseProtocolPayloadProcessPlan } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "series": null,
  "episode": null,
  "timeBoundary": null,
  "viewpointBoundary": null,
  "knowledgeBoundary": null,
  "sceneEntrances": null,
  "eventSequence": null,
  "narrativeMoves": null,
  "imageMotifs": null,
  "pacingRules": null,
  "dictionRules": null,
  "forbiddenMoves": null,
  "endingHook": null,
  "required": null,
} satisfies CreativeStyleContractResponseProtocolPayloadProcessPlan

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreativeStyleContractResponseProtocolPayloadProcessPlan
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
