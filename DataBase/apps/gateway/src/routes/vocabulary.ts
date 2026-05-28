import { Hono } from "hono";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { clampLimit } from "../utils.js";

interface VocabularyRow {
  id: number | string;
  content: string;
  type: string;
  category: string;
  note: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

export function vocabularyRoutes({ pool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/vocabulary/search", async (c) => {
    const q = (c.req.query("q") || "").trim();
    const limit = clampLimit(c.req.query("limit") || null, 20, 100);

    // Vocabulary entries are short (2-8 chars). Topic queries are long and won't LIKE-match.
    // Always return the full curated vocabulary pool (non-baseline) regardless of query,
    // so the Writer always has the preferred/banned word list available.
    const rows = await query<VocabularyRow[]>(
      pool,
      `
      SELECT id, content, type, category, note, created_at, updated_at
      FROM vocabulary
      WHERE category != 'baseline-article'
      ORDER BY RAND()
      LIMIT ?
      `,
      [limit]
    );

    return c.json({
      query: q,
      count: rows.length,
      items: rows,
      requestId: c.get("requestId")
    });
  });

  return app;
}
