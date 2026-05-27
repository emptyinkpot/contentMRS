# @emptyinkpot/database-gateway-generated-client@0.1.0

A TypeScript SDK client for the 127.0.0.1 API.

## Usage

First, install the SDK from npm.

```bash
npm install @emptyinkpot/database-gateway-generated-client --save
```

Next, try it out.


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


## Documentation

### API Endpoints

All URIs are relative to *http://127.0.0.1:18090*

| Class | Method | HTTP request | Description
| ----- | ------ | ------------ | -------------
*DefaultApi* | [**appendChapter**](docs/DefaultApi.md#appendchapter) | **POST** /writes/append-chapter | Append a chapter through the controlled write facade
*DefaultApi* | [**createWork**](docs/DefaultApi.md#creatework) | **POST** /writes/create-work | Create a work through the controlled write facade
*DefaultApi* | [**getAuthorProfile**](docs/DefaultApi.md#getauthorprofile) | **GET** /creative/author-profile | Author profile, interest clusters, and technique weights
*DefaultApi* | [**getCanonicalPartEvidenceFactAtoms**](docs/DefaultApi.md#getcanonicalpartevidencefactatoms) | **GET** /content/canonical/parts/{id}/evidence-fact-atoms | Typed fact atoms derived from canonical evidence citation blocks
*DefaultApi* | [**getCreativeStyleContract**](docs/DefaultApi.md#getcreativestylecontract) | **GET** /creative/style-contract | Creative writing style contract
*DefaultApi* | [**getDependencyHealth**](docs/DefaultApi.md#getdependencyhealth) | **GET** /health/dependencies | Required and optional dependency health
*DefaultApi* | [**getHealth**](docs/DefaultApi.md#gethealth) | **GET** /health | Core Gateway health
*DefaultApi* | [**getMyBlogReaderMemory**](docs/DefaultApi.md#getmyblogreadermemory) | **GET** /myblog/runtime/reader/memory | Read MyBlog reader memory from DataBase
*DefaultApi* | [**getMyBlogVisualSnapshot**](docs/DefaultApi.md#getmyblogvisualsnapshot) | **GET** /myblog/runtime/visuals/snapshot | Read MyBlog visual runtime snapshot from DataBase
*DefaultApi* | [**getNote**](docs/DefaultApi.md#getnote) | **GET** /content/notes/{id} | Single note
*DefaultApi* | [**getOpenListFile**](docs/DefaultApi.md#getopenlistfileoperation) | **POST** /openlist/fs/get | Get one file object through OpenList
*DefaultApi* | [**getOpenListHealth**](docs/DefaultApi.md#getopenlisthealth) | **GET** /openlist/health | OpenList runtime health through the Gateway adapter
*DefaultApi* | [**getOpenListStorage**](docs/DefaultApi.md#getopenliststorage) | **GET** /openlist/storages/{id} | Get one OpenList storage mount
*DefaultApi* | [**getOpenListTarget**](docs/DefaultApi.md#getopenlisttarget) | **GET** /openlist/targets/{id} | Get one DataBase-owned OpenList file target
*DefaultApi* | [**getOpenListTargetFile**](docs/DefaultApi.md#getopenlisttargetfileoperation) | **POST** /openlist/targets/{id}/get | Get one file for a DataBase-owned OpenList target
*DefaultApi* | [**getRagflowHealth**](docs/DefaultApi.md#getragflowhealth) | **GET** /health/ragflow | RAGFlow EvidenceProvider readiness
*DefaultApi* | [**getServiceIdentity**](docs/DefaultApi.md#getserviceidentity) | **GET** / | Service identity
*DefaultApi* | [**getStatus**](docs/DefaultApi.md#getstatus) | **GET** /status | Runtime status and integration metadata
*DefaultApi* | [**getStoryMemory**](docs/DefaultApi.md#getstorymemory) | **GET** /creative/story-memory | Canonical story memory for a creative work
*DefaultApi* | [**getStoryMemoryContext**](docs/DefaultApi.md#getstorymemorycontext) | **GET** /creative/story-memory/context | Prompt-ready story memory context summary
*DefaultApi* | [**getStylePack**](docs/DefaultApi.md#getstylepack) | **GET** /style/pack | Read DataBase style and syntax reference as StylePack
*DefaultApi* | [**getTableInventory**](docs/DefaultApi.md#gettableinventory) | **GET** /inventory/tables | Table inventory
*DefaultApi* | [**listCanonicalContentAssets**](docs/DefaultApi.md#listcanonicalcontentassets) | **GET** /content/canonical/assets | Canonical content asset references
*DefaultApi* | [**listCanonicalContentBlocks**](docs/DefaultApi.md#listcanonicalcontentblocks) | **GET** /content/canonical/parts/{id}/blocks | Canonical typed blocks for one part
*DefaultApi* | [**listCanonicalContentParts**](docs/DefaultApi.md#listcanonicalcontentparts) | **GET** /content/canonical/works/{id}/parts | Canonical content parts for one work
*DefaultApi* | [**listCanonicalContentWorks**](docs/DefaultApi.md#listcanonicalcontentworks) | **GET** /content/canonical/works | Canonical content works across novels, articles, scripts, comics, and manuscripts
*DefaultApi* | [**listCanonicalPublicationTargets**](docs/DefaultApi.md#listcanonicalpublicationtargets) | **GET** /content/canonical/publication-targets | Canonical publication target mappings
*DefaultApi* | [**listContentSources**](docs/DefaultApi.md#listcontentsources) | **GET** /content/sources | Content source catalog
*DefaultApi* | [**listExperienceRecords**](docs/DefaultApi.md#listexperiencerecords) | **GET** /content/experience-records | Experience records listing
*DefaultApi* | [**listFanqieWorks**](docs/DefaultApi.md#listfanqieworks) | **GET** /content/fanqie-works | Fanqie works listing
*DefaultApi* | [**listLiterature**](docs/DefaultApi.md#listliterature) | **GET** /content/literature | Literature listing
*DefaultApi* | [**listMyBlogReaderHighlights**](docs/DefaultApi.md#listmyblogreaderhighlights) | **GET** /myblog/runtime/reader/highlights | Read MyBlog reader highlights from DataBase
*DefaultApi* | [**listNotes**](docs/DefaultApi.md#listnotes) | **GET** /content/notes | Notes listing
*DefaultApi* | [**listOpenListFiles**](docs/DefaultApi.md#listopenlistfilesoperation) | **POST** /openlist/fs/list | List files through OpenList
*DefaultApi* | [**listOpenListMounts**](docs/DefaultApi.md#listopenlistmounts) | **GET** /openlist/mounts | List DataBase-owned OpenList mount topology
*DefaultApi* | [**listOpenListStorages**](docs/DefaultApi.md#listopenliststorages) | **GET** /openlist/storages | List OpenList storage mounts
*DefaultApi* | [**listOpenListTargetFiles**](docs/DefaultApi.md#listopenlisttargetfilesoperation) | **POST** /openlist/targets/{id}/list | List files for a DataBase-owned OpenList target
*DefaultApi* | [**listOpenListTargets**](docs/DefaultApi.md#listopenlisttargets) | **GET** /openlist/targets | List DataBase-owned OpenList file targets
*DefaultApi* | [**listSemanticRelations**](docs/DefaultApi.md#listsemanticrelations) | **GET** /semantic/relations | Semantic graph relations
*DefaultApi* | [**listSemanticTags**](docs/DefaultApi.md#listsemantictags) | **GET** /semantic/tags | Semantic tag taxonomy
*DefaultApi* | [**listSemanticUnits**](docs/DefaultApi.md#listsemanticunits) | **GET** /semantic/units | Civilization semantic units
*DefaultApi* | [**listStateTransitions**](docs/DefaultApi.md#liststatetransitions) | **GET** /content/state-machine/transitions | State transition logs
*DefaultApi* | [**listWorkChapters**](docs/DefaultApi.md#listworkchapters) | **GET** /content/works/{id}/chapters | Chapters for a work
*DefaultApi* | [**listWorkCharacters**](docs/DefaultApi.md#listworkcharacters) | **GET** /content/works/{id}/characters | Characters for a work
*DefaultApi* | [**listWorks**](docs/DefaultApi.md#listworks) | **GET** /content/works | Works listing
*DefaultApi* | [**projectObsidianMarkdown**](docs/DefaultApi.md#projectobsidianmarkdown) | **POST** /writes/project-obsidian-markdown | Project one Obsidian Markdown file into canonical content tables
*DefaultApi* | [**recordArticleAcceptanceReport**](docs/DefaultApi.md#recordarticleacceptancereport) | **POST** /writes/record-article-acceptance-report | Record an article acceptance report through the controlled write facade
*DefaultApi* | [**recordArticleReferenceUsageReport**](docs/DefaultApi.md#recordarticlereferenceusagereportoperation) | **POST** /writes/record-article-reference-usage-report | Record an article reference usage report through the controlled write facade
*DefaultApi* | [**recordAuditResult**](docs/DefaultApi.md#recordauditresult) | **POST** /writes/record-audit-result | Record chapter audit result through the controlled write facade
*DefaultApi* | [**recordAuthorLexiconReview**](docs/DefaultApi.md#recordauthorlexiconreviewoperation) | **POST** /writes/record-author-lexicon-review | Record an author lexicon review through the controlled write facade
*DefaultApi* | [**recordChapterTransition**](docs/DefaultApi.md#recordchaptertransition) | **POST** /writes/record-chapter-transition | Record a chapter state transition through the controlled write facade
*DefaultApi* | [**recordExperience**](docs/DefaultApi.md#recordexperience) | **POST** /writes/record-experience | Record an experience through the controlled write facade
*DefaultApi* | [**recordGenerationOutput**](docs/DefaultApi.md#recordgenerationoutput) | **POST** /writes/record-generation-output | Record generated or polished chapter output through the controlled write facade
*DefaultApi* | [**recordMyBlogVisualSyncResult**](docs/DefaultApi.md#recordmyblogvisualsyncresult) | **POST** /myblog/runtime/visuals/sync-result | Record a MyBlog visual sync result into DataBase
*DefaultApi* | [**recordNote**](docs/DefaultApi.md#recordnote) | **POST** /writes/record-note | Record a note through the controlled write facade
*DefaultApi* | [**recordPublicationResult**](docs/DefaultApi.md#recordpublicationresultoperation) | **POST** /writes/publication/record-result | Record publication result through the controlled write facade
*DefaultApi* | [**recordSemanticReferenceMaterial**](docs/DefaultApi.md#recordsemanticreferencematerial) | **POST** /writes/record-semantic-reference-material | Record reusable semantic reference material through the controlled write facade
*DefaultApi* | [**recordStoryMemory**](docs/DefaultApi.md#recordstorymemory) | **POST** /writes/record-story-memory | Record canonical story memory through the controlled write facade
*DefaultApi* | [**recordStyleRevisionPair**](docs/DefaultApi.md#recordstylerevisionpair) | **POST** /writes/record-style-revision-pair | Record ContentBase style revision evidence through the controlled write facade
*DefaultApi* | [**replaceWorkStructure**](docs/DefaultApi.md#replaceworkstructure) | **POST** /writes/replace-work-structure | Replace imported work structure through the controlled write facade
*DefaultApi* | [**resolveCreativeContext**](docs/DefaultApi.md#resolvecreativecontext) | **GET** /creative/context | Resolved creative context for generation and review
*DefaultApi* | [**searchContent**](docs/DefaultApi.md#searchcontent) | **GET** /search | Unified search across the MySQL search projection
*DefaultApi* | [**searchEvidencePack**](docs/DefaultApi.md#searchevidencepack) | **GET** /evidence/search | Search DataBase evidence as a writing-ready EvidencePack
*DefaultApi* | [**searchVocabulary**](docs/DefaultApi.md#searchvocabulary) | **GET** /vocabulary/search | Vocabulary search
*DefaultApi* | [**upsertMyBlogReaderHighlight**](docs/DefaultApi.md#upsertmyblogreaderhighlight) | **POST** /myblog/runtime/reader/highlights | Upsert a MyBlog reader highlight into DataBase
*DefaultApi* | [**upsertMyBlogReaderMemory**](docs/DefaultApi.md#upsertmyblogreadermemory) | **POST** /myblog/runtime/reader/memory | Upsert MyBlog reader memory into DataBase
*DefaultApi* | [**upsertVocabularyItem**](docs/DefaultApi.md#upsertvocabularyitem) | **POST** /writes/upsert-vocabulary-item | Upsert a vocabulary item through the controlled write facade
*DefaultApi* | [**upsertWork**](docs/DefaultApi.md#upsertwork) | **POST** /writes/upsert-work | Create or update a work through the controlled write facade


### Models

- [ArticleReferenceUsageReport](docs/ArticleReferenceUsageReport.md)
- [ArticleReferenceUsageReportActualUsage](docs/ArticleReferenceUsageReportActualUsage.md)
- [ArticleReferenceUsageReportActualUsageParagraphsInner](docs/ArticleReferenceUsageReportActualUsageParagraphsInner.md)
- [ArticleReferenceUsageReportAnchorsInner](docs/ArticleReferenceUsageReportAnchorsInner.md)
- [ArticleReferenceUsageReportContextSources](docs/ArticleReferenceUsageReportContextSources.md)
- [ArticleReferenceUsageReportSectionUsageInner](docs/ArticleReferenceUsageReportSectionUsageInner.md)
- [ArticleReferenceUsageReportSourcePassagesInner](docs/ArticleReferenceUsageReportSourcePassagesInner.md)
- [AuthorProfileResponse](docs/AuthorProfileResponse.md)
- [CanonicalAssetsResponse](docs/CanonicalAssetsResponse.md)
- [CanonicalBlocksResponse](docs/CanonicalBlocksResponse.md)
- [CanonicalContentListResponse](docs/CanonicalContentListResponse.md)
- [CanonicalPartsResponse](docs/CanonicalPartsResponse.md)
- [CanonicalWorksResponse](docs/CanonicalWorksResponse.md)
- [Chapter](docs/Chapter.md)
- [ChaptersResponse](docs/ChaptersResponse.md)
- [CharacterGrowth](docs/CharacterGrowth.md)
- [CharactersResponse](docs/CharactersResponse.md)
- [ContentAsset](docs/ContentAsset.md)
- [ContentBlock](docs/ContentBlock.md)
- [ContentPart](docs/ContentPart.md)
- [ContentSourceSummary](docs/ContentSourceSummary.md)
- [ContentSourcesResponse](docs/ContentSourcesResponse.md)
- [ContentWork](docs/ContentWork.md)
- [CreativeAuthorTechnique](docs/CreativeAuthorTechnique.md)
- [CreativeStyleContractResponse](docs/CreativeStyleContractResponse.md)
- [CreativeStyleContractResponseAuthorTechniquesInner](docs/CreativeStyleContractResponseAuthorTechniquesInner.md)
- [CreativeStyleContractResponseCounts](docs/CreativeStyleContractResponseCounts.md)
- [CreativeStyleContractResponseEditingStepsInner](docs/CreativeStyleContractResponseEditingStepsInner.md)
- [CreativeStyleContractResponseLexicon](docs/CreativeStyleContractResponseLexicon.md)
- [CreativeStyleContractResponseLexiconBannedInner](docs/CreativeStyleContractResponseLexiconBannedInner.md)
- [CreativeStyleContractResponseLexiconPreferredInner](docs/CreativeStyleContractResponseLexiconPreferredInner.md)
- [CreativeStyleContractResponseModulesInner](docs/CreativeStyleContractResponseModulesInner.md)
- [CreativeStyleContractResponseProtocol](docs/CreativeStyleContractResponseProtocol.md)
- [CreativeStyleContractResponseProtocolPayload](docs/CreativeStyleContractResponseProtocolPayload.md)
- [CreativeStyleContractResponseProtocolPayloadAuthorProfile](docs/CreativeStyleContractResponseProtocolPayloadAuthorProfile.md)
- [CreativeStyleContractResponseProtocolPayloadAuthorialConstitution](docs/CreativeStyleContractResponseProtocolPayloadAuthorialConstitution.md)
- [CreativeStyleContractResponseProtocolPayloadConceptualEntry](docs/CreativeStyleContractResponseProtocolPayloadConceptualEntry.md)
- [CreativeStyleContractResponseProtocolPayloadInterestClustersInner](docs/CreativeStyleContractResponseProtocolPayloadInterestClustersInner.md)
- [CreativeStyleContractResponseProtocolPayloadLexiconLifecycle](docs/CreativeStyleContractResponseProtocolPayloadLexiconLifecycle.md)
- [CreativeStyleContractResponseProtocolPayloadNarrativeProtocol](docs/CreativeStyleContractResponseProtocolPayloadNarrativeProtocol.md)
- [CreativeStyleContractResponseProtocolPayloadNarrativeProtocolIdeologicalBlendInner](docs/CreativeStyleContractResponseProtocolPayloadNarrativeProtocolIdeologicalBlendInner.md)
- [CreativeStyleContractResponseProtocolPayloadNarrativeProtocolLexicalSystem](docs/CreativeStyleContractResponseProtocolPayloadNarrativeProtocolLexicalSystem.md)
- [CreativeStyleContractResponseProtocolPayloadNarrativeProtocolPerspective](docs/CreativeStyleContractResponseProtocolPayloadNarrativeProtocolPerspective.md)
- [CreativeStyleContractResponseProtocolPayloadNarrativeProtocolRhetoricalSystem](docs/CreativeStyleContractResponseProtocolPayloadNarrativeProtocolRhetoricalSystem.md)
- [CreativeStyleContractResponseProtocolPayloadNarrativeProtocolSourceUse](docs/CreativeStyleContractResponseProtocolPayloadNarrativeProtocolSourceUse.md)
- [CreativeStyleContractResponseProtocolPayloadNarrativeProtocolStructureLogic](docs/CreativeStyleContractResponseProtocolPayloadNarrativeProtocolStructureLogic.md)
- [CreativeStyleContractResponseProtocolPayloadProcessPlan](docs/CreativeStyleContractResponseProtocolPayloadProcessPlan.md)
- [CreativeStyleContractResponseProtocolPayloadWritingTaskTypesInner](docs/CreativeStyleContractResponseProtocolPayloadWritingTaskTypesInner.md)
- [CreativeStyleContractResponseQualityRulesInner](docs/CreativeStyleContractResponseQualityRulesInner.md)
- [CreativeStyleContractResponseSourceMaterialsInner](docs/CreativeStyleContractResponseSourceMaterialsInner.md)
- [CreativeStyleContractResponseTechniquesInner](docs/CreativeStyleContractResponseTechniquesInner.md)
- [CreativeWritingTechnique](docs/CreativeWritingTechnique.md)
- [DependencyHealthResponse](docs/DependencyHealthResponse.md)
- [ErrorResponse](docs/ErrorResponse.md)
- [EvidenceChunk](docs/EvidenceChunk.md)
- [EvidenceCitation](docs/EvidenceCitation.md)
- [EvidenceFactAtom](docs/EvidenceFactAtom.md)
- [EvidenceFactAtomPack](docs/EvidenceFactAtomPack.md)
- [EvidenceFactAtomPackAtomsInner](docs/EvidenceFactAtomPackAtomsInner.md)
- [EvidencePack](docs/EvidencePack.md)
- [EvidencePackChunksInner](docs/EvidencePackChunksInner.md)
- [EvidencePackCitationsInner](docs/EvidencePackCitationsInner.md)
- [EvidencePackCounts](docs/EvidencePackCounts.md)
- [EvidencePackQueryRun](docs/EvidencePackQueryRun.md)
- [EvidencePackQueryRunRoundsInner](docs/EvidencePackQueryRunRoundsInner.md)
- [EvidencePackScreening](docs/EvidencePackScreening.md)
- [EvidencePackScreeningFusion](docs/EvidencePackScreeningFusion.md)
- [EvidencePackScreeningLatentRerank](docs/EvidencePackScreeningLatentRerank.md)
- [EvidencePackScreeningLatentRerankGenerationControl](docs/EvidencePackScreeningLatentRerankGenerationControl.md)
- [EvidencePackScreeningRejectedInner](docs/EvidencePackScreeningRejectedInner.md)
- [EvidencePackSourcesInner](docs/EvidencePackSourcesInner.md)
- [EvidenceSource](docs/EvidenceSource.md)
- [ExperienceRecordsResponse](docs/ExperienceRecordsResponse.md)
- [FanqieWorksResponse](docs/FanqieWorksResponse.md)
- [GatewayMutationResponse](docs/GatewayMutationResponse.md)
- [GatewayWriteEnvelope](docs/GatewayWriteEnvelope.md)
- [GetOpenListFileRequest](docs/GetOpenListFileRequest.md)
- [GetOpenListTargetFileRequest](docs/GetOpenListTargetFileRequest.md)
- [HealthResponse](docs/HealthResponse.md)
- [HealthResponseChecks](docs/HealthResponseChecks.md)
- [HealthResponseOptionalDownstreams](docs/HealthResponseOptionalDownstreams.md)
- [ImportantItem](docs/ImportantItem.md)
- [ListOpenListFilesRequest](docs/ListOpenListFilesRequest.md)
- [ListOpenListTargetFilesRequest](docs/ListOpenListTargetFilesRequest.md)
- [LiteratureResponse](docs/LiteratureResponse.md)
- [MutationResultMetadata](docs/MutationResultMetadata.md)
- [MyBlogReaderHighlight](docs/MyBlogReaderHighlight.md)
- [MyBlogReaderHighlightResponse](docs/MyBlogReaderHighlightResponse.md)
- [MyBlogReaderHighlightUpsertRequest](docs/MyBlogReaderHighlightUpsertRequest.md)
- [MyBlogReaderHighlightsResponse](docs/MyBlogReaderHighlightsResponse.md)
- [MyBlogReaderMemory](docs/MyBlogReaderMemory.md)
- [MyBlogReaderMemoryListResponse](docs/MyBlogReaderMemoryListResponse.md)
- [MyBlogReaderMemoryQueryResponse](docs/MyBlogReaderMemoryQueryResponse.md)
- [MyBlogReaderMemoryResponse](docs/MyBlogReaderMemoryResponse.md)
- [MyBlogReaderMemoryUpsertRequest](docs/MyBlogReaderMemoryUpsertRequest.md)
- [MyBlogVisualPin](docs/MyBlogVisualPin.md)
- [MyBlogVisualSnapshotResponse](docs/MyBlogVisualSnapshotResponse.md)
- [MyBlogVisualSource](docs/MyBlogVisualSource.md)
- [MyBlogVisualSyncResultRequest](docs/MyBlogVisualSyncResultRequest.md)
- [MyBlogVisualSyncResultRequestPinsInner](docs/MyBlogVisualSyncResultRequestPinsInner.md)
- [MyBlogVisualSyncResultResponse](docs/MyBlogVisualSyncResultResponse.md)
- [NoteResponse](docs/NoteResponse.md)
- [NotesResponse](docs/NotesResponse.md)
- [OpenListFileObject](docs/OpenListFileObject.md)
- [OpenListFsGetResponse](docs/OpenListFsGetResponse.md)
- [OpenListFsListResponse](docs/OpenListFsListResponse.md)
- [OpenListFsListResponseContentInner](docs/OpenListFsListResponseContentInner.md)
- [OpenListHealthResponse](docs/OpenListHealthResponse.md)
- [OpenListMount](docs/OpenListMount.md)
- [OpenListMountsResponse](docs/OpenListMountsResponse.md)
- [OpenListStorage](docs/OpenListStorage.md)
- [OpenListStorageResponse](docs/OpenListStorageResponse.md)
- [OpenListStoragesResponse](docs/OpenListStoragesResponse.md)
- [OpenListStoragesResponseStoragesInner](docs/OpenListStoragesResponseStoragesInner.md)
- [OpenListTarget](docs/OpenListTarget.md)
- [OpenListTargetFsGetResponse](docs/OpenListTargetFsGetResponse.md)
- [OpenListTargetFsListResponse](docs/OpenListTargetFsListResponse.md)
- [OpenListTargetResponse](docs/OpenListTargetResponse.md)
- [OpenListTargetsResponse](docs/OpenListTargetsResponse.md)
- [PublicationTarget](docs/PublicationTarget.md)
- [PublicationTargetsResponse](docs/PublicationTargetsResponse.md)
- [RagflowHealthResponse](docs/RagflowHealthResponse.md)
- [RagflowHealthResponseFailedDocumentsInner](docs/RagflowHealthResponseFailedDocumentsInner.md)
- [RagflowHealthResponseSampleInner](docs/RagflowHealthResponseSampleInner.md)
- [RecordArticleAcceptanceReportMutationResponse](docs/RecordArticleAcceptanceReportMutationResponse.md)
- [RecordArticleAcceptanceReportResult](docs/RecordArticleAcceptanceReportResult.md)
- [RecordArticleReferenceUsageReportMutationResponse](docs/RecordArticleReferenceUsageReportMutationResponse.md)
- [RecordArticleReferenceUsageReportPayload](docs/RecordArticleReferenceUsageReportPayload.md)
- [RecordArticleReferenceUsageReportRequest](docs/RecordArticleReferenceUsageReportRequest.md)
- [RecordArticleReferenceUsageReportResult](docs/RecordArticleReferenceUsageReportResult.md)
- [RecordAuditResultMutationResponse](docs/RecordAuditResultMutationResponse.md)
- [RecordAuditResultResult](docs/RecordAuditResultResult.md)
- [RecordAuthorLexiconReviewMutationResponse](docs/RecordAuthorLexiconReviewMutationResponse.md)
- [RecordAuthorLexiconReviewMutationResponseItem](docs/RecordAuthorLexiconReviewMutationResponseItem.md)
- [RecordAuthorLexiconReviewPayload](docs/RecordAuthorLexiconReviewPayload.md)
- [RecordAuthorLexiconReviewRequest](docs/RecordAuthorLexiconReviewRequest.md)
- [RecordChapterTransitionMutationResponse](docs/RecordChapterTransitionMutationResponse.md)
- [RecordChapterTransitionResult](docs/RecordChapterTransitionResult.md)
- [RecordGenerationOutputMutationResponse](docs/RecordGenerationOutputMutationResponse.md)
- [RecordGenerationOutputResult](docs/RecordGenerationOutputResult.md)
- [RecordPublicationResultMutationResponse](docs/RecordPublicationResultMutationResponse.md)
- [RecordPublicationResultPayload](docs/RecordPublicationResultPayload.md)
- [RecordPublicationResultRequest](docs/RecordPublicationResultRequest.md)
- [RecordPublicationResultResult](docs/RecordPublicationResultResult.md)
- [RecordSemanticReferenceMaterialMutationResponse](docs/RecordSemanticReferenceMaterialMutationResponse.md)
- [RecordSemanticReferenceMaterialMutationResponseItem](docs/RecordSemanticReferenceMaterialMutationResponseItem.md)
- [RecordSemanticReferenceMaterialResult](docs/RecordSemanticReferenceMaterialResult.md)
- [RecordStoryMemoryMutationResponse](docs/RecordStoryMemoryMutationResponse.md)
- [RecordStoryMemoryMutationResponseResult](docs/RecordStoryMemoryMutationResponseResult.md)
- [RecordStoryMemoryResult](docs/RecordStoryMemoryResult.md)
- [RecordStyleRevisionPairMutationResponse](docs/RecordStyleRevisionPairMutationResponse.md)
- [RecordStyleRevisionPairMutationResponseItem](docs/RecordStyleRevisionPairMutationResponseItem.md)
- [RecordStyleRevisionPairResult](docs/RecordStyleRevisionPairResult.md)
- [ReplaceWorkStructureMutationResponse](docs/ReplaceWorkStructureMutationResponse.md)
- [ReplaceWorkStructureResult](docs/ReplaceWorkStructureResult.md)
- [ResolvedCreativeContext](docs/ResolvedCreativeContext.md)
- [ResolvedCreativeContextAuthorProfile](docs/ResolvedCreativeContextAuthorProfile.md)
- [ResolvedCreativeContextAuthorProfileInterestClustersInner](docs/ResolvedCreativeContextAuthorProfileInterestClustersInner.md)
- [ResolvedCreativeContextAuthorProfileProfile](docs/ResolvedCreativeContextAuthorProfileProfile.md)
- [ResolvedCreativeContextCorpusImitation](docs/ResolvedCreativeContextCorpusImitation.md)
- [ResolvedCreativeContextCorpusImitationPunctuationProfile](docs/ResolvedCreativeContextCorpusImitationPunctuationProfile.md)
- [ResolvedCreativeContextCorpusImitationSourcePassagesInner](docs/ResolvedCreativeContextCorpusImitationSourcePassagesInner.md)
- [ResolvedCreativeContextCounts](docs/ResolvedCreativeContextCounts.md)
- [ResolvedCreativeContextCurrentPart](docs/ResolvedCreativeContextCurrentPart.md)
- [ResolvedCreativeContextLexiconLearning](docs/ResolvedCreativeContextLexiconLearning.md)
- [ResolvedCreativeContextLexiconLearningCounts](docs/ResolvedCreativeContextLexiconLearningCounts.md)
- [ResolvedCreativeContextLexiconLearningRecentReviewsInner](docs/ResolvedCreativeContextLexiconLearningRecentReviewsInner.md)
- [ResolvedCreativeContextNarrativeState](docs/ResolvedCreativeContextNarrativeState.md)
- [ResolvedCreativeContextNarrativeStateCharactersInner](docs/ResolvedCreativeContextNarrativeStateCharactersInner.md)
- [ResolvedCreativeContextNarrativeStateCurrentChapter](docs/ResolvedCreativeContextNarrativeStateCurrentChapter.md)
- [ResolvedCreativeContextNarrativeStatePreviousChaptersInner](docs/ResolvedCreativeContextNarrativeStatePreviousChaptersInner.md)
- [ResolvedCreativeContextNarrativeStateWorldRulesInner](docs/ResolvedCreativeContextNarrativeStateWorldRulesInner.md)
- [ResolvedCreativeContextPartsInner](docs/ResolvedCreativeContextPartsInner.md)
- [ResolvedCreativeContextPublicationState](docs/ResolvedCreativeContextPublicationState.md)
- [ResolvedCreativeContextPublicationStateTargetsInner](docs/ResolvedCreativeContextPublicationStateTargetsInner.md)
- [ResolvedCreativeContextRecentBlocksInner](docs/ResolvedCreativeContextRecentBlocksInner.md)
- [ResolvedCreativeContextRuleInventory](docs/ResolvedCreativeContextRuleInventory.md)
- [ResolvedCreativeContextRuleInventoryRulesInner](docs/ResolvedCreativeContextRuleInventoryRulesInner.md)
- [ResolvedCreativeContextRuntimeSnapshot](docs/ResolvedCreativeContextRuntimeSnapshot.md)
- [ResolvedCreativeContextRuntimeSnapshotSourceCounts](docs/ResolvedCreativeContextRuntimeSnapshotSourceCounts.md)
- [ResolvedCreativeContextSemanticContext](docs/ResolvedCreativeContextSemanticContext.md)
- [ResolvedCreativeContextSemanticState](docs/ResolvedCreativeContextSemanticState.md)
- [ResolvedCreativeContextSnapshot](docs/ResolvedCreativeContextSnapshot.md)
- [ResolvedCreativeContextStyleContract](docs/ResolvedCreativeContextStyleContract.md)
- [ResolvedCreativeContextStyleState](docs/ResolvedCreativeContextStyleState.md)
- [ResolvedCreativeContextWork](docs/ResolvedCreativeContextWork.md)
- [SearchResponse](docs/SearchResponse.md)
- [SearchResult](docs/SearchResult.md)
- [SemanticRelation](docs/SemanticRelation.md)
- [SemanticRelationsResponse](docs/SemanticRelationsResponse.md)
- [SemanticRelationsResponseFilters](docs/SemanticRelationsResponseFilters.md)
- [SemanticTag](docs/SemanticTag.md)
- [SemanticTagsResponse](docs/SemanticTagsResponse.md)
- [SemanticTagsResponseFilters](docs/SemanticTagsResponseFilters.md)
- [SemanticUnit](docs/SemanticUnit.md)
- [SemanticUnitTagsInner](docs/SemanticUnitTagsInner.md)
- [SemanticUnitsResponse](docs/SemanticUnitsResponse.md)
- [SemanticUnitsResponseFilters](docs/SemanticUnitsResponseFilters.md)
- [ServiceIdentityResponse](docs/ServiceIdentityResponse.md)
- [StateTransitionsResponse](docs/StateTransitionsResponse.md)
- [StatusResponse](docs/StatusResponse.md)
- [StatusResponseAuth](docs/StatusResponseAuth.md)
- [StatusResponseBind](docs/StatusResponseBind.md)
- [StatusResponseContracts](docs/StatusResponseContracts.md)
- [StatusResponseDownstream](docs/StatusResponseDownstream.md)
- [StatusResponseDownstreamMysql](docs/StatusResponseDownstreamMysql.md)
- [StoryEvent](docs/StoryEvent.md)
- [StoryEventId](docs/StoryEventId.md)
- [StoryMemoryContextResponse](docs/StoryMemoryContextResponse.md)
- [StoryMemoryCounts](docs/StoryMemoryCounts.md)
- [StoryMemoryResponse](docs/StoryMemoryResponse.md)
- [StylePack](docs/StylePack.md)
- [StylePackCounts](docs/StylePackCounts.md)
- [StylePackProfile](docs/StylePackProfile.md)
- [StylePackProfilesInner](docs/StylePackProfilesInner.md)
- [StylePackRevisionPairsInner](docs/StylePackRevisionPairsInner.md)
- [StylePackRevisionPairsInnerReviewerEvidence](docs/StylePackRevisionPairsInnerReviewerEvidence.md)
- [StylePackScreening](docs/StylePackScreening.md)
- [StyleRevisionPair](docs/StyleRevisionPair.md)
- [TableInventoryItem](docs/TableInventoryItem.md)
- [TableInventoryResponse](docs/TableInventoryResponse.md)
- [VocabularyItem](docs/VocabularyItem.md)
- [VocabularySearchResponse](docs/VocabularySearchResponse.md)
- [Work](docs/Work.md)
- [WorkId](docs/WorkId.md)
- [WorksResponse](docs/WorksResponse.md)

### Authorization


Authentication schemes defined for the API:
<a id="DataBaseApiKey"></a>
#### DataBaseApiKey


- **Type**: API key
- **API key parameter name**: `X-DataBase-Api-Key`
- **Location**: HTTP header

## About

This TypeScript SDK client supports the [Fetch API](https://fetch.spec.whatwg.org/)
and is automatically generated by the
[OpenAPI Generator](https://openapi-generator.tech) project:

- API version: `0.1.0`
- Package version: `0.1.0`
- Generator version: `7.22.0`
- Build package: `org.openapitools.codegen.languages.TypeScriptFetchClientCodegen`

The generated npm module supports the following:

- Environments
  * Node.js
  * Webpack
  * Browserify
- Language levels
  * ES5 - you must have a Promises/A+ library installed
  * ES6
- Module systems
  * CommonJS
  * ES6 module system


## Development

### Building

To build the TypeScript source code, you need to have Node.js and npm installed.
After cloning the repository, navigate to the project directory and run:

```bash
npm install
npm run build
```

### Publishing

Once you've built the package, you can publish it to npm:

```bash
npm publish
```

## License

[]()
