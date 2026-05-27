import { z } from "zod";
export declare const ArticleReferenceUsageAnchorSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        theory: "theory";
        document: "document";
        comparison: "comparison";
        observer: "observer";
        literary: "literary";
    }>;
    name: z.ZodString;
    use: z.ZodString;
    source: z.ZodEnum<{
        request: "request";
        creativeContract: "creativeContract";
        semanticUnit: "semanticUnit";
        storyMemory: "storyMemory";
        literature: "literature";
        learningEvent: "learningEvent";
        sourcePassage: "sourcePassage";
    }>;
    sourceId: z.ZodOptional<z.ZodString>;
    sectionTitle: z.ZodOptional<z.ZodString>;
    required: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ArticleReferenceUsageSourcePassageSchema: z.ZodObject<{
    sourceId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    kind: z.ZodEnum<{
        theory: "theory";
        document: "document";
        comparison: "comparison";
        observer: "observer";
        literary: "literary";
    }>;
    excerpt: z.ZodOptional<z.ZodString>;
    promotedAnchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
    sectionTitles: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const ArticleReferenceUsageReportSchema: z.ZodObject<{
    version: z.ZodLiteral<"article-reference-usage-report.v1">;
    articlePlanVersion: z.ZodString;
    topic: z.ZodString;
    target: z.ZodString;
    referenceWeaveVersion: z.ZodString;
    anchors: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            theory: "theory";
            document: "document";
            comparison: "comparison";
            observer: "observer";
            literary: "literary";
        }>;
        name: z.ZodString;
        use: z.ZodString;
        source: z.ZodEnum<{
            request: "request";
            creativeContract: "creativeContract";
            semanticUnit: "semanticUnit";
            storyMemory: "storyMemory";
            literature: "literature";
            learningEvent: "learningEvent";
            sourcePassage: "sourcePassage";
        }>;
        sourceId: z.ZodOptional<z.ZodString>;
        sectionTitle: z.ZodOptional<z.ZodString>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    sourcePassages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sourceId: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        kind: z.ZodEnum<{
            theory: "theory";
            document: "document";
            comparison: "comparison";
            observer: "observer";
            literary: "literary";
        }>;
        excerpt: z.ZodOptional<z.ZodString>;
        promotedAnchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
        sectionTitles: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>>;
    sectionUsage: z.ZodDefault<z.ZodArray<z.ZodObject<{
        sectionTitle: z.ZodString;
        anchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
        instruction: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    actualUsage: z.ZodOptional<z.ZodObject<{
        score: z.ZodNumber;
        threshold: z.ZodNumber;
        paragraphCount: z.ZodNumber;
        materialBackedParagraphCount: z.ZodNumber;
        materialBackedParagraphRatio: z.ZodNumber;
        kindCoverage: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        matchedAnchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
        paragraphs: z.ZodDefault<z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            anchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
            kinds: z.ZodDefault<z.ZodArray<z.ZodString>>;
            sourceIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
            excerpt: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    contextSources: z.ZodObject<{
        creativeSourceMaterials: z.ZodDefault<z.ZodNumber>;
        semanticUnits: z.ZodDefault<z.ZodNumber>;
        memoryItems: z.ZodDefault<z.ZodNumber>;
        literatureItems: z.ZodDefault<z.ZodNumber>;
        learningEvents: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type ArticleReferenceUsageAnchor = z.infer<typeof ArticleReferenceUsageAnchorSchema>;
export type ArticleReferenceUsageSourcePassage = z.infer<typeof ArticleReferenceUsageSourcePassageSchema>;
export type ArticleReferenceUsageReport = z.infer<typeof ArticleReferenceUsageReportSchema>;
export declare const RecordArticleReferenceUsageReportResultSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterId: z.ZodNullable<z.ZodNumber>;
    chapterNumber: z.ZodNumber;
    partId: z.ZodString;
    blockId: z.ZodString;
    reportId: z.ZodString;
    anchorCount: z.ZodNumber;
    sectionCount: z.ZodNumber;
}, z.core.$strip>;
export type RecordArticleReferenceUsageReportResult = z.infer<typeof RecordArticleReferenceUsageReportResultSchema>;
export declare const RecordArticleReferenceUsageReportMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_article_reference_usage_report">;
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
        anchorCount: z.ZodNumber;
        sectionCount: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordArticleReferenceUsageReportMutationResponse = z.infer<typeof RecordArticleReferenceUsageReportMutationResponseSchema>;
export declare const RecordArticleReferenceUsageReportPayloadSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterId: z.ZodOptional<z.ZodNumber>;
    chapterNumber: z.ZodNumber;
    partId: z.ZodOptional<z.ZodString>;
    reportId: z.ZodOptional<z.ZodString>;
    report: z.ZodObject<{
        version: z.ZodLiteral<"article-reference-usage-report.v1">;
        articlePlanVersion: z.ZodString;
        topic: z.ZodString;
        target: z.ZodString;
        referenceWeaveVersion: z.ZodString;
        anchors: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                theory: "theory";
                document: "document";
                comparison: "comparison";
                observer: "observer";
                literary: "literary";
            }>;
            name: z.ZodString;
            use: z.ZodString;
            source: z.ZodEnum<{
                request: "request";
                creativeContract: "creativeContract";
                semanticUnit: "semanticUnit";
                storyMemory: "storyMemory";
                literature: "literature";
                learningEvent: "learningEvent";
                sourcePassage: "sourcePassage";
            }>;
            sourceId: z.ZodOptional<z.ZodString>;
            sectionTitle: z.ZodOptional<z.ZodString>;
            required: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>;
        sourcePassages: z.ZodDefault<z.ZodArray<z.ZodObject<{
            sourceId: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            kind: z.ZodEnum<{
                theory: "theory";
                document: "document";
                comparison: "comparison";
                observer: "observer";
                literary: "literary";
            }>;
            excerpt: z.ZodOptional<z.ZodString>;
            promotedAnchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
            sectionTitles: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>>;
        sectionUsage: z.ZodDefault<z.ZodArray<z.ZodObject<{
            sectionTitle: z.ZodString;
            anchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
            instruction: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        actualUsage: z.ZodOptional<z.ZodObject<{
            score: z.ZodNumber;
            threshold: z.ZodNumber;
            paragraphCount: z.ZodNumber;
            materialBackedParagraphCount: z.ZodNumber;
            materialBackedParagraphRatio: z.ZodNumber;
            kindCoverage: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            matchedAnchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
            paragraphs: z.ZodDefault<z.ZodArray<z.ZodObject<{
                index: z.ZodNumber;
                anchorNames: z.ZodDefault<z.ZodArray<z.ZodString>>;
                kinds: z.ZodDefault<z.ZodArray<z.ZodString>>;
                sourceIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
                excerpt: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
        }, z.core.$strip>>;
        contextSources: z.ZodObject<{
            creativeSourceMaterials: z.ZodDefault<z.ZodNumber>;
            semanticUnits: z.ZodDefault<z.ZodNumber>;
            memoryItems: z.ZodDefault<z.ZodNumber>;
            literatureItems: z.ZodDefault<z.ZodNumber>;
            learningEvents: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        warnings: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
    operator: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RecordArticleReferenceUsageReportPayload = z.infer<typeof RecordArticleReferenceUsageReportPayloadSchema>;
