import { z } from "zod";
export const SemanticTagMetadataSchema = z.object({
    id: z.string(),
    layer: z.string(),
    value: z.string(),
    description: z.string().nullable().optional(),
});
export const SemanticReferenceMaterialKindSchema = z.enum([
    "document",
    "theory",
    "comparison",
    "observer",
    "literary",
]);
export const SemanticUnitSchema = z.object({
    id: z.string(),
    sourceId: z.string().nullable().optional(),
    sourceTitle: z.string(),
    sourceAuthor: z.string().nullable().optional(),
    sourceLocator: z.string().nullable().optional(),
    excerpt: z.string(),
    summary: z.string().nullable().optional(),
    materialKind: SemanticReferenceMaterialKindSchema.nullable().optional(),
    status: z.string(),
    tags: z.array(SemanticTagMetadataSchema),
    searchScore: z.number().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const SemanticTagSchema = z.object({
    id: z.string(),
    layer: z.string(),
    value: z.string(),
    description: z.string().nullable().optional(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const SemanticRelationSchema = z.object({
    id: z.string(),
    fromUnitId: z.string().nullable().optional(),
    fromTagId: z.string().nullable().optional(),
    relationType: z.string(),
    toUnitId: z.string().nullable().optional(),
    toTagId: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const SemanticUnitsResponseSchema = z.object({
    count: z.number(),
    units: z.array(SemanticUnitSchema),
    filters: z.object({
        status: z.string(),
        search: z.string(),
        tag: z.string(),
        materialKind: SemanticReferenceMaterialKindSchema.or(z.literal("")),
    }),
    requestId: z.string(),
});
export const StylePackProfileSchema = z.object({
    id: z.string(),
    sourceId: z.string().nullable().optional(),
    sourceTitle: z.string(),
    sourceAuthor: z.string().nullable().optional(),
    sourceLocator: z.string().nullable().optional(),
    summary: z.string(),
    sentenceLengthBand: z.string(),
    paragraphDensity: z.string(),
    progressionMoves: z.array(z.string()),
    rhetoricalMoves: z.array(z.string()),
    imageryClusters: z.array(z.string()),
    constraints: z.array(z.string()),
    tags: z.array(SemanticTagMetadataSchema),
    searchScore: z.number().nullable().optional(),
});
export const StyleRevisionReviewerEvidenceSchema = z.object({
    badReason: z.string(),
    rewriteActions: z.array(z.string()),
    forbiddenMoves: z.array(z.string()),
    targetShape: z.string(),
});
export const StyleRevisionPairSchema = z.object({
    id: z.string(),
    sourceId: z.string().nullable().optional(),
    sourceTitle: z.string(),
    sourceLocator: z.string().nullable().optional(),
    issueType: z.string(),
    ruleId: z.string(),
    severity: z.string(),
    originalText: z.string(),
    revisedText: z.string().nullable().optional(),
    reviewerEvidence: StyleRevisionReviewerEvidenceSchema,
    tags: z.array(SemanticTagMetadataSchema),
    searchScore: z.number().nullable().optional(),
});
export const StylePackSchema = z.object({
    version: z.literal("style-pack.v1"),
    query: z.string(),
    mode: z.enum(["empty_query", "style_reference_projection"]),
    sourceIds: z.array(z.string()),
    profiles: z.array(StylePackProfileSchema),
    syntaxProfiles: z.array(z.string()),
    rhetoricalMoves: z.array(z.string()),
    imageryClusters: z.array(z.string()),
    paragraphMoves: z.array(z.string()),
    revisionPairs: z.array(StyleRevisionPairSchema).default([]),
    constraints: z.array(z.string()),
    counts: z.object({
        sources: z.number(),
        profiles: z.number(),
        syntaxProfiles: z.number(),
        rhetoricalMoves: z.number(),
        imageryClusters: z.number(),
        revisionPairs: z.number().default(0),
    }),
    screening: z.object({
        version: z.literal("style-screening.v1"),
        requestedLimit: z.number(),
        sourceFilterIds: z.array(z.string()).default([]),
        selectedProfileCount: z.number(),
        sourceDiversityCount: z.number(),
        rankingSignals: z.array(z.string()),
    }),
    requestId: z.string(),
});
export const SemanticTagsResponseSchema = z.object({
    count: z.number(),
    tags: z.array(SemanticTagSchema),
    filters: z.object({
        status: z.string(),
        layer: z.string(),
    }),
    requestId: z.string(),
});
export const SemanticRelationsResponseSchema = z.object({
    count: z.number(),
    relations: z.array(SemanticRelationSchema),
    filters: z.object({
        status: z.string(),
        type: z.string(),
        unit: z.string(),
    }),
    requestId: z.string(),
});
export const RecordSemanticReferenceMaterialPayloadSchema = z.object({
    unitId: z.string().optional(),
    sourceId: z.string().optional(),
    sourceTitle: z.string(),
    sourceAuthor: z.string().optional(),
    sourceLocator: z.string().optional(),
    excerpt: z.string(),
    summary: z.string().optional(),
    materialKind: SemanticReferenceMaterialKindSchema,
    status: z.enum(["candidate", "active", "retired"]).default("candidate"),
    tags: z.array(z.object({
        layer: z.enum([
            "image",
            "concept",
            "civilization",
            "emotion",
            "narrative_function",
            "style",
            "usable_for",
            "narrative_position",
        ]),
        value: z.string(),
        description: z.string().optional(),
    })).default([]),
});
export const RecordSemanticReferenceMaterialResultSchema = z.object({
    unitId: z.string(),
    sourceId: z.string().nullable(),
    sourceTitle: z.string(),
    materialKind: SemanticReferenceMaterialKindSchema,
    status: z.string(),
    tagCount: z.number(),
});
export const RecordSemanticReferenceMaterialMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_semantic_reference_material"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordSemanticReferenceMaterialResultSchema,
    requestId: z.string(),
});
export const RecordStyleRevisionPairPayloadSchema = z.object({
    pairId: z.string().optional(),
    sourceId: z.string().optional(),
    sourceTitle: z.string().default("ContentBase SyntaxReviewer"),
    sourceLocator: z.string().optional(),
    topic: z.string().optional(),
    target: z.string().optional(),
    issueType: z.string(),
    ruleId: z.string(),
    severity: z.enum(["block", "warn", "info"]).default("warn"),
    originalText: z.string(),
    revisedText: z.string().optional(),
    reviewerEvidence: StyleRevisionReviewerEvidenceSchema,
    status: z.enum(["candidate", "active", "retired"]).default("candidate"),
    metadata: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.object({
        layer: z.enum([
            "image",
            "concept",
            "civilization",
            "emotion",
            "narrative_function",
            "style",
            "usable_for",
            "narrative_position",
        ]),
        value: z.string(),
        description: z.string().optional(),
    })).default([]),
});
export const RecordStyleRevisionPairResultSchema = z.object({
    unitId: z.string(),
    sourceId: z.string().nullable(),
    sourceTitle: z.string(),
    issueType: z.string(),
    status: z.string(),
    tagCount: z.number(),
});
export const RecordStyleRevisionPairMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_style_revision_pair"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordStyleRevisionPairResultSchema,
    requestId: z.string(),
});
