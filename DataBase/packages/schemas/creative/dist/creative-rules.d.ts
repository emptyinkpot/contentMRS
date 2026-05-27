export type CreativeRuleSeverity = "info" | "warn" | "block";
export type CreativeRuleFixAction = "remove_banned_punctuation" | "remove_ascii_noise" | "rewrite_europeanized_chinese" | "remove_corpus_copy" | "restore_narrative_delta" | "restore_outline_anchor" | "restore_scenery_hook";
export interface CreativeRuleInput {
    text: string;
    taskType?: string;
    narrative?: {
        chapterTitle?: string;
        chapterSummary?: string;
        keyEvents?: string[];
        mustAdvanceBeats?: string[];
        scenePlan?: string;
        previousEndingState?: string;
    };
    sourcePassages?: Array<{
        sourceId?: string;
        title?: string;
        text?: string;
        excerpt?: string;
    }>;
}
export interface CreativeRuleViolation {
    ruleId: string;
    category: string;
    severity: CreativeRuleSeverity;
    message: string;
    fixAction: CreativeRuleFixAction;
    fixInstruction: string;
    excerpt?: string;
    index?: number;
}
export interface CreativeRuleInventoryItem {
    id: string;
    category: string;
    owner: string;
    severity: CreativeRuleSeverity;
    appliesTo: string[];
    definition: string;
    detectorId: string;
    enforcement: string;
    failureMode: string;
    rationale: string;
}
export interface CreativeExecutableRule extends CreativeRuleInventoryItem {
    detect(input: CreativeRuleInput): CreativeRuleViolation[];
}
export interface CreativeRuleInventory {
    rules: CreativeRuleInventoryItem[];
    languageRules: CreativeRuleInventoryItem[];
    narrativeRules: CreativeRuleInventoryItem[];
    styleRules: CreativeRuleInventoryItem[];
    corpusRules: CreativeRuleInventoryItem[];
    qualityRules: CreativeRuleInventoryItem[];
}
/** Maps ContentBase article evaluation task types to creative-rule appliesTo buckets. */
export declare function resolveCreativeRuleTaskType(taskType?: string): string;
export declare const CREATIVE_EXECUTABLE_RULES: CreativeExecutableRule[];
export declare function getCreativeRuleInventory(): CreativeRuleInventory;
export declare function runCreativeRules(input: CreativeRuleInput): CreativeRuleViolation[];
