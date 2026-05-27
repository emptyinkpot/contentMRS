import { z } from "zod";
export const ArticleReferenceUsageAnchorSchema = z.object({
    kind: z.enum(["theory", "document", "comparison", "observer", "literary"]),
    name: z.string(),
    use: z.string(),
    source: z.enum([
        "request",
        "creativeContract",
        "semanticUnit",
        "storyMemory",
        "literature",
        "learningEvent",
        "sourcePassage"
    ]),
    sourceId: z.string().optional(),
    sectionTitle: z.string().optional(),
    required: z.boolean().default(false),
});
export const ArticleReferenceUsageSourcePassageSchema = z.object({
    sourceId: z.string().optional(),
    title: z.string(),
    kind: z.enum(["theory", "document", "comparison", "observer", "literary"]),
    excerpt: z.string().optional(),
    promotedAnchorNames: z.array(z.string()).default([]),
    sectionTitles: z.array(z.string()).default([]),
});
export const ArticleReferenceUsageReportSchema = z.object({
    version: z.literal("article-reference-usage-report.v1"),
    articlePlanVersion: z.string(),
    topic: z.string(),
    target: z.string(),
    referenceWeaveVersion: z.string(),
    anchors: z.array(ArticleReferenceUsageAnchorSchema),
    sourcePassages: z.array(ArticleReferenceUsageSourcePassageSchema).default([]),
    sectionUsage: z.array(z.object({
        sectionTitle: z.string(),
        anchorNames: z.array(z.string()).default([]),
        instruction: z.string().optional(),
    })).default([]),
    actualUsage: z.object({
        score: z.number(),
        threshold: z.number(),
        paragraphCount: z.number().int().nonnegative(),
        materialBackedParagraphCount: z.number().int().nonnegative(),
        materialBackedParagraphRatio: z.number(),
        kindCoverage: z.record(z.string(), z.number().int().nonnegative()).default({}),
        matchedAnchorNames: z.array(z.string()).default([]),
        paragraphs: z.array(z.object({
            index: z.number().int().nonnegative(),
            anchorNames: z.array(z.string()).default([]),
            kinds: z.array(z.string()).default([]),
            sourceIds: z.array(z.string()).default([]),
            excerpt: z.string().optional(),
        })).default([]),
    }).optional(),
    contextSources: z.object({
        creativeSourceMaterials: z.number().int().nonnegative().default(0),
        semanticUnits: z.number().int().nonnegative().default(0),
        memoryItems: z.number().int().nonnegative().default(0),
        literatureItems: z.number().int().nonnegative().default(0),
        learningEvents: z.number().int().nonnegative().default(0),
    }),
    warnings: z.array(z.string()).default([]),
});
export const RecordArticleReferenceUsageReportResultSchema = z.object({
    workId: z.number(),
    chapterId: z.number().nullable(),
    chapterNumber: z.number(),
    partId: z.string(),
    blockId: z.string(),
    reportId: z.string(),
    anchorCount: z.number(),
    sectionCount: z.number(),
});
export const RecordArticleReferenceUsageReportMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_article_reference_usage_report"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordArticleReferenceUsageReportResultSchema,
    requestId: z.string(),
});
export const RecordArticleReferenceUsageReportPayloadSchema = z.object({
    workId: z.number(),
    chapterId: z.number().optional(),
    chapterNumber: z.number(),
    partId: z.string().optional(),
    reportId: z.string().optional(),
    report: ArticleReferenceUsageReportSchema,
    operator: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
