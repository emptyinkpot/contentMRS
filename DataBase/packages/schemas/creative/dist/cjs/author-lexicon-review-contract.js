"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordAuthorLexiconReviewMutationResponseSchema = exports.RecordAuthorLexiconReviewResultSchema = exports.RecordAuthorLexiconReviewPayloadSchema = exports.AuthorLexiconLearningSchema = exports.AuthorLexiconLearningCountsSchema = exports.AuthorLexiconReviewSchema = exports.AuthorLexiconReviewDecisionSchema = void 0;
const zod_1 = require("zod");
const DateStringSchema = zod_1.z.string();
exports.AuthorLexiconReviewDecisionSchema = zod_1.z.enum([
    "candidate",
    "approved_preferred",
    "approved_banned",
    "rejected",
]);
exports.AuthorLexiconReviewSchema = zod_1.z.object({
    id: zod_1.z.number().int().nonnegative(),
    authorProfileId: zod_1.z.string(),
    term: zod_1.z.string(),
    decision: exports.AuthorLexiconReviewDecisionSchema,
    sourceKind: zod_1.z.string(),
    sourceRef: zod_1.z.string().nullable().optional(),
    reason: zod_1.z.string(),
    category: zod_1.z.string(),
    note: zod_1.z.string().nullable().optional(),
    createdAt: DateStringSchema,
});
exports.AuthorLexiconLearningCountsSchema = zod_1.z.object({
    recentReviews: zod_1.z.number().int().nonnegative(),
    candidate: zod_1.z.number().int().nonnegative(),
    approvedPreferred: zod_1.z.number().int().nonnegative(),
    approvedBanned: zod_1.z.number().int().nonnegative(),
    rejected: zod_1.z.number().int().nonnegative(),
});
exports.AuthorLexiconLearningSchema = zod_1.z.object({
    recentReviews: zod_1.z.array(exports.AuthorLexiconReviewSchema),
    counts: exports.AuthorLexiconLearningCountsSchema,
    summary: zod_1.z.string(),
});
exports.RecordAuthorLexiconReviewPayloadSchema = zod_1.z.object({
    authorProfileId: zod_1.z.string(),
    term: zod_1.z.string(),
    decision: exports.AuthorLexiconReviewDecisionSchema,
    sourceKind: zod_1.z.string(),
    sourceRef: zod_1.z.string().optional(),
    reason: zod_1.z.string(),
    category: zod_1.z.string().optional(),
    note: zod_1.z.string().optional(),
    alternative: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.RecordAuthorLexiconReviewResultSchema = zod_1.z.object({
    reviewId: zod_1.z.number().int().nonnegative(),
    authorProfileId: zod_1.z.string(),
    term: zod_1.z.string(),
    decision: exports.AuthorLexiconReviewDecisionSchema,
    sourceKind: zod_1.z.string(),
    sourceRef: zod_1.z.string().nullable().optional(),
    promotionApplied: zod_1.z.boolean(),
    promotedTable: zod_1.z.enum(["vocabulary", "banned_words"]).nullable(),
    activeRecordId: zod_1.z.string().nullable().optional(),
    activeSummary: zod_1.z.string().nullable().optional(),
});
exports.RecordAuthorLexiconReviewMutationResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    action: zod_1.z.literal("record_author_lexicon_review"),
    idempotencyKey: zod_1.z.string(),
    actor: zod_1.z.string(),
    result: zod_1.z.object({
        affectedRows: zod_1.z.number(),
        insertId: zod_1.z.number(),
        warningStatus: zod_1.z.number(),
    }),
    item: exports.RecordAuthorLexiconReviewResultSchema,
    requestId: zod_1.z.string(),
});
