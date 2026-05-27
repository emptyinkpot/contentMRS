"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordArticleReferenceUsageReportPayloadSchema = exports.RecordArticleReferenceUsageReportMutationResponseSchema = exports.RecordArticleReferenceUsageReportResultSchema = exports.ArticleReferenceUsageReportSchema = exports.ArticleReferenceUsageSourcePassageSchema = exports.ArticleReferenceUsageAnchorSchema = void 0;
const zod_1 = require("zod");
exports.ArticleReferenceUsageAnchorSchema = zod_1.z.object({
    kind: zod_1.z.enum(["theory", "document", "comparison", "observer", "literary"]),
    name: zod_1.z.string(),
    use: zod_1.z.string(),
    source: zod_1.z.enum([
        "request",
        "creativeContract",
        "semanticUnit",
        "storyMemory",
        "literature",
        "learningEvent",
        "sourcePassage"
    ]),
    sourceId: zod_1.z.string().optional(),
    sectionTitle: zod_1.z.string().optional(),
    required: zod_1.z.boolean().default(false),
});
exports.ArticleReferenceUsageSourcePassageSchema = zod_1.z.object({
    sourceId: zod_1.z.string().optional(),
    title: zod_1.z.string(),
    kind: zod_1.z.enum(["theory", "document", "comparison", "observer", "literary"]),
    excerpt: zod_1.z.string().optional(),
    promotedAnchorNames: zod_1.z.array(zod_1.z.string()).default([]),
    sectionTitles: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.ArticleReferenceUsageReportSchema = zod_1.z.object({
    version: zod_1.z.literal("article-reference-usage-report.v1"),
    articlePlanVersion: zod_1.z.string(),
    topic: zod_1.z.string(),
    target: zod_1.z.string(),
    referenceWeaveVersion: zod_1.z.string(),
    anchors: zod_1.z.array(exports.ArticleReferenceUsageAnchorSchema),
    sourcePassages: zod_1.z.array(exports.ArticleReferenceUsageSourcePassageSchema).default([]),
    sectionUsage: zod_1.z.array(zod_1.z.object({
        sectionTitle: zod_1.z.string(),
        anchorNames: zod_1.z.array(zod_1.z.string()).default([]),
        instruction: zod_1.z.string().optional(),
    })).default([]),
    actualUsage: zod_1.z.object({
        score: zod_1.z.number(),
        threshold: zod_1.z.number(),
        paragraphCount: zod_1.z.number().int().nonnegative(),
        materialBackedParagraphCount: zod_1.z.number().int().nonnegative(),
        materialBackedParagraphRatio: zod_1.z.number(),
        kindCoverage: zod_1.z.record(zod_1.z.string(), zod_1.z.number().int().nonnegative()).default({}),
        matchedAnchorNames: zod_1.z.array(zod_1.z.string()).default([]),
        paragraphs: zod_1.z.array(zod_1.z.object({
            index: zod_1.z.number().int().nonnegative(),
            anchorNames: zod_1.z.array(zod_1.z.string()).default([]),
            kinds: zod_1.z.array(zod_1.z.string()).default([]),
            sourceIds: zod_1.z.array(zod_1.z.string()).default([]),
            excerpt: zod_1.z.string().optional(),
        })).default([]),
    }).optional(),
    contextSources: zod_1.z.object({
        creativeSourceMaterials: zod_1.z.number().int().nonnegative().default(0),
        semanticUnits: zod_1.z.number().int().nonnegative().default(0),
        memoryItems: zod_1.z.number().int().nonnegative().default(0),
        literatureItems: zod_1.z.number().int().nonnegative().default(0),
        learningEvents: zod_1.z.number().int().nonnegative().default(0),
    }),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.RecordArticleReferenceUsageReportResultSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    chapterId: zod_1.z.number().nullable(),
    chapterNumber: zod_1.z.number(),
    partId: zod_1.z.string(),
    blockId: zod_1.z.string(),
    reportId: zod_1.z.string(),
    anchorCount: zod_1.z.number(),
    sectionCount: zod_1.z.number(),
});
exports.RecordArticleReferenceUsageReportMutationResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    action: zod_1.z.literal("record_article_reference_usage_report"),
    idempotencyKey: zod_1.z.string(),
    actor: zod_1.z.string(),
    result: zod_1.z.object({
        affectedRows: zod_1.z.number(),
        insertId: zod_1.z.number(),
        warningStatus: zod_1.z.number(),
    }),
    item: exports.RecordArticleReferenceUsageReportResultSchema,
    requestId: zod_1.z.string(),
});
exports.RecordArticleReferenceUsageReportPayloadSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    chapterId: zod_1.z.number().optional(),
    chapterNumber: zod_1.z.number(),
    partId: zod_1.z.string().optional(),
    reportId: zod_1.z.string().optional(),
    report: exports.ArticleReferenceUsageReportSchema,
    operator: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
