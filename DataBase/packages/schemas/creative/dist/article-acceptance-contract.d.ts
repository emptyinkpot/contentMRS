import { z } from "zod";
import { type EvidenceFactAtom } from "@emptyinkpot/database-content-contracts";
export declare const ArticleAcceptancePartContractSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    minNonWhitespaceChars: z.ZodDefault<z.ZodNumber>;
    requiredCases: z.ZodDefault<z.ZodArray<z.ZodString>>;
    forbiddenCases: z.ZodDefault<z.ZodArray<z.ZodString>>;
    requiredSources: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const ArticleFactAtomSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        date: "date";
        person: "person";
        organization: "organization";
        location: "location";
        amount: "amount";
        artifact: "artifact";
        event: "event";
        relationship: "relationship";
        legal_status: "legal_status";
        theory_claim: "theory_claim";
        source_anchor: "source_anchor";
    }>;
    value: z.ZodString;
    sourceId: z.ZodString;
    sourceText: z.ZodOptional<z.ZodString>;
    citationId: z.ZodOptional<z.ZodString>;
    blockId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ArticleFactClaimSchema: z.ZodObject<{
    text: z.ZodOptional<z.ZodString>;
    atomIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    inference: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ArticleAcceptancePolicySchema: z.ZodObject<{
    bannedPunctuation: z.ZodDefault<z.ZodArray<z.ZodString>>;
    bannedHeadings: z.ZodDefault<z.ZodArray<z.ZodString>>;
    bannedNarratorPhrases: z.ZodDefault<z.ZodArray<z.ZodString>>;
    bannedAiPhrases: z.ZodDefault<z.ZodArray<z.ZodString>>;
    bannedSyntaxPatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
    bannedInstallmentMarkers: z.ZodDefault<z.ZodArray<z.ZodString>>;
    bannedUnsupportedImageryPatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
    forbidInlineSourceCitations: z.ZodDefault<z.ZodBoolean>;
    inlineSourceCitationPatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
    preferredTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
    minPreferredTermHits: z.ZodDefault<z.ZodNumber>;
    bannedTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
    factBoundaryStrict: z.ZodDefault<z.ZodBoolean>;
    factBoundaryAllowedTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
    factBoundaryIgnoredTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
    factBoundaryForbiddenTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
    factBoundaryRequiredTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
    factBoundaryAtoms: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            date: "date";
            person: "person";
            organization: "organization";
            location: "location";
            amount: "amount";
            artifact: "artifact";
            event: "event";
            relationship: "relationship";
            legal_status: "legal_status";
            theory_claim: "theory_claim";
            source_anchor: "source_anchor";
        }>;
        value: z.ZodString;
        sourceId: z.ZodString;
        sourceText: z.ZodOptional<z.ZodString>;
        citationId: z.ZodOptional<z.ZodString>;
        blockId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    factBoundaryRequiredAtomIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const ArticleAcceptanceContractSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodLiteral<"article-acceptance-contract.v1">>;
    id: z.ZodDefault<z.ZodString>;
    taskType: z.ZodDefault<z.ZodString>;
    seamlessInstallments: z.ZodDefault<z.ZodBoolean>;
    parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        minNonWhitespaceChars: z.ZodDefault<z.ZodNumber>;
        requiredCases: z.ZodDefault<z.ZodArray<z.ZodString>>;
        forbiddenCases: z.ZodDefault<z.ZodArray<z.ZodString>>;
        requiredSources: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>>;
    globalRequiredCases: z.ZodDefault<z.ZodArray<z.ZodString>>;
    globalForbiddenCases: z.ZodDefault<z.ZodArray<z.ZodString>>;
    globalRequiredSources: z.ZodDefault<z.ZodArray<z.ZodString>>;
    policy: z.ZodDefault<z.ZodObject<{
        bannedPunctuation: z.ZodDefault<z.ZodArray<z.ZodString>>;
        bannedHeadings: z.ZodDefault<z.ZodArray<z.ZodString>>;
        bannedNarratorPhrases: z.ZodDefault<z.ZodArray<z.ZodString>>;
        bannedAiPhrases: z.ZodDefault<z.ZodArray<z.ZodString>>;
        bannedSyntaxPatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
        bannedInstallmentMarkers: z.ZodDefault<z.ZodArray<z.ZodString>>;
        bannedUnsupportedImageryPatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
        forbidInlineSourceCitations: z.ZodDefault<z.ZodBoolean>;
        inlineSourceCitationPatterns: z.ZodDefault<z.ZodArray<z.ZodString>>;
        preferredTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
        minPreferredTermHits: z.ZodDefault<z.ZodNumber>;
        bannedTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
        factBoundaryStrict: z.ZodDefault<z.ZodBoolean>;
        factBoundaryAllowedTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
        factBoundaryIgnoredTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
        factBoundaryForbiddenTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
        factBoundaryRequiredTerms: z.ZodDefault<z.ZodArray<z.ZodString>>;
        factBoundaryAtoms: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<{
                date: "date";
                person: "person";
                organization: "organization";
                location: "location";
                amount: "amount";
                artifact: "artifact";
                event: "event";
                relationship: "relationship";
                legal_status: "legal_status";
                theory_claim: "theory_claim";
                source_anchor: "source_anchor";
            }>;
            value: z.ZodString;
            sourceId: z.ZodString;
            sourceText: z.ZodOptional<z.ZodString>;
            citationId: z.ZodOptional<z.ZodString>;
            blockId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        factBoundaryRequiredAtomIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ArticleAcceptancePartContract = z.infer<typeof ArticleAcceptancePartContractSchema>;
export type ArticleFactAtom = EvidenceFactAtom;
export type ArticleFactClaim = z.infer<typeof ArticleFactClaimSchema>;
export type ArticleAcceptancePolicy = z.infer<typeof ArticleAcceptancePolicySchema>;
export type ArticleAcceptanceContract = z.infer<typeof ArticleAcceptanceContractSchema>;
export interface ArticleAcceptanceInput {
    body?: string;
    partBodies?: Array<{
        id?: string;
        title?: string;
        body: string;
    }>;
    contract: unknown;
    factClaims?: ArticleFactClaim[];
    sourcePassages?: Array<{
        sourceId?: string;
        title?: string;
        text?: string;
        excerpt?: string;
    }>;
}
export interface ArticleAcceptanceViolation {
    ruleId: string;
    severity: "block" | "warn";
    category: string;
    message: string;
    excerpt?: string;
    partId?: string;
}
export interface ArticleAcceptanceReport {
    version: "article-acceptance-report.v1";
    passed: boolean;
    contractId: string;
    violations: ArticleAcceptanceViolation[];
    metrics: {
        partCount: number;
        totalNonWhitespaceChars: number;
        wordCounts: Array<{
            partId: string;
            nonWhitespaceChars: number;
            minNonWhitespaceChars: number;
        }>;
        requiredCaseCoverage: Record<string, boolean>;
        forbiddenCaseHits: string[];
        requiredSourceCoverage: Record<string, boolean>;
        preferredTermHits: number;
        bannedTermHits: string[];
        creativeRuleBlockCount: number;
        factBoundary: {
            strict: boolean;
            atomCount: number;
            claimCount: number;
            usedAtomIds: string[];
            unauthorizedAtomIds: string[];
            missingRequiredAtomIds: string[];
            unboundClaimCount: number;
        };
    };
}
export declare const ArticleAcceptanceViolationSchema: z.ZodObject<{
    ruleId: z.ZodString;
    severity: z.ZodEnum<{
        warn: "warn";
        block: "block";
    }>;
    category: z.ZodString;
    message: z.ZodString;
    excerpt: z.ZodOptional<z.ZodString>;
    partId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ArticleAcceptanceReportSchema: z.ZodObject<{
    version: z.ZodLiteral<"article-acceptance-report.v1">;
    passed: z.ZodBoolean;
    contractId: z.ZodString;
    violations: z.ZodArray<z.ZodObject<{
        ruleId: z.ZodString;
        severity: z.ZodEnum<{
            warn: "warn";
            block: "block";
        }>;
        category: z.ZodString;
        message: z.ZodString;
        excerpt: z.ZodOptional<z.ZodString>;
        partId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    metrics: z.ZodObject<{
        partCount: z.ZodNumber;
        totalNonWhitespaceChars: z.ZodNumber;
        wordCounts: z.ZodArray<z.ZodObject<{
            partId: z.ZodString;
            nonWhitespaceChars: z.ZodNumber;
            minNonWhitespaceChars: z.ZodNumber;
        }, z.core.$strip>>;
        requiredCaseCoverage: z.ZodRecord<z.ZodString, z.ZodBoolean>;
        forbiddenCaseHits: z.ZodArray<z.ZodString>;
        requiredSourceCoverage: z.ZodRecord<z.ZodString, z.ZodBoolean>;
        preferredTermHits: z.ZodNumber;
        bannedTermHits: z.ZodArray<z.ZodString>;
        creativeRuleBlockCount: z.ZodNumber;
        factBoundary: z.ZodObject<{
            strict: z.ZodBoolean;
            atomCount: z.ZodNumber;
            claimCount: z.ZodNumber;
            usedAtomIds: z.ZodArray<z.ZodString>;
            unauthorizedAtomIds: z.ZodArray<z.ZodString>;
            missingRequiredAtomIds: z.ZodArray<z.ZodString>;
            unboundClaimCount: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const RecordArticleAcceptanceReportResultSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterId: z.ZodNullable<z.ZodNumber>;
    chapterNumber: z.ZodNumber;
    partId: z.ZodString;
    blockId: z.ZodString;
    reportId: z.ZodString;
    passed: z.ZodBoolean;
    contractId: z.ZodString;
    blockCount: z.ZodNumber;
    warningCount: z.ZodNumber;
}, z.core.$strip>;
export type RecordArticleAcceptanceReportResult = z.infer<typeof RecordArticleAcceptanceReportResultSchema>;
export declare const RecordArticleAcceptanceReportMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_article_acceptance_report">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        workId: z.ZodNumber;
        chapterId: z.ZodNullable<z.ZodNumber>;
        chapterNumber: z.ZodNumber;
        partId: z.ZodString;
        blockId: z.ZodString;
        reportId: z.ZodString;
        passed: z.ZodBoolean;
        contractId: z.ZodString;
        blockCount: z.ZodNumber;
        warningCount: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordArticleAcceptanceReportMutationResponse = z.infer<typeof RecordArticleAcceptanceReportMutationResponseSchema>;
export declare const RecordArticleAcceptanceReportPayloadSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterId: z.ZodOptional<z.ZodNumber>;
    chapterNumber: z.ZodNumber;
    partId: z.ZodOptional<z.ZodString>;
    reportId: z.ZodOptional<z.ZodString>;
    report: z.ZodObject<{
        version: z.ZodLiteral<"article-acceptance-report.v1">;
        passed: z.ZodBoolean;
        contractId: z.ZodString;
        violations: z.ZodArray<z.ZodObject<{
            ruleId: z.ZodString;
            severity: z.ZodEnum<{
                warn: "warn";
                block: "block";
            }>;
            category: z.ZodString;
            message: z.ZodString;
            excerpt: z.ZodOptional<z.ZodString>;
            partId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        metrics: z.ZodObject<{
            partCount: z.ZodNumber;
            totalNonWhitespaceChars: z.ZodNumber;
            wordCounts: z.ZodArray<z.ZodObject<{
                partId: z.ZodString;
                nonWhitespaceChars: z.ZodNumber;
                minNonWhitespaceChars: z.ZodNumber;
            }, z.core.$strip>>;
            requiredCaseCoverage: z.ZodRecord<z.ZodString, z.ZodBoolean>;
            forbiddenCaseHits: z.ZodArray<z.ZodString>;
            requiredSourceCoverage: z.ZodRecord<z.ZodString, z.ZodBoolean>;
            preferredTermHits: z.ZodNumber;
            bannedTermHits: z.ZodArray<z.ZodString>;
            creativeRuleBlockCount: z.ZodNumber;
            factBoundary: z.ZodObject<{
                strict: z.ZodBoolean;
                atomCount: z.ZodNumber;
                claimCount: z.ZodNumber;
                usedAtomIds: z.ZodArray<z.ZodString>;
                unauthorizedAtomIds: z.ZodArray<z.ZodString>;
                missingRequiredAtomIds: z.ZodArray<z.ZodString>;
                unboundClaimCount: z.ZodNumber;
            }, z.core.$strip>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    operator: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RecordArticleAcceptanceReportPayload = z.infer<typeof RecordArticleAcceptanceReportPayloadSchema>;
export declare function parseArticleAcceptanceContract(value: unknown): ArticleAcceptanceContract;
export declare function runArticleAcceptance(input: ArticleAcceptanceInput): ArticleAcceptanceReport;
