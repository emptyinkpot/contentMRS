"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicProjectionManifestSchema = exports.PublicProjectionPostSchema = exports.ReplaceWorkStructureMutationResponseSchema = exports.ReplaceWorkStructureResultSchema = exports.RecordAuditResultPayloadSchema = exports.RecordAuditResultMutationResponseSchema = exports.RecordAuditResultResultSchema = exports.AuditIssueSchema = exports.SuggestedActionSchema = exports.AuditStatusSchema = exports.RecordPublicationResultMutationResponseSchema = exports.RecordPublicationResultResultSchema = exports.RecordPublicationResultPayloadSchema = exports.PublicationObservedStatusSchema = exports.PublicationResultActionSchema = exports.RecordChapterTransitionPayloadSchema = exports.RecordChapterTransitionMutationResponseSchema = exports.RecordChapterTransitionResultSchema = exports.ChapterTransitionReasonSchema = exports.ChapterStatusSchema = exports.RecordGenerationOutputPayloadSchema = exports.RecordGenerationOutputMutationResponseSchema = exports.RecordGenerationOutputResultSchema = exports.EvidencePackSchema = exports.EvidenceCitationSchema = exports.EvidenceChunkSchema = exports.ContentSourcesResponseSchema = exports.ContentSourceSummarySchema = exports.EvidenceSourceSchema = exports.EvidenceFactAtomPackSchema = exports.EvidenceFactAtomSchema = exports.EvidenceFactAtomTypeSchema = exports.PublicationRecordSchema = exports.PublicationTargetSchema = exports.AuthorLexiconReviewSchema = exports.AuthorInterestClusterSchema = exports.AuthorProfileSchema = exports.ContentAssetSchema = exports.ContentBlockSchema = exports.ContentPartSchema = exports.ContentWorkSchema = exports.AuthorLexiconDecisionSchema = exports.ContentStatusSchema = exports.ContentAssetKindSchema = exports.ContentBlockKindSchema = exports.ContentPartKindSchema = exports.ContentWorkKindSchema = void 0;
exports.parsePublicProjectionPost = parsePublicProjectionPost;
exports.parsePublicProjectionManifest = parsePublicProjectionManifest;
exports.parseContentWork = parseContentWork;
exports.parsePublicationRecord = parsePublicationRecord;
const zod_1 = require("zod");
const UnknownRecordSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
exports.ContentWorkKindSchema = zod_1.z.enum([
    "novel",
    "fiction_series",
    "blog_post",
    "essay",
    "current_affairs_commentary",
    "historical_short_video",
    "business_copywriting",
    "comic_series",
    "comic_one_shot",
    "image_collection",
    "manuscript",
]);
exports.ContentPartKindSchema = zod_1.z.enum([
    "volume",
    "chapter",
    "scene",
    "article_section",
    "script_segment",
    "comic_episode",
    "comic_page_ref",
    "appendix",
]);
exports.ContentBlockKindSchema = zod_1.z.enum([
    "paragraph",
    "heading",
    "quote",
    "image",
    "comic_panel",
    "dialogue",
    "caption",
    "page_break",
    "evidence_citation",
    "semantic_unit_ref",
    "prompt_context",
]);
exports.ContentAssetKindSchema = zod_1.z.enum([
    "cover_image",
    "comic_page",
    "panel_crop",
    "reference_image",
    "audio",
    "video",
    "pdf",
    "markdown_export",
    "epub_export",
]);
exports.ContentStatusSchema = zod_1.z.enum([
    "draft",
    "active",
    "reviewing",
    "ready",
    "published",
    "retired",
]);
exports.AuthorLexiconDecisionSchema = zod_1.z.enum([
    "candidate",
    "approved_preferred",
    "approved_banned",
    "rejected",
]);
exports.ContentWorkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    kind: exports.ContentWorkKindSchema,
    title: zod_1.z.string(),
    subtitle: zod_1.z.string().nullable().optional(),
    status: exports.ContentStatusSchema,
    authorProfileId: zod_1.z.string().nullable().optional(),
    metadata: UnknownRecordSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.ContentPartSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workId: zod_1.z.string(),
    parentPartId: zod_1.z.string().nullable().optional(),
    kind: exports.ContentPartKindSchema,
    partOrder: zod_1.z.number(),
    title: zod_1.z.string().nullable().optional(),
    status: exports.ContentStatusSchema,
    metadata: UnknownRecordSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.ContentBlockSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workId: zod_1.z.string(),
    partId: zod_1.z.string().nullable().optional(),
    assetId: zod_1.z.string().nullable().optional(),
    kind: exports.ContentBlockKindSchema,
    blockOrder: zod_1.z.number(),
    textContent: zod_1.z.string().nullable().optional(),
    payload: UnknownRecordSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.ContentAssetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    kind: exports.ContentAssetKindSchema,
    title: zod_1.z.string().nullable().optional(),
    storageProvider: zod_1.z.string(),
    storageUri: zod_1.z.string(),
    mimeType: zod_1.z.string().nullable().optional(),
    byteSize: zod_1.z.number().nullable().optional(),
    checksumSha256: zod_1.z.string().nullable().optional(),
    metadata: UnknownRecordSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.AuthorProfileSchema = zod_1.z.object({
    id: zod_1.z.string(),
    displayName: zod_1.z.string(),
    stance: zod_1.z.string().nullable().optional(),
    voice: zod_1.z.array(zod_1.z.string()),
    status: zod_1.z.enum(["active", "retired"]),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.AuthorInterestClusterSchema = zod_1.z.object({
    id: zod_1.z.string(),
    authorProfileId: zod_1.z.string(),
    name: zod_1.z.string(),
    terms: zod_1.z.array(zod_1.z.string()),
    appliesTo: zod_1.z.array(exports.ContentWorkKindSchema),
    evidence: UnknownRecordSchema,
    status: zod_1.z.enum(["candidate", "active", "retired"]),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.AuthorLexiconReviewSchema = zod_1.z.object({
    id: zod_1.z.string(),
    authorProfileId: zod_1.z.string(),
    term: zod_1.z.string(),
    decision: exports.AuthorLexiconDecisionSchema,
    sourceKind: zod_1.z.string(),
    sourceRef: zod_1.z.string().nullable().optional(),
    reason: zod_1.z.string(),
    createdAt: zod_1.z.string(),
});
exports.PublicationTargetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    platform: zod_1.z.string(),
    accountIdentity: zod_1.z.string(),
    localWorkId: zod_1.z.string(),
    remoteWorkId: zod_1.z.string().nullable().optional(),
    status: zod_1.z.enum(["active", "paused", "retired"]),
    metadata: UnknownRecordSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.PublicationRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    targetId: zod_1.z.string(),
    contentPartId: zod_1.z.string().nullable().optional(),
    action: zod_1.z.string(),
    remotePartId: zod_1.z.string().nullable().optional(),
    observedStatus: zod_1.z.string(),
    idempotencyKey: zod_1.z.string(),
    result: UnknownRecordSchema,
    createdAt: zod_1.z.string(),
});
exports.EvidenceFactAtomTypeSchema = zod_1.z.enum([
    "person",
    "organization",
    "location",
    "amount",
    "date",
    "artifact",
    "event",
    "relationship",
    "legal_status",
    "theory_claim",
    "source_anchor",
]);
exports.EvidenceFactAtomSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.EvidenceFactAtomTypeSchema,
    value: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    sourceText: zod_1.z.string().optional(),
    citationId: zod_1.z.string().optional(),
    blockId: zod_1.z.string().optional(),
});
exports.EvidenceFactAtomPackSchema = zod_1.z.object({
    workId: zod_1.z.string().optional(),
    partId: zod_1.z.string(),
    atoms: zod_1.z.array(exports.EvidenceFactAtomSchema),
    sourceBlockIds: zod_1.z.array(zod_1.z.string()),
    requestId: zod_1.z.string(),
});
exports.EvidenceSourceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    sourceType: zod_1.z.string(),
    sourceTable: zod_1.z.string().optional(),
    sourceId: zod_1.z.string().optional(),
    source: zod_1.z.string().nullable().optional(),
    externalRefs: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
exports.ContentSourceSummarySchema = zod_1.z.object({
    id: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    title: zod_1.z.string(),
    kind: zod_1.z.string(),
    author: zod_1.z.string().nullable().optional(),
    category: zod_1.z.string().nullable().optional(),
    source: zod_1.z.string().nullable().optional(),
    sourceTable: zod_1.z.string().optional(),
    chunkCount: zod_1.z.number().int().nonnegative(),
    semanticUnitCount: zod_1.z.number().int().nonnegative(),
    preview: zod_1.z.string().nullable().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    createdAt: zod_1.z.string().nullable().optional(),
    updatedAt: zod_1.z.string().nullable().optional(),
});
exports.ContentSourcesResponseSchema = zod_1.z.object({
    version: zod_1.z.literal("content-sources.v1"),
    count: zod_1.z.number().int().nonnegative(),
    sources: zod_1.z.array(exports.ContentSourceSummarySchema),
    requestId: zod_1.z.string(),
});
exports.EvidenceChunkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    chunkIndex: zod_1.z.number(),
    text: zod_1.z.string(),
    privacyLevel: zod_1.z.string(),
    relevanceScore: zod_1.z.number().optional(),
    location: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
exports.EvidenceCitationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    chunkId: zod_1.z.string(),
    title: zod_1.z.string(),
    excerpt: zod_1.z.string(),
    locator: zod_1.z.string().optional(),
    relevanceScore: zod_1.z.number().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
exports.EvidencePackSchema = zod_1.z.object({
    version: zod_1.z.literal("evidence-pack.v1"),
    query: zod_1.z.string(),
    mode: zod_1.z.enum([
        "keyword_projection",
        "multi_query_projection",
        "web_projection",
        "mixed_projection",
        "vector_primary_projection",
        "author_hybrid_projection",
        "empty_query",
    ]),
    queryRun: zod_1.z.object({
        id: zod_1.z.string(),
        provider: zod_1.z.string(),
        status: zod_1.z.literal("read_projection"),
        rounds: zod_1.z.array(zod_1.z.object({
            query: zod_1.z.string(),
            tokenCount: zod_1.z.number(),
            resultCount: zod_1.z.number(),
            provider: zod_1.z.string(),
            sourceFilterCount: zod_1.z.number().optional(),
        })).default([]),
    }),
    sources: zod_1.z.array(exports.EvidenceSourceSchema),
    chunks: zod_1.z.array(exports.EvidenceChunkSchema),
    citations: zod_1.z.array(exports.EvidenceCitationSchema),
    constraints: zod_1.z.array(zod_1.z.string()),
    counts: zod_1.z.object({
        sources: zod_1.z.number(),
        chunks: zod_1.z.number(),
        citations: zod_1.z.number(),
        webSources: zod_1.z.number().optional(),
        queryRounds: zod_1.z.number().optional(),
    }),
    screening: zod_1.z.object({
        version: zod_1.z.literal("evidence-screening.v1"),
        requestedLimit: zod_1.z.number(),
        queryCount: zod_1.z.number(),
        sourceFilterIds: zod_1.z.array(zod_1.z.string()).default([]),
        selectedChunkCount: zod_1.z.number(),
        selectedCitationCount: zod_1.z.number(),
        sourceDiversityCount: zod_1.z.number(),
        droppedDuplicateChunkCount: zod_1.z.number(),
        rankingSignals: zod_1.z.array(zod_1.z.string()),
        rejected: zod_1.z.array(zod_1.z.object({
            chunkId: zod_1.z.string(),
            reason: zod_1.z.enum(["off_topic", "duplicate", "low_relevance", "exclude_query"]),
            detail: zod_1.z.string().optional(),
        })).optional(),
        excludeQueriesApplied: zod_1.z.array(zod_1.z.string()).optional(),
        centralClaim: zod_1.z.string().optional(),
        fusion: zod_1.z.object({
            vectorWeight: zod_1.z.number(),
            ragflowRetrievalWeight: zod_1.z.number().nullable().optional(),
        }).optional(),
        latentRerank: zod_1.z.object({
            enabled: zod_1.z.boolean(),
            applied: zod_1.z.boolean(),
            modelVersion: zod_1.z.string().nullable().optional(),
            warning: zod_1.z.string().nullable().optional(),
            generationControl: zod_1.z.object({
                styleWeight: zod_1.z.number(),
                factWeight: zod_1.z.number(),
                modelVersion: zod_1.z.string().optional(),
                reason: zod_1.z.string().optional(),
            }).nullable().optional(),
        }).optional(),
    }).optional(),
    requestId: zod_1.z.string(),
});
exports.RecordGenerationOutputResultSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    chapterId: zod_1.z.number(),
    chapterNumber: zod_1.z.number(),
    partId: zod_1.z.string(),
    blockId: zod_1.z.string(),
    status: zod_1.z.string(),
    canonicalStatus: exports.ContentStatusSchema,
    wordCount: zod_1.z.number(),
});
exports.RecordGenerationOutputMutationResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    action: zod_1.z.literal("record_generation_output"),
    idempotencyKey: zod_1.z.string(),
    actor: zod_1.z.string(),
    result: zod_1.z.object({
        affectedRows: zod_1.z.number(),
        insertId: zod_1.z.number(),
        warningStatus: zod_1.z.number(),
    }),
    item: exports.RecordGenerationOutputResultSchema,
    requestId: zod_1.z.string(),
});
exports.RecordGenerationOutputPayloadSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    chapterId: zod_1.z.number().optional(),
    chapterNumber: zod_1.z.number(),
    title: zod_1.z.string().optional(),
    body: zod_1.z.string(),
    status: zod_1.z.enum(["first_draft", "polished"]).default("first_draft"),
    operator: zod_1.z.string().optional(),
    metadata: UnknownRecordSchema.optional(),
});
exports.ChapterStatusSchema = zod_1.z.enum([
    "outline",
    "first_draft",
    "polished",
    "audited",
    "published_unconfirmed",
    "published",
]);
exports.ChapterTransitionReasonSchema = zod_1.z.enum([
    "content_generated",
    "content_polished",
    "audit_passed",
    "audit_failed",
    "published_unconfirmed",
    "publish_submitted",
    "published",
    "publish_confirmed",
    "content_cleared",
    "manual_adjustment",
    "system_migration",
]);
exports.RecordChapterTransitionResultSchema = zod_1.z.object({
    chapterId: zod_1.z.number(),
    workId: zod_1.z.number(),
    chapterNumber: zod_1.z.number(),
    fromState: exports.ChapterStatusSchema,
    toState: exports.ChapterStatusSchema,
    reason: exports.ChapterTransitionReasonSchema,
    logged: zod_1.z.boolean(),
});
exports.RecordChapterTransitionMutationResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    action: zod_1.z.literal("record_chapter_transition"),
    idempotencyKey: zod_1.z.string(),
    actor: zod_1.z.string(),
    result: zod_1.z.object({
        affectedRows: zod_1.z.number(),
        insertId: zod_1.z.number(),
        warningStatus: zod_1.z.number(),
    }),
    item: exports.RecordChapterTransitionResultSchema,
    requestId: zod_1.z.string(),
});
exports.RecordChapterTransitionPayloadSchema = zod_1.z.object({
    chapterId: zod_1.z.number(),
    fromState: exports.ChapterStatusSchema,
    toState: exports.ChapterStatusSchema,
    reason: exports.ChapterTransitionReasonSchema,
    operator: zod_1.z.string().optional(),
    metadata: UnknownRecordSchema.optional(),
    logTransition: zod_1.z.boolean().default(true),
    sealAuditPassed: zod_1.z.boolean().default(false),
});
exports.PublicationResultActionSchema = zod_1.z.enum([
    "publish_chapter",
    "edit_chapter",
]);
exports.PublicationObservedStatusSchema = zod_1.z.enum([
    "submitted",
    "published",
    "edited",
    "failed",
]);
exports.RecordPublicationResultPayloadSchema = zod_1.z.object({
    targetId: zod_1.z.string().optional(),
    platform: zod_1.z.literal("fanqie").default("fanqie"),
    accountId: zod_1.z.string(),
    bookId: zod_1.z.string(),
    localWorkId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    chapterId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    chapterNumber: zod_1.z.number(),
    contentPartId: zod_1.z.string().optional(),
    action: exports.PublicationResultActionSchema,
    remotePartId: zod_1.z.string().optional(),
    observedStatus: exports.PublicationObservedStatusSchema,
    publishedAt: zod_1.z.string().optional(),
    result: UnknownRecordSchema.optional(),
});
exports.RecordPublicationResultResultSchema = zod_1.z.object({
    recordId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    contentPartId: zod_1.z.string().nullable(),
    chapterId: zod_1.z.number().nullable(),
    chapterNumber: zod_1.z.number(),
    action: exports.PublicationResultActionSchema,
    remotePartId: zod_1.z.string().nullable(),
    observedStatus: exports.PublicationObservedStatusSchema,
    chapterStatus: exports.ChapterStatusSchema.nullable(),
    contentPartStatus: exports.ContentStatusSchema.nullable(),
});
exports.RecordPublicationResultMutationResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    action: zod_1.z.literal("publication_record_result"),
    idempotencyKey: zod_1.z.string(),
    actor: zod_1.z.string(),
    result: zod_1.z.object({
        affectedRows: zod_1.z.number(),
        insertId: zod_1.z.number(),
        warningStatus: zod_1.z.number(),
    }),
    item: exports.RecordPublicationResultResultSchema,
    requestId: zod_1.z.string(),
});
exports.AuditStatusSchema = zod_1.z.enum([
    "pending",
    "reviewing",
    "passed",
    "failed",
]);
exports.SuggestedActionSchema = zod_1.z.enum([
    "auto_fix",
    "rewrite",
    "manual",
    "none",
]);
exports.AuditIssueSchema = zod_1.z.object({
    type: zod_1.z.string(),
    message: zod_1.z.string(),
    severity: zod_1.z.enum(["error", "warning", "info"]),
    position: zod_1.z.object({
        line: zod_1.z.number().optional(),
        column: zod_1.z.number().optional(),
    }).optional(),
});
exports.RecordAuditResultResultSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    chapterId: zod_1.z.number(),
    chapterNumber: zod_1.z.number(),
    auditStatus: exports.AuditStatusSchema,
    suggestedAction: exports.SuggestedActionSchema,
    issueCount: zod_1.z.number(),
});
exports.RecordAuditResultMutationResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    action: zod_1.z.literal("record_audit_result"),
    idempotencyKey: zod_1.z.string(),
    actor: zod_1.z.string(),
    result: zod_1.z.object({
        affectedRows: zod_1.z.number(),
        insertId: zod_1.z.number(),
        warningStatus: zod_1.z.number(),
    }),
    item: exports.RecordAuditResultResultSchema,
    requestId: zod_1.z.string(),
});
exports.RecordAuditResultPayloadSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    chapterNumber: zod_1.z.number(),
    auditStatus: exports.AuditStatusSchema,
    auditIssues: zod_1.z.array(exports.AuditIssueSchema).default([]),
    suggestedAction: exports.SuggestedActionSchema,
    operator: zod_1.z.string().optional(),
    metadata: UnknownRecordSchema.optional(),
});
exports.ReplaceWorkStructureResultSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    volumes: zod_1.z.number(),
    chapterOutlines: zod_1.z.number(),
    characters: zod_1.z.number(),
    worldSettings: zod_1.z.number(),
    storyEvents: zod_1.z.number(),
    characterGrowth: zod_1.z.number(),
    importantItems: zod_1.z.number(),
});
exports.ReplaceWorkStructureMutationResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    action: zod_1.z.literal("replace_work_structure"),
    idempotencyKey: zod_1.z.string(),
    actor: zod_1.z.string(),
    result: zod_1.z.object({
        affectedRows: zod_1.z.number(),
        insertId: zod_1.z.number(),
        warningStatus: zod_1.z.number(),
    }),
    item: exports.ReplaceWorkStructureResultSchema,
    requestId: zod_1.z.string(),
});
exports.PublicProjectionPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    date: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    summary: zod_1.z.string().min(1),
    tags: zod_1.z.array(zod_1.z.string().min(1)).default([]),
    categories: zod_1.z.array(zod_1.z.string().min(1)).default([]),
    series: zod_1.z.string().min(1).optional(),
    featured: zod_1.z.boolean().default(false),
    draft: zod_1.z.boolean().default(true),
    toc: zod_1.z.boolean().default(true),
    body: zod_1.z.string().min(1),
    source: zod_1.z.object({
        system: zod_1.z.literal("contentbase"),
        capabilityId: zod_1.z.string().min(1),
        runtimeVersion: zod_1.z.string().min(1),
        jobId: zod_1.z.string().min(1).optional(),
        workId: zod_1.z.number().int().positive().optional(),
        chapterId: zod_1.z.number().int().positive().optional(),
        chapterNumber: zod_1.z.number().int().positive().optional(),
        generatedAt: zod_1.z.string().min(1),
    }),
    trace: UnknownRecordSchema.default({}),
});
exports.PublicProjectionManifestSchema = zod_1.z.object({
    version: zod_1.z.literal("public-projection.v1"),
    target: zod_1.z.literal("myblog"),
    generatedAt: zod_1.z.string().min(1),
    posts: zod_1.z.array(zod_1.z.object({
        slug: zod_1.z.string().min(1),
        title: zod_1.z.string().min(1),
        file: zod_1.z.string().min(1),
        source: exports.PublicProjectionPostSchema.shape.source,
    })),
});
function parsePublicProjectionPost(value) {
    return exports.PublicProjectionPostSchema.parse(value);
}
function parsePublicProjectionManifest(value) {
    return exports.PublicProjectionManifestSchema.parse(value);
}
function parseContentWork(value) {
    return exports.ContentWorkSchema.parse(value);
}
function parsePublicationRecord(value) {
    return exports.PublicationRecordSchema.parse(value);
}
