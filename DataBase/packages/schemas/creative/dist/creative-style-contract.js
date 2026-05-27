import { z } from "zod";
export const DEFAULT_CREATIVE_PROTOCOL_ID = "immersive_historical_synthetic_narrative";
const UnknownRecordSchema = z.record(z.string(), z.unknown());
export const CreativeAuthorProfileSchema = z.object({
    id: z.string(),
    stance: z.string(),
    voice: z.array(z.string()),
    narrativeTechniques: z.array(z.string()),
    preferredDiction: z.array(z.string()),
    rejectedDiction: z.array(z.string()),
    qualityNorthStar: z.string(),
});
export const CreativeWritingTaskTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    goal: z.string(),
    requiredInputs: z.array(z.string()),
    qualitySignals: z.array(z.string()),
});
export const CreativeInterestClusterSchema = z.object({
    id: z.string(),
    name: z.string(),
    terms: z.array(z.string()),
    appliesTo: z.array(z.string()),
});
export const CreativeLexiconLifecycleSchema = z.object({
    activeSource: z.string(),
    candidateSource: z.string(),
    promotionRule: z.string(),
    learningEvents: z.string(),
});
export const CreativeConceptualEntrySchema = z.object({
    id: z.string(),
    name: z.string(),
    mechanism: z.string(),
    entrySources: z.array(z.string()),
    forbiddenOpening: z.string(),
    preferredOpening: z.string(),
});
export const CreativeArticleProcessPlanSchema = z
    .object({
    series: z.string().optional(),
    episode: z.string().optional(),
    timeBoundary: z.string().optional(),
    viewpointBoundary: z.string().optional(),
    knowledgeBoundary: z.string().optional(),
    sceneEntrances: z.array(z.string()).optional(),
    eventSequence: z.array(z.string()).optional(),
    narrativeMoves: z.array(z.string()).optional(),
    imageMotifs: z.array(z.string()).optional(),
    pacingRules: z.array(z.string()).optional(),
    dictionRules: z.array(z.string()).optional(),
    forbiddenMoves: z.array(z.string()).optional(),
    endingHook: z.string().optional(),
    required: z.boolean().optional(),
})
    .catchall(z.unknown());
export const CreativeArticleAuthorialConstitutionSchema = z
    .object({
    coreLaw: z.string().optional(),
    cannotDo: z.array(z.string()).optional(),
    blockers: z.array(z.string()).optional(),
})
    .catchall(z.unknown());
export const CreativeArticleNarrativeProtocolSchema = z
    .object({
    required: z.boolean().optional(),
    perspective: z
        .object({
        mode: z.string().optional(),
        rules: z.array(z.string()).optional(),
        prohibitions: z.array(z.string()).optional(),
    })
        .catchall(z.unknown())
        .optional(),
    ideologicalBlend: z
        .array(z
        .object({
        name: z.string().optional(),
        ratio: z.number().optional(),
        keywords: z.array(z.string()).optional(),
    })
        .catchall(z.unknown()))
        .optional(),
    characterMotivationEngine: z.array(z.string()).optional(),
    narrativeGoal: z.string().optional(),
    narrativeDevices: z.array(z.string()).optional(),
    persuasionStrategy: z.array(z.string()).optional(),
    ironyMethods: z.array(z.string()).optional(),
    structureLogic: z
        .object({
        opening: z.string().optional(),
        development: z.string().optional(),
        ending: z.string().optional(),
    })
        .catchall(z.unknown())
        .optional(),
    lexicalSystem: z
        .object({
        prioritySource: z.string().optional(),
        preferredVocabulary: z.array(z.string()).optional(),
        contextualVocabulary: z.array(UnknownRecordSchema).optional(),
        contextualRules: z.array(z.string()).optional(),
        bannedTerms: z.array(z.string()).optional(),
    })
        .catchall(z.unknown())
        .optional(),
    rhetoricalSystem: z
        .object({
        metaphorSources: z.array(z.string()).optional(),
        metaphorStyle: z.string().optional(),
        bannedMetaphors: z.array(z.string()).optional(),
    })
        .catchall(z.unknown())
        .optional(),
    sourceUse: z
        .object({
        quotationSources: z.array(z.string()).optional(),
        referenceAnchors: z.array(UnknownRecordSchema).optional(),
        citationRules: z.array(z.string()).optional(),
    })
        .catchall(z.unknown())
        .optional(),
    corePrinciples: z.array(z.string()).optional(),
    formatProhibitions: z.array(z.string()).optional(),
})
    .catchall(z.unknown());
export const CreativeStyleProtocolPayloadSchema = z
    .object({
    ideologicalBlend: z.record(z.string(), z.number()).optional(),
    narrativeGoal: z.string().optional(),
    macroMicroLine: z.string().optional(),
    authorProfile: CreativeAuthorProfileSchema.optional(),
    writingTaskTypes: z.array(CreativeWritingTaskTypeSchema).optional(),
    interestClusters: z.array(CreativeInterestClusterSchema).optional(),
    lexiconLifecycle: CreativeLexiconLifecycleSchema.optional(),
    conceptualEntry: CreativeConceptualEntrySchema.optional(),
    processPlan: CreativeArticleProcessPlanSchema.optional(),
    narrativeProtocol: CreativeArticleNarrativeProtocolSchema.optional(),
    authorialConstitution: CreativeArticleAuthorialConstitutionSchema.optional(),
})
    .catchall(z.unknown());
export const CreativeContractProtocolSchema = z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string(),
    perspectiveRule: z.string(),
    toneRule: z.string(),
    executionRule: z.string(),
    payload: CreativeStyleProtocolPayloadSchema,
});
export const CreativeContractModuleSchema = z.object({
    code: z.string(),
    parentCode: z.string(),
    category: z.string(),
    name: z.string(),
    moduleKind: z.string(),
    description: z.string(),
    payload: z.unknown(),
});
export const CreativeContractEditingStepSchema = z.object({
    stepOrder: z.number(),
    name: z.string(),
    taskSummary: z.string(),
    requiredReport: z.unknown(),
    hardRules: z.unknown(),
});
export const CreativeContractQualityRuleSchema = z.object({
    id: z.string(),
    ruleType: z.string(),
    severity: z.string(),
    ruleText: z.string(),
    checkHint: z.string(),
});
export const CreativeContractSourceMaterialSchema = z.object({
    id: z.string(),
    category: z.string(),
    title: z.string(),
    useCase: z.string(),
    payload: z.unknown(),
});
export const CreativeContractVocabularyTermSchema = z.object({
    word: z.string(),
    content: z.string(),
    type: z.string(),
    category: z.string(),
    tags: z.unknown(),
    note: z.string(),
});
export const CreativeContractBannedTermSchema = z.object({
    word: z.string(),
    content: z.string(),
    type: z.string(),
    category: z.string(),
    reason: z.string(),
    replacement: z.string(),
    alternative: z.string(),
});
export const CreativeWritingTechniqueSchema = z.object({
    id: z.string(),
    name: z.string(),
    layer: z.string(),
    description: z.string(),
    mechanism: z.string(),
    suitableFor: z.array(z.string()),
    avoidWhen: z.array(z.string()),
    promptInstruction: z.string(),
    qualityCheck: z.string(),
    status: z.string(),
});
export const CreativeAuthorTechniqueSchema = z.object({
    authorProfileId: z.string(),
    techniqueId: z.string(),
    weight: z.number(),
    priority: z.string(),
    taskTypes: z.array(z.string()),
    trigger: z.string(),
    constraint: z.string(),
    status: z.string(),
});
export const CreativeStyleContractSchema = z.object({
    protocol: CreativeContractProtocolSchema,
    modules: z.array(CreativeContractModuleSchema),
    editingSteps: z.array(CreativeContractEditingStepSchema),
    qualityRules: z.array(CreativeContractQualityRuleSchema),
    sourceMaterials: z.array(CreativeContractSourceMaterialSchema),
    techniques: z.array(CreativeWritingTechniqueSchema),
    authorTechniques: z.array(CreativeAuthorTechniqueSchema),
    lexicon: z.object({
        preferred: z.array(CreativeContractVocabularyTermSchema),
        banned: z.array(CreativeContractBannedTermSchema),
    }),
});
export function parseCreativeStyleContract(value) {
    return CreativeStyleContractSchema.parse(value);
}
