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

interface SemanticUnitRow {
  id: string;
  source_id: string | null;
  source_title: string;
  source_author: string | null;
  source_locator: string | null;
  excerpt: string;
  summary: string | null;
}

interface VocabularyHit {
  id: number | string;
  content: string;
  type: string;
  category: string;
  note: string | null;
}

interface UnifiedResult {
  id: string;
  text: string;
  title: string;
  source: string;
  provider: "ragflow" | "semantic_units" | "vocabulary";
  score: number;
  metadata: Record<string, unknown>;
}

function scoreText(text: string, tokens: string[]): number {
  const normalized = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (normalized.includes(token.toLowerCase())) score += 10;
  }
  score += Math.min(5, Math.floor(text.length / 200));
  return score;
}

export function searchRoutes({ pool, config }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/search/unified", async (c) => {
    const q = (c.req.query("q") || "").trim();
    const limit = clampLimit(c.req.query("limit") || null, 20, 100);
    const sourceIds = listParam(c.req.query("sourceIds"));
    const includeVocabulary = !["0", "false", "no", "off"].includes(
      String(c.req.query("includeVocabulary") || "true").toLowerCase()
    );

    if (!q) {
      return c.json({
        query: q,
        count: 0,
        providers: [],
        results: [],
        requestId: c.get("requestId"),
      });
    }

    const tokens = q
      .split(/[\s,，、]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
      .slice(0, 10);
    const like = `%${q}%`;
    const results: UnifiedResult[] = [];
    const providers: string[] = [];
    const errors: string[] = [];

    // 1. RAGFlow vector retrieval
    const ragflowDatasetIds = listParam(
      c.req.query("ragflowDatasetIds") ||
        process.env.DATABASE_LITERARY_RAGFLOW_DATASET_IDS ||
        LITERARY_RAGFLOW_DATASET_ID
    );

    const ragflowPromise = (async () => {
      if (
        !config?.evidenceRagflow?.baseUrl ||
        !config?.evidenceRagflow?.apiKey ||
        !ragflowDatasetIds.length
      ) {
        return;
      }
      try {
        const endpoint = `${config.evidenceRagflow.baseUrl.replace(/\/+$/, "")}/api/v1/retrieval`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            authorization: `Bearer ${config.evidenceRagflow.apiKey}`,
          },
          body: JSON.stringify({
            question: q,
            dataset_ids: ragflowDatasetIds,
            page: 1,
            page_size: Math.min(limit, 30),
            similarity_threshold: 0.05,
            vector_similarity_weight: 0.35,
            top_k: 64,
            keyword: true,
            highlight: false,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          errors.push(`ragflow: HTTP ${response.status}`);
          return;
        }
        const payload = (await response.json()) as RagflowRetrievalResponse;
        const chunks = Array.isArray(payload?.data?.chunks) ? payload.data!.chunks! : [];
        providers.push("ragflow");
        for (const chunk of chunks) {
          const text = chunkText(chunk);
          if (!text) continue;
          results.push({
            id: `ragflow:${chunk.document_id || ""}:${results.length}`,
            text: text.slice(0, 800),
            title: chunkSource(chunk),
            source: String(chunk.document_id || ""),
            provider: "ragflow",
            score: Number(chunk.similarity || chunk.score || chunk.vector_similarity || 0) * 100,
            metadata: {
              documentId: chunk.document_id || chunk.doc_id,
              documentName: chunk.document_name || chunk.doc_name,
              similarity: chunk.similarity,
              vectorSimilarity: chunk.vector_similarity,
            },
          });
        }
      } catch (err) {
        errors.push(`ragflow: ${err instanceof Error ? err.message : "unknown"}`);
      }
    })();

    // 2. semantic_units keyword search
    const semanticPromise = (async () => {
      try {
        const likeTerms = [q, ...tokens].filter((t) => t.length >= 2).slice(0, 6);
        const textWhere = likeTerms
          .map(() => "(u.source_title LIKE ? OR u.summary LIKE ? OR u.excerpt LIKE ?)")
          .join(" OR ");
        const textParams = likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`]);
        const sourceWhere = sourceIds.length
          ? `AND u.source_id IN (${sourceIds.map(() => "?").join(", ")})`
          : "";
        const rows = await query<SemanticUnitRow[]>(
          pool,
          `
          SELECT u.id, u.source_id, u.source_title, u.source_author, u.source_locator, u.excerpt, u.summary
          FROM semantic_units u
          WHERE u.status = 'active'
            ${sourceWhere}
            AND (${textWhere})
          ORDER BY u.updated_at DESC
          LIMIT ?
          `,
          [...sourceIds, ...textParams, Math.min(limit * 2, 60)]
        );
        providers.push("semantic_units");
        for (const row of rows) {
          const text = [row.summary, row.excerpt].filter(Boolean).join("\n").trim();
          if (!text) continue;
          results.push({
            id: `semantic:${row.id}`,
            text: text.slice(0, 800),
            title: row.source_title || "",
            source: row.source_id || row.id,
            provider: "semantic_units",
            score: scoreText(text, tokens),
            metadata: {
              semanticUnitId: row.id,
              sourceAuthor: row.source_author,
              sourceLocator: row.source_locator,
            },
          });
        }
      } catch (err) {
        errors.push(`semantic_units: ${err instanceof Error ? err.message : "unknown"}`);
      }
    })();

    // 3. vocabulary keyword search
    const vocabularyPromise = (async () => {
      if (!includeVocabulary) return;
      try {
        const rows = await query<VocabularyHit[]>(
          pool,
          `
          SELECT id, content, type, category, note
          FROM vocabulary
          WHERE content LIKE ? OR note LIKE ?
          ORDER BY id DESC
          LIMIT ?
          `,
          [like, like, Math.min(limit, 30)]
        );
        if (rows.length) providers.push("vocabulary");
        for (const row of rows) {
          const text = [row.content, row.note].filter(Boolean).join(" — ");
          results.push({
            id: `vocab:${row.id}`,
            text,
            title: row.content,
            source: `${row.type}/${row.category}`,
            provider: "vocabulary",
            score: scoreText(text, tokens) * 0.6,
            metadata: {
              vocabularyId: row.id,
              type: row.type,
              category: row.category,
            },
          });
        }
      } catch (err) {
        errors.push(`vocabulary: ${err instanceof Error ? err.message : "unknown"}`);
      }
    })();

    await Promise.all([ragflowPromise, semanticPromise, vocabularyPromise]);

    const ranked = results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return c.json({
      query: q,
      count: ranked.length,
      totalCandidates: results.length,
      providers,
      ...(errors.length ? { errors } : {}),
      results: ranked,
      requestId: c.get("requestId"),
    });
  });

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
