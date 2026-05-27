import { z } from "zod";
export declare const SemanticTagMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    layer: z.ZodString;
    value: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type SemanticTagMetadata = z.infer<typeof SemanticTagMetadataSchema>;
export declare const SemanticReferenceMaterialKindSchema: z.ZodEnum<{
    document: "document";
    theory: "theory";
    comparison: "comparison";
    observer: "observer";
    literary: "literary";
}>;
export type SemanticReferenceMaterialKind = z.infer<typeof SemanticReferenceMaterialKindSchema>;
export declare const SemanticUnitSchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceTitle: z.ZodString;
    sourceAuthor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceLocator: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    excerpt: z.ZodString;
    summary: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    materialKind: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        document: "document";
        theory: "theory";
        comparison: "comparison";
        observer: "observer";
        literary: "literary";
    }>>>;
    status: z.ZodString;
    tags: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        layer: z.ZodString;
        value: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    searchScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type SemanticUnit = z.infer<typeof SemanticUnitSchema>;
export declare const SemanticTagSchema: z.ZodObject<{
    id: z.ZodString;
    layer: z.ZodString;
    value: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type SemanticTag = z.infer<typeof SemanticTagSchema>;
export declare const SemanticRelationSchema: z.ZodObject<{
    id: z.ZodString;
    fromUnitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fromTagId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    relationType: z.ZodString;
    toUnitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    toTagId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type SemanticRelation = z.infer<typeof SemanticRelationSchema>;
export declare const SemanticUnitsResponseSchema: z.ZodObject<{
    count: z.ZodNumber;
    units: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sourceTitle: z.ZodString;
        sourceAuthor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sourceLocator: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        excerpt: z.ZodString;
        summary: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        materialKind: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
            document: "document";
            theory: "theory";
            comparison: "comparison";
            observer: "observer";
            literary: "literary";
        }>>>;
        status: z.ZodString;
        tags: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            layer: z.ZodString;
            value: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        searchScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    filters: z.ZodObject<{
        status: z.ZodString;
        search: z.ZodString;
        tag: z.ZodString;
        materialKind: z.ZodUnion<[z.ZodEnum<{
            document: "document";
            theory: "theory";
            comparison: "comparison";
            observer: "observer";
            literary: "literary";
        }>, z.ZodLiteral<"">]>;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type SemanticUnitsResponse = z.infer<typeof SemanticUnitsResponseSchema>;
export declare const StylePackProfileSchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceTitle: z.ZodString;
    sourceAuthor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceLocator: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    summary: z.ZodString;
    sentenceLengthBand: z.ZodString;
    paragraphDensity: z.ZodString;
    progressionMoves: z.ZodArray<z.ZodString>;
    rhetoricalMoves: z.ZodArray<z.ZodString>;
    imageryClusters: z.ZodArray<z.ZodString>;
    constraints: z.ZodArray<z.ZodString>;
    tags: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        layer: z.ZodString;
        value: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    searchScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type StylePackProfile = z.infer<typeof StylePackProfileSchema>;
export declare const StyleRevisionReviewerEvidenceSchema: z.ZodObject<{
    badReason: z.ZodString;
    rewriteActions: z.ZodArray<z.ZodString>;
    forbiddenMoves: z.ZodArray<z.ZodString>;
    targetShape: z.ZodString;
}, z.core.$strip>;
export type StyleRevisionReviewerEvidence = z.infer<typeof StyleRevisionReviewerEvidenceSchema>;
export declare const StyleRevisionPairSchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceTitle: z.ZodString;
    sourceLocator: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    issueType: z.ZodString;
    ruleId: z.ZodString;
    severity: z.ZodString;
    originalText: z.ZodString;
    revisedText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reviewerEvidence: z.ZodObject<{
        badReason: z.ZodString;
        rewriteActions: z.ZodArray<z.ZodString>;
        forbiddenMoves: z.ZodArray<z.ZodString>;
        targetShape: z.ZodString;
    }, z.core.$strip>;
    tags: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        layer: z.ZodString;
        value: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    searchScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type StyleRevisionPair = z.infer<typeof StyleRevisionPairSchema>;
export declare const StylePackSchema: z.ZodObject<{
    version: z.ZodLiteral<"style-pack.v1">;
    query: z.ZodString;
    mode: z.ZodEnum<{
        empty_query: "empty_query";
        style_reference_projection: "style_reference_projection";
    }>;
    sourceIds: z.ZodArray<z.ZodString>;
    profiles: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sourceTitle: z.ZodString;
        sourceAuthor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sourceLocator: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        summary: z.ZodString;
        sentenceLengthBand: z.ZodString;
        paragraphDensity: z.ZodString;
        progressionMoves: z.ZodArray<z.ZodString>;
        rhetoricalMoves: z.ZodArray<z.ZodString>;
        imageryClusters: z.ZodArray<z.ZodString>;
        constraints: z.ZodArray<z.ZodString>;
        tags: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            layer: z.ZodString;
            value: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        searchScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>>;
    syntaxProfiles: z.ZodArray<z.ZodString>;
    rhetoricalMoves: z.ZodArray<z.ZodString>;
    imageryClusters: z.ZodArray<z.ZodString>;
    paragraphMoves: z.ZodArray<z.ZodString>;
    revisionPairs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sourceTitle: z.ZodString;
        sourceLocator: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        issueType: z.ZodString;
        ruleId: z.ZodString;
        severity: z.ZodString;
        originalText: z.ZodString;
        revisedText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        reviewerEvidence: z.ZodObject<{
            badReason: z.ZodString;
            rewriteActions: z.ZodArray<z.ZodString>;
            forbiddenMoves: z.ZodArray<z.ZodString>;
            targetShape: z.ZodString;
        }, z.core.$strip>;
        tags: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            layer: z.ZodString;
            value: z.ZodString;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
        searchScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>>>;
    constraints: z.ZodArray<z.ZodString>;
    counts: z.ZodObject<{
        sources: z.ZodNumber;
        profiles: z.ZodNumber;
        syntaxProfiles: z.ZodNumber;
        rhetoricalMoves: z.ZodNumber;
        imageryClusters: z.ZodNumber;
        revisionPairs: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    screening: z.ZodObject<{
        version: z.ZodLiteral<"style-screening.v1">;
        requestedLimit: z.ZodNumber;
        sourceFilterIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
        selectedProfileCount: z.ZodNumber;
        sourceDiversityCount: z.ZodNumber;
        rankingSignals: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type StylePack = z.infer<typeof StylePackSchema>;
export declare const SemanticTagsResponseSchema: z.ZodObject<{
    count: z.ZodNumber;
    tags: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        layer: z.ZodString;
        value: z.ZodString;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    filters: z.ZodObject<{
        status: z.ZodString;
        layer: z.ZodString;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type SemanticTagsResponse = z.infer<typeof SemanticTagsResponseSchema>;
export declare const SemanticRelationsResponseSchema: z.ZodObject<{
    count: z.ZodNumber;
    relations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        fromUnitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        fromTagId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        relationType: z.ZodString;
        toUnitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        toTagId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    filters: z.ZodObject<{
        status: z.ZodString;
        type: z.ZodString;
        unit: z.ZodString;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type SemanticRelationsResponse = z.infer<typeof SemanticRelationsResponseSchema>;
export declare const RecordSemanticReferenceMaterialPayloadSchema: z.ZodObject<{
    unitId: z.ZodOptional<z.ZodString>;
    sourceId: z.ZodOptional<z.ZodString>;
    sourceTitle: z.ZodString;
    sourceAuthor: z.ZodOptional<z.ZodString>;
    sourceLocator: z.ZodOptional<z.ZodString>;
    excerpt: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    materialKind: z.ZodEnum<{
        document: "document";
        theory: "theory";
        comparison: "comparison";
        observer: "observer";
        literary: "literary";
    }>;
    status: z.ZodDefault<z.ZodEnum<{
        candidate: "candidate";
        active: "active";
        retired: "retired";
    }>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodObject<{
        layer: z.ZodEnum<{
            image: "image";
            concept: "concept";
            civilization: "civilization";
            emotion: "emotion";
            narrative_function: "narrative_function";
            style: "style";
            usable_for: "usable_for";
            narrative_position: "narrative_position";
        }>;
        value: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type RecordSemanticReferenceMaterialPayload = z.infer<typeof RecordSemanticReferenceMaterialPayloadSchema>;
export declare const RecordSemanticReferenceMaterialResultSchema: z.ZodObject<{
    unitId: z.ZodString;
    sourceId: z.ZodNullable<z.ZodString>;
    sourceTitle: z.ZodString;
    materialKind: z.ZodEnum<{
        document: "document";
        theory: "theory";
        comparison: "comparison";
        observer: "observer";
        literary: "literary";
    }>;
    status: z.ZodString;
    tagCount: z.ZodNumber;
}, z.core.$strip>;
export type RecordSemanticReferenceMaterialResult = z.infer<typeof RecordSemanticReferenceMaterialResultSchema>;
export declare const RecordSemanticReferenceMaterialMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_semantic_reference_material">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        unitId: z.ZodString;
        sourceId: z.ZodNullable<z.ZodString>;
        sourceTitle: z.ZodString;
        materialKind: z.ZodEnum<{
            document: "document";
            theory: "theory";
            comparison: "comparison";
            observer: "observer";
            literary: "literary";
        }>;
        status: z.ZodString;
        tagCount: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordSemanticReferenceMaterialMutationResponse = z.infer<typeof RecordSemanticReferenceMaterialMutationResponseSchema>;
export declare const RecordStyleRevisionPairPayloadSchema: z.ZodObject<{
    pairId: z.ZodOptional<z.ZodString>;
    sourceId: z.ZodOptional<z.ZodString>;
    sourceTitle: z.ZodDefault<z.ZodString>;
    sourceLocator: z.ZodOptional<z.ZodString>;
    topic: z.ZodOptional<z.ZodString>;
    target: z.ZodOptional<z.ZodString>;
    issueType: z.ZodString;
    ruleId: z.ZodString;
    severity: z.ZodDefault<z.ZodEnum<{
        block: "block";
        warn: "warn";
        info: "info";
    }>>;
    originalText: z.ZodString;
    revisedText: z.ZodOptional<z.ZodString>;
    reviewerEvidence: z.ZodObject<{
        badReason: z.ZodString;
        rewriteActions: z.ZodArray<z.ZodString>;
        forbiddenMoves: z.ZodArray<z.ZodString>;
        targetShape: z.ZodString;
    }, z.core.$strip>;
    status: z.ZodDefault<z.ZodEnum<{
        candidate: "candidate";
        active: "active";
        retired: "retired";
    }>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodObject<{
        layer: z.ZodEnum<{
            image: "image";
            concept: "concept";
            civilization: "civilization";
            emotion: "emotion";
            narrative_function: "narrative_function";
            style: "style";
            usable_for: "usable_for";
            narrative_position: "narrative_position";
        }>;
        value: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type RecordStyleRevisionPairPayload = z.infer<typeof RecordStyleRevisionPairPayloadSchema>;
export declare const RecordStyleRevisionPairResultSchema: z.ZodObject<{
    unitId: z.ZodString;
    sourceId: z.ZodNullable<z.ZodString>;
    sourceTitle: z.ZodString;
    issueType: z.ZodString;
    status: z.ZodString;
    tagCount: z.ZodNumber;
}, z.core.$strip>;
export type RecordStyleRevisionPairResult = z.infer<typeof RecordStyleRevisionPairResultSchema>;
export declare const RecordStyleRevisionPairMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_style_revision_pair">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        unitId: z.ZodString;
        sourceId: z.ZodNullable<z.ZodString>;
        sourceTitle: z.ZodString;
        issueType: z.ZodString;
        status: z.ZodString;
        tagCount: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordStyleRevisionPairMutationResponse = z.infer<typeof RecordStyleRevisionPairMutationResponseSchema>;
