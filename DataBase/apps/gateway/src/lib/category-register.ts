import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "mysql2/promise";
import { query } from "../db.js";

const configPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../config/category-register.json",
);

export interface CategoryRegisterRow {
  category: string;
  tags: string[];
}

let cachedMap: Map<string, string[]> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function loadCategoryRegisterFromConfig(): Map<string, string[]> {
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as {
      categories?: Record<string, string[]>;
    };
    const map = new Map<string, string[]>();
    for (const [category, tags] of Object.entries(parsed.categories || {})) {
      if (category && Array.isArray(tags) && tags.length) {
        map.set(category, tags.map(String).filter(Boolean));
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function parseTagsJson(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

export async function loadCategoryRegisterMap(pool: Pool): Promise<Map<string, string[]>> {
  const now = Date.now();
  if (cachedMap && now - cachedAt < CACHE_TTL_MS) {
    return cachedMap;
  }

  try {
    const rows = await query<Array<{ category: string; tags: unknown }>>(
      pool,
      `SELECT category, tags FROM vocabulary_category_register`,
    );
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const category = String(row.category || "").trim();
      const tags = parseTagsJson(row.tags);
      if (category && tags.length) map.set(category, tags);
    }
    if (map.size > 0) {
      cachedMap = map;
      cachedAt = now;
      return map;
    }
  } catch {
    // Table may not exist yet on older deployments; fall back to static map.
  }

  cachedMap = loadCategoryRegisterFromConfig();
  cachedAt = now;
  return cachedMap;
}

export function inferTagsFromCategoryMap(
  category: string,
  map: Map<string, string[]>,
): string[] {
  const normalized = String(category || "").trim();
  if (!normalized) return ["historical-narrative"];
  return map.get(normalized) || ["historical-narrative"];
}

export function invalidateCategoryRegisterCache(): void {
  cachedMap = null;
  cachedAt = 0;
}
