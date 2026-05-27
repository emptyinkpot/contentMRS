import { readFile, writeFile } from "node:fs/promises";
import YAML from "yaml";
import { z, toJSONSchema } from "zod";
import {
  ContentAssetSchema,
  ContentBlockSchema,
  ContentSourceSummarySchema,
  ContentSourcesResponseSchema,
  EvidencePackSchema,
  EvidenceSourceSchema,
  EvidenceChunkSchema,
  EvidenceCitationSchema,
  EvidenceFactAtomPackSchema,
  EvidenceFactAtomSchema,
  ContentPartSchema,
  ContentWorkSchema,
  PublicationTargetSchema,
  RecordAuditResultMutationResponseSchema,
  RecordAuditResultResultSchema,
  RecordChapterTransitionMutationResponseSchema,
  RecordChapterTransitionResultSchema,
  RecordGenerationOutputMutationResponseSchema,
  RecordGenerationOutputResultSchema,
  RecordPublicationResultMutationResponseSchema,
  RecordPublicationResultPayloadSchema,
  RecordPublicationResultResultSchema,
  ReplaceWorkStructureMutationResponseSchema,
  ReplaceWorkStructureResultSchema,
} from "@emptyinkpot/database-content-contracts";
import {
  CreativeStyleContractSchema,
  ResolvedCreativeContextSchema,
  CharacterGrowthSchema,
  ImportantItemSchema,
  RecordArticleAcceptanceReportMutationResponseSchema,
  RecordArticleAcceptanceReportResultSchema,
  RecordArticleReferenceUsageReportMutationResponseSchema,
  RecordArticleReferenceUsageReportPayloadSchema,
  RecordArticleReferenceUsageReportResultSchema,
  RecordAuthorLexiconReviewMutationResponseSchema,
  RecordAuthorLexiconReviewPayloadSchema,
  ArticleReferenceUsageReportSchema,
  RecordStoryMemoryMutationResponseSchema,
  RecordStoryMemoryResultSchema,
  StoryEventSchema,
  StoryMemoryContextResponseSchema,
  StoryMemoryCountsSchema,
  StoryMemoryResponseSchema,
} from "@emptyinkpot/database-creative-contracts";
import {
  SemanticRelationSchema,
  SemanticRelationsResponseSchema,
  SemanticTagSchema,
  SemanticTagsResponseSchema,
  RecordSemanticReferenceMaterialMutationResponseSchema,
  RecordSemanticReferenceMaterialResultSchema,
  RecordStyleRevisionPairMutationResponseSchema,
  RecordStyleRevisionPairResultSchema,
  SemanticReferenceMaterialKindSchema,
  StylePackSchema,
  StylePackProfileSchema,
  StyleRevisionPairSchema,
  SemanticUnitSchema,
  SemanticUnitsResponseSchema,
} from "@emptyinkpot/database-semantic-contracts";

const OPENAPI_PATH = new URL("../openapi.yaml", import.meta.url);

const RequestIdSchema = z.string();

const HealthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.literal("database-gateway"),
  checks: z.object({
    mysql: z.string(),
  }),
  optionalDownstreams: z.object({
    nocodb: z.string(),
    openlist: z.string(),
    ragflow: z.string(),
  }),
  requestId: RequestIdSchema,
});

const DependencyHealthResponseSchema = z.object({
  ok: z.boolean(),
  mysql: z.enum(["ok", "error"]),
  mysqlLatencyMs: z.number().nullable(),
  schemaParseOk: z.boolean(),
  optionalDownstreams: z.object({
    nocodb: z.string(),
    openlist: z.string(),
    ragflow: z.string(),
  }),
  schemaVersion: z.string(),
  requestId: RequestIdSchema,
});

const RagflowHealthResponseSchema = z.object({
  ok: z.boolean(),
  status: z.enum([
    "not_configured",
    "misconfigured",
    "http_error",
    "dataset_error",
    "dataset_missing",
    "embedding_missing",
    "document_failed",
    "retrieval_empty",
    "retrieval_without_text",
    "ok",
  ]),
  provider: z.literal("ragflow.retrieval"),
  message: z.string(),
  baseUrl: z.string().nullable(),
  datasetCount: z.number(),
  documentFilterCount: z.number(),
  visibleDatasetCount: z.number().optional(),
  missingDatasetIds: z.array(z.string()).optional(),
  datasetsWithoutEmbedding: z.array(z.string()).optional(),
  failedDocuments: z.array(z.object({
    datasetId: z.string(),
    documentId: z.string(),
    documentName: z.string(),
    progressMessage: z.string(),
  })).optional(),
  query: z.string().optional(),
  chunkCount: z.number().optional(),
  sample: z.array(z.object({
    id: z.string(),
    datasetId: z.string(),
    documentId: z.string(),
    documentName: z.string(),
    score: z.number().nullable(),
    textLength: z.number(),
  })).optional(),
  retrievalChecked: z.boolean(),
  requestId: RequestIdSchema,
});

const OpenListHealthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.literal("openlist"),
  requestId: RequestIdSchema,
});

const OpenListStorageSchema = z.object({
  id: z.number(),
  mount_path: z.string(),
  order: z.number().optional(),
  driver: z.string().optional(),
  cache_expiration: z.number().optional(),
  status: z.string().optional(),
  addition: z.string().optional(),
  remark: z.string().optional(),
  disabled: z.boolean().optional(),
}).passthrough();

const OpenListFileObjectSchema = z.object({
  name: z.string(),
  size: z.number(),
  is_dir: z.boolean(),
  modified: z.string(),
  created: z.string(),
  sign: z.string().optional(),
  thumb: z.string().optional(),
  type: z.number().optional(),
  hashinfo: z.string().optional(),
  hash_info: z.record(z.string(), z.string()).optional(),
}).passthrough();

const OpenListStoragesResponseSchema = z.object({
  count: z.number(),
  storages: z.array(OpenListStorageSchema),
  requestId: RequestIdSchema,
});

const OpenListStorageResponseSchema = z.object({
  storage: OpenListStorageSchema,
  requestId: RequestIdSchema,
});

const OpenListFsListResponseSchema = z.object({
  content: z.array(OpenListFileObjectSchema),
  total: z.number(),
  readme: z.string().optional(),
  header: z.string().optional(),
  write: z.boolean().optional(),
  write_content_bypass: z.boolean().optional(),
  provider: z.string().optional(),
  direct_upload_tools: z.array(z.string()).optional(),
  requestId: RequestIdSchema,
});

const OpenListFsGetResponseSchema = z.object({
  item: OpenListFileObjectSchema,
  requestId: RequestIdSchema,
});

const OpenListMountSchema = z.object({
  id: z.string(),
  mountPath: z.string(),
  driver: z.string().nullable(),
  remark: z.string().nullable(),
  openlistStatus: z.string().nullable(),
  disabled: z.boolean(),
  source: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  lastSyncedAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const OpenListTargetSchema = z.object({
  id: z.string(),
  provider: z.string(),
  purpose: z.string(),
  displayName: z.string(),
  mountPath: z.string(),
  remoteDir: z.string(),
  localCachePath: z.string().nullable(),
  status: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const OpenListMountsResponseSchema = z.object({
  count: z.number(),
  mounts: z.array(OpenListMountSchema),
  requestId: RequestIdSchema,
});

const OpenListTargetsResponseSchema = z.object({
  count: z.number(),
  targets: z.array(OpenListTargetSchema),
  requestId: RequestIdSchema,
});

const OpenListTargetResponseSchema = z.object({
  target: OpenListTargetSchema,
  requestId: RequestIdSchema,
});

const OpenListTargetFsListResponseSchema = OpenListFsListResponseSchema.extend({
  target: OpenListTargetSchema,
});

const OpenListTargetFsGetResponseSchema = OpenListFsGetResponseSchema.extend({
  target: OpenListTargetSchema,
});

const MyBlogReaderMemorySchema = z.object({
  id: z.string(),
  objectId: z.string(),
  objectType: z.string(),
  title: z.string(),
  href: z.string(),
  progress: z.number(),
  location: z.unknown(),
  scrollTop: z.number(),
  timestamp: z.number(),
  lastReadAt: z.number(),
  updatedAt: z.number(),
});

const MyBlogReaderMemoryResponseSchema = z.object({
  ok: z.boolean(),
  item: MyBlogReaderMemorySchema.nullable(),
  requestId: RequestIdSchema,
});

const MyBlogReaderMemoryListResponseSchema = z.object({
  ok: z.boolean(),
  items: z.array(MyBlogReaderMemorySchema),
  requestId: RequestIdSchema,
});

const MyBlogReaderMemoryQueryResponseSchema = z.object({
  ok: z.boolean(),
  item: MyBlogReaderMemorySchema.nullable().optional(),
  items: z.array(MyBlogReaderMemorySchema).optional(),
  requestId: RequestIdSchema,
});

const MyBlogReaderMemoryUpsertRequestSchema = z.object({
  id: z.string().optional(),
  objectId: z.string().optional(),
  objectType: z.string().optional(),
  type: z.string().optional(),
  title: z.string().optional(),
  href: z.string().optional(),
  progress: z.number().optional(),
  percent: z.number().optional(),
  location: z.unknown().optional(),
  scrollTop: z.number().optional(),
  lastReadAt: z.number().optional(),
  updatedAt: z.number().optional(),
}).passthrough();

const MyBlogReaderHighlightSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  objectId: z.string(),
  objectType: z.string(),
  title: z.string(),
  text: z.string(),
  color: z.string(),
  note: z.string(),
  anchor: z.unknown(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const MyBlogReaderHighlightsResponseSchema = z.object({
  ok: z.boolean(),
  items: z.array(MyBlogReaderHighlightSchema),
  requestId: RequestIdSchema,
});

const MyBlogReaderHighlightResponseSchema = z.object({
  ok: z.boolean(),
  item: MyBlogReaderHighlightSchema,
  requestId: RequestIdSchema,
});

const MyBlogReaderHighlightUpsertRequestSchema = z.object({
  id: z.string(),
  articleId: z.string().optional(),
  objectId: z.string().optional(),
  objectType: z.string().optional(),
  type: z.string().optional(),
  title: z.string().optional(),
  text: z.string(),
  color: z.string().optional(),
  note: z.string().nullable().optional(),
  anchor: z.unknown().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
}).passthrough();

const MyBlogVisualSourceSchema = z.object({
  id: z.string(),
  sourceType: z.string(),
  provider: z.string(),
  sourceUrl: z.string(),
  boardId: z.string(),
  providerConfig: z.record(z.string(), z.unknown()),
  title: z.string(),
  collectionTitle: z.string(),
  partitionPattern: z.unknown(),
  syncIntervalSeconds: z.number(),
  lastCursor: z.string(),
  lastSyncedAt: z.number().nullable(),
  syncStatus: z.string(),
  pinsSnapshotHash: z.string(),
  lastError: z.string(),
  pinCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const MyBlogVisualPinSchema = z.object({
  id: z.string(),
  pinId: z.string(),
  sourceId: z.string(),
  pinUrl: z.string(),
  imagePreviewUrl: z.string(),
  title: z.string(),
  description: z.string(),
  boardId: z.string(),
  positionIndex: z.number(),
  downloaded: z.boolean(),
  raw: z.unknown(),
  firstSeenAt: z.number(),
  lastSeenAt: z.number(),
  deletedAt: z.number().nullable(),
});

const MyBlogVisualSnapshotResponseSchema = z.object({
  ok: z.boolean(),
  version: z.number(),
  mode: z.string(),
  downloaded: z.boolean(),
  generatedAt: z.string(),
  sources: z.array(MyBlogVisualSourceSchema),
  pinsBySource: z.record(z.string(), z.array(MyBlogVisualPinSchema)),
  requestId: RequestIdSchema,
});

const MyBlogVisualSyncResultRequestSchema = z.object({
  sourceId: z.string().optional(),
  provider: z.string().optional(),
  ok: z.boolean().optional(),
  runId: z.string().optional(),
  snapshotHash: z.string().optional(),
  error: z.string().nullable().optional(),
  pins: z.array(z.object({
    id: z.string().optional(),
    pinId: z.string().optional(),
    pinUrl: z.string().optional(),
    imagePreviewUrl: z.string().optional(),
    image: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    boardId: z.string().optional(),
    positionIndex: z.number().optional(),
    raw: z.unknown().optional(),
  }).passthrough()).optional(),
}).passthrough();

const MyBlogVisualSyncResultResponseSchema = z.object({
  ok: z.boolean(),
  sourceId: z.string(),
  syncedItems: z.number(),
  snapshotHash: z.string(),
  requestId: RequestIdSchema,
});

const CanonicalWorksResponseSchema = z.object({
  count: z.number(),
  works: z.array(ContentWorkSchema),
  requestId: RequestIdSchema,
});

const CanonicalPartsResponseSchema = z.object({
  workId: z.string(),
  count: z.number(),
  parts: z.array(ContentPartSchema),
  requestId: RequestIdSchema,
});

const CanonicalBlocksResponseSchema = z.object({
  partId: z.string(),
  count: z.number(),
  blocks: z.array(ContentBlockSchema),
  requestId: RequestIdSchema,
});

const CanonicalAssetsResponseSchema = z.object({
  count: z.number(),
  assets: z.array(ContentAssetSchema),
  requestId: RequestIdSchema,
});

const PublicationTargetsResponseSchema = z.object({
  count: z.number(),
  publicationTargets: z.array(PublicationTargetSchema),
  requestId: RequestIdSchema,
});

const CreativeStyleContractResponseSchema = CreativeStyleContractSchema.extend({
  counts: z.object({
    modules: z.number(),
    editingSteps: z.number(),
    qualityRules: z.number(),
    sourceMaterials: z.number(),
    techniques: z.number(),
    authorTechniques: z.number(),
    preferredTerms: z.number(),
    bannedTerms: z.number(),
  }),
  requestId: RequestIdSchema,
});

const GENERATED_SCHEMAS = {
  ContentWork: ContentWorkSchema,
  ContentPart: ContentPartSchema,
  ContentBlock: ContentBlockSchema,
  ContentSourceSummary: ContentSourceSummarySchema,
  ContentSourcesResponse: ContentSourcesResponseSchema,
  EvidencePack: EvidencePackSchema,
  EvidenceSource: EvidenceSourceSchema,
  EvidenceChunk: EvidenceChunkSchema,
  EvidenceCitation: EvidenceCitationSchema,
  EvidenceFactAtom: EvidenceFactAtomSchema,
  EvidenceFactAtomPack: EvidenceFactAtomPackSchema,
  ContentAsset: ContentAssetSchema,
  PublicationTarget: PublicationTargetSchema,
  HealthResponse: HealthResponseSchema,
  DependencyHealthResponse: DependencyHealthResponseSchema,
  RagflowHealthResponse: RagflowHealthResponseSchema,
  OpenListHealthResponse: OpenListHealthResponseSchema,
  OpenListStorage: OpenListStorageSchema,
  OpenListFileObject: OpenListFileObjectSchema,
  OpenListStoragesResponse: OpenListStoragesResponseSchema,
  OpenListStorageResponse: OpenListStorageResponseSchema,
  OpenListFsListResponse: OpenListFsListResponseSchema,
  OpenListFsGetResponse: OpenListFsGetResponseSchema,
  OpenListMount: OpenListMountSchema,
  OpenListTarget: OpenListTargetSchema,
  OpenListMountsResponse: OpenListMountsResponseSchema,
  OpenListTargetsResponse: OpenListTargetsResponseSchema,
  OpenListTargetResponse: OpenListTargetResponseSchema,
  OpenListTargetFsListResponse: OpenListTargetFsListResponseSchema,
  OpenListTargetFsGetResponse: OpenListTargetFsGetResponseSchema,
  MyBlogReaderMemory: MyBlogReaderMemorySchema,
  MyBlogReaderMemoryResponse: MyBlogReaderMemoryResponseSchema,
  MyBlogReaderMemoryListResponse: MyBlogReaderMemoryListResponseSchema,
  MyBlogReaderMemoryQueryResponse: MyBlogReaderMemoryQueryResponseSchema,
  MyBlogReaderMemoryUpsertRequest: MyBlogReaderMemoryUpsertRequestSchema,
  MyBlogReaderHighlight: MyBlogReaderHighlightSchema,
  MyBlogReaderHighlightsResponse: MyBlogReaderHighlightsResponseSchema,
  MyBlogReaderHighlightResponse: MyBlogReaderHighlightResponseSchema,
  MyBlogReaderHighlightUpsertRequest: MyBlogReaderHighlightUpsertRequestSchema,
  MyBlogVisualSource: MyBlogVisualSourceSchema,
  MyBlogVisualPin: MyBlogVisualPinSchema,
  MyBlogVisualSnapshotResponse: MyBlogVisualSnapshotResponseSchema,
  MyBlogVisualSyncResultRequest: MyBlogVisualSyncResultRequestSchema,
  MyBlogVisualSyncResultResponse: MyBlogVisualSyncResultResponseSchema,
  RecordAuditResultResult: RecordAuditResultResultSchema,
  RecordChapterTransitionResult: RecordChapterTransitionResultSchema,
  RecordGenerationOutputResult: RecordGenerationOutputResultSchema,
  RecordPublicationResultPayload: RecordPublicationResultPayloadSchema,
  RecordPublicationResultResult: RecordPublicationResultResultSchema,
  ReplaceWorkStructureResult: ReplaceWorkStructureResultSchema,
  StoryEvent: StoryEventSchema,
  CharacterGrowth: CharacterGrowthSchema,
  ImportantItem: ImportantItemSchema,
  StoryMemoryCounts: StoryMemoryCountsSchema,
  RecordArticleAcceptanceReportResult: RecordArticleAcceptanceReportResultSchema,
  ArticleReferenceUsageReport: ArticleReferenceUsageReportSchema,
  RecordArticleReferenceUsageReportPayload: RecordArticleReferenceUsageReportPayloadSchema,
  RecordArticleReferenceUsageReportResult: RecordArticleReferenceUsageReportResultSchema,
  RecordAuthorLexiconReviewPayload: RecordAuthorLexiconReviewPayloadSchema,
  RecordSemanticReferenceMaterialResult: RecordSemanticReferenceMaterialResultSchema,
  RecordStyleRevisionPairResult: RecordStyleRevisionPairResultSchema,
  RecordStoryMemoryResult: RecordStoryMemoryResultSchema,
  SemanticUnit: SemanticUnitSchema,
  SemanticTag: SemanticTagSchema,
  SemanticRelation: SemanticRelationSchema,
  StylePack: StylePackSchema,
  StylePackProfile: StylePackProfileSchema,
  StyleRevisionPair: StyleRevisionPairSchema,
  CanonicalWorksResponse: CanonicalWorksResponseSchema,
  CanonicalPartsResponse: CanonicalPartsResponseSchema,
  CanonicalBlocksResponse: CanonicalBlocksResponseSchema,
  CanonicalAssetsResponse: CanonicalAssetsResponseSchema,
  PublicationTargetsResponse: PublicationTargetsResponseSchema,
  RecordAuditResultMutationResponse: RecordAuditResultMutationResponseSchema,
  RecordChapterTransitionMutationResponse: RecordChapterTransitionMutationResponseSchema,
  RecordGenerationOutputMutationResponse: RecordGenerationOutputMutationResponseSchema,
  RecordPublicationResultMutationResponse: RecordPublicationResultMutationResponseSchema,
  ReplaceWorkStructureMutationResponse: ReplaceWorkStructureMutationResponseSchema,
  RecordArticleAcceptanceReportMutationResponse: RecordArticleAcceptanceReportMutationResponseSchema,
  RecordArticleReferenceUsageReportMutationResponse: RecordArticleReferenceUsageReportMutationResponseSchema,
  RecordSemanticReferenceMaterialMutationResponse: RecordSemanticReferenceMaterialMutationResponseSchema,
  RecordStyleRevisionPairMutationResponse: RecordStyleRevisionPairMutationResponseSchema,
  RecordAuthorLexiconReviewMutationResponse: RecordAuthorLexiconReviewMutationResponseSchema,
  CreativeStyleContractResponse: CreativeStyleContractResponseSchema,
  ResolvedCreativeContext: ResolvedCreativeContextSchema,
  StoryMemoryResponse: StoryMemoryResponseSchema,
  StoryMemoryContextResponse: StoryMemoryContextResponseSchema,
  RecordStoryMemoryMutationResponse: RecordStoryMemoryMutationResponseSchema,
  SemanticUnitsResponse: SemanticUnitsResponseSchema,
  SemanticTagsResponse: SemanticTagsResponseSchema,
  SemanticRelationsResponse: SemanticRelationsResponseSchema,
};

const RETIRED_GENERATED_SCHEMAS = [
  "CreativeContextResponse",
  "CreativeContextResponseAuthorProfile",
  "CreativeContextResponseSemanticContext",
  "CreativeContextResponseSnapshot",
];

const RESPONSE_SCHEMA_BY_PATH = {
  "/content/canonical/works": "CanonicalWorksResponse",
  "/content/canonical/works/{id}/parts": "CanonicalPartsResponse",
  "/content/canonical/parts/{id}/blocks": "CanonicalBlocksResponse",
  "/content/sources": "ContentSourcesResponse",
  "/content/canonical/parts/{id}/evidence-fact-atoms": "EvidenceFactAtomPack",
  "/evidence/search": "EvidencePack",
  "/style/pack": "StylePack",
  "/content/canonical/assets": "CanonicalAssetsResponse",
  "/content/canonical/publication-targets": "PublicationTargetsResponse",
  "/creative/style-contract": "CreativeStyleContractResponse",
  "/creative/context": "ResolvedCreativeContext",
  "/creative/story-memory": "StoryMemoryResponse",
  "/creative/story-memory/context": "StoryMemoryContextResponse",
  "/semantic/units": "SemanticUnitsResponse",
  "/semantic/tags": "SemanticTagsResponse",
  "/semantic/relations": "SemanticRelationsResponse",
};

const POST_RESPONSE_SCHEMA_BY_PATH = {
  "/writes/record-audit-result": "RecordAuditResultMutationResponse",
  "/writes/record-chapter-transition": "RecordChapterTransitionMutationResponse",
  "/writes/record-generation-output": "RecordGenerationOutputMutationResponse",
  "/writes/publication/record-result": "RecordPublicationResultMutationResponse",
  "/writes/record-article-acceptance-report": "RecordArticleAcceptanceReportMutationResponse",
  "/writes/record-article-reference-usage-report": "RecordArticleReferenceUsageReportMutationResponse",
  "/writes/record-author-lexicon-review": "RecordAuthorLexiconReviewMutationResponse",
  "/writes/record-semantic-reference-material": "RecordSemanticReferenceMaterialMutationResponse",
  "/writes/record-style-revision-pair": "RecordStyleRevisionPairMutationResponse",
  "/writes/record-story-memory": "RecordStoryMemoryMutationResponse",
  "/writes/replace-work-structure": "ReplaceWorkStructureMutationResponse",
  "/writes/upsert-work": "GatewayMutationResponse",
};

function cleanJsonSchema(schema) {
  if (Array.isArray(schema)) return schema.map(cleanJsonSchema);
  if (!schema || typeof schema !== "object") return schema;

  const next = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "$schema") continue;
    next[key] = cleanJsonSchema(value);
  }
  return next;
}

function responseRef(schemaName) {
  return {
    $ref: `#/components/schemas/${schemaName}`,
  };
}

function errorRef() {
  return responseRef("ErrorResponse");
}

function gatewayWriteEnvelopeRef() {
  return responseRef("GatewayWriteEnvelope");
}

function gatewayWriteEnvelopeWithPayloadRef(schemaName) {
  return {
    allOf: [
      gatewayWriteEnvelopeRef(),
      {
        type: "object",
        required: ["payload"],
        properties: {
          payload: responseRef(schemaName),
        },
      },
    ],
  };
}

function ensureGetPath(document, path, operation) {
  document.paths ??= {};
  document.paths[path] ??= {};
  document.paths[path].get = operation;
}

function ensurePostPath(document, path, operation) {
  document.paths ??= {};
  document.paths[path] ??= {};
  document.paths[path].post = operation;
}

const source = await readFile(OPENAPI_PATH, "utf8");
const document = YAML.parse(source);

document.components ??= {};
document.components.schemas ??= {};

for (const name of RETIRED_GENERATED_SCHEMAS) {
  delete document.components.schemas[name];
}

for (const [name, schema] of Object.entries(GENERATED_SCHEMAS)) {
  document.components.schemas[name] = cleanJsonSchema(toJSONSchema(schema));
}

document.components.schemas.CanonicalWorksResponse.properties.works.items =
  responseRef("ContentWork");
document.components.schemas.CanonicalPartsResponse.properties.parts.items =
  responseRef("ContentPart");
document.components.schemas.CanonicalBlocksResponse.properties.blocks.items =
  responseRef("ContentBlock");
document.components.schemas.ContentSourcesResponse.properties.sources.items =
  responseRef("ContentSourceSummary");
document.components.schemas.CanonicalAssetsResponse.properties.assets.items =
  responseRef("ContentAsset");
document.components.schemas.PublicationTargetsResponse.properties.publicationTargets.items =
  responseRef("PublicationTarget");
document.components.schemas.OpenListMountsResponse.properties.mounts.items =
  responseRef("OpenListMount");
document.components.schemas.OpenListTargetsResponse.properties.targets.items =
  responseRef("OpenListTarget");
document.components.schemas.OpenListTargetResponse.properties.target =
  responseRef("OpenListTarget");
document.components.schemas.OpenListTargetFsListResponse.properties.target =
  responseRef("OpenListTarget");
document.components.schemas.OpenListTargetFsListResponse.properties.content.items =
  responseRef("OpenListFileObject");
document.components.schemas.OpenListTargetFsGetResponse.properties.target =
  responseRef("OpenListTarget");
document.components.schemas.OpenListTargetFsGetResponse.properties.item =
  responseRef("OpenListFileObject");
document.components.schemas.MyBlogReaderMemoryListResponse.properties.items.items =
  responseRef("MyBlogReaderMemory");
document.components.schemas.MyBlogReaderMemoryResponse.properties.item.anyOf = [
  responseRef("MyBlogReaderMemory"),
  { type: "null" },
];
document.components.schemas.MyBlogReaderMemoryQueryResponse.properties.item.anyOf = [
  responseRef("MyBlogReaderMemory"),
  { type: "null" },
];
document.components.schemas.MyBlogReaderMemoryQueryResponse.properties.items.items =
  responseRef("MyBlogReaderMemory");
document.components.schemas.MyBlogReaderHighlightsResponse.properties.items.items =
  responseRef("MyBlogReaderHighlight");
document.components.schemas.MyBlogReaderHighlightResponse.properties.item =
  responseRef("MyBlogReaderHighlight");
document.components.schemas.MyBlogVisualSnapshotResponse.properties.sources.items =
  responseRef("MyBlogVisualSource");
document.components.schemas.MyBlogVisualSnapshotResponse.properties.pinsBySource.additionalProperties = {
  type: "array",
  items: responseRef("MyBlogVisualPin"),
};
document.components.schemas.SemanticUnitsResponse.properties.units.items =
  responseRef("SemanticUnit");
document.components.schemas.SemanticUnit.properties.materialKind = {
  oneOf: [
    cleanJsonSchema(toJSONSchema(SemanticReferenceMaterialKindSchema)),
    { type: "null" }
  ],
};
document.components.schemas.SemanticUnitsResponse.properties.filters.properties.materialKind =
  { type: "string", enum: ["", "document", "theory", "comparison", "observer", "literary"] };
document.components.schemas.SemanticTagsResponse.properties.tags.items =
  responseRef("SemanticTag");
document.components.schemas.SemanticRelationsResponse.properties.relations.items =
  responseRef("SemanticRelation");
document.components.schemas.ResolvedCreativeContext.properties.semanticState.properties.units.items =
  responseRef("SemanticUnit");
document.components.schemas.ResolvedCreativeContext.properties.semanticContext.properties.units.items =
  responseRef("SemanticUnit");
document.components.schemas.StoryMemoryResponse.properties.events.items =
  responseRef("StoryEvent");
document.components.schemas.StoryMemoryResponse.properties.characterGrowth.items =
  responseRef("CharacterGrowth");
document.components.schemas.StoryMemoryResponse.properties.importantItems.items =
  responseRef("ImportantItem");
document.components.schemas.StoryMemoryResponse.properties.counts =
  responseRef("StoryMemoryCounts");
document.components.schemas.StoryMemoryContextResponse.properties.counts =
  responseRef("StoryMemoryCounts");
document.components.schemas.RecordStoryMemoryMutationResponse.properties.item =
  responseRef("RecordStoryMemoryResult");
document.components.schemas.RecordAuditResultMutationResponse.properties.item =
  responseRef("RecordAuditResultResult");
document.components.schemas.RecordGenerationOutputMutationResponse.properties.item =
  responseRef("RecordGenerationOutputResult");
document.components.schemas.RecordPublicationResultMutationResponse.properties.item =
  responseRef("RecordPublicationResultResult");
document.components.schemas.RecordArticleAcceptanceReportMutationResponse.properties.item =
  responseRef("RecordArticleAcceptanceReportResult");
document.components.schemas.RecordArticleReferenceUsageReportMutationResponse.properties.item =
  responseRef("RecordArticleReferenceUsageReportResult");
document.components.schemas.RecordArticleReferenceUsageReportPayload.properties.report =
  responseRef("ArticleReferenceUsageReport");
document.components.schemas.RecordChapterTransitionMutationResponse.properties.item =
  responseRef("RecordChapterTransitionResult");
document.components.schemas.ReplaceWorkStructureMutationResponse.properties.item =
  responseRef("ReplaceWorkStructureResult");

ensureGetPath(document, "/health", {
  operationId: "getHealth",
  security: [],
  summary: "Core Gateway health",
  description: "Returns core Gateway readiness. Optional downstreams such as NocoDB and OpenList are reported as evidence but do not make this route fail.",
  responses: {
    "200": {
      description: "Gateway core dependencies are healthy.",
      content: { "application/json": { schema: responseRef("HealthResponse") } },
    },
    "503": {
      description: "Required core dependency failure.",
      content: { "application/json": { schema: responseRef("HealthResponse") } },
    },
  },
});

ensureGetPath(document, "/health/dependencies", {
  operationId: "getDependencyHealth",
  security: [],
  summary: "Required and optional dependency health",
  description: "Returns required MySQL/schema health plus optional downstream statuses. Only required dependency failures make this route return non-200.",
  responses: {
    "200": {
      description: "Required dependencies are healthy.",
      content: { "application/json": { schema: responseRef("DependencyHealthResponse") } },
    },
    "503": {
      description: "Required dependency failure.",
      content: { "application/json": { schema: responseRef("DependencyHealthResponse") } },
    },
  },
});

ensureGetPath(document, "/health/ragflow", {
  operationId: "getRagflowHealth",
  security: [],
  summary: "RAGFlow EvidenceProvider readiness",
  description: "Returns DataBase Gateway's RAGFlow EvidenceProvider readiness. By default it checks configuration, HTTP health, dataset visibility, and embedding configuration. Set retrieval=true to also require real text-bearing chunks from /api/v1/retrieval.",
  parameters: [
    {
      name: "retrieval",
      in: "query",
      schema: { type: "boolean", default: false },
    },
    {
      name: "q",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 10, maximum: 50 },
    },
  ],
  responses: {
    "200": {
      description: "RAGFlow EvidenceProvider readiness check passed.",
      content: { "application/json": { schema: responseRef("RagflowHealthResponse") } },
    },
    "503": {
      description: "RAGFlow EvidenceProvider is not ready.",
      content: { "application/json": { schema: responseRef("RagflowHealthResponse") } },
    },
  },
});

ensureGetPath(document, "/evidence/search", {
  operationId: "searchEvidencePack",
  summary: "Search DataBase evidence as a writing-ready EvidencePack",
  description: "Wraps the canonical search_documents/search_chunks projection as EvidenceSource, EvidenceChunk, and EvidenceCitation records. This is the NotebookLM-style private evidence boundary for ContentBase; OpenList remains file access projection, not semantic truth.",
  parameters: [
    {
      name: "q",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "topic",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "target",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "semanticTags",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "sourceIds",
      in: "query",
      description: "Comma/space separated DataBase source ids. Use this to constrain EvidencePack retrieval to a specific imported corpus, for example book_xingwang_world_history_21.",
      schema: { type: "string" },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 10, maximum: 50 },
    },
    {
      name: "rounds",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 4, maximum: 12 },
    },
    {
      name: "includeWeb",
      in: "query",
      schema: { type: "boolean", default: false },
    },
    {
      name: "includeRagflow",
      in: "query",
      schema: { type: "boolean", default: false },
    },
  ],
  responses: {
    "200": {
      description: "DataBase-owned EvidencePack assembled from indexed chunks.",
      content: { "application/json": { schema: responseRef("EvidencePack") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/style/pack", {
  operationId: "getStylePack",
  summary: "Read DataBase style and syntax reference as StylePack",
  description: "Returns DataBase-owned derived style profiles for syntax, rhetoric, imagery, paragraph movement, and copyright boundaries. This is not factual evidence and does not expose reusable copyrighted sentences.",
  parameters: [
    {
      name: "q",
      in: "query",
      required: true,
      description: "Style query such as 句法 修辞 意象.",
      schema: { type: "string" },
    },
    {
      name: "sourceIds",
      in: "query",
      description: "Comma/space separated DataBase source ids. Use this to constrain StylePack retrieval to a specific style source, for example book_kinkakuji_restricted_style.",
      schema: { type: "string" },
    },
    {
      name: "limit",
      in: "query",
      description: "Maximum style profiles to return.",
      schema: { type: "integer", minimum: 1, maximum: 20, default: 6 },
    },
  ],
  responses: {
    "200": {
      description: "DataBase-owned StylePack assembled from restricted style reference projections.",
      content: { "application/json": { schema: responseRef("StylePack") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/openlist/health", {
  operationId: "getOpenListHealth",
  summary: "OpenList runtime health through the Gateway adapter",
  responses: {
    "200": {
      description: "OpenList ping succeeded.",
      content: { "application/json": { schema: responseRef("OpenListHealthResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
    "503": {
      description: "OpenList client is not configured.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensureGetPath(document, "/openlist/storages", {
  operationId: "listOpenListStorages",
  summary: "List OpenList storage mounts",
  parameters: [
    {
      name: "page",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
      name: "per_page",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 1000, default: 200 },
    },
  ],
  responses: {
    "200": {
      description: "OpenList storage mounts.",
      content: { "application/json": { schema: responseRef("OpenListStoragesResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
    "503": {
      description: "OpenList client is not configured.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensureGetPath(document, "/openlist/storages/{id}", {
  operationId: "getOpenListStorage",
  summary: "Get one OpenList storage mount",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "integer", minimum: 1 },
    },
  ],
  responses: {
    "200": {
      description: "One OpenList storage mount.",
      content: { "application/json": { schema: responseRef("OpenListStorageResponse") } },
    },
    "400": { description: "Invalid storage id." },
    "401": { description: "Missing or invalid API key." },
    "503": {
      description: "OpenList client is not configured.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/openlist/fs/list", {
  operationId: "listOpenListFiles",
  summary: "List files through OpenList",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["path"],
          properties: {
            path: { type: "string" },
            password: { type: "string" },
            page: { type: "integer", minimum: 1 },
            per_page: { type: "integer", minimum: 1, maximum: 1000 },
            refresh: { type: "boolean" },
            subPath: { type: "string" },
          },
        },
      },
    },
  },
  responses: {
    "200": {
      description: "File list from OpenList.",
      content: { "application/json": { schema: responseRef("OpenListFsListResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
    "503": {
      description: "OpenList client is not configured.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/openlist/fs/get", {
  operationId: "getOpenListFile",
  summary: "Get one file object through OpenList",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["path"],
          properties: {
            path: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
  },
  responses: {
    "200": {
      description: "One file object from OpenList.",
      content: { "application/json": { schema: responseRef("OpenListFsGetResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
    "503": {
      description: "OpenList client is not configured.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensureGetPath(document, "/openlist/mounts", {
  operationId: "listOpenListMounts",
  summary: "List DataBase-owned OpenList mount topology",
  description: "Reads mount topology from DataBase. OpenList is the access projection; the mounted backend is the file truth.",
  parameters: [
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 500, default: 100 },
    },
  ],
  responses: {
    "200": {
      description: "DataBase-owned OpenList mount records.",
      content: { "application/json": { schema: responseRef("OpenListMountsResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/openlist/targets", {
  operationId: "listOpenListTargets",
  summary: "List DataBase-owned OpenList file targets",
  description: "Returns canonical target ids so callers do not hard-code OpenList remote paths.",
  parameters: [
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, maximum: 500, default: 100 },
    },
    {
      name: "status",
      in: "query",
      schema: { type: "string", default: "active" },
    },
    {
      name: "purpose",
      in: "query",
      schema: { type: "string" },
    },
  ],
  responses: {
    "200": {
      description: "DataBase-owned OpenList targets.",
      content: { "application/json": { schema: responseRef("OpenListTargetsResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/openlist/targets/{id}", {
  operationId: "getOpenListTarget",
  summary: "Get one DataBase-owned OpenList file target",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    "200": {
      description: "One DataBase-owned OpenList target.",
      content: { "application/json": { schema: responseRef("OpenListTargetResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
    "404": { description: "OpenList target not found." },
  },
});

ensurePostPath(document, "/openlist/targets/{id}/list", {
  operationId: "listOpenListTargetFiles",
  summary: "List files for a DataBase-owned OpenList target",
  description: "Resolves target id from MySQL, then calls OpenList with the registered remoteDir.",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            password: { type: "string" },
            page: { type: "integer", minimum: 1 },
            per_page: { type: "integer", minimum: 1, maximum: 1000 },
            refresh: { type: "boolean" },
            subPath: { type: "string" },
          },
        },
      },
    },
  },
  responses: {
    "200": {
      description: "File list for the registered target.",
      content: { "application/json": { schema: responseRef("OpenListTargetFsListResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
    "404": { description: "OpenList target not found." },
    "503": {
      description: "OpenList client is not configured.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/openlist/targets/{id}/get", {
  operationId: "getOpenListTargetFile",
  summary: "Get one file for a DataBase-owned OpenList target",
  description: "Resolves the registered target id and accepts a stable bookId/object id so callers do not pass raw OpenList paths.",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            bookId: { type: "string" },
            path: { type: "string" },
            password: { type: "string" },
          },
          anyOf: [
            { required: ["bookId"] },
            { required: ["path"] },
          ],
        },
      },
    },
  },
  responses: {
    "200": {
      description: "One file for the registered target.",
      content: { "application/json": { schema: responseRef("OpenListTargetFsGetResponse") } },
    },
    "400": { description: "Invalid target file request." },
    "401": { description: "Missing or invalid API key." },
    "404": { description: "OpenList target or file not found." },
    "503": {
      description: "OpenList client is not configured.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensureGetPath(document, "/myblog/runtime/reader/memory", {
  operationId: "getMyBlogReaderMemory",
  summary: "Read MyBlog reader memory from DataBase",
  description: "Returns either one reader-memory item by objectId or the latest reader-memory list. MyBlog must call this Gateway route instead of connecting to MySQL.",
  parameters: [
    {
      name: "objectId",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 20, maximum: 50 },
    },
  ],
  responses: {
    "200": {
      description: "MyBlog reader memory projection.",
      content: { "application/json": { schema: responseRef("MyBlogReaderMemoryQueryResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensurePostPath(document, "/myblog/runtime/reader/memory", {
  operationId: "upsertMyBlogReaderMemory",
  summary: "Upsert MyBlog reader memory into DataBase",
  description: "Persists MyBlog reader progress through the Gateway-owned MySQL tables.",
  requestBody: {
    required: true,
    content: { "application/json": { schema: responseRef("MyBlogReaderMemoryUpsertRequest") } },
  },
  responses: {
    "200": {
      description: "Upserted reader-memory item.",
      content: { "application/json": { schema: responseRef("MyBlogReaderMemoryResponse") } },
    },
    "400": { description: "Invalid payload.", content: { "application/json": { schema: errorRef() } } },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/myblog/runtime/reader/highlights", {
  operationId: "listMyBlogReaderHighlights",
  summary: "Read MyBlog reader highlights from DataBase",
  description: "Returns reader highlights from DataBase-owned storage. MyBlog must not query reader_highlights directly.",
  parameters: [
    {
      name: "objectId",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "articleId",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 100, maximum: 200 },
    },
  ],
  responses: {
    "200": {
      description: "MyBlog reader highlights.",
      content: { "application/json": { schema: responseRef("MyBlogReaderHighlightsResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensurePostPath(document, "/myblog/runtime/reader/highlights", {
  operationId: "upsertMyBlogReaderHighlight",
  summary: "Upsert a MyBlog reader highlight into DataBase",
  description: "Persists a reader highlight through the Gateway-owned MySQL tables.",
  requestBody: {
    required: true,
    content: { "application/json": { schema: responseRef("MyBlogReaderHighlightUpsertRequest") } },
  },
  responses: {
    "200": {
      description: "Upserted reader highlight.",
      content: { "application/json": { schema: responseRef("MyBlogReaderHighlightResponse") } },
    },
    "400": { description: "Invalid payload.", content: { "application/json": { schema: errorRef() } } },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/myblog/runtime/visuals/snapshot", {
  operationId: "getMyBlogVisualSnapshot",
  summary: "Read MyBlog visual runtime snapshot from DataBase",
  description: "Returns the stored visual-source and pin snapshot from Gateway-owned MySQL tables.",
  responses: {
    "200": {
      description: "MyBlog visual runtime snapshot.",
      content: { "application/json": { schema: responseRef("MyBlogVisualSnapshotResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensurePostPath(document, "/myblog/runtime/visuals/sync-result", {
  operationId: "recordMyBlogVisualSyncResult",
  summary: "Record a MyBlog visual sync result into DataBase",
  description: "MyBlog may execute Pinterest/Apify sync, but the resulting pins and source status are stored by DataBase Gateway.",
  requestBody: {
    required: true,
    content: { "application/json": { schema: responseRef("MyBlogVisualSyncResultRequest") } },
  },
  responses: {
    "200": {
      description: "Stored visual sync result.",
      content: { "application/json": { schema: responseRef("MyBlogVisualSyncResultResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/creative/story-memory", {
  operationId: "getStoryMemory",
  summary: "Canonical story memory for a creative work",
  parameters: [
    {
      name: "workId",
      in: "query",
      required: true,
      schema: { type: "integer", minimum: 1 },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 500, maximum: 1000 },
    },
  ],
  responses: {
    "200": {
      description: "Canonical story events, character growth, and important items for a work.",
      content: { "application/json": { schema: responseRef("StoryMemoryResponse") } },
    },
    "400": { description: "Invalid query." },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/creative/story-memory/context", {
  operationId: "getStoryMemoryContext",
  summary: "Prompt-ready story memory context summary",
  parameters: [
    {
      name: "workId",
      in: "query",
      required: true,
      schema: { type: "integer", minimum: 1 },
    },
    {
      name: "currentChapter",
      in: "query",
      schema: { type: "integer", minimum: 1 },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 500, maximum: 1000 },
    },
  ],
  responses: {
    "200": {
      description: "Prompt-ready context summary assembled from canonical story memory.",
      content: { "application/json": { schema: responseRef("StoryMemoryContextResponse") } },
    },
    "400": { description: "Invalid query." },
    "401": { description: "Missing or invalid API key." },
  },
});

ensurePostPath(document, "/writes/record-story-memory", {
  operationId: "recordStoryMemory",
  summary: "Record canonical story memory through the controlled write facade",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent story memory mutation result.",
      content: { "application/json": { schema: responseRef("RecordStoryMemoryMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/replace-work-structure", {
  operationId: "replaceWorkStructure",
  summary: "Replace imported work structure through the controlled write facade",
  description: "Idempotently replaces a work's imported volume outlines, chapter outlines, characters, world settings, and optional seeded story memory in one transaction.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent work structure replacement result.",
      content: { "application/json": { schema: responseRef("ReplaceWorkStructureMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/upsert-work", {
  operationId: "upsertWork",
  summary: "Create or update a work through the controlled write facade",
  description: "Idempotently creates a canonical work by title or updates mutable work metadata when the title already exists.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent work upsert mutation result.",
      content: { "application/json": { schema: responseRef("GatewayMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/record-generation-output", {
  operationId: "recordGenerationOutput",
  summary: "Record generated or polished chapter output through the controlled write facade",
  description: "Idempotently persists generated chapter body into legacy chapter storage and the canonical content part/block projection. Chapter status transitions remain owned by the ContentBase state machine.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent generation output mutation result.",
      content: { "application/json": { schema: responseRef("RecordGenerationOutputMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/record-audit-result", {
  operationId: "recordAuditResult",
  summary: "Record chapter audit result through the controlled write facade",
  description: "Idempotently persists chapter audit status, audit issues, and suggested action. Chapter lifecycle status transitions remain owned by the ContentBase state machine.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent audit result mutation result.",
      content: { "application/json": { schema: responseRef("RecordAuditResultMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/record-article-acceptance-report", {
  operationId: "recordArticleAcceptanceReport",
  summary: "Record an article acceptance report through the controlled write facade",
  description: "Idempotently persists a DataBase-owned article acceptance report as a canonical content prompt_context block attached to the chapter content part. The report is a runtime evidence artifact, not a replacement for style or policy truth.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent article acceptance report mutation result.",
      content: { "application/json": { schema: responseRef("RecordArticleAcceptanceReportMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/record-article-reference-usage-report", {
  operationId: "recordArticleReferenceUsageReport",
  summary: "Record an article reference usage report through the controlled write facade",
  description: "Idempotently persists DataBase-owned runtime evidence describing which reference, memory, literature, and learning materials were used by article generation. The report is an audit artifact, not a replacement for source material truth.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeWithPayloadRef("RecordArticleReferenceUsageReportPayload") } },
  },
  responses: {
    "200": {
      description: "Idempotent article reference usage report mutation result.",
      content: { "application/json": { schema: responseRef("RecordArticleReferenceUsageReportMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/record-author-lexicon-review", {
  operationId: "recordAuthorLexiconReview",
  summary: "Record an author lexicon review through the controlled write facade",
  description: "Idempotently persists author lexicon review evidence and, when approved, promotes the term into the canonical active vocabulary or banned-word truth. Review evidence remains durable even when no promotion happens.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeWithPayloadRef("RecordAuthorLexiconReviewPayload") } },
  },
  responses: {
    "200": {
      description: "Idempotent author lexicon review mutation result.",
      content: { "application/json": { schema: responseRef("RecordAuthorLexiconReviewMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/record-semantic-reference-material", {
  operationId: "recordSemanticReferenceMaterial",
  summary: "Record reusable semantic reference material through the controlled write facade",
  description: "Idempotently persists a reusable semantic reference material as a semantic_unit with a usable_for material tag. This is the canonical DataBase material pool for theory, document, comparison, observer, and literary reuse.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent semantic reference material mutation result.",
      content: { "application/json": { schema: responseRef("RecordSemanticReferenceMaterialMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/record-style-revision-pair", {
  operationId: "recordStyleRevisionPair",
  summary: "Record ContentBase style revision evidence through the controlled write facade",
  description: "Idempotently persists SyntaxReviewer bad-reason/action/forbidden-move evidence as a DataBase-owned semantic_unit tagged style-revision-pair and syntax-eval-case. The stored sample is for future prompting and evaluation, not deterministic string replacement.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent style revision pair mutation result.",
      content: { "application/json": { schema: responseRef("RecordStyleRevisionPairMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/record-chapter-transition", {
  operationId: "recordChapterTransition",
  summary: "Record a chapter state transition through the controlled write facade",
  description: "Idempotently persists a validated chapter status transition and transition log entry. The caller owns transition legality checks; the Gateway enforces stored fromState match before writing.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeRef() } },
  },
  responses: {
    "200": {
      description: "Idempotent chapter transition mutation result.",
      content: { "application/json": { schema: responseRef("RecordChapterTransitionMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensurePostPath(document, "/writes/publication/record-result", {
  operationId: "recordPublicationResult",
  summary: "Record publication result through the controlled write facade",
  description: "Idempotently writes one publication_records row and updates the canonical chapter publication state for a platform publish or edit result.",
  parameters: [
    {
      name: "X-DataBase-Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: { "application/json": { schema: gatewayWriteEnvelopeWithPayloadRef("RecordPublicationResultPayload") } },
  },
  responses: {
    "200": {
      description: "Idempotent publication result mutation result.",
      content: { "application/json": { schema: responseRef("RecordPublicationResultMutationResponse") } },
    },
    "400": {
      description: "Invalid mutation request.",
      content: { "application/json": { schema: errorRef() } },
    },
    "401": { description: "Missing or invalid API key." },
    "409": {
      description: "Idempotency conflict or in-progress mutation.",
      content: { "application/json": { schema: errorRef() } },
    },
  },
});

ensureGetPath(document, "/content/canonical/parts/{id}/evidence-fact-atoms", {
  operationId: "getCanonicalPartEvidenceFactAtoms",
  summary: "Typed fact atoms derived from canonical evidence citation blocks",
  description: "Returns DataBase-owned typed fact atoms attached to evidence_citation blocks for a canonical content part. This is a read projection over canonical content evidence, not a request-local facts registry.",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 500, maximum: 1000 },
    },
  ],
  responses: {
    "200": {
      description: "Evidence fact atom pack for a canonical content part.",
      content: { "application/json": { schema: responseRef("EvidenceFactAtomPack") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

ensureGetPath(document, "/content/sources", {
  operationId: "listContentSources",
  summary: "Content source catalog",
  description: "Returns a DataBase-owned source catalog projection for browsing and constraining EvidencePack retrieval. Consumers receive stable sourceId values and must not depend on MySQL, OpenList, or Obsidian internals.",
  parameters: [
    {
      name: "search",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "kind",
      in: "query",
      schema: { type: "string" },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 100, maximum: 500 },
    },
  ],
  responses: {
    "200": {
      description: "SDK-facing source catalog.",
      content: { "application/json": { schema: responseRef("ContentSourcesResponse") } },
    },
    "401": { description: "Missing or invalid API key." },
  },
});

for (const [path, schemaName] of Object.entries(RESPONSE_SCHEMA_BY_PATH)) {
  const schema =
    document.paths?.[path]?.get?.responses?.["200"]?.content?.["application/json"]
      ?.schema;
  if (!schema) {
    throw new Error(`Missing OpenAPI 200 application/json schema for ${path}`);
  }
  Object.assign(schema, responseRef(schemaName));
  for (const key of Object.keys(schema)) {
    if (key !== "$ref") delete schema[key];
  }
}

for (const [path, schemaName] of Object.entries(POST_RESPONSE_SCHEMA_BY_PATH)) {
  const schema =
    document.paths?.[path]?.post?.responses?.["200"]?.content?.["application/json"]
      ?.schema;
  if (!schema) {
    throw new Error(`Missing OpenAPI 200 application/json schema for ${path}`);
  }
  Object.assign(schema, responseRef(schemaName));
  for (const key of Object.keys(schema)) {
    if (key !== "$ref") delete schema[key];
  }
}

const output = YAML.stringify(document, {
  indent: 2,
  lineWidth: 0,
  minContentWidth: 0,
});

await writeFile(OPENAPI_PATH, output, "utf8");
console.log("generated gateway/openapi.yaml from DataBase Zod contracts");
