"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreativeStyleContractSchema = exports.CreativeAuthorTechniqueSchema = exports.CreativeWritingTechniqueSchema = exports.CreativeContractBannedTermSchema = exports.CreativeContractVocabularyTermSchema = exports.CreativeContractSourceMaterialSchema = exports.CreativeContractQualityRuleSchema = exports.CreativeContractEditingStepSchema = exports.CreativeContractModuleSchema = exports.CreativeContractProtocolSchema = exports.CreativeStyleProtocolPayloadSchema = exports.CreativeArticleNarrativeProtocolSchema = exports.CreativeArticleAuthorialConstitutionSchema = exports.CreativeArticleProcessPlanSchema = exports.CreativeConceptualEntrySchema = exports.CreativeLexiconLifecycleSchema = exports.CreativeInterestClusterSchema = exports.CreativeWritingTaskTypeSchema = exports.CreativeAuthorProfileSchema = exports.DEFAULT_CREATIVE_PROTOCOL_ID = void 0;
exports.parseCreativeStyleContract = parseCreativeStyleContract;
const zod_1 = require("zod");
exports.DEFAULT_CREATIVE_PROTOCOL_ID = "immersive_historical_synthetic_narrative";
const UnknownRecordSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
exports.CreativeAuthorProfileSchema = zod_1.z.object({
    id: zod_1.z.string(),
    stance: zod_1.z.string(),
    voice: zod_1.z.array(zod_1.z.string()),
    narrativeTechniques: zod_1.z.array(zod_1.z.string()),
    preferredDiction: zod_1.z.array(zod_1.z.string()),
    rejectedDiction: zod_1.z.array(zod_1.z.string()),
    qualityNorthStar: zod_1.z.string(),
});
exports.CreativeWritingTaskTypeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    goal: zod_1.z.string(),
    requiredInputs: zod_1.z.array(zod_1.z.string()),
    qualitySignals: zod_1.z.array(zod_1.z.string()),
});
exports.CreativeInterestClusterSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    terms: zod_1.z.array(zod_1.z.string()),
    appliesTo: zod_1.z.array(zod_1.z.string()),
});
exports.CreativeLexiconLifecycleSchema = zod_1.z.object({
    activeSource: zod_1.z.string(),
    candidateSource: zod_1.z.string(),
    promotionRule: zod_1.z.string(),
    learningEvents: zod_1.z.string(),
});
exports.CreativeConceptualEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    mechanism: zod_1.z.string(),
    entrySources: zod_1.z.array(zod_1.z.string()),
    forbiddenOpening: zod_1.z.string(),
    preferredOpening: zod_1.z.string(),
});
exports.CreativeArticleProcessPlanSchema = zod_1.z
    .object({
    series: zod_1.z.string().optional(),
    episode: zod_1.z.string().optional(),
    timeBoundary: zod_1.z.string().optional(),
    viewpointBoundary: zod_1.z.string().optional(),
    knowledgeBoundary: zod_1.z.string().optional(),
    sceneEntrances: zod_1.z.array(zod_1.z.string()).optional(),
    eventSequence: zod_1.z.array(zod_1.z.string()).optional(),
    narrativeMoves: zod_1.z.array(zod_1.z.string()).optional(),
    imageMotifs: zod_1.z.array(zod_1.z.string()).optional(),
    pacingRules: zod_1.z.array(zod_1.z.string()).optional(),
    dictionRules: zod_1.z.array(zod_1.z.string()).optional(),
    forbiddenMoves: zod_1.z.array(zod_1.z.string()).optional(),
    endingHook: zod_1.z.string().optional(),
    required: zod_1.z.boolean().optional(),
})
    .catchall(zod_1.z.unknown());
exports.CreativeArticleAuthorialConstitutionSchema = zod_1.z
    .object({
    coreLaw: zod_1.z.string().optional(),
    cannotDo: zod_1.z.array(zod_1.z.string()).optional(),
    blockers: zod_1.z.array(zod_1.z.string()).optional(),
})
    .catchall(zod_1.z.unknown());
exports.CreativeArticleNarrativeProtocolSchema = zod_1.z
    .object({
    required: zod_1.z.boolean().optional(),
    perspective: zod_1.z
        .object({
        mode: zod_1.z.string().optional(),
        rules: zod_1.z.array(zod_1.z.string()).optional(),
        prohibitions: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .catchall(zod_1.z.unknown())
        .optional(),
    ideologicalBlend: zod_1.z
        .array(zod_1.z
        .object({
        name: zod_1.z.string().optional(),
        ratio: zod_1.z.number().optional(),
        keywords: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .catchall(zod_1.z.unknown()))
        .optional(),
    characterMotivationEngine: zod_1.z.array(zod_1.z.string()).optional(),
    narrativeGoal: zod_1.z.string().optional(),
    narrativeDevices: zod_1.z.array(zod_1.z.string()).optional(),
    persuasionStrategy: zod_1.z.array(zod_1.z.string()).optional(),
    ironyMethods: zod_1.z.array(zod_1.z.string()).optional(),
    structureLogic: zod_1.z
        .object({
        opening: zod_1.z.string().optional(),
        development: zod_1.z.string().optional(),
        ending: zod_1.z.string().optional(),
    })
        .catchall(zod_1.z.unknown())
        .optional(),
    lexicalSystem: zod_1.z
        .object({
        prioritySource: zod_1.z.string().optional(),
        preferredVocabulary: zod_1.z.array(zod_1.z.string()).optional(),
        contextualVocabulary: zod_1.z.array(UnknownRecordSchema).optional(),
        contextualRules: zod_1.z.array(zod_1.z.string()).optional(),
        bannedTerms: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .catchall(zod_1.z.unknown())
        .optional(),
    rhetoricalSystem: zod_1.z
        .object({
        metaphorSources: zod_1.z.array(zod_1.z.string()).optional(),
        metaphorStyle: zod_1.z.string().optional(),
        bannedMetaphors: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .catchall(zod_1.z.unknown())
        .optional(),
    sourceUse: zod_1.z
        .object({
        quotationSources: zod_1.z.array(zod_1.z.string()).optional(),
        referenceAnchors: zod_1.z.array(UnknownRecordSchema).optional(),
        citationRules: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .catchall(zod_1.z.unknown())
        .optional(),
    corePrinciples: zod_1.z.array(zod_1.z.string()).optional(),
    formatProhibitions: zod_1.z.array(zod_1.z.string()).optional(),
})
    .catchall(zod_1.z.unknown());
exports.CreativeStyleProtocolPayloadSchema = zod_1.z
    .object({
    ideologicalBlend: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    narrativeGoal: zod_1.z.string().optional(),
    macroMicroLine: zod_1.z.string().optional(),
    authorProfile: exports.CreativeAuthorProfileSchema.optional(),
    writingTaskTypes: zod_1.z.array(exports.CreativeWritingTaskTypeSchema).optional(),
    interestClusters: zod_1.z.array(exports.CreativeInterestClusterSchema).optional(),
    lexiconLifecycle: exports.CreativeLexiconLifecycleSchema.optional(),
    conceptualEntry: exports.CreativeConceptualEntrySchema.optional(),
    processPlan: exports.CreativeArticleProcessPlanSchema.optional(),
    narrativeProtocol: exports.CreativeArticleNarrativeProtocolSchema.optional(),
    authorialConstitution: exports.CreativeArticleAuthorialConstitutionSchema.optional(),
})
    .catchall(zod_1.z.unknown());
exports.CreativeContractProtocolSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    domain: zod_1.z.string(),
    perspectiveRule: zod_1.z.string(),
    toneRule: zod_1.z.string(),
    executionRule: zod_1.z.string(),
    payload: exports.CreativeStyleProtocolPayloadSchema,
});
exports.CreativeContractModuleSchema = zod_1.z.object({
    code: zod_1.z.string(),
    parentCode: zod_1.z.string(),
    category: zod_1.z.string(),
    name: zod_1.z.string(),
    moduleKind: zod_1.z.string(),
    description: zod_1.z.string(),
    payload: zod_1.z.unknown(),
});
exports.CreativeContractEditingStepSchema = zod_1.z.object({
    stepOrder: zod_1.z.number(),
    name: zod_1.z.string(),
    taskSummary: zod_1.z.string(),
    requiredReport: zod_1.z.unknown(),
    hardRules: zod_1.z.unknown(),
});
exports.CreativeContractQualityRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    ruleType: zod_1.z.string(),
    severity: zod_1.z.string(),
    ruleText: zod_1.z.string(),
    checkHint: zod_1.z.string(),
});
exports.CreativeContractSourceMaterialSchema = zod_1.z.object({
    id: zod_1.z.string(),
    category: zod_1.z.string(),
    title: zod_1.z.string(),
    useCase: zod_1.z.string(),
    payload: zod_1.z.unknown(),
});
exports.CreativeContractVocabularyTermSchema = zod_1.z.object({
    word: zod_1.z.string(),
    content: zod_1.z.string(),
    type: zod_1.z.string(),
    category: zod_1.z.string(),
    tags: zod_1.z.unknown(),
    note: zod_1.z.string(),
});
exports.CreativeContractBannedTermSchema = zod_1.z.object({
    word: zod_1.z.string(),
    content: zod_1.z.string(),
    type: zod_1.z.string(),
    category: zod_1.z.string(),
    reason: zod_1.z.string(),
    replacement: zod_1.z.string(),
    alternative: zod_1.z.string(),
});
exports.CreativeWritingTechniqueSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    layer: zod_1.z.string(),
    description: zod_1.z.string(),
    mechanism: zod_1.z.string(),
    suitableFor: zod_1.z.array(zod_1.z.string()),
    avoidWhen: zod_1.z.array(zod_1.z.string()),
    promptInstruction: zod_1.z.string(),
    qualityCheck: zod_1.z.string(),
    status: zod_1.z.string(),
});
exports.CreativeAuthorTechniqueSchema = zod_1.z.object({
    authorProfileId: zod_1.z.string(),
    techniqueId: zod_1.z.string(),
    weight: zod_1.z.number(),
    priority: zod_1.z.string(),
    taskTypes: zod_1.z.array(zod_1.z.string()),
    trigger: zod_1.z.string(),
    constraint: zod_1.z.string(),
    status: zod_1.z.string(),
});
exports.CreativeStyleContractSchema = zod_1.z.object({
    protocol: exports.CreativeContractProtocolSchema,
    modules: zod_1.z.array(exports.CreativeContractModuleSchema),
    editingSteps: zod_1.z.array(exports.CreativeContractEditingStepSchema),
    qualityRules: zod_1.z.array(exports.CreativeContractQualityRuleSchema),
    sourceMaterials: zod_1.z.array(exports.CreativeContractSourceMaterialSchema),
    techniques: zod_1.z.array(exports.CreativeWritingTechniqueSchema),
    authorTechniques: zod_1.z.array(exports.CreativeAuthorTechniqueSchema),
    lexicon: zod_1.z.object({
        preferred: zod_1.z.array(exports.CreativeContractVocabularyTermSchema),
        banned: zod_1.z.array(exports.CreativeContractBannedTermSchema),
    }),
});
function parseCreativeStyleContract(value) {
    return exports.CreativeStyleContractSchema.parse(value);
}
