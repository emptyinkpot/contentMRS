
# StylePackProfile


## Properties

Name | Type
------------ | -------------
`id` | string
`sourceId` | string
`sourceTitle` | string
`sourceAuthor` | string
`sourceLocator` | string
`summary` | string
`sentenceLengthBand` | string
`paragraphDensity` | string
`progressionMoves` | Array&lt;string&gt;
`rhetoricalMoves` | Array&lt;string&gt;
`imageryClusters` | Array&lt;string&gt;
`constraints` | Array&lt;string&gt;
`tags` | [Array&lt;SemanticUnitTagsInner&gt;](SemanticUnitTagsInner.md)
`searchScore` | number

## Example

```typescript
import type { StylePackProfile } from '@emptyinkpot/database-gateway-generated-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "sourceId": null,
  "sourceTitle": null,
  "sourceAuthor": null,
  "sourceLocator": null,
  "summary": null,
  "sentenceLengthBand": null,
  "paragraphDensity": null,
  "progressionMoves": null,
  "rhetoricalMoves": null,
  "imageryClusters": null,
  "constraints": null,
  "tags": null,
  "searchScore": null,
} satisfies StylePackProfile

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StylePackProfile
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
