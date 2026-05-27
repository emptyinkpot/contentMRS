import { z } from "zod";
const DateStringSchema = z.string().nullable();
const UnknownRecordSchema = z.record(z.string(), z.unknown());
export const StoryEventSchema = z.object({
    id: z.union([z.string(), z.number()]),
    workId: z.union([z.string(), z.number()]),
    chapterNumber: z.number(),
    eventType: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    charactersInvolved: z.array(z.string()),
    importance: z.string().nullable(),
    createdAt: DateStringSchema,
});
export const CharacterGrowthSchema = z.object({
    id: z.union([z.string(), z.number()]),
    workId: z.union([z.string(), z.number()]),
    characterName: z.string(),
    chapterNumber: z.number(),
    growthType: z.string(),
    before: z.string().nullable(),
    after: z.string().nullable(),
    description: z.string().nullable(),
    createdAt: DateStringSchema,
});
export const ImportantItemSchema = z.object({
    id: z.union([z.string(), z.number()]),
    workId: z.union([z.string(), z.number()]),
    name: z.string(),
    type: z.string(),
    description: z.string().nullable(),
    currentOwner: z.string().nullable(),
    acquiredAt: z.unknown(),
    currentLocation: z.string().nullable(),
    properties: z.unknown(),
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
export const StoryMemoryCountsSchema = z.object({
    events: z.number(),
    characterGrowth: z.number(),
    importantItems: z.number(),
});
export const StoryMemoryResponseSchema = z.object({
    workId: z.number(),
    events: z.array(StoryEventSchema),
    characterGrowth: z.array(CharacterGrowthSchema),
    importantItems: z.array(ImportantItemSchema),
    counts: StoryMemoryCountsSchema,
    requestId: z.string(),
});
export const StoryMemoryContextResponseSchema = z.object({
    workId: z.number(),
    currentChapter: z.number().nullable(),
    summary: z.string(),
    counts: StoryMemoryCountsSchema,
    requestId: z.string(),
});
export const RecordStoryMemoryResultSchema = z.object({
    workId: z.number(),
    chapterNumber: z.number(),
    events: z.number(),
    characterGrowth: z.number(),
    importantItems: z.number(),
});
export const RecordStoryMemoryMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_story_memory"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordStoryMemoryResultSchema,
    requestId: z.string(),
});
export const RecordStoryMemoryPayloadSchema = z.object({
    workId: z.number(),
    chapterNumber: z.number(),
    events: z.array(UnknownRecordSchema).optional(),
    characterGrowth: z.array(UnknownRecordSchema).optional(),
    importantItems: z.array(UnknownRecordSchema).optional(),
});
