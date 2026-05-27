"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordStoryMemoryPayloadSchema = exports.RecordStoryMemoryMutationResponseSchema = exports.RecordStoryMemoryResultSchema = exports.StoryMemoryContextResponseSchema = exports.StoryMemoryResponseSchema = exports.StoryMemoryCountsSchema = exports.ImportantItemSchema = exports.CharacterGrowthSchema = exports.StoryEventSchema = void 0;
const zod_1 = require("zod");
const DateStringSchema = zod_1.z.string().nullable();
const UnknownRecordSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
exports.StoryEventSchema = zod_1.z.object({
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    workId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    chapterNumber: zod_1.z.number(),
    eventType: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    charactersInvolved: zod_1.z.array(zod_1.z.string()),
    importance: zod_1.z.string().nullable(),
    createdAt: DateStringSchema,
});
exports.CharacterGrowthSchema = zod_1.z.object({
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    workId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    characterName: zod_1.z.string(),
    chapterNumber: zod_1.z.number(),
    growthType: zod_1.z.string(),
    before: zod_1.z.string().nullable(),
    after: zod_1.z.string().nullable(),
    description: zod_1.z.string().nullable(),
    createdAt: DateStringSchema,
});
exports.ImportantItemSchema = zod_1.z.object({
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    workId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    name: zod_1.z.string(),
    type: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    currentOwner: zod_1.z.string().nullable(),
    acquiredAt: zod_1.z.unknown(),
    currentLocation: zod_1.z.string().nullable(),
    properties: zod_1.z.unknown(),
    createdAt: DateStringSchema,
    updatedAt: DateStringSchema,
});
exports.StoryMemoryCountsSchema = zod_1.z.object({
    events: zod_1.z.number(),
    characterGrowth: zod_1.z.number(),
    importantItems: zod_1.z.number(),
});
exports.StoryMemoryResponseSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    events: zod_1.z.array(exports.StoryEventSchema),
    characterGrowth: zod_1.z.array(exports.CharacterGrowthSchema),
    importantItems: zod_1.z.array(exports.ImportantItemSchema),
    counts: exports.StoryMemoryCountsSchema,
    requestId: zod_1.z.string(),
});
exports.StoryMemoryContextResponseSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    currentChapter: zod_1.z.number().nullable(),
    summary: zod_1.z.string(),
    counts: exports.StoryMemoryCountsSchema,
    requestId: zod_1.z.string(),
});
exports.RecordStoryMemoryResultSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    chapterNumber: zod_1.z.number(),
    events: zod_1.z.number(),
    characterGrowth: zod_1.z.number(),
    importantItems: zod_1.z.number(),
});
exports.RecordStoryMemoryMutationResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    action: zod_1.z.literal("record_story_memory"),
    idempotencyKey: zod_1.z.string(),
    actor: zod_1.z.string(),
    result: zod_1.z.object({
        affectedRows: zod_1.z.number(),
        insertId: zod_1.z.number(),
        warningStatus: zod_1.z.number(),
    }),
    item: exports.RecordStoryMemoryResultSchema,
    requestId: zod_1.z.string(),
});
exports.RecordStoryMemoryPayloadSchema = zod_1.z.object({
    workId: zod_1.z.number(),
    chapterNumber: zod_1.z.number(),
    events: zod_1.z.array(UnknownRecordSchema).optional(),
    characterGrowth: zod_1.z.array(UnknownRecordSchema).optional(),
    importantItems: zod_1.z.array(UnknownRecordSchema).optional(),
});
