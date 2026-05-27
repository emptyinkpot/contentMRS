"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolvedCreativeContextSchema = exports.CreativeContextRuntimeSnapshotSchema = exports.CreativeContextPublicationStateSchema = exports.CreativeContextRuleInventorySchema = exports.CreativeContextRuleSchema = exports.CreativeContextCorpusImitationSchema = exports.CreativeContextCorpusPassageSchema = exports.CreativeContextStyleStateSchema = exports.CreativeContextSemanticStateSchema = exports.CreativeContextNarrativeStateSchema = exports.CreativeContextWorldRuleSchema = exports.CreativeContextCharacterStateSchema = exports.CreativeContextChapterBriefSchema = exports.CreativeContextPublicationTargetSchema = exports.CreativeContextAuthorProfileSchema = exports.CreativeContextBlockSchema = exports.CreativeContextPartSchema = exports.CreativeContextWorkSchema = void 0;
const zod_1 = require("zod");
const creative_style_contract_js_1 = require("./creative-style-contract.js");
const author_lexicon_review_contract_js_1 = require("./author-lexicon-review-contract.js");
const UnknownRecordSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
const DateStringSchema = zod_1.z.string();
exports.CreativeContextWorkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    kind: zod_1.z.string(),
    title: zod_1.z.string(),
    subtitle: zod_1.z.string().nullable().optional(),
    status: zod_1.z.string(),
    authorProfileId: zod_1.z.string().nullable().optional(),
    metadata: UnknownRecordSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
exports.CreativeContextPartSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workId: zod_1.z.string(),
    parentPartId: zod_1.z.string().nullable().optional(),
    kind: zod_1.z.string(),
    partOrder: zod_1.z.number(),
    title: zod_1.z.string().nullable().optional(),
    status: zod_1.z.string(),
    metadata: UnknownRecordSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
exports.CreativeContextBlockSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workId: zod_1.z.string(),
    partId: zod_1.z.string().nullable().optional(),
    assetId: zod_1.z.string().nullable().optional(),
    kind: zod_1.z.string(),
    blockOrder: zod_1.z.number(),
    textContent: zod_1.z.string().nullable().optional(),
    payload: UnknownRecordSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
exports.CreativeContextAuthorProfileSchema = zod_1.z.object({
    profile: zod_1.z.object({
        id: zod_1.z.string(),
        displayName: zod_1.z.string(),
        stance: zod_1.z.string().nullable().optional(),
        voice: zod_1.z.array(zod_1.z.string()),
        status: zod_1.z.string(),
        createdAt: DateStringSchema,
        updatedAt: DateStringSchema,
    }),
    interestClusters: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        authorProfileId: zod_1.z.string(),
        name: zod_1.z.string(),
        terms: zod_1.z.array(zod_1.z.string()),
        appliesTo: zod_1.z.array(zod_1.z.string()),
        evidence: UnknownRecordSchema,
        status: zod_1.z.string(),
        createdAt: DateStringSchema,
        updatedAt: DateStringSchema,
    })),
    authorTechniques: creative_style_contract_js_1.CreativeStyleContractSchema.shape.authorTechniques,
});
exports.CreativeContextPublicationTargetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    platform: zod_1.z.string(),
    accountIdentity: zod_1.z.string(),
    localWorkId: zod_1.z.string(),
    remoteWorkId: zod_1.z.string().nullable().optional(),
    status: zod_1.z.string(),
    metadata: UnknownRecordSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
exports.CreativeContextChapterBriefSchema = zod_1.z.object({
    chapterNumber: zod_1.z.number(),
    partId: zod_1.z.string().nullable(),
    title: zod_1.z.string(),
    summary: zod_1.z.string(),
    status: zod_1.z.string(),
    wordCount: zod_1.z.number().nullable(),
});
exports.CreativeContextCharacterStateSchema = zod_1.z.object({
    name: zod_1.z.string(),
    roleType: zod_1.z.string(),
    summary: zod_1.z.string(),
});
exports.CreativeContextWorldRuleSchema = zod_1.z.object({
    type: zod_1.z.string(),
    title: zod_1.z.string(),
    content: zod_1.z.string(),
});
exports.CreativeContextNarrativeStateSchema = zod_1.z.object({
    currentChapter: exports.CreativeContextChapterBriefSchema.nullable(),
    previousChapters: zod_1.z.array(exports.CreativeContextChapterBriefSchema),
    nextChapters: zod_1.z.array(exports.CreativeContextChapterBriefSchema),
    characters: zod_1.z.array(exports.CreativeContextCharacterStateSchema),
    worldRules: zod_1.z.array(exports.CreativeContextWorldRuleSchema),
    continuityBrief: zod_1.z.string(),
});
exports.CreativeContextSemanticStateSchema = zod_1.z.object({
    query: zod_1.z.string(),
    units: zod_1.z.array(zod_1.z.unknown()),
    memoryBrief: zod_1.z.string(),
});
exports.CreativeContextStyleStateSchema = zod_1.z.object({
    authorProfileId: zod_1.z.string(),
    protocol: zod_1.z.string(),
    preferredTerms: zod_1.z.array(zod_1.z.string()),
    bannedTerms: zod_1.z.array(zod_1.z.string()),
    qualityRules: zod_1.z.array(zod_1.z.string()),
    techniques: zod_1.z.array(zod_1.z.string()),
});
exports.CreativeContextCorpusPassageSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    category: zod_1.z.string(),
    title: zod_1.z.string(),
    useCase: zod_1.z.string(),
    reusableImages: zod_1.z.array(zod_1.z.string()),
    sentenceRhythms: zod_1.z.array(zod_1.z.string()),
    semanticPosture: zod_1.z.string(),
    narrativePositions: zod_1.z.array(zod_1.z.string()),
    transformationInstruction: zod_1.z.string(),
});
exports.CreativeContextCorpusImitationSchema = zod_1.z.object({
    sourcePassages: zod_1.z.array(exports.CreativeContextCorpusPassageSchema),
    reusableImages: zod_1.z.array(zod_1.z.string()),
    sentenceRhythms: zod_1.z.array(zod_1.z.string()),
    punctuationProfile: zod_1.z.object({
        prefer: zod_1.z.array(zod_1.z.string()),
        avoid: zod_1.z.array(zod_1.z.string()),
        cadence: zod_1.z.array(zod_1.z.string()),
    }),
    hookPatterns: zod_1.z.array(zod_1.z.string()),
    sceneryPatterns: zod_1.z.array(zod_1.z.string()),
    forbiddenImitationRules: zod_1.z.array(zod_1.z.string()),
    transformationInstructions: zod_1.z.array(zod_1.z.string()),
});
exports.CreativeContextRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    category: zod_1.z.string(),
    owner: zod_1.z.string(),
    severity: zod_1.z.string(),
    appliesTo: zod_1.z.array(zod_1.z.string()),
    definition: zod_1.z.string(),
    detectorId: zod_1.z.string(),
    enforcement: zod_1.z.string(),
    failureMode: zod_1.z.string(),
    rationale: zod_1.z.string(),
});
exports.CreativeContextRuleInventorySchema = zod_1.z.object({
    rules: zod_1.z.array(exports.CreativeContextRuleSchema),
    languageRules: zod_1.z.array(exports.CreativeContextRuleSchema),
    narrativeRules: zod_1.z.array(exports.CreativeContextRuleSchema),
    styleRules: zod_1.z.array(exports.CreativeContextRuleSchema),
    corpusRules: zod_1.z.array(exports.CreativeContextRuleSchema),
    qualityRules: zod_1.z.array(exports.CreativeContextRuleSchema),
});
exports.CreativeContextPublicationStateSchema = zod_1.z.object({
    targets: zod_1.z.array(exports.CreativeContextPublicationTargetSchema),
    constraints: zod_1.z.array(zod_1.z.string()),
});
exports.CreativeContextRuntimeSnapshotSchema = zod_1.z.object({
    contextHash: zod_1.z.string(),
    resolvedAt: DateStringSchema,
    sourceCounts: zod_1.z.object({
        parts: zod_1.z.number(),
        recentBlocks: zod_1.z.number(),
        semanticUnits: zod_1.z.number(),
        publicationTargets: zod_1.z.number(),
        characters: zod_1.z.number(),
        worldRules: zod_1.z.number(),
        lexiconReviews: zod_1.z.number(),
    }),
});
exports.ResolvedCreativeContextSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    contextVersion: zod_1.z.literal("creative-context.v1"),
    work: exports.CreativeContextWorkSchema,
    narrativeState: exports.CreativeContextNarrativeStateSchema,
    semanticState: exports.CreativeContextSemanticStateSchema,
    styleState: exports.CreativeContextStyleStateSchema,
    corpusImitation: exports.CreativeContextCorpusImitationSchema,
    ruleInventory: exports.CreativeContextRuleInventorySchema,
    publicationState: exports.CreativeContextPublicationStateSchema,
    runtimeSnapshot: exports.CreativeContextRuntimeSnapshotSchema,
    lexiconLearning: author_lexicon_review_contract_js_1.AuthorLexiconLearningSchema,
    currentPart: exports.CreativeContextPartSchema.nullable(),
    parts: zod_1.z.array(exports.CreativeContextPartSchema),
    recentBlocks: zod_1.z.array(exports.CreativeContextBlockSchema),
    authorProfile: exports.CreativeContextAuthorProfileSchema,
    styleContract: creative_style_contract_js_1.CreativeStyleContractSchema,
    semanticContext: zod_1.z.object({
        query: zod_1.z.string(),
        units: zod_1.z.array(zod_1.z.unknown()),
    }),
    publicationTargets: zod_1.z.array(exports.CreativeContextPublicationTargetSchema),
    snapshot: zod_1.z.object({
        workId: zod_1.z.string(),
        partId: zod_1.z.string().nullable(),
        authorProfileId: zod_1.z.string(),
        protocol: zod_1.z.string(),
        semanticLimit: zod_1.z.number(),
        resolvedAt: DateStringSchema,
    }),
    counts: zod_1.z.object({
        parts: zod_1.z.number(),
        recentBlocks: zod_1.z.number(),
        semanticUnits: zod_1.z.number(),
        publicationTargets: zod_1.z.number(),
        preferredTerms: zod_1.z.number(),
        bannedTerms: zod_1.z.number(),
        qualityRules: zod_1.z.number(),
        techniques: zod_1.z.number(),
        lexiconReviews: zod_1.z.number(),
    }),
    requestId: zod_1.z.string(),
});
