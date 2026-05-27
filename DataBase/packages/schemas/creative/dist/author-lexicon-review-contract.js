import { z } from "zod";
const DateStringSchema = z.string();
export const AuthorLexiconReviewDecisionSchema = z.enum([
    "candidate",
    "approved_preferred",
    "approved_banned",
    "rejected",
]);
export const AuthorLexiconReviewSchema = z.object({
    id: z.number().int().nonnegative(),
    authorProfileId: z.string(),
    term: z.string(),
    decision: AuthorLexiconReviewDecisionSchema,
    sourceKind: z.string(),
    sourceRef: z.string().nullable().optional(),
    reason: z.string(),
    category: z.string(),
    note: z.string().nullable().optional(),
    createdAt: DateStringSchema,
});
export const AuthorLexiconLearningCountsSchema = z.object({
    recentReviews: z.number().int().nonnegative(),
    candidate: z.number().int().nonnegative(),
    approvedPreferred: z.number().int().nonnegative(),
    approvedBanned: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
});
export const AuthorLexiconLearningSchema = z.object({
    recentReviews: z.array(AuthorLexiconReviewSchema),
    counts: AuthorLexiconLearningCountsSchema,
    summary: z.string(),
});
export const RecordAuthorLexiconReviewPayloadSchema = z.object({
    authorProfileId: z.string(),
    term: z.string(),
    decision: AuthorLexiconReviewDecisionSchema,
    sourceKind: z.string(),
    sourceRef: z.string().optional(),
    reason: z.string(),
    category: z.string().optional(),
    note: z.string().optional(),
    alternative: z.string().optional(),
    tags: z.array(z.string()).optional(),
});
export const RecordAuthorLexiconReviewResultSchema = z.object({
    reviewId: z.number().int().nonnegative(),
    authorProfileId: z.string(),
    term: z.string(),
    decision: AuthorLexiconReviewDecisionSchema,
    sourceKind: z.string(),
    sourceRef: z.string().nullable().optional(),
    promotionApplied: z.boolean(),
    promotedTable: z.enum(["vocabulary", "banned_words"]).nullable(),
    activeRecordId: z.string().nullable().optional(),
    activeSummary: z.string().nullable().optional(),
});
export const RecordAuthorLexiconReviewMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_author_lexicon_review"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordAuthorLexiconReviewResultSchema,
    requestId: z.string(),
});
