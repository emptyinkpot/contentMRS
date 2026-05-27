import { Hono } from "hono";
import {
  StoryMemoryContextResponseSchema,
  StoryMemoryResponseSchema,
  type CharacterGrowth,
  type ImportantItem,
  type StoryEvent
} from "@emptyinkpot/database-creative-contracts";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { clampLimit } from "../utils.js";
import { HttpError, validatedResponse } from "../http.js";

interface StoryEventRow {
  id: number | string;
  work_id: number | string;
  chapter_number: number;
  event_type: string;
  title: string;
  description: string | null;
  characters_involved: string | unknown[] | null;
  importance: string | null;
  created_at: Date | string | null;
}

interface CharacterGrowthRow {
  id: number | string;
  work_id: number | string;
  character_name: string;
  chapter_number: number;
  growth_type: string;
  before_change: string | null;
  after_change: string | null;
  description: string | null;
  created_at: Date | string | null;
}

interface ImportantItemRow {
  id: number | string;
  work_id: number | string;
  name: string;
  item_type: string;
  description: string | null;
  current_owner: string | null;
  acquired_at: string | Record<string, unknown> | null;
  current_location: string | null;
  properties: string | Record<string, unknown> | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

function parseWorkId(value: string | undefined): number {
  const workId = Number(value);
  if (!Number.isInteger(workId) || workId <= 0) {
    throw new HttpError(400, "invalid_work_id", "workId must be a positive integer");
  }
  return workId;
}

function parseCurrentChapter(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const chapter = Number(value);
  if (!Number.isInteger(chapter) || chapter <= 0) {
    throw new HttpError(
      400,
      "invalid_current_chapter",
      "currentChapter must be a positive integer when provided"
    );
  }
  return chapter;
}

function parseJsonValue(value: unknown, fallback: unknown): unknown {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseStringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(String).filter(Boolean);
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapEvent(row: StoryEventRow): StoryEvent {
  return {
    id: row.id,
    workId: row.work_id,
    chapterNumber: row.chapter_number,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    charactersInvolved: parseStringArray(row.characters_involved),
    importance: row.importance,
    createdAt: toIsoString(row.created_at)
  };
}

function mapCharacterGrowth(row: CharacterGrowthRow): CharacterGrowth {
  return {
    id: row.id,
    workId: row.work_id,
    characterName: row.character_name,
    chapterNumber: row.chapter_number,
    growthType: row.growth_type,
    before: row.before_change,
    after: row.after_change,
    description: row.description,
    createdAt: toIsoString(row.created_at)
  };
}

function mapImportantItem(row: ImportantItemRow): ImportantItem {
  return {
    id: row.id,
    workId: row.work_id,
    name: row.name,
    type: row.item_type,
    description: row.description,
    currentOwner: row.current_owner,
    acquiredAt: parseJsonValue(row.acquired_at, { chapterNumber: 0, description: "" }),
    currentLocation: row.current_location,
    properties: parseJsonValue(row.properties, {}),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function formatContextSummary(input: {
  currentChapter: number | null;
  events: ReturnType<typeof mapEvent>[];
  characterGrowth: ReturnType<typeof mapCharacterGrowth>[];
  importantItems: ReturnType<typeof mapImportantItem>[];
}): string {
  const parts: string[] = [];
  const chapterLimit = input.currentChapter ?? Number.MAX_SAFE_INTEGER;
  const importantEvents = input.events.filter((event) =>
    event.chapterNumber < chapterLimit &&
    (event.importance === "high" || event.importance === "critical")
  );

  if (importantEvents.length > 0) {
    parts.push("=== 关键事件回顾 ===");
    for (const event of importantEvents) {
      parts.push(`【第${event.chapterNumber}章】${event.title}`);
      if (event.description) parts.push(event.description);
      const characters = Array.isArray(event.charactersInvolved) ? event.charactersInvolved.map(String).filter(Boolean) : [];
      if (characters.length > 0) parts.push(`涉及人物：${characters.join("、")}`);
      parts.push("");
    }
  }

  if (input.importantItems.length > 0) {
    parts.push("=== 重要物品 ===");
    for (const item of input.importantItems) {
      parts.push(`【${item.name}】`);
      parts.push(`类型：${item.type}`);
      if (item.description) parts.push(`描述：${item.description}`);
      if (item.currentOwner) parts.push(`当前持有者：${item.currentOwner}`);
      parts.push("");
    }
  }

  const growthByCharacter = new Map<string, ReturnType<typeof mapCharacterGrowth>[]>();
  for (const growth of input.characterGrowth.filter((item) => item.chapterNumber < chapterLimit)) {
    const list = growthByCharacter.get(growth.characterName) ?? [];
    list.push(growth);
    growthByCharacter.set(growth.characterName, list);
  }

  if (growthByCharacter.size > 0) {
    parts.push("=== 角色成长 ===");
    for (const [characterName, growthRows] of growthByCharacter.entries()) {
      parts.push(`【${characterName}】`);
      for (const growth of growthRows) {
        if (growth.description) parts.push(`- 第${growth.chapterNumber}章：${growth.description}`);
      }
      parts.push("");
    }
  }

  return parts.join("\n");
}

export function storyMemoryRoutes({ pool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/creative/story-memory", async (c) => {
    const workId = parseWorkId(c.req.query("workId"));
    const limit = clampLimit(c.req.query("limit") || null, 500, 1000);

    const [events, characterGrowth, importantItems] = await Promise.all([
      query<StoryEventRow[]>(
        pool,
        `SELECT * FROM story_events WHERE work_id = ? ORDER BY chapter_number ASC, created_at ASC LIMIT ?`,
        [workId, limit]
      ),
      query<CharacterGrowthRow[]>(
        pool,
        `SELECT * FROM character_growth WHERE work_id = ? ORDER BY character_name ASC, chapter_number ASC LIMIT ?`,
        [workId, limit]
      ),
      query<ImportantItemRow[]>(
        pool,
        `SELECT * FROM important_items WHERE work_id = ? ORDER BY created_at ASC LIMIT ?`,
        [workId, limit]
      )
    ]);

    return c.json(validatedResponse(StoryMemoryResponseSchema, {
      workId,
      events: events.map(mapEvent),
      characterGrowth: characterGrowth.map(mapCharacterGrowth),
      importantItems: importantItems.map(mapImportantItem),
      counts: {
        events: events.length,
        characterGrowth: characterGrowth.length,
        importantItems: importantItems.length
      },
      requestId: c.get("requestId")
    }));
  });

  app.get("/creative/story-memory/context", async (c) => {
    const workId = parseWorkId(c.req.query("workId"));
    const currentChapter = parseCurrentChapter(c.req.query("currentChapter"));
    const limit = clampLimit(c.req.query("limit") || null, 500, 1000);

    const [events, characterGrowth, importantItems] = await Promise.all([
      query<StoryEventRow[]>(
        pool,
        `SELECT * FROM story_events WHERE work_id = ? ORDER BY chapter_number ASC, created_at ASC LIMIT ?`,
        [workId, limit]
      ),
      query<CharacterGrowthRow[]>(
        pool,
        `SELECT * FROM character_growth WHERE work_id = ? ORDER BY character_name ASC, chapter_number ASC LIMIT ?`,
        [workId, limit]
      ),
      query<ImportantItemRow[]>(
        pool,
        `SELECT * FROM important_items WHERE work_id = ? ORDER BY created_at ASC LIMIT ?`,
        [workId, limit]
      )
    ]);

    const mappedEvents = events.map(mapEvent);
    const mappedCharacterGrowth = characterGrowth.map(mapCharacterGrowth);
    const mappedImportantItems = importantItems.map(mapImportantItem);

    return c.json(validatedResponse(StoryMemoryContextResponseSchema, {
      workId,
      currentChapter,
      summary: formatContextSummary({
        currentChapter,
        events: mappedEvents,
        characterGrowth: mappedCharacterGrowth,
        importantItems: mappedImportantItems
      }),
      counts: {
        events: mappedEvents.length,
        characterGrowth: mappedCharacterGrowth.length,
        importantItems: mappedImportantItems.length
      },
      requestId: c.get("requestId")
    }));
  });

  return app;
}
