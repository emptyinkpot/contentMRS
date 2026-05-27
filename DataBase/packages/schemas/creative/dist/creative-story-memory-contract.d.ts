import { z } from "zod";
export declare const StoryEventSchema: z.ZodObject<{
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    workId: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    chapterNumber: z.ZodNumber;
    eventType: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    charactersInvolved: z.ZodArray<z.ZodString>;
    importance: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type StoryEvent = z.infer<typeof StoryEventSchema>;
export declare const CharacterGrowthSchema: z.ZodObject<{
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    workId: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    characterName: z.ZodString;
    chapterNumber: z.ZodNumber;
    growthType: z.ZodString;
    before: z.ZodNullable<z.ZodString>;
    after: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type CharacterGrowth = z.infer<typeof CharacterGrowthSchema>;
export declare const ImportantItemSchema: z.ZodObject<{
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    workId: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    name: z.ZodString;
    type: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    currentOwner: z.ZodNullable<z.ZodString>;
    acquiredAt: z.ZodUnknown;
    currentLocation: z.ZodNullable<z.ZodString>;
    properties: z.ZodUnknown;
    createdAt: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type ImportantItem = z.infer<typeof ImportantItemSchema>;
export declare const StoryMemoryCountsSchema: z.ZodObject<{
    events: z.ZodNumber;
    characterGrowth: z.ZodNumber;
    importantItems: z.ZodNumber;
}, z.core.$strip>;
export type StoryMemoryCounts = z.infer<typeof StoryMemoryCountsSchema>;
export declare const StoryMemoryResponseSchema: z.ZodObject<{
    workId: z.ZodNumber;
    events: z.ZodArray<z.ZodObject<{
        id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        workId: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        chapterNumber: z.ZodNumber;
        eventType: z.ZodString;
        title: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        charactersInvolved: z.ZodArray<z.ZodString>;
        importance: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    characterGrowth: z.ZodArray<z.ZodObject<{
        id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        workId: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        characterName: z.ZodString;
        chapterNumber: z.ZodNumber;
        growthType: z.ZodString;
        before: z.ZodNullable<z.ZodString>;
        after: z.ZodNullable<z.ZodString>;
        description: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    importantItems: z.ZodArray<z.ZodObject<{
        id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        workId: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        name: z.ZodString;
        type: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        currentOwner: z.ZodNullable<z.ZodString>;
        acquiredAt: z.ZodUnknown;
        currentLocation: z.ZodNullable<z.ZodString>;
        properties: z.ZodUnknown;
        createdAt: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    counts: z.ZodObject<{
        events: z.ZodNumber;
        characterGrowth: z.ZodNumber;
        importantItems: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type StoryMemoryResponse = z.infer<typeof StoryMemoryResponseSchema>;
export declare const StoryMemoryContextResponseSchema: z.ZodObject<{
    workId: z.ZodNumber;
    currentChapter: z.ZodNullable<z.ZodNumber>;
    summary: z.ZodString;
    counts: z.ZodObject<{
        events: z.ZodNumber;
        characterGrowth: z.ZodNumber;
        importantItems: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type StoryMemoryContextResponse = z.infer<typeof StoryMemoryContextResponseSchema>;
export declare const RecordStoryMemoryResultSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterNumber: z.ZodNumber;
    events: z.ZodNumber;
    characterGrowth: z.ZodNumber;
    importantItems: z.ZodNumber;
}, z.core.$strip>;
export type RecordStoryMemoryResult = z.infer<typeof RecordStoryMemoryResultSchema>;
export declare const RecordStoryMemoryMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_story_memory">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        workId: z.ZodNumber;
        chapterNumber: z.ZodNumber;
        events: z.ZodNumber;
        characterGrowth: z.ZodNumber;
        importantItems: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordStoryMemoryMutationResponse = z.infer<typeof RecordStoryMemoryMutationResponseSchema>;
export declare const RecordStoryMemoryPayloadSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterNumber: z.ZodNumber;
    events: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    characterGrowth: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    importantItems: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, z.core.$strip>;
export type RecordStoryMemoryPayload = z.infer<typeof RecordStoryMemoryPayloadSchema>;
