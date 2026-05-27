import { z } from "zod";
const UnknownRecordSchema = z.record(z.string(), z.unknown());
export const ContentWorkKindSchema = z.enum([
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
export const ContentPartKindSchema = z.enum([
    "volume",
    "chapter",
    "scene",
    "article_section",
    "script_segment",
    "comic_episode",
    "comic_page_ref",
    "appendix",
]);
export const ContentBlockKindSchema = z.enum([
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
export const ContentAssetKindSchema = z.enum([
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
export const ContentStatusSchema = z.enum([
    "draft",
    "active",
    "reviewing",
    "ready",
    "published",
    "retired",
]);
export const AuthorLexiconDecisionSchema = z.enum([
    "candidate",
    "approved_preferred",
    "approved_banned",
    "rejected",
]);
export const ContentWorkSchema = z.object({
    id: z.string(),
    kind: ContentWorkKindSchema,
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    status: ContentStatusSchema,
    authorProfileId: z.string().nullable().optional(),
    metadata: UnknownRecordSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const ContentPartSchema = z.object({
    id: z.string(),
    workId: z.string(),
    parentPartId: z.string().nullable().optional(),
    kind: ContentPartKindSchema,
    partOrder: z.number(),
    title: z.string().nullable().optional(),
    status: ContentStatusSchema,
    metadata: UnknownRecordSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const ContentBlockSchema = z.object({
    id: z.string(),
    workId: z.string(),
    partId: z.string().nullable().optional(),
    assetId: z.string().nullable().optional(),
    kind: ContentBlockKindSchema,
    blockOrder: z.number(),
    textContent: z.string().nullable().optional(),
    payload: UnknownRecordSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const ContentAssetSchema = z.object({
    id: z.string(),
    kind: ContentAssetKindSchema,
    title: z.string().nullable().optional(),
    storageProvider: z.string(),
    storageUri: z.string(),
    mimeType: z.string().nullable().optional(),
    byteSize: z.number().nullable().optional(),
    checksumSha256: z.string().nullable().optional(),
    metadata: UnknownRecordSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const AuthorProfileSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    stance: z.string().nullable().optional(),
    voice: z.array(z.string()),
    status: z.enum(["active", "retired"]),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const AuthorInterestClusterSchema = z.object({
    id: z.string(),
    authorProfileId: z.string(),
    name: z.string(),
    terms: z.array(z.string()),
    appliesTo: z.array(ContentWorkKindSchema),
    evidence: UnknownRecordSchema,
    status: z.enum(["candidate", "active", "retired"]),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const AuthorLexiconReviewSchema = z.object({
    id: z.string(),
    authorProfileId: z.string(),
    term: z.string(),
    decision: AuthorLexiconDecisionSchema,
    sourceKind: z.string(),
    sourceRef: z.string().nullable().optional(),
    reason: z.string(),
    createdAt: z.string(),
});
export const PublicationTargetSchema = z.object({
    id: z.string(),
    platform: z.string(),
    accountIdentity: z.string(),
    localWorkId: z.string(),
    remoteWorkId: z.string().nullable().optional(),
    status: z.enum(["active", "paused", "retired"]),
    metadata: UnknownRecordSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const PublicationRecordSchema = z.object({
    id: z.string(),
    targetId: z.string(),
    contentPartId: z.string().nullable().optional(),
    action: z.string(),
    remotePartId: z.string().nullable().optional(),
    observedStatus: z.string(),
    idempotencyKey: z.string(),
    result: UnknownRecordSchema,
    createdAt: z.string(),
});
export const EvidenceFactAtomTypeSchema = z.enum([
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
export const EvidenceFactAtomSchema = z.object({
    id: z.string(),
    type: EvidenceFactAtomTypeSchema,
    value: z.string(),
    sourceId: z.string(),
    sourceText: z.string().optional(),
    citationId: z.string().optional(),
    blockId: z.string().optional(),
});
export const EvidenceFactAtomPackSchema = z.object({
    workId: z.string().optional(),
    partId: z.string(),
    atoms: z.array(EvidenceFactAtomSchema),
    sourceBlockIds: z.array(z.string()),
    requestId: z.string(),
});
export const EvidenceSourceSchema = z.object({
    id: z.string(),
    title: z.string(),
    sourceType: z.string(),
    sourceTable: z.string().optional(),
    sourceId: z.string().optional(),
    source: z.string().nullable().optional(),
    externalRefs: z.array(z.record(z.string(), z.unknown())).default([]),
    metadata: z.record(z.string(), z.unknown()).default({}),
});
export const ContentSourceSummarySchema = z.object({
    id: z.string(),
    sourceId: z.string(),
    title: z.string(),
    kind: z.string(),
    author: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    sourceTable: z.string().optional(),
    chunkCount: z.number().int().nonnegative(),
    semanticUnitCount: z.number().int().nonnegative(),
    preview: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
});
export const ContentSourcesResponseSchema = z.object({
    version: z.literal("content-sources.v1"),
    count: z.number().int().nonnegative(),
    sources: z.array(ContentSourceSummarySchema),
    requestId: z.string(),
});
export const EvidenceChunkSchema = z.object({
    id: z.string(),
    sourceId: z.string(),
    chunkIndex: z.number(),
    text: z.string(),
    privacyLevel: z.string(),
    relevanceScore: z.number().optional(),
    location: z.record(z.string(), z.unknown()).default({}),
    metadata: z.record(z.string(), z.unknown()).default({}),
});
export const EvidenceCitationSchema = z.object({
    id: z.string(),
    sourceId: z.string(),
    chunkId: z.string(),
    title: z.string(),
    excerpt: z.string(),
    locator: z.string().optional(),
    relevanceScore: z.number().optional(),
    metadata: z.record(z.string(), z.unknown()).default({}),
});
export const EvidencePackSchema = z.object({
    version: z.literal("evidence-pack.v1"),
    query: z.string(),
    mode: z.enum([
        "keyword_projection",
        "multi_query_projection",
        "web_projection",
        "mixed_projection",
        "vector_primary_projection",
        "author_hybrid_projection",
        "empty_query",
    ]),
    queryRun: z.object({
        id: z.string(),
        provider: z.string(),
        status: z.literal("read_projection"),
        rounds: z.array(z.object({
            query: z.string(),
            tokenCount: z.number(),
            resultCount: z.number(),
            provider: z.string(),
            sourceFilterCount: z.number().optional(),
        })).default([]),
    }),
    sources: z.array(EvidenceSourceSchema),
    chunks: z.array(EvidenceChunkSchema),
    citations: z.array(EvidenceCitationSchema),
    constraints: z.array(z.string()),
    counts: z.object({
        sources: z.number(),
        chunks: z.number(),
        citations: z.number(),
        webSources: z.number().optional(),
        queryRounds: z.number().optional(),
    }),
    screening: z.object({
        version: z.literal("evidence-screening.v1"),
        requestedLimit: z.number(),
        queryCount: z.number(),
        sourceFilterIds: z.array(z.string()).default([]),
        selectedChunkCount: z.number(),
        selectedCitationCount: z.number(),
        sourceDiversityCount: z.number(),
        droppedDuplicateChunkCount: z.number(),
        rankingSignals: z.array(z.string()),
        rejected: z.array(z.object({
            chunkId: z.string(),
            reason: z.enum(["off_topic", "duplicate", "low_relevance", "exclude_query"]),
            detail: z.string().optional(),
        })).optional(),
        excludeQueriesApplied: z.array(z.string()).optional(),
        centralClaim: z.string().optional(),
        fusion: z.object({
            vectorWeight: z.number(),
            ragflowRetrievalWeight: z.number().nullable().optional(),
        }).optional(),
        latentRerank: z.object({
            enabled: z.boolean(),
            applied: z.boolean(),
            modelVersion: z.string().nullable().optional(),
            warning: z.string().nullable().optional(),
            generationControl: z.object({
                styleWeight: z.number(),
                factWeight: z.number(),
                modelVersion: z.string().optional(),
                reason: z.string().optional(),
            }).nullable().optional(),
        }).optional(),
    }).optional(),
    requestId: z.string(),
});
export const RecordGenerationOutputResultSchema = z.object({
    workId: z.number(),
    chapterId: z.number(),
    chapterNumber: z.number(),
    partId: z.string(),
    blockId: z.string(),
    status: z.string(),
    canonicalStatus: ContentStatusSchema,
    wordCount: z.number(),
});
export const RecordGenerationOutputMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_generation_output"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordGenerationOutputResultSchema,
    requestId: z.string(),
});
export const RecordGenerationOutputPayloadSchema = z.object({
    workId: z.number(),
    chapterId: z.number().optional(),
    chapterNumber: z.number(),
    title: z.string().optional(),
    body: z.string(),
    status: z.enum(["first_draft", "polished"]).default("first_draft"),
    operator: z.string().optional(),
    metadata: UnknownRecordSchema.optional(),
});
export const ChapterStatusSchema = z.enum([
    "outline",
    "first_draft",
    "polished",
    "audited",
    "published_unconfirmed",
    "published",
]);
export const ChapterTransitionReasonSchema = z.enum([
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
export const RecordChapterTransitionResultSchema = z.object({
    chapterId: z.number(),
    workId: z.number(),
    chapterNumber: z.number(),
    fromState: ChapterStatusSchema,
    toState: ChapterStatusSchema,
    reason: ChapterTransitionReasonSchema,
    logged: z.boolean(),
});
export const RecordChapterTransitionMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_chapter_transition"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordChapterTransitionResultSchema,
    requestId: z.string(),
});
export const RecordChapterTransitionPayloadSchema = z.object({
    chapterId: z.number(),
    fromState: ChapterStatusSchema,
    toState: ChapterStatusSchema,
    reason: ChapterTransitionReasonSchema,
    operator: z.string().optional(),
    metadata: UnknownRecordSchema.optional(),
    logTransition: z.boolean().default(true),
    sealAuditPassed: z.boolean().default(false),
});
export const PublicationResultActionSchema = z.enum([
    "publish_chapter",
    "edit_chapter",
]);
export const PublicationObservedStatusSchema = z.enum([
    "submitted",
    "published",
    "edited",
    "failed",
]);
export const RecordPublicationResultPayloadSchema = z.object({
    targetId: z.string().optional(),
    platform: z.literal("fanqie").default("fanqie"),
    accountId: z.string(),
    bookId: z.string(),
    localWorkId: z.union([z.string(), z.number()]),
    chapterId: z.union([z.string(), z.number()]).optional(),
    chapterNumber: z.number(),
    contentPartId: z.string().optional(),
    action: PublicationResultActionSchema,
    remotePartId: z.string().optional(),
    observedStatus: PublicationObservedStatusSchema,
    publishedAt: z.string().optional(),
    result: UnknownRecordSchema.optional(),
});
export const RecordPublicationResultResultSchema = z.object({
    recordId: z.string(),
    targetId: z.string(),
    contentPartId: z.string().nullable(),
    chapterId: z.number().nullable(),
    chapterNumber: z.number(),
    action: PublicationResultActionSchema,
    remotePartId: z.string().nullable(),
    observedStatus: PublicationObservedStatusSchema,
    chapterStatus: ChapterStatusSchema.nullable(),
    contentPartStatus: ContentStatusSchema.nullable(),
});
export const RecordPublicationResultMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("publication_record_result"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordPublicationResultResultSchema,
    requestId: z.string(),
});
export const AuditStatusSchema = z.enum([
    "pending",
    "reviewing",
    "passed",
    "failed",
]);
export const SuggestedActionSchema = z.enum([
    "auto_fix",
    "rewrite",
    "manual",
    "none",
]);
export const AuditIssueSchema = z.object({
    type: z.string(),
    message: z.string(),
    severity: z.enum(["error", "warning", "info"]),
    position: z.object({
        line: z.number().optional(),
        column: z.number().optional(),
    }).optional(),
});
export const RecordAuditResultResultSchema = z.object({
    workId: z.number(),
    chapterId: z.number(),
    chapterNumber: z.number(),
    auditStatus: AuditStatusSchema,
    suggestedAction: SuggestedActionSchema,
    issueCount: z.number(),
});
export const RecordAuditResultMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_audit_result"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordAuditResultResultSchema,
    requestId: z.string(),
});
export const RecordAuditResultPayloadSchema = z.object({
    workId: z.number(),
    chapterNumber: z.number(),
    auditStatus: AuditStatusSchema,
    auditIssues: z.array(AuditIssueSchema).default([]),
    suggestedAction: SuggestedActionSchema,
    operator: z.string().optional(),
    metadata: UnknownRecordSchema.optional(),
});
export const ReplaceWorkStructureResultSchema = z.object({
    workId: z.number(),
    volumes: z.number(),
    chapterOutlines: z.number(),
    characters: z.number(),
    worldSettings: z.number(),
    storyEvents: z.number(),
    characterGrowth: z.number(),
    importantItems: z.number(),
});
export const ReplaceWorkStructureMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("replace_work_structure"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: ReplaceWorkStructureResultSchema,
    requestId: z.string(),
});
export const PublicProjectionPostSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    summary: z.string().min(1),
    tags: z.array(z.string().min(1)).default([]),
    categories: z.array(z.string().min(1)).default([]),
    series: z.string().min(1).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(true),
    toc: z.boolean().default(true),
    body: z.string().min(1),
    source: z.object({
        system: z.literal("contentbase"),
        capabilityId: z.string().min(1),
        runtimeVersion: z.string().min(1),
        jobId: z.string().min(1).optional(),
        workId: z.number().int().positive().optional(),
        chapterId: z.number().int().positive().optional(),
        chapterNumber: z.number().int().positive().optional(),
        generatedAt: z.string().min(1),
    }),
    trace: UnknownRecordSchema.default({}),
});
export const PublicProjectionManifestSchema = z.object({
    version: z.literal("public-projection.v1"),
    target: z.literal("myblog"),
    generatedAt: z.string().min(1),
    posts: z.array(z.object({
        slug: z.string().min(1),
        title: z.string().min(1),
        file: z.string().min(1),
        source: PublicProjectionPostSchema.shape.source,
    })),
});
export function parsePublicProjectionPost(value) {
    return PublicProjectionPostSchema.parse(value);
}
export function parsePublicProjectionManifest(value) {
    return PublicProjectionManifestSchema.parse(value);
}
export function parseContentWork(value) {
    return ContentWorkSchema.parse(value);
}
export function parsePublicationRecord(value) {
    return PublicationRecordSchema.parse(value);
}
