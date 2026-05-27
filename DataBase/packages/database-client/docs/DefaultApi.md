# DefaultApi

All URIs are relative to *http://127.0.0.1:18090*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**appendChapter**](DefaultApi.md#appendchapter) | **POST** /writes/append-chapter | Append a chapter through the controlled write facade |
| [**createWork**](DefaultApi.md#creatework) | **POST** /writes/create-work | Create a work through the controlled write facade |
| [**getAuthorProfile**](DefaultApi.md#getauthorprofile) | **GET** /creative/author-profile | Author profile, interest clusters, and technique weights |
| [**getCanonicalPartEvidenceFactAtoms**](DefaultApi.md#getcanonicalpartevidencefactatoms) | **GET** /content/canonical/parts/{id}/evidence-fact-atoms | Typed fact atoms derived from canonical evidence citation blocks |
| [**getCreativeStyleContract**](DefaultApi.md#getcreativestylecontract) | **GET** /creative/style-contract | Creative writing style contract |
| [**getDependencyHealth**](DefaultApi.md#getdependencyhealth) | **GET** /health/dependencies | Required and optional dependency health |
| [**getHealth**](DefaultApi.md#gethealth) | **GET** /health | Core Gateway health |
| [**getMyBlogReaderMemory**](DefaultApi.md#getmyblogreadermemory) | **GET** /myblog/runtime/reader/memory | Read MyBlog reader memory from DataBase |
| [**getMyBlogVisualSnapshot**](DefaultApi.md#getmyblogvisualsnapshot) | **GET** /myblog/runtime/visuals/snapshot | Read MyBlog visual runtime snapshot from DataBase |
| [**getNote**](DefaultApi.md#getnote) | **GET** /content/notes/{id} | Single note |
| [**getOpenListFile**](DefaultApi.md#getopenlistfileoperation) | **POST** /openlist/fs/get | Get one file object through OpenList |
| [**getOpenListHealth**](DefaultApi.md#getopenlisthealth) | **GET** /openlist/health | OpenList runtime health through the Gateway adapter |
| [**getOpenListStorage**](DefaultApi.md#getopenliststorage) | **GET** /openlist/storages/{id} | Get one OpenList storage mount |
| [**getOpenListTarget**](DefaultApi.md#getopenlisttarget) | **GET** /openlist/targets/{id} | Get one DataBase-owned OpenList file target |
| [**getOpenListTargetFile**](DefaultApi.md#getopenlisttargetfileoperation) | **POST** /openlist/targets/{id}/get | Get one file for a DataBase-owned OpenList target |
| [**getRagflowHealth**](DefaultApi.md#getragflowhealth) | **GET** /health/ragflow | RAGFlow EvidenceProvider readiness |
| [**getServiceIdentity**](DefaultApi.md#getserviceidentity) | **GET** / | Service identity |
| [**getStatus**](DefaultApi.md#getstatus) | **GET** /status | Runtime status and integration metadata |
| [**getStoryMemory**](DefaultApi.md#getstorymemory) | **GET** /creative/story-memory | Canonical story memory for a creative work |
| [**getStoryMemoryContext**](DefaultApi.md#getstorymemorycontext) | **GET** /creative/story-memory/context | Prompt-ready story memory context summary |
| [**getStylePack**](DefaultApi.md#getstylepack) | **GET** /style/pack | Read DataBase style and syntax reference as StylePack |
| [**getTableInventory**](DefaultApi.md#gettableinventory) | **GET** /inventory/tables | Table inventory |
| [**listCanonicalContentAssets**](DefaultApi.md#listcanonicalcontentassets) | **GET** /content/canonical/assets | Canonical content asset references |
| [**listCanonicalContentBlocks**](DefaultApi.md#listcanonicalcontentblocks) | **GET** /content/canonical/parts/{id}/blocks | Canonical typed blocks for one part |
| [**listCanonicalContentParts**](DefaultApi.md#listcanonicalcontentparts) | **GET** /content/canonical/works/{id}/parts | Canonical content parts for one work |
| [**listCanonicalContentWorks**](DefaultApi.md#listcanonicalcontentworks) | **GET** /content/canonical/works | Canonical content works across novels, articles, scripts, comics, and manuscripts |
| [**listCanonicalPublicationTargets**](DefaultApi.md#listcanonicalpublicationtargets) | **GET** /content/canonical/publication-targets | Canonical publication target mappings |
| [**listContentSources**](DefaultApi.md#listcontentsources) | **GET** /content/sources | Content source catalog |
| [**listExperienceRecords**](DefaultApi.md#listexperiencerecords) | **GET** /content/experience-records | Experience records listing |
| [**listFanqieWorks**](DefaultApi.md#listfanqieworks) | **GET** /content/fanqie-works | Fanqie works listing |
| [**listLiterature**](DefaultApi.md#listliterature) | **GET** /content/literature | Literature listing |
| [**listMyBlogReaderHighlights**](DefaultApi.md#listmyblogreaderhighlights) | **GET** /myblog/runtime/reader/highlights | Read MyBlog reader highlights from DataBase |
| [**listNotes**](DefaultApi.md#listnotes) | **GET** /content/notes | Notes listing |
| [**listOpenListFiles**](DefaultApi.md#listopenlistfilesoperation) | **POST** /openlist/fs/list | List files through OpenList |
| [**listOpenListMounts**](DefaultApi.md#listopenlistmounts) | **GET** /openlist/mounts | List DataBase-owned OpenList mount topology |
| [**listOpenListStorages**](DefaultApi.md#listopenliststorages) | **GET** /openlist/storages | List OpenList storage mounts |
| [**listOpenListTargetFiles**](DefaultApi.md#listopenlisttargetfilesoperation) | **POST** /openlist/targets/{id}/list | List files for a DataBase-owned OpenList target |
| [**listOpenListTargets**](DefaultApi.md#listopenlisttargets) | **GET** /openlist/targets | List DataBase-owned OpenList file targets |
| [**listSemanticRelations**](DefaultApi.md#listsemanticrelations) | **GET** /semantic/relations | Semantic graph relations |
| [**listSemanticTags**](DefaultApi.md#listsemantictags) | **GET** /semantic/tags | Semantic tag taxonomy |
| [**listSemanticUnits**](DefaultApi.md#listsemanticunits) | **GET** /semantic/units | Civilization semantic units |
| [**listStateTransitions**](DefaultApi.md#liststatetransitions) | **GET** /content/state-machine/transitions | State transition logs |
| [**listWorkChapters**](DefaultApi.md#listworkchapters) | **GET** /content/works/{id}/chapters | Chapters for a work |
| [**listWorkCharacters**](DefaultApi.md#listworkcharacters) | **GET** /content/works/{id}/characters | Characters for a work |
| [**listWorks**](DefaultApi.md#listworks) | **GET** /content/works | Works listing |
| [**projectObsidianMarkdown**](DefaultApi.md#projectobsidianmarkdown) | **POST** /writes/project-obsidian-markdown | Project one Obsidian Markdown file into canonical content tables |
| [**recordArticleAcceptanceReport**](DefaultApi.md#recordarticleacceptancereport) | **POST** /writes/record-article-acceptance-report | Record an article acceptance report through the controlled write facade |
| [**recordArticleReferenceUsageReport**](DefaultApi.md#recordarticlereferenceusagereportoperation) | **POST** /writes/record-article-reference-usage-report | Record an article reference usage report through the controlled write facade |
| [**recordAuditResult**](DefaultApi.md#recordauditresult) | **POST** /writes/record-audit-result | Record chapter audit result through the controlled write facade |
| [**recordAuthorLexiconReview**](DefaultApi.md#recordauthorlexiconreviewoperation) | **POST** /writes/record-author-lexicon-review | Record an author lexicon review through the controlled write facade |
| [**recordChapterTransition**](DefaultApi.md#recordchaptertransition) | **POST** /writes/record-chapter-transition | Record a chapter state transition through the controlled write facade |
| [**recordExperience**](DefaultApi.md#recordexperience) | **POST** /writes/record-experience | Record an experience through the controlled write facade |
| [**recordGenerationOutput**](DefaultApi.md#recordgenerationoutput) | **POST** /writes/record-generation-output | Record generated or polished chapter output through the controlled write facade |
| [**recordMyBlogVisualSyncResult**](DefaultApi.md#recordmyblogvisualsyncresult) | **POST** /myblog/runtime/visuals/sync-result | Record a MyBlog visual sync result into DataBase |
| [**recordNote**](DefaultApi.md#recordnote) | **POST** /writes/record-note | Record a note through the controlled write facade |
| [**recordPublicationResult**](DefaultApi.md#recordpublicationresultoperation) | **POST** /writes/publication/record-result | Record publication result through the controlled write facade |
| [**recordSemanticReferenceMaterial**](DefaultApi.md#recordsemanticreferencematerial) | **POST** /writes/record-semantic-reference-material | Record reusable semantic reference material through the controlled write facade |
| [**recordStoryMemory**](DefaultApi.md#recordstorymemory) | **POST** /writes/record-story-memory | Record canonical story memory through the controlled write facade |
| [**recordStyleRevisionPair**](DefaultApi.md#recordstylerevisionpair) | **POST** /writes/record-style-revision-pair | Record ContentBase style revision evidence through the controlled write facade |
| [**replaceWorkStructure**](DefaultApi.md#replaceworkstructure) | **POST** /writes/replace-work-structure | Replace imported work structure through the controlled write facade |
| [**resolveCreativeContext**](DefaultApi.md#resolvecreativecontext) | **GET** /creative/context | Resolved creative context for generation and review |
| [**searchContent**](DefaultApi.md#searchcontent) | **GET** /search | Unified search across the MySQL search projection |
| [**searchEvidencePack**](DefaultApi.md#searchevidencepack) | **GET** /evidence/search | Search DataBase evidence as a writing-ready EvidencePack |
| [**searchVocabulary**](DefaultApi.md#searchvocabulary) | **GET** /vocabulary/search | Vocabulary search |
| [**upsertMyBlogReaderHighlight**](DefaultApi.md#upsertmyblogreaderhighlight) | **POST** /myblog/runtime/reader/highlights | Upsert a MyBlog reader highlight into DataBase |
| [**upsertMyBlogReaderMemory**](DefaultApi.md#upsertmyblogreadermemory) | **POST** /myblog/runtime/reader/memory | Upsert MyBlog reader memory into DataBase |
| [**upsertVocabularyItem**](DefaultApi.md#upsertvocabularyitem) | **POST** /writes/upsert-vocabulary-item | Upsert a vocabulary item through the controlled write facade |
| [**upsertWork**](DefaultApi.md#upsertwork) | **POST** /writes/upsert-work | Create or update a work through the controlled write facade |



## appendChapter

> GatewayMutationResponse appendChapter(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Append a chapter through the controlled write facade

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { AppendChapterRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies AppendChapterRequest;

  try {
    const data = await api.appendChapter(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**GatewayMutationResponse**](GatewayMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createWork

> GatewayMutationResponse createWork(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Create a work through the controlled write facade

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { CreateWorkRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies CreateWorkRequest;

  try {
    const data = await api.createWork(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**GatewayMutationResponse**](GatewayMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getAuthorProfile

> AuthorProfileResponse getAuthorProfile(id)

Author profile, interest clusters, and technique weights

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetAuthorProfileRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    id: id_example,
  } satisfies GetAuthorProfileRequest;

  try {
    const data = await api.getAuthorProfile(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Optional] [Defaults to `&#39;emptyinkpot_primary_author&#39;`] |

### Return type

[**AuthorProfileResponse**](AuthorProfileResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Active author profile and reusable style model. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **404** | Author profile not found. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getCanonicalPartEvidenceFactAtoms

> EvidenceFactAtomPack getCanonicalPartEvidenceFactAtoms(id, limit)

Typed fact atoms derived from canonical evidence citation blocks

Returns DataBase-owned typed fact atoms attached to evidence_citation blocks for a canonical content part. This is a read projection over canonical content evidence, not a request-local facts registry.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetCanonicalPartEvidenceFactAtomsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
    // number (optional)
    limit: 56,
  } satisfies GetCanonicalPartEvidenceFactAtomsRequest;

  try {
    const data = await api.getCanonicalPartEvidenceFactAtoms(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `500`] |

### Return type

[**EvidenceFactAtomPack**](EvidenceFactAtomPack.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Evidence fact atom pack for a canonical content part. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getCreativeStyleContract

> CreativeStyleContractResponse getCreativeStyleContract(protocol)

Creative writing style contract

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetCreativeStyleContractRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    protocol: protocol_example,
  } satisfies GetCreativeStyleContractRequest;

  try {
    const data = await api.getCreativeStyleContract(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **protocol** | `string` |  | [Optional] [Defaults to `&#39;immersive_historical_synthetic_narrative&#39;`] |

### Return type

[**CreativeStyleContractResponse**](CreativeStyleContractResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Creative style contract assembled from MySQL truth tables. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **404** | Creative protocol not found. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDependencyHealth

> DependencyHealthResponse getDependencyHealth()

Required and optional dependency health

Returns required MySQL/schema health plus optional downstream statuses. Only required dependency failures make this route return non-200.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetDependencyHealthRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getDependencyHealth();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**DependencyHealthResponse**](DependencyHealthResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Required dependencies are healthy. |  -  |
| **503** | Required dependency failure. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getHealth

> HealthResponse getHealth()

Core Gateway health

Returns core Gateway readiness. Optional downstreams such as NocoDB and OpenList are reported as evidence but do not make this route fail.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetHealthRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getHealth();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**HealthResponse**](HealthResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Gateway core dependencies are healthy. |  -  |
| **503** | Required core dependency failure. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMyBlogReaderMemory

> MyBlogReaderMemoryQueryResponse getMyBlogReaderMemory(objectId, limit)

Read MyBlog reader memory from DataBase

Returns either one reader-memory item by objectId or the latest reader-memory list. MyBlog must call this Gateway route instead of connecting to MySQL.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetMyBlogReaderMemoryRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    objectId: objectId_example,
    // number (optional)
    limit: 56,
  } satisfies GetMyBlogReaderMemoryRequest;

  try {
    const data = await api.getMyBlogReaderMemory(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **objectId** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `20`] |

### Return type

[**MyBlogReaderMemoryQueryResponse**](MyBlogReaderMemoryQueryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MyBlog reader memory projection. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMyBlogVisualSnapshot

> MyBlogVisualSnapshotResponse getMyBlogVisualSnapshot()

Read MyBlog visual runtime snapshot from DataBase

Returns the stored visual-source and pin snapshot from Gateway-owned MySQL tables.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetMyBlogVisualSnapshotRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getMyBlogVisualSnapshot();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**MyBlogVisualSnapshotResponse**](MyBlogVisualSnapshotResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MyBlog visual runtime snapshot. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getNote

> NoteResponse getNote(id)

Single note

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetNoteRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
  } satisfies GetNoteRequest;

  try {
    const data = await api.getNote(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |

### Return type

[**NoteResponse**](NoteResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Note record. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **404** | Note not found. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getOpenListFile

> OpenListFsGetResponse getOpenListFile(getOpenListFileRequest)

Get one file object through OpenList

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetOpenListFileOperationRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // GetOpenListFileRequest
    getOpenListFileRequest: ...,
  } satisfies GetOpenListFileOperationRequest;

  try {
    const data = await api.getOpenListFile(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **getOpenListFileRequest** | [GetOpenListFileRequest](GetOpenListFileRequest.md) |  | |

### Return type

[**OpenListFsGetResponse**](OpenListFsGetResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | One file object from OpenList. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **503** | OpenList client is not configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getOpenListHealth

> OpenListHealthResponse getOpenListHealth()

OpenList runtime health through the Gateway adapter

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetOpenListHealthRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getOpenListHealth();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**OpenListHealthResponse**](OpenListHealthResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OpenList ping succeeded. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **503** | OpenList client is not configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getOpenListStorage

> OpenListStorageResponse getOpenListStorage(id)

Get one OpenList storage mount

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetOpenListStorageRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // number
    id: 56,
  } satisfies GetOpenListStorageRequest;

  try {
    const data = await api.getOpenListStorage(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `number` |  | [Defaults to `undefined`] |

### Return type

[**OpenListStorageResponse**](OpenListStorageResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | One OpenList storage mount. |  -  |
| **400** | Invalid storage id. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **503** | OpenList client is not configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getOpenListTarget

> OpenListTargetResponse getOpenListTarget(id)

Get one DataBase-owned OpenList file target

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetOpenListTargetRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
  } satisfies GetOpenListTargetRequest;

  try {
    const data = await api.getOpenListTarget(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |

### Return type

[**OpenListTargetResponse**](OpenListTargetResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | One DataBase-owned OpenList target. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **404** | OpenList target not found. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getOpenListTargetFile

> OpenListTargetFsGetResponse getOpenListTargetFile(id, getOpenListTargetFileRequest)

Get one file for a DataBase-owned OpenList target

Resolves the registered target id and accepts a stable bookId/object id so callers do not pass raw OpenList paths.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetOpenListTargetFileOperationRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
    // GetOpenListTargetFileRequest
    getOpenListTargetFileRequest: ...,
  } satisfies GetOpenListTargetFileOperationRequest;

  try {
    const data = await api.getOpenListTargetFile(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **getOpenListTargetFileRequest** | [GetOpenListTargetFileRequest](GetOpenListTargetFileRequest.md) |  | |

### Return type

[**OpenListTargetFsGetResponse**](OpenListTargetFsGetResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | One file for the registered target. |  -  |
| **400** | Invalid target file request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **404** | OpenList target or file not found. |  -  |
| **503** | OpenList client is not configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getRagflowHealth

> RagflowHealthResponse getRagflowHealth(retrieval, q, limit)

RAGFlow EvidenceProvider readiness

Returns DataBase Gateway\&#39;s RAGFlow EvidenceProvider readiness. By default it checks configuration, HTTP health, dataset visibility, and embedding configuration. Set retrieval&#x3D;true to also require real text-bearing chunks from /api/v1/retrieval.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetRagflowHealthRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // boolean (optional)
    retrieval: true,
    // string (optional)
    q: q_example,
    // number (optional)
    limit: 56,
  } satisfies GetRagflowHealthRequest;

  try {
    const data = await api.getRagflowHealth(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **retrieval** | `boolean` |  | [Optional] [Defaults to `false`] |
| **q** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `10`] |

### Return type

[**RagflowHealthResponse**](RagflowHealthResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | RAGFlow EvidenceProvider readiness check passed. |  -  |
| **503** | RAGFlow EvidenceProvider is not ready. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getServiceIdentity

> ServiceIdentityResponse getServiceIdentity()

Service identity

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetServiceIdentityRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getServiceIdentity();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**ServiceIdentityResponse**](ServiceIdentityResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Service identity. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getStatus

> StatusResponse getStatus()

Runtime status and integration metadata

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetStatusRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getStatus();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**StatusResponse**](StatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Gateway runtime status. This endpoint does not perform downstream health checks. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getStoryMemory

> StoryMemoryResponse getStoryMemory(workId, limit)

Canonical story memory for a creative work

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetStoryMemoryRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // number
    workId: 56,
    // number (optional)
    limit: 56,
  } satisfies GetStoryMemoryRequest;

  try {
    const data = await api.getStoryMemory(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workId** | `number` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `500`] |

### Return type

[**StoryMemoryResponse**](StoryMemoryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Canonical story events, character growth, and important items for a work. |  -  |
| **400** | Invalid query. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getStoryMemoryContext

> StoryMemoryContextResponse getStoryMemoryContext(workId, currentChapter, limit)

Prompt-ready story memory context summary

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetStoryMemoryContextRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // number
    workId: 56,
    // number (optional)
    currentChapter: 56,
    // number (optional)
    limit: 56,
  } satisfies GetStoryMemoryContextRequest;

  try {
    const data = await api.getStoryMemoryContext(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workId** | `number` |  | [Defaults to `undefined`] |
| **currentChapter** | `number` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `500`] |

### Return type

[**StoryMemoryContextResponse**](StoryMemoryContextResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Prompt-ready context summary assembled from canonical story memory. |  -  |
| **400** | Invalid query. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getStylePack

> StylePack getStylePack(q, sourceIds, limit)

Read DataBase style and syntax reference as StylePack

Returns DataBase-owned derived style profiles for syntax, rhetoric, imagery, paragraph movement, and copyright boundaries. This is not factual evidence and does not expose reusable copyrighted sentences.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetStylePackRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string | Style query such as 句法 修辞 意象.
    q: q_example,
    // string | Comma/space separated DataBase source ids. Use this to constrain StylePack retrieval to a specific style source, for example book_kinkakuji_restricted_style. (optional)
    sourceIds: sourceIds_example,
    // number | Maximum style profiles to return. (optional)
    limit: 56,
  } satisfies GetStylePackRequest;

  try {
    const data = await api.getStylePack(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **q** | `string` | Style query such as 句法 修辞 意象. | [Defaults to `undefined`] |
| **sourceIds** | `string` | Comma/space separated DataBase source ids. Use this to constrain StylePack retrieval to a specific style source, for example book_kinkakuji_restricted_style. | [Optional] [Defaults to `undefined`] |
| **limit** | `number` | Maximum style profiles to return. | [Optional] [Defaults to `6`] |

### Return type

[**StylePack**](StylePack.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | DataBase-owned StylePack assembled from restricted style reference projections. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getTableInventory

> TableInventoryResponse getTableInventory()

Table inventory

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { GetTableInventoryRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.getTableInventory();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**TableInventoryResponse**](TableInventoryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MySQL table inventory with sensitive table visibility labels. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listCanonicalContentAssets

> CanonicalAssetsResponse listCanonicalContentAssets(kind, limit)

Canonical content asset references

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListCanonicalContentAssetsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    kind: kind_example,
    // number (optional)
    limit: 56,
  } satisfies ListCanonicalContentAssetsRequest;

  try {
    const data = await api.listCanonicalContentAssets(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **kind** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**CanonicalAssetsResponse**](CanonicalAssetsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Canonical content asset records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listCanonicalContentBlocks

> CanonicalBlocksResponse listCanonicalContentBlocks(id, limit)

Canonical typed blocks for one part

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListCanonicalContentBlocksRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
    // number (optional)
    limit: 56,
  } satisfies ListCanonicalContentBlocksRequest;

  try {
    const data = await api.listCanonicalContentBlocks(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `500`] |

### Return type

[**CanonicalBlocksResponse**](CanonicalBlocksResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Canonical content block records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listCanonicalContentParts

> CanonicalPartsResponse listCanonicalContentParts(id, kind, limit)

Canonical content parts for one work

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListCanonicalContentPartsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
    // string (optional)
    kind: kind_example,
    // number (optional)
    limit: 56,
  } satisfies ListCanonicalContentPartsRequest;

  try {
    const data = await api.listCanonicalContentParts(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **kind** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `200`] |

### Return type

[**CanonicalPartsResponse**](CanonicalPartsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Canonical content part records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listCanonicalContentWorks

> CanonicalWorksResponse listCanonicalContentWorks(kind, status, search, limit)

Canonical content works across novels, articles, scripts, comics, and manuscripts

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListCanonicalContentWorksRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    kind: kind_example,
    // string (optional)
    status: status_example,
    // string (optional)
    search: search_example,
    // number (optional)
    limit: 56,
  } satisfies ListCanonicalContentWorksRequest;

  try {
    const data = await api.listCanonicalContentWorks(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **kind** | `string` |  | [Optional] [Defaults to `undefined`] |
| **status** | `string` |  | [Optional] [Defaults to `undefined`] |
| **search** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `50`] |

### Return type

[**CanonicalWorksResponse**](CanonicalWorksResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Canonical content work records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listCanonicalPublicationTargets

> PublicationTargetsResponse listCanonicalPublicationTargets(platform, accountIdentity, localWorkId, limit)

Canonical publication target mappings

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListCanonicalPublicationTargetsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    platform: platform_example,
    // string (optional)
    accountIdentity: accountIdentity_example,
    // string (optional)
    localWorkId: localWorkId_example,
    // number (optional)
    limit: 56,
  } satisfies ListCanonicalPublicationTargetsRequest;

  try {
    const data = await api.listCanonicalPublicationTargets(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **platform** | `string` |  | [Optional] [Defaults to `undefined`] |
| **accountIdentity** | `string` |  | [Optional] [Defaults to `undefined`] |
| **localWorkId** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**PublicationTargetsResponse**](PublicationTargetsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Canonical publication target records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listContentSources

> ContentSourcesResponse listContentSources(search, kind, limit)

Content source catalog

Returns a DataBase-owned source catalog projection for browsing and constraining EvidencePack retrieval. Consumers receive stable sourceId values and must not depend on MySQL, OpenList, or Obsidian internals.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListContentSourcesRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    search: search_example,
    // string (optional)
    kind: kind_example,
    // number (optional)
    limit: 56,
  } satisfies ListContentSourcesRequest;

  try {
    const data = await api.listContentSources(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **search** | `string` |  | [Optional] [Defaults to `undefined`] |
| **kind** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**ContentSourcesResponse**](ContentSourcesResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | SDK-facing source catalog. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listExperienceRecords

> ExperienceRecordsResponse listExperienceRecords(type, search, limit)

Experience records listing

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListExperienceRecordsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    type: type_example,
    // string (optional)
    search: search_example,
    // number (optional)
    limit: 56,
  } satisfies ListExperienceRecordsRequest;

  try {
    const data = await api.listExperienceRecords(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **type** | `string` |  | [Optional] [Defaults to `undefined`] |
| **search** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**ExperienceRecordsResponse**](ExperienceRecordsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Experience records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listFanqieWorks

> FanqieWorksResponse listFanqieWorks(search, accountId, limit)

Fanqie works listing

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListFanqieWorksRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    search: search_example,
    // string (optional)
    accountId: accountId_example,
    // number (optional)
    limit: 56,
  } satisfies ListFanqieWorksRequest;

  try {
    const data = await api.listFanqieWorks(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **search** | `string` |  | [Optional] [Defaults to `undefined`] |
| **accountId** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**FanqieWorksResponse**](FanqieWorksResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Fanqie work records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listLiterature

> LiteratureResponse listLiterature(search, limit)

Literature listing

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListLiteratureRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    search: search_example,
    // number (optional)
    limit: 56,
  } satisfies ListLiteratureRequest;

  try {
    const data = await api.listLiterature(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **search** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**LiteratureResponse**](LiteratureResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Literature records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listMyBlogReaderHighlights

> MyBlogReaderHighlightsResponse listMyBlogReaderHighlights(objectId, articleId, limit)

Read MyBlog reader highlights from DataBase

Returns reader highlights from DataBase-owned storage. MyBlog must not query reader_highlights directly.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListMyBlogReaderHighlightsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    objectId: objectId_example,
    // string (optional)
    articleId: articleId_example,
    // number (optional)
    limit: 56,
  } satisfies ListMyBlogReaderHighlightsRequest;

  try {
    const data = await api.listMyBlogReaderHighlights(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **objectId** | `string` |  | [Optional] [Defaults to `undefined`] |
| **articleId** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**MyBlogReaderHighlightsResponse**](MyBlogReaderHighlightsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | MyBlog reader highlights. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listNotes

> NotesResponse listNotes(category, search, limit)

Notes listing

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListNotesRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    category: category_example,
    // string (optional)
    search: search_example,
    // number (optional)
    limit: 56,
  } satisfies ListNotesRequest;

  try {
    const data = await api.listNotes(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **category** | `string` |  | [Optional] [Defaults to `undefined`] |
| **search** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**NotesResponse**](NotesResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Note records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listOpenListFiles

> OpenListFsListResponse listOpenListFiles(listOpenListFilesRequest)

List files through OpenList

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListOpenListFilesOperationRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // ListOpenListFilesRequest
    listOpenListFilesRequest: ...,
  } satisfies ListOpenListFilesOperationRequest;

  try {
    const data = await api.listOpenListFiles(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **listOpenListFilesRequest** | [ListOpenListFilesRequest](ListOpenListFilesRequest.md) |  | |

### Return type

[**OpenListFsListResponse**](OpenListFsListResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | File list from OpenList. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **503** | OpenList client is not configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listOpenListMounts

> OpenListMountsResponse listOpenListMounts(limit)

List DataBase-owned OpenList mount topology

Reads mount topology from DataBase. OpenList is the access projection; the mounted backend is the file truth.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListOpenListMountsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // number (optional)
    limit: 56,
  } satisfies ListOpenListMountsRequest;

  try {
    const data = await api.listOpenListMounts(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**OpenListMountsResponse**](OpenListMountsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | DataBase-owned OpenList mount records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listOpenListStorages

> OpenListStoragesResponse listOpenListStorages(page, perPage)

List OpenList storage mounts

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListOpenListStoragesRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // number (optional)
    page: 56,
    // number (optional)
    perPage: 56,
  } satisfies ListOpenListStoragesRequest;

  try {
    const data = await api.listOpenListStorages(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **page** | `number` |  | [Optional] [Defaults to `1`] |
| **perPage** | `number` |  | [Optional] [Defaults to `200`] |

### Return type

[**OpenListStoragesResponse**](OpenListStoragesResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OpenList storage mounts. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **503** | OpenList client is not configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listOpenListTargetFiles

> OpenListTargetFsListResponse listOpenListTargetFiles(id, listOpenListTargetFilesRequest)

List files for a DataBase-owned OpenList target

Resolves target id from MySQL, then calls OpenList with the registered remoteDir.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListOpenListTargetFilesOperationRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
    // ListOpenListTargetFilesRequest (optional)
    listOpenListTargetFilesRequest: ...,
  } satisfies ListOpenListTargetFilesOperationRequest;

  try {
    const data = await api.listOpenListTargetFiles(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **listOpenListTargetFilesRequest** | [ListOpenListTargetFilesRequest](ListOpenListTargetFilesRequest.md) |  | [Optional] |

### Return type

[**OpenListTargetFsListResponse**](OpenListTargetFsListResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | File list for the registered target. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **404** | OpenList target not found. |  -  |
| **503** | OpenList client is not configured. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listOpenListTargets

> OpenListTargetsResponse listOpenListTargets(limit, status, purpose)

List DataBase-owned OpenList file targets

Returns canonical target ids so callers do not hard-code OpenList remote paths.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListOpenListTargetsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // number (optional)
    limit: 56,
    // string (optional)
    status: status_example,
    // string (optional)
    purpose: purpose_example,
  } satisfies ListOpenListTargetsRequest;

  try {
    const data = await api.listOpenListTargets(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **limit** | `number` |  | [Optional] [Defaults to `100`] |
| **status** | `string` |  | [Optional] [Defaults to `&#39;active&#39;`] |
| **purpose** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**OpenListTargetsResponse**](OpenListTargetsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | DataBase-owned OpenList targets. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listSemanticRelations

> SemanticRelationsResponse listSemanticRelations(status, type, unit, limit)

Semantic graph relations

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListSemanticRelationsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    status: status_example,
    // string (optional)
    type: type_example,
    // string (optional)
    unit: unit_example,
    // number (optional)
    limit: 56,
  } satisfies ListSemanticRelationsRequest;

  try {
    const data = await api.listSemanticRelations(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **status** | `string` |  | [Optional] [Defaults to `&#39;active&#39;`] |
| **type** | `string` |  | [Optional] [Defaults to `undefined`] |
| **unit** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `100`] |

### Return type

[**SemanticRelationsResponse**](SemanticRelationsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Semantic graph relation rows. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listSemanticTags

> SemanticTagsResponse listSemanticTags(status, layer, limit)

Semantic tag taxonomy

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListSemanticTagsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    status: status_example,
    // string (optional)
    layer: layer_example,
    // number (optional)
    limit: 56,
  } satisfies ListSemanticTagsRequest;

  try {
    const data = await api.listSemanticTags(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **status** | `string` |  | [Optional] [Defaults to `&#39;active&#39;`] |
| **layer** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `200`] |

### Return type

[**SemanticTagsResponse**](SemanticTagsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Semantic tag taxonomy rows. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listSemanticUnits

> SemanticUnitsResponse listSemanticUnits(status, search, tag, limit)

Civilization semantic units

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListSemanticUnitsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    status: status_example,
    // string (optional)
    search: search_example,
    // string (optional)
    tag: tag_example,
    // number (optional)
    limit: 56,
  } satisfies ListSemanticUnitsRequest;

  try {
    const data = await api.listSemanticUnits(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **status** | `string` |  | [Optional] [Defaults to `&#39;active&#39;`] |
| **search** | `string` |  | [Optional] [Defaults to `undefined`] |
| **tag** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `50`] |

### Return type

[**SemanticUnitsResponse**](SemanticUnitsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Active semantic units with tag metadata. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listStateTransitions

> StateTransitionsResponse listStateTransitions(limit)

State transition logs

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListStateTransitionsRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // number (optional)
    limit: 56,
  } satisfies ListStateTransitionsRequest;

  try {
    const data = await api.listStateTransitions(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **limit** | `number` |  | [Optional] [Defaults to `200`] |

### Return type

[**StateTransitionsResponse**](StateTransitionsResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | State transition log records. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listWorkChapters

> ChaptersResponse listWorkChapters(id, limit)

Chapters for a work

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListWorkChaptersRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
    // number (optional)
    limit: 56,
  } satisfies ListWorkChaptersRequest;

  try {
    const data = await api.listWorkChapters(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `200`] |

### Return type

[**ChaptersResponse**](ChaptersResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Chapter records for the requested work. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listWorkCharacters

> CharactersResponse listWorkCharacters(id, limit)

Characters for a work

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListWorkCharactersRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    id: id_example,
    // number (optional)
    limit: 56,
  } satisfies ListWorkCharactersRequest;

  try {
    const data = await api.listWorkCharacters(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `200`] |

### Return type

[**CharactersResponse**](CharactersResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Character records for the requested work. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listWorks

> WorksResponse listWorks(search, status, platform, limit)

Works listing

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ListWorksRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    search: search_example,
    // string (optional)
    status: status_example,
    // string (optional)
    platform: platform_example,
    // number (optional)
    limit: 56,
  } satisfies ListWorksRequest;

  try {
    const data = await api.listWorks(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **search** | `string` |  | [Optional] [Defaults to `undefined`] |
| **status** | `string` |  | [Optional] [Defaults to `undefined`] |
| **platform** | `string` |  | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `50`] |

### Return type

[**WorksResponse**](WorksResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Work records with description previews. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## projectObsidianMarkdown

> GatewayMutationResponse projectObsidianMarkdown(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Project one Obsidian Markdown file into canonical content tables

Idempotently writes one structured Obsidian Vault projection into content_works, content_parts, content_blocks, content_assets, and content_relations. The Vault remains the human-editable Markdown file truth; DataBase owns the canonical structure and relations.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ProjectObsidianMarkdownRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies ProjectObsidianMarkdownRequest;

  try {
    const data = await api.projectObsidianMarkdown(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**GatewayMutationResponse**](GatewayMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordArticleAcceptanceReport

> RecordArticleAcceptanceReportMutationResponse recordArticleAcceptanceReport(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record an article acceptance report through the controlled write facade

Idempotently persists a DataBase-owned article acceptance report as a canonical content prompt_context block attached to the chapter content part. The report is a runtime evidence artifact, not a replacement for style or policy truth.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordArticleAcceptanceReportRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordArticleAcceptanceReportRequest;

  try {
    const data = await api.recordArticleAcceptanceReport(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**RecordArticleAcceptanceReportMutationResponse**](RecordArticleAcceptanceReportMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent article acceptance report mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordArticleReferenceUsageReport

> RecordArticleReferenceUsageReportMutationResponse recordArticleReferenceUsageReport(xDataBaseIdempotencyKey, recordArticleReferenceUsageReportRequest)

Record an article reference usage report through the controlled write facade

Idempotently persists DataBase-owned runtime evidence describing which reference, memory, literature, and learning materials were used by article generation. The report is an audit artifact, not a replacement for source material truth.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordArticleReferenceUsageReportOperationRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // RecordArticleReferenceUsageReportRequest
    recordArticleReferenceUsageReportRequest: ...,
  } satisfies RecordArticleReferenceUsageReportOperationRequest;

  try {
    const data = await api.recordArticleReferenceUsageReport(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **recordArticleReferenceUsageReportRequest** | [RecordArticleReferenceUsageReportRequest](RecordArticleReferenceUsageReportRequest.md) |  | |

### Return type

[**RecordArticleReferenceUsageReportMutationResponse**](RecordArticleReferenceUsageReportMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent article reference usage report mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordAuditResult

> RecordAuditResultMutationResponse recordAuditResult(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record chapter audit result through the controlled write facade

Idempotently persists chapter audit status, audit issues, and suggested action. Chapter lifecycle status transitions remain owned by the ContentBase state machine.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordAuditResultRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordAuditResultRequest;

  try {
    const data = await api.recordAuditResult(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**RecordAuditResultMutationResponse**](RecordAuditResultMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent audit result mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordAuthorLexiconReview

> RecordAuthorLexiconReviewMutationResponse recordAuthorLexiconReview(xDataBaseIdempotencyKey, recordAuthorLexiconReviewRequest)

Record an author lexicon review through the controlled write facade

Idempotently persists author lexicon review evidence and, when approved, promotes the term into the canonical active vocabulary or banned-word truth. Review evidence remains durable even when no promotion happens.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordAuthorLexiconReviewOperationRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // RecordAuthorLexiconReviewRequest
    recordAuthorLexiconReviewRequest: ...,
  } satisfies RecordAuthorLexiconReviewOperationRequest;

  try {
    const data = await api.recordAuthorLexiconReview(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **recordAuthorLexiconReviewRequest** | [RecordAuthorLexiconReviewRequest](RecordAuthorLexiconReviewRequest.md) |  | |

### Return type

[**RecordAuthorLexiconReviewMutationResponse**](RecordAuthorLexiconReviewMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent author lexicon review mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordChapterTransition

> RecordChapterTransitionMutationResponse recordChapterTransition(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record a chapter state transition through the controlled write facade

Idempotently persists a validated chapter status transition and transition log entry. The caller owns transition legality checks; the Gateway enforces stored fromState match before writing.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordChapterTransitionRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordChapterTransitionRequest;

  try {
    const data = await api.recordChapterTransition(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**RecordChapterTransitionMutationResponse**](RecordChapterTransitionMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent chapter transition mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordExperience

> GatewayMutationResponse recordExperience(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record an experience through the controlled write facade

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordExperienceRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordExperienceRequest;

  try {
    const data = await api.recordExperience(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**GatewayMutationResponse**](GatewayMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordGenerationOutput

> RecordGenerationOutputMutationResponse recordGenerationOutput(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record generated or polished chapter output through the controlled write facade

Idempotently persists generated chapter body into legacy chapter storage and the canonical content part/block projection. Chapter status transitions remain owned by the ContentBase state machine.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordGenerationOutputRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordGenerationOutputRequest;

  try {
    const data = await api.recordGenerationOutput(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**RecordGenerationOutputMutationResponse**](RecordGenerationOutputMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent generation output mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordMyBlogVisualSyncResult

> MyBlogVisualSyncResultResponse recordMyBlogVisualSyncResult(myBlogVisualSyncResultRequest)

Record a MyBlog visual sync result into DataBase

MyBlog may execute Pinterest/Apify sync, but the resulting pins and source status are stored by DataBase Gateway.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordMyBlogVisualSyncResultRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // MyBlogVisualSyncResultRequest
    myBlogVisualSyncResultRequest: ...,
  } satisfies RecordMyBlogVisualSyncResultRequest;

  try {
    const data = await api.recordMyBlogVisualSyncResult(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **myBlogVisualSyncResultRequest** | [MyBlogVisualSyncResultRequest](MyBlogVisualSyncResultRequest.md) |  | |

### Return type

[**MyBlogVisualSyncResultResponse**](MyBlogVisualSyncResultResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Stored visual sync result. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordNote

> GatewayMutationResponse recordNote(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record a note through the controlled write facade

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordNoteRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordNoteRequest;

  try {
    const data = await api.recordNote(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**GatewayMutationResponse**](GatewayMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordPublicationResult

> RecordPublicationResultMutationResponse recordPublicationResult(xDataBaseIdempotencyKey, recordPublicationResultRequest)

Record publication result through the controlled write facade

Idempotently writes one publication_records row and updates the canonical chapter publication state for a platform publish or edit result.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordPublicationResultOperationRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // RecordPublicationResultRequest
    recordPublicationResultRequest: ...,
  } satisfies RecordPublicationResultOperationRequest;

  try {
    const data = await api.recordPublicationResult(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **recordPublicationResultRequest** | [RecordPublicationResultRequest](RecordPublicationResultRequest.md) |  | |

### Return type

[**RecordPublicationResultMutationResponse**](RecordPublicationResultMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent publication result mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordSemanticReferenceMaterial

> RecordSemanticReferenceMaterialMutationResponse recordSemanticReferenceMaterial(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record reusable semantic reference material through the controlled write facade

Idempotently persists a reusable semantic reference material as a semantic_unit with a usable_for material tag. This is the canonical DataBase material pool for theory, document, comparison, observer, and literary reuse.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordSemanticReferenceMaterialRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordSemanticReferenceMaterialRequest;

  try {
    const data = await api.recordSemanticReferenceMaterial(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**RecordSemanticReferenceMaterialMutationResponse**](RecordSemanticReferenceMaterialMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent semantic reference material mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordStoryMemory

> RecordStoryMemoryMutationResponse recordStoryMemory(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record canonical story memory through the controlled write facade

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordStoryMemoryRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordStoryMemoryRequest;

  try {
    const data = await api.recordStoryMemory(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**RecordStoryMemoryMutationResponse**](RecordStoryMemoryMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent story memory mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recordStyleRevisionPair

> RecordStyleRevisionPairMutationResponse recordStyleRevisionPair(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Record ContentBase style revision evidence through the controlled write facade

Idempotently persists SyntaxReviewer bad-reason/action/forbidden-move evidence as a DataBase-owned semantic_unit tagged style-revision-pair and syntax-eval-case. The stored sample is for future prompting and evaluation, not deterministic string replacement.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { RecordStyleRevisionPairRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies RecordStyleRevisionPairRequest;

  try {
    const data = await api.recordStyleRevisionPair(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**RecordStyleRevisionPairMutationResponse**](RecordStyleRevisionPairMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent style revision pair mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## replaceWorkStructure

> ReplaceWorkStructureMutationResponse replaceWorkStructure(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Replace imported work structure through the controlled write facade

Idempotently replaces a work\&#39;s imported volume outlines, chapter outlines, characters, world settings, and optional seeded story memory in one transaction.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ReplaceWorkStructureRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies ReplaceWorkStructureRequest;

  try {
    const data = await api.replaceWorkStructure(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**ReplaceWorkStructureMutationResponse**](ReplaceWorkStructureMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent work structure replacement result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## resolveCreativeContext

> ResolvedCreativeContext resolveCreativeContext(workId, partId, protocol, semanticSearch, semanticLimit)

Resolved creative context for generation and review

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { ResolveCreativeContextRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    workId: workId_example,
    // string (optional)
    partId: partId_example,
    // string (optional)
    protocol: protocol_example,
    // string (optional)
    semanticSearch: semanticSearch_example,
    // number (optional)
    semanticLimit: 56,
  } satisfies ResolveCreativeContextRequest;

  try {
    const data = await api.resolveCreativeContext(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **workId** | `string` |  | [Defaults to `undefined`] |
| **partId** | `string` |  | [Optional] [Defaults to `undefined`] |
| **protocol** | `string` |  | [Optional] [Defaults to `&#39;immersive_historical_synthetic_narrative&#39;`] |
| **semanticSearch** | `string` |  | [Optional] [Defaults to `undefined`] |
| **semanticLimit** | `number` |  | [Optional] [Defaults to `12`] |

### Return type

[**ResolvedCreativeContext**](ResolvedCreativeContext.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Canonical creative context snapshot assembled from content, author, style, semantic, and publication truth. |  -  |
| **400** | Missing required query. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **404** | Work, part, author profile, or creative protocol not found. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchContent

> SearchResponse searchContent(q, limit)

Unified search across the MySQL search projection

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { SearchContentRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    q: q_example,
    // number (optional)
    limit: 56,
  } satisfies SearchContentRequest;

  try {
    const data = await api.searchContent(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **q** | `string` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `10`] |

### Return type

[**SearchResponse**](SearchResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Search matches from public/private projections. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchEvidencePack

> EvidencePack searchEvidencePack(q, topic, target, semanticTags, sourceIds, limit, rounds, includeWeb, includeRagflow)

Search DataBase evidence as a writing-ready EvidencePack

Wraps the canonical search_documents/search_chunks projection as EvidenceSource, EvidenceChunk, and EvidenceCitation records. This is the NotebookLM-style private evidence boundary for ContentBase; OpenList remains file access projection, not semantic truth.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { SearchEvidencePackRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string (optional)
    q: q_example,
    // string (optional)
    topic: topic_example,
    // string (optional)
    target: target_example,
    // string (optional)
    semanticTags: semanticTags_example,
    // string | Comma/space separated DataBase source ids. Use this to constrain EvidencePack retrieval to a specific imported corpus, for example book_xingwang_world_history_21. (optional)
    sourceIds: sourceIds_example,
    // number (optional)
    limit: 56,
    // number (optional)
    rounds: 56,
    // boolean (optional)
    includeWeb: true,
    // boolean (optional)
    includeRagflow: true,
  } satisfies SearchEvidencePackRequest;

  try {
    const data = await api.searchEvidencePack(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **q** | `string` |  | [Optional] [Defaults to `undefined`] |
| **topic** | `string` |  | [Optional] [Defaults to `undefined`] |
| **target** | `string` |  | [Optional] [Defaults to `undefined`] |
| **semanticTags** | `string` |  | [Optional] [Defaults to `undefined`] |
| **sourceIds** | `string` | Comma/space separated DataBase source ids. Use this to constrain EvidencePack retrieval to a specific imported corpus, for example book_xingwang_world_history_21. | [Optional] [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `10`] |
| **rounds** | `number` |  | [Optional] [Defaults to `4`] |
| **includeWeb** | `boolean` |  | [Optional] [Defaults to `false`] |
| **includeRagflow** | `boolean` |  | [Optional] [Defaults to `false`] |

### Return type

[**EvidencePack**](EvidencePack.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | DataBase-owned EvidencePack assembled from indexed chunks. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchVocabulary

> VocabularySearchResponse searchVocabulary(q, limit)

Vocabulary search

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { SearchVocabularyRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    q: q_example,
    // number (optional)
    limit: 56,
  } satisfies SearchVocabularyRequest;

  try {
    const data = await api.searchVocabulary(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **q** | `string` |  | [Defaults to `undefined`] |
| **limit** | `number` |  | [Optional] [Defaults to `20`] |

### Return type

[**VocabularySearchResponse**](VocabularySearchResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Vocabulary matches. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## upsertMyBlogReaderHighlight

> MyBlogReaderHighlightResponse upsertMyBlogReaderHighlight(myBlogReaderHighlightUpsertRequest)

Upsert a MyBlog reader highlight into DataBase

Persists a reader highlight through the Gateway-owned MySQL tables.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { UpsertMyBlogReaderHighlightRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // MyBlogReaderHighlightUpsertRequest
    myBlogReaderHighlightUpsertRequest: ...,
  } satisfies UpsertMyBlogReaderHighlightRequest;

  try {
    const data = await api.upsertMyBlogReaderHighlight(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **myBlogReaderHighlightUpsertRequest** | [MyBlogReaderHighlightUpsertRequest](MyBlogReaderHighlightUpsertRequest.md) |  | |

### Return type

[**MyBlogReaderHighlightResponse**](MyBlogReaderHighlightResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Upserted reader highlight. |  -  |
| **400** | Invalid payload. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## upsertMyBlogReaderMemory

> MyBlogReaderMemoryResponse upsertMyBlogReaderMemory(myBlogReaderMemoryUpsertRequest)

Upsert MyBlog reader memory into DataBase

Persists MyBlog reader progress through the Gateway-owned MySQL tables.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { UpsertMyBlogReaderMemoryRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // MyBlogReaderMemoryUpsertRequest
    myBlogReaderMemoryUpsertRequest: ...,
  } satisfies UpsertMyBlogReaderMemoryRequest;

  try {
    const data = await api.upsertMyBlogReaderMemory(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **myBlogReaderMemoryUpsertRequest** | [MyBlogReaderMemoryUpsertRequest](MyBlogReaderMemoryUpsertRequest.md) |  | |

### Return type

[**MyBlogReaderMemoryResponse**](MyBlogReaderMemoryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Upserted reader-memory item. |  -  |
| **400** | Invalid payload. |  -  |
| **401** | Missing or invalid API key. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## upsertVocabularyItem

> GatewayMutationResponse upsertVocabularyItem(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Upsert a vocabulary item through the controlled write facade

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { UpsertVocabularyItemRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies UpsertVocabularyItemRequest;

  try {
    const data = await api.upsertVocabularyItem(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**GatewayMutationResponse**](GatewayMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## upsertWork

> GatewayMutationResponse upsertWork(xDataBaseIdempotencyKey, gatewayWriteEnvelope)

Create or update a work through the controlled write facade

Idempotently creates a canonical work by title or updates mutable work metadata when the title already exists.

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from '@emptyinkpot/database-gateway-generated-client';
import type { UpsertWorkRequest } from '@emptyinkpot/database-gateway-generated-client';

async function example() {
  console.log("🚀 Testing @emptyinkpot/database-gateway-generated-client SDK...");
  const api = new DefaultApi();

  const body = {
    // string
    xDataBaseIdempotencyKey: xDataBaseIdempotencyKey_example,
    // GatewayWriteEnvelope
    gatewayWriteEnvelope: ...,
  } satisfies UpsertWorkRequest;

  try {
    const data = await api.upsertWork(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **xDataBaseIdempotencyKey** | `string` |  | [Defaults to `undefined`] |
| **gatewayWriteEnvelope** | [GatewayWriteEnvelope](GatewayWriteEnvelope.md) |  | |

### Return type

[**GatewayMutationResponse**](GatewayMutationResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Idempotent work upsert mutation result. |  -  |
| **400** | Invalid mutation request. |  -  |
| **401** | Missing or invalid API key. |  -  |
| **409** | Idempotency conflict or in-progress mutation. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
