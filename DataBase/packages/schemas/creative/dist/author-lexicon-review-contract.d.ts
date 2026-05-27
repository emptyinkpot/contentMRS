import { z } from "zod";
export declare const AuthorLexiconReviewDecisionSchema: z.ZodEnum<{
    candidate: "candidate";
    approved_preferred: "approved_preferred";
    approved_banned: "approved_banned";
    rejected: "rejected";
}>;
export type AuthorLexiconReviewDecision = z.infer<typeof AuthorLexiconReviewDecisionSchema>;
export declare const AuthorLexiconReviewSchema: z.ZodObject<{
    id: z.ZodNumber;
    authorProfileId: z.ZodString;
    term: z.ZodString;
    decision: z.ZodEnum<{
        candidate: "candidate";
        approved_preferred: "approved_preferred";
        approved_banned: "approved_banned";
        rejected: "rejected";
    }>;
    sourceKind: z.ZodString;
    sourceRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodString;
    category: z.ZodString;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type AuthorLexiconReview = z.infer<typeof AuthorLexiconReviewSchema>;
export declare const AuthorLexiconLearningCountsSchema: z.ZodObject<{
    recentReviews: z.ZodNumber;
    candidate: z.ZodNumber;
    approvedPreferred: z.ZodNumber;
    approvedBanned: z.ZodNumber;
    rejected: z.ZodNumber;
}, z.core.$strip>;
export type AuthorLexiconLearningCounts = z.infer<typeof AuthorLexiconLearningCountsSchema>;
export declare const AuthorLexiconLearningSchema: z.ZodObject<{
    recentReviews: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        authorProfileId: z.ZodString;
        term: z.ZodString;
        decision: z.ZodEnum<{
            candidate: "candidate";
            approved_preferred: "approved_preferred";
            approved_banned: "approved_banned";
            rejected: "rejected";
        }>;
        sourceKind: z.ZodString;
        sourceRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        reason: z.ZodString;
        category: z.ZodString;
        note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodString;
    }, z.core.$strip>>;
    counts: z.ZodObject<{
        recentReviews: z.ZodNumber;
        candidate: z.ZodNumber;
        approvedPreferred: z.ZodNumber;
        approvedBanned: z.ZodNumber;
        rejected: z.ZodNumber;
    }, z.core.$strip>;
    summary: z.ZodString;
}, z.core.$strip>;
export type AuthorLexiconLearning = z.infer<typeof AuthorLexiconLearningSchema>;
export declare const RecordAuthorLexiconReviewPayloadSchema: z.ZodObject<{
    authorProfileId: z.ZodString;
    term: z.ZodString;
    decision: z.ZodEnum<{
        candidate: "candidate";
        approved_preferred: "approved_preferred";
        approved_banned: "approved_banned";
        rejected: "rejected";
    }>;
    sourceKind: z.ZodString;
    sourceRef: z.ZodOptional<z.ZodString>;
    reason: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    alternative: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type RecordAuthorLexiconReviewPayload = z.infer<typeof RecordAuthorLexiconReviewPayloadSchema>;
export declare const RecordAuthorLexiconReviewResultSchema: z.ZodObject<{
    reviewId: z.ZodNumber;
    authorProfileId: z.ZodString;
    term: z.ZodString;
    decision: z.ZodEnum<{
        candidate: "candidate";
        approved_preferred: "approved_preferred";
        approved_banned: "approved_banned";
        rejected: "rejected";
    }>;
    sourceKind: z.ZodString;
    sourceRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    promotionApplied: z.ZodBoolean;
    promotedTable: z.ZodNullable<z.ZodEnum<{
        vocabulary: "vocabulary";
        banned_words: "banned_words";
    }>>;
    activeRecordId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    activeSummary: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type RecordAuthorLexiconReviewResult = z.infer<typeof RecordAuthorLexiconReviewResultSchema>;
export declare const RecordAuthorLexiconReviewMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_author_lexicon_review">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        reviewId: z.ZodNumber;
        authorProfileId: z.ZodString;
        term: z.ZodString;
        decision: z.ZodEnum<{
            candidate: "candidate";
            approved_preferred: "approved_preferred";
            approved_banned: "approved_banned";
            rejected: "rejected";
        }>;
        sourceKind: z.ZodString;
        sourceRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        promotionApplied: z.ZodBoolean;
        promotedTable: z.ZodNullable<z.ZodEnum<{
            vocabulary: "vocabulary";
            banned_words: "banned_words";
        }>>;
        activeRecordId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        activeSummary: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordAuthorLexiconReviewMutationResponse = z.infer<typeof RecordAuthorLexiconReviewMutationResponseSchema>;
