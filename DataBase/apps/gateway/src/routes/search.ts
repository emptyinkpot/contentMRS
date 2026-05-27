import { Hono } from "hono";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { clampLimit } from "../utils.js";

interface SearchRow {
  document_id: string;
  source_table: string;
  source_id: string;
  source: string | null;
  title: string | null;
  privacy_level: string;
  chunk_index: number;
  snippet: string;
}

interface RagflowChunk {
  content?: string;
  text?: string;
  chunk?: string;
  document_id?: string;
  doc_id?: string;
  document_name?: string;
  doc_name?: string;
  document_keyword?: string | string[];
  docnm_kwd?: string | string[];
  similarity?: number;
  score?: number;
  vector_similarity?: number;
  metadata?: Record<string, unknown>;
}

interface RagflowRetrievalResponse {
  data?: {
    chunks?: RagflowChunk[];
  };
}

const LITERARY_RAGFLOW_DATASET_ID = "bdcc99c658f111f18aecb3d695a2553d";

function listParam(value: string | undefined | null): string[] {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[,，、\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function chunkText(chunk: RagflowChunk): string {
  return String(chunk?.content || chunk?.text || chunk?.chunk || "").trim();
}

function chunkSource(chunk: RagflowChunk): string {
  const doc =
    chunk?.document_keyword ||
    chunk?.document_name ||
    chunk?.doc_name ||
    chunk?.docnm_kwd ||
    "";
  return Array.isArray(doc) ? doc.filter(Boolean).join(" / ") : String(doc || "");
}

export function searchRoutes({ pool, config }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/search", async (c) => {
    const q = (c.req.query("q") || "").trim();
    const limit = clampLimit(c.req.query("limit") || null, 10, 50);

    if (!q) {
      return c.json({
        query: q,
        count: 0,
        results: [],
        requestId: c.get("requestId")
      });
    }

    const like = `%${q}%`;
    const rows = await query<SearchRow[]>(
      pool,
      `
      SELECT
        c.document_id,
        d.source_table,
        d.source_id,
        d.source,
        d.title,
        c.privacy_level,
        c.chunk_index,
        LEFT(c.chunk_text, 300) AS snippet
      FROM search_chunks c
      JOIN search_documents d ON d.id = c.document_id
      WHERE c.privacy_level IN ('public', 'private')
        AND c.chunk_text LIKE ?
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT ?
      `,
      [like, limit]
    );

    return c.json({
      query: q,
      count: rows.length,
      results: rows,
      requestId: c.get("requestId")
    });
  });

  app.get("/search/vector", async (c) => {
    const q = (c.req.query("q") || "").trim();
    const limit = clampLimit(c.req.query("limit") || null, 10, 50);
    const datasetIds = listParam(
      c.req.query("ragflowDatasetIds") ||
        process.env.DATABASE_LITERARY_RAGFLOW_DATASET_IDS ||
        LITERARY_RAGFLOW_DATASET_ID
    );

    if (!q) {
      return c.json({
        query: q,
        count: 0,
        provider: "ragflow.retrieval",
        datasetIds,
        results: [],
        requestId: c.get("requestId")
      });
    }

    if (
      !config?.evidenceRagflow?.baseUrl ||
      !config?.evidenceRagflow?.apiKey ||
      !datasetIds.length
    ) {
      return c.json({
        query: q,
        count: 0,
        provider: "ragflow.retrieval",
        datasetIds,
        warning: "RAGFlow literary vector retrieval is not configured",
        results: [],
        requestId: c.get("requestId")
      });
    }

    const endpoint = `${config.evidenceRagflow.baseUrl.replace(/\/+$/, "")}/api/v1/retrieval`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${config.evidenceRagflow.apiKey}`,
        "X-Request-Id": c.get("requestId")
      },
      body: JSON.stringify({
        question: q,
        dataset_ids: datasetIds,
        page: 1,
        page_size: limit,
        similarity_threshold: Number(
          c.req.query("similarityThreshold") ||
            process.env.DATABASE_LITERARY_RAGFLOW_SIMILARITY_THRESHOLD ||
            "0.05"
        ),
        vector_similarity_weight: Number(
          c.req.query("vectorWeight") ||
            process.env.DATABASE_LITERARY_RAGFLOW_VECTOR_WEIGHT ||
            "0.35"
        ),
        top_k: Number(
          c.req.query("topK") || process.env.DATABASE_LITERARY_RAGFLOW_TOP_K || "64"
        ),
        keyword: true,
        highlight: false,
        use_kg: false,
        toc_enhance: false
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      return c.json(
        {
          query: q,
          count: 0,
          provider: "ragflow.retrieval",
          datasetIds,
          warning: `RAGFlow retrieval failed: HTTP ${response.status}`,
          results: [],
          requestId: c.get("requestId")
        },
        502
      );
    }

    const payload = (await response.json()) as RagflowRetrievalResponse;
    const chunks: RagflowChunk[] = Array.isArray(payload?.data?.chunks)
      ? payload.data!.chunks!
      : [];

    const results = chunks
      .map((chunk, index) => {
        const metadata =
          chunk?.metadata && typeof chunk.metadata === "object"
            ? (chunk.metadata as Record<string, unknown>)
            : {};
        return {
          document_id: String(
            chunk?.document_id || chunk?.doc_id || metadata.document_id || ""
          ),
          source_table: "ragflow_literary_corpus",
          source_id: String(metadata.source_id || metadata.sourceId || ""),
          source: chunkSource(chunk),
          title: String(
            chunk?.document_name ||
              chunk?.doc_name ||
              metadata.title ||
              chunkSource(chunk) ||
              ""
          ),
          privacy_level: "private",
          chunk_index: Number(metadata.chunk_index ?? metadata.chunkIndex ?? index),
          snippet: chunkText(chunk).slice(0, 1000),
          score: Number(
            chunk?.similarity || chunk?.score || chunk?.vector_similarity || 0
          ),
          provider: "ragflow.retrieval"
        };
      })
      .filter((item) => item.snippet);

    return c.json({
      query: q,
      count: results.length,
      provider: "ragflow.retrieval",
      datasetIds,
      results,
      requestId: c.get("requestId")
    });
  });

  return app;
}
