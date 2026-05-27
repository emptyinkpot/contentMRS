import { z } from "zod";
import { CreativeStyleContractSchema } from "./creative-style-contract.js";
import { AuthorLexiconLearningSchema } from "./author-lexicon-review-contract.js";
const UnknownRecordSchema = z.record(z.string(), z.unknown());
const DateStringSchema = z.string();
export const CreativeContextWorkSchema = z.object({
    id: z.string(),
    kind: z.string(),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    status: z.string(),
    authorProfileId: z.string().nullable().optional(),
    metadata: UnknownRecordSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
export const CreativeContextPartSchema = z.object({
    id: z.string(),
    workId: z.string(),
    parentPartId: z.string().nullable().optional(),
    kind: z.string(),
    partOrder: z.number(),
    title: z.string().nullable().optional(),
    status: z.string(),
    metadata: UnknownRecordSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
export const CreativeContextBlockSchema = z.object({
    id: z.string(),
    workId: z.string(),
    partId: z.string().nullable().optional(),
    assetId: z.string().nullable().optional(),
    kind: z.string(),
    blockOrder: z.number(),
    textContent: z.string().nullable().optional(),
    payload: UnknownRecordSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
export const CreativeContextAuthorProfileSchema = z.object({
    profile: z.object({
        id: z.string(),
        displayName: z.string(),
        stance: z.string().nullable().optional(),
        voice: z.array(z.string()),
        status: z.string(),
        createdAt: DateStringSchema,
        updatedAt: DateStringSchema,
    }),
    interestClusters: z.array(z.object({
        id: z.string(),
        authorProfileId: z.string(),
        name: z.string(),
        terms: z.array(z.string()),
        appliesTo: z.array(z.string()),
        evidence: UnknownRecordSchema,
        status: z.string(),
        createdAt: DateStringSchema,
        updatedAt: DateStringSchema,
    })),
    authorTechniques: CreativeStyleContractSchema.shape.authorTechniques,
});
export const CreativeContextPublicationTargetSchema = z.object({
    id: z.string(),
    platform: z.string(),
    accountIdentity: z.string(),
    localWorkId: z.string(),
    remoteWorkId: z.string().nullable().optional(),
    status: z.string(),
    metadata: UnknownRecordSchema,
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
export const CreativeContextChapterBriefSchema = z.object({
    chapterNumber: z.number(),
    partId: z.string().nullable(),
    title: z.string(),
    summary: z.string(),
    status: z.string(),
    wordCount: z.number().nullable(),
});
export const CreativeContextCharacterStateSchema = z.object({
    name: z.string(),
    roleType: z.string(),
    summary: z.string(),
});
export const CreativeContextWorldRuleSchema = z.object({
    type: z.string(),
    title: z.string(),
    content: z.string(),
});
export const CreativeContextNarrativeStateSchema = z.object({
    currentChapter: CreativeContextChapterBriefSchema.nullable(),
    previousChapters: z.array(CreativeContextChapterBriefSchema),
    nextChapters: z.array(CreativeContextChapterBriefSchema),
    characters: z.array(CreativeContextCharacterStateSchema),
    worldRules: z.array(CreativeContextWorldRuleSchema),
    continuityBrief: z.string(),
});
export const CreativeContextSemanticStateSchema = z.object({
    query: z.string(),
    units: z.array(z.unknown()),
    memoryBrief: z.string(),
});
export const CreativeContextStyleStateSchema = z.object({
    authorProfileId: z.string(),
    protocol: z.string(),
    preferredTerms: z.array(z.string()),
    bannedTerms: z.array(z.string()),
    qualityRules: z.array(z.string()),
    techniques: z.array(z.string()),
});
export const CreativeContextCorpusPassageSchema = z.object({
    sourceId: z.string(),
    category: z.string(),
    title: z.string(),
    useCase: z.string(),
    reusableImages: z.array(z.string()),
    sentenceRhythms: z.array(z.string()),
    semanticPosture: z.string(),
    narrativePositions: z.array(z.string()),
    transformationInstruction: z.string(),
});
export const CreativeContextCorpusImitationSchema = z.object({
    sourcePassages: z.array(CreativeContextCorpusPassageSchema),
    reusableImages: z.array(z.string()),
    sentenceRhythms: z.array(z.string()),
    punctuationProfile: z.object({
        prefer: z.array(z.string()),
        avoid: z.array(z.string()),
        cadence: z.array(z.string()),
    }),
    hookPatterns: z.array(z.string()),
    sceneryPatterns: z.array(z.string()),
    forbiddenImitationRules: z.array(z.string()),
    transformationInstructions: z.array(z.string()),
});
export const CreativeContextRuleSchema = z.object({
    id: z.string(),
    category: z.string(),
    owner: z.string(),
    severity: z.string(),
    appliesTo: z.array(z.string()),
    definition: z.string(),
    detectorId: z.string(),
    enforcement: z.string(),
    failureMode: z.string(),
    rationale: z.string(),
});
export const CreativeContextRuleInventorySchema = z.object({
    rules: z.array(CreativeContextRuleSchema),
    languageRules: z.array(CreativeContextRuleSchema),
    narrativeRules: z.array(CreativeContextRuleSchema),
    styleRules: z.array(CreativeContextRuleSchema),
    corpusRules: z.array(CreativeContextRuleSchema),
    qualityRules: z.array(CreativeContextRuleSchema),
});
export const CreativeContextPublicationStateSchema = z.object({
    targets: z.array(CreativeContextPublicationTargetSchema),
    constraints: z.array(z.string()),
});
export const CreativeContextRuntimeSnapshotSchema = z.object({
    contextHash: z.string(),
    resolvedAt: DateStringSchema,
    sourceCounts: z.object({
        parts: z.number(),
        recentBlocks: z.number(),
        semanticUnits: z.number(),
        publicationTargets: z.number(),
        characters: z.number(),
        worldRules: z.number(),
        lexiconReviews: z.number(),
    }),
});
export const ResolvedCreativeContextSchema = z.object({
    ok: z.literal(true),
    contextVersion: z.literal("creative-context.v1"),
    work: CreativeContextWorkSchema,
    narrativeState: CreativeContextNarrativeStateSchema,
    semanticState: CreativeContextSemanticStateSchema,
    styleState: CreativeContextStyleStateSchema,
    corpusImitation: CreativeContextCorpusImitationSchema,
    ruleInventory: CreativeContextRuleInventorySchema,
    publicationState: CreativeContextPublicationStateSchema,
    runtimeSnapshot: CreativeContextRuntimeSnapshotSchema,
    lexiconLearning: AuthorLexiconLearningSchema,
    currentPart: CreativeContextPartSchema.nullable(),
    parts: z.array(CreativeContextPartSchema),
    recentBlocks: z.array(CreativeContextBlockSchema),
    authorProfile: CreativeContextAuthorProfileSchema,
    styleContract: CreativeStyleContractSchema,
    semanticContext: z.object({
        query: z.string(),
        units: z.array(z.unknown()),
    }),
    publicationTargets: z.array(CreativeContextPublicationTargetSchema),
    snapshot: z.object({
        workId: z.string(),
        partId: z.string().nullable(),
        authorProfileId: z.string(),
        protocol: z.string(),
        semanticLimit: z.number(),
        resolvedAt: DateStringSchema,
    }),
    counts: z.object({
        parts: z.number(),
        recentBlocks: z.number(),
        semanticUnits: z.number(),
        publicationTargets: z.number(),
        preferredTerms: z.number(),
        bannedTerms: z.number(),
        qualityRules: z.number(),
        techniques: z.number(),
        lexiconReviews: z.number(),
    }),
    requestId: z.string(),
});
