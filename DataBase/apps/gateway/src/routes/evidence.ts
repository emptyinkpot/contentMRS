import { Hono } from "hono";
import {
  EvidencePackSchema,
  type EvidenceChunk,
  type EvidenceCitation,
  type EvidenceSource,
} from "@emptyinkpot/database-content-contracts";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { HttpError, validatedResponse } from "../http.js";
import { clampLimit } from "../utils.js";

interface EvidenceSearchRow {
  document_id: string;
  source_table: string;
  source_id: string;
  source: string | null;
  title: string | null;
  privacy_level: string;
  chunk_index: number;
  chunk_text: string;
  chunk_metadata: string | null;
  updated_at?: string | Date | null;
}

interface RankedEvidenceRow extends EvidenceSearchRow {
  score: number;
  matchedQuery: string;
  matchedTokens: string[];
}

interface SemanticEvidenceRow {
  id: string;
  source_id: string | null;
  source_title: string;
  source_author: string | null;
  source_locator: string | null;
  excerpt: string;
  summary: string | null;
  status: string;
  tags: string | null;
  updated_at?: string | Date | null;
}

interface RankedSemanticEvidenceRow extends SemanticEvidenceRow {
  score: number;
  matchedQuery: string;
  matchedTokens: string[];
}

interface WebEvidenceItem {
  id?: string;
  title?: string;
  url?: string;
  source?: string;
  snippet?: string;
  excerpt?: string;
  text?: string;
  content?: string;
  fullText?: string;
  publishedAt?: string;
  score?: number;
}

interface SourceTierPolicyItem {
  domain: string;
  tier: string;
  note: string | null;
}

interface RagflowEvidenceChunk {
  id?: string;
  content?: string;
  content_ltks?: string;
  document_id?: string;
  document_keyword?: string;
  document_name?: string;
  dataset_id?: string;
  kb_id?: string;
  positions?: unknown;
  similarity?: number;
  term_similarity?: number;
  vector_similarity?: number;
  important_keywords?: unknown;
  tag_kwd?: unknown;
  questions?: unknown;
}

function fallbackTitle(row: EvidenceSearchRow) {
  return row.title || row.source || `${row.source_table}:${row.source_id}`;
}

function toStableId(parts: Array<string | number | null | undefined>) {
  return parts.map((part) => String(part ?? "").replace(/[^a-zA-Z0-9_-]+/g, "_")).join("__");
}

function normalizeSearchText(value: string) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function parseListQuery(value: string | null | undefined): string[] {
  return uniqueStrings(String(value || "")
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean));
}

function hostOfUrl(value: string | undefined): string {
  try {
    return new URL(String(value || "")).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostMatchesPolicy(host: string, domain: string): boolean {
  return Boolean(host && domain && (host === domain || host.endsWith(`.${domain}`)));
}

function sourceTierForUrl(value: string | undefined, sourcePolicy: SourceTierPolicyItem[] = []): string {
  const host = hostOfUrl(value);
  const match = sourcePolicy.find((item) => hostMatchesPolicy(host, item.domain));
  return match?.tier || "U";
}

function sourceTierWeight(tier: string): number {
  if (tier === "S") return 120;
  if (tier === "A") return 80;
  if (tier === "B") return 35;
  return 0;
}

function normalizeWebEvidenceText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function loadSourceTierPolicy(pool: RouteDependencies["pool"]): Promise<SourceTierPolicyItem[]> {
  const rows = await query<Array<{ content: string; category: string | null; note: string | null }>>(pool, `
    SELECT content, category, note
    FROM vocabulary
    WHERE type = 'source-tier'
      AND category IN ('S','A','B')
    ORDER BY
      CASE category WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 ELSE 4 END,
      content ASC
    LIMIT 500
  `);
  return rows
    .map((row) => ({
      domain: String(row.content || "").trim().replace(/^www\./, "").toLowerCase(),
      tier: String(row.category || "U").trim().toUpperCase(),
      note: row.note || null,
    }))
    .filter((item) => item.domain && ["S", "A", "B"].includes(item.tier));
}

function tokenizeEvidenceQuery(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const cjk = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const ascii = normalized.match(/[a-z0-9_]{2,}/g) || [];
  const tokens: string[] = [];
  for (const token of [...cjk, ...ascii]) {
    tokens.push(token);
    if (/[\u4e00-\u9fa5]/.test(token)) {
      for (let size = 2; size <= Math.min(6, token.length); size += 1) {
        for (let index = 0; index <= token.length - size; index += 1) {
          tokens.push(token.slice(index, index + size));
        }
      }
    }
  }
  return uniqueStrings(tokens)
    .filter((item) => item.length >= 2)
    .filter((item) => !/^(文章|生成|资料|材料|target|draft|article|the|and|with)$/.test(item))
    .slice(0, 32);
}

function buildEvidenceQueries(input: {
  q: string;
  topic?: string;
  target?: string;
  semanticTags: string[];
  maxRounds: number;
}): string[] {
  const seeds = [
    input.q,
    input.topic || "",
    input.target || "",
    input.semanticTags.join(" "),
  ].map((item) => String(item || "").trim()).filter(Boolean);
  const tokenGroups = tokenizeEvidenceQuery(seeds.join(" "))
    .filter((item) => item.length >= 2)
    .slice(0, 12);
  const grouped = [
    ...seeds,
    ...input.semanticTags,
    tokenGroups.slice(0, 4).join(" "),
    tokenGroups.slice(4, 8).join(" "),
    tokenGroups.slice(8, 12).join(" "),
    ...tokenGroups.slice(0, 6),
  ];
  return uniqueStrings(grouped)
    .filter((item) => item.length >= 2)
    .slice(0, Math.max(1, Math.min(input.maxRounds, 12)));
}

function scoreEvidenceRow(row: EvidenceSearchRow, queryText: string, tokens: string[]): RankedEvidenceRow {
  const chunkText = normalizeSearchText(row.chunk_text || "");
  const metadata = parseRecord(row.chunk_metadata);
  const locatorText = normalizeSearchText([
    metadata.locator,
    metadata.chapter,
    metadata.section,
  ].filter(Boolean).join(" "));
  const titleText = normalizeSearchText([row.title, row.source, row.source_id].filter(Boolean).join(" "));
  const query = normalizeSearchText(queryText);
  const chunkQueryHit = query && chunkText.includes(query) ? 1 : 0;
  const locatorQueryHit = query && locatorText.includes(query) ? 1 : 0;
  const chunkHits = tokens.filter((token) => chunkText.includes(normalizeSearchText(token)));
  const locatorHits = tokens.filter((token) => locatorText.includes(normalizeSearchText(token)));
  const titleTokenHits = tokens.filter((token) => titleText.includes(normalizeSearchText(token)));
  const matchedTokens = uniqueStrings([...chunkHits, ...locatorHits, ...titleTokenHits]);
  const titleHits = titleTokenHits.length;
  const textLength = String(row.chunk_text || "").length;
  const lengthScore = textLength > 180 ? 4 : textLength > 60 ? 2 : 0;
  // 正文命中是主信号，章节/locator 是定位信号；书名/sourceId 只作弱信号，避免目录、版权页或书名重复段落压过正文片段。
  const score = chunkQueryHit * 70
    + locatorQueryHit * 18
    + chunkHits.length * 18
    + locatorHits.length * 8
    + titleHits * 2
    + lengthScore;
  return {
    ...row,
    score,
    matchedQuery: queryText,
    matchedTokens,
  };
}

function scoreSemanticEvidenceRow(row: SemanticEvidenceRow, queryText: string, tokens: string[]): RankedSemanticEvidenceRow {
  const bodyText = normalizeSearchText([row.summary, row.excerpt, row.tags].filter(Boolean).join(" "));
  const locatorText = normalizeSearchText(row.source_locator || "");
  const titleText = normalizeSearchText([row.source_title, row.source_author].filter(Boolean).join(" "));
  const query = normalizeSearchText(queryText);
  const bodyQueryHit = query && bodyText.includes(query) ? 1 : 0;
  const locatorQueryHit = query && locatorText.includes(query) ? 1 : 0;
  const bodyHits = tokens.filter((token) => bodyText.includes(normalizeSearchText(token)));
  const locatorHits = tokens.filter((token) => locatorText.includes(normalizeSearchText(token)));
  const titleTokenHits = tokens.filter((token) => titleText.includes(normalizeSearchText(token)));
  const matchedTokens = uniqueStrings([...bodyHits, ...locatorHits, ...titleTokenHits]);
  const titleHits = titleTokenHits.length;
  const textLength = [row.summary, row.excerpt].filter(Boolean).join(" ").length;
  const lengthScore = textLength > 180 ? 4 : textLength > 60 ? 2 : 0;
  // semantic_units 是二级资料卡，仍以摘要/摘录/标签命中为主，来源题名只作弱背书。
  const score = bodyQueryHit * 60
    + locatorQueryHit * 16
    + bodyHits.length * 16
    + locatorHits.length * 7
    + titleHits * 2
    + lengthScore;
  return {
    ...row,
    score,
    matchedQuery: queryText,
    matchedTokens,
  };
}

async function searchDatabaseEvidence(input: {
  pool: RouteDependencies["pool"];
  queries: string[];
  limit: number;
  sourceIds: string[];
}): Promise<{ rows: RankedEvidenceRow[]; rounds: Array<{ query: string; tokenCount: number; resultCount: number; provider: string; sourceFilterCount?: number }> }> {
  const rankedByChunk = new Map<string, RankedEvidenceRow>();
  const rounds: Array<{ query: string; tokenCount: number; resultCount: number; provider: string; sourceFilterCount?: number }> = [];
  for (const queryText of input.queries) {
    const tokens = tokenizeEvidenceQuery(queryText).slice(0, 10);
    const likeTerms = uniqueStrings([queryText, ...tokens]).filter((item) => item.length >= 2).slice(0, 8);
    if (!likeTerms.length) continue;
    const where = likeTerms.map(() => "(c.chunk_text LIKE ? OR CAST(c.metadata_json AS CHAR) LIKE ?)").join(" OR ");
    const sourceWhere = input.sourceIds.length
      ? `AND d.source_id IN (${input.sourceIds.map(() => "?").join(", ")})`
      : "";
    const params = [
      ...input.sourceIds,
      ...likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`]),
      Math.max(input.limit * 4, 20),
    ];
    const rows = await query<EvidenceSearchRow[]>(
      input.pool,
      `
      SELECT
        c.document_id,
        d.source_table,
        d.source_id,
        d.source,
        d.title,
        c.privacy_level,
        c.chunk_index,
        c.chunk_text,
        CAST(c.metadata_json AS CHAR) AS chunk_metadata,
        c.updated_at
      FROM search_chunks c
      JOIN search_documents d ON d.id = c.document_id
      WHERE c.privacy_level IN ('public', 'private')
        AND c.index_status = 'indexed'
        ${sourceWhere}
        AND (${where})
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT ?
      `,
      params
    );
    rounds.push({
      query: queryText,
      tokenCount: likeTerms.length,
      resultCount: rows.length,
      provider: "database.search_chunks",
      sourceFilterCount: input.sourceIds.length || undefined,
    });
    for (const row of rows) {
      const ranked = scoreEvidenceRow(row, queryText, likeTerms);
      if (ranked.score <= 0) continue;
      const key = `${row.document_id}:${row.chunk_index}`;
      const current = rankedByChunk.get(key);
      if (!current || ranked.score > current.score) {
        rankedByChunk.set(key, ranked);
      }
    }
  }
  const rows = Array.from(rankedByChunk.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit);
  return { rows, rounds };
}

async function searchSemanticEvidence(input: {
  pool: RouteDependencies["pool"];
  queries: string[];
  limit: number;
  sourceIds: string[];
}): Promise<{ rows: RankedSemanticEvidenceRow[]; rounds: Array<{ query: string; tokenCount: number; resultCount: number; provider: string; sourceFilterCount?: number }> }> {
  const rankedByUnit = new Map<string, RankedSemanticEvidenceRow>();
  const rounds: Array<{ query: string; tokenCount: number; resultCount: number; provider: string; sourceFilterCount?: number }> = [];
  for (const queryText of input.queries) {
    const tokens = tokenizeEvidenceQuery(queryText).slice(0, 10);
    const likeTerms = uniqueStrings([queryText, ...tokens]).filter((item) => item.length >= 2).slice(0, 8);
    if (!likeTerms.length) continue;
    const textWhere = likeTerms.map(() => "(u.source_title LIKE ? OR u.summary LIKE ? OR u.excerpt LIKE ?)").join(" OR ");
    const tagWhere = likeTerms.map(() => "stt_filter.tag_value LIKE ? OR stt_filter.description LIKE ?").join(" OR ");
    const textParams = likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`]);
    const tagParams = likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`]);
    const sourceWhere = input.sourceIds.length
      ? `AND u.source_id IN (${input.sourceIds.map(() => "?").join(", ")})`
      : "";
    const rows = await query<SemanticEvidenceRow[]>(
      input.pool,
      `
      SELECT
        u.id,
        u.source_id,
        u.source_title,
        u.source_author,
        u.source_locator,
        u.excerpt,
        u.summary,
        u.status,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', tag_rows.id,
                'layer', tag_rows.tag_layer,
                'value', tag_rows.tag_value,
                'description', tag_rows.description
              )
            )
            FROM (
              SELECT stt_inner.id, stt_inner.tag_layer, stt_inner.tag_value, stt_inner.description
              FROM semantic_unit_tags sut_inner
              JOIN semantic_tag_taxonomy stt_inner ON stt_inner.id = sut_inner.tag_id
              WHERE sut_inner.unit_id = u.id AND stt_inner.status = 'active'
              ORDER BY stt_inner.tag_layer ASC, stt_inner.tag_value ASC
            ) tag_rows
          ),
          JSON_ARRAY()
        ) AS tags,
        u.updated_at
      FROM semantic_units u
      WHERE u.status = 'active'
        ${sourceWhere}
        AND (
          ${textWhere}
          OR EXISTS (
            SELECT 1
            FROM semantic_unit_tags sut_filter
            JOIN semantic_tag_taxonomy stt_filter ON stt_filter.id = sut_filter.tag_id
            WHERE sut_filter.unit_id = u.id
              AND stt_filter.status = 'active'
              AND (${tagWhere})
          )
        )
      ORDER BY u.updated_at DESC, u.id ASC
      LIMIT ?
      `,
      [
        ...input.sourceIds,
        ...textParams,
        ...tagParams,
        Math.max(input.limit * 4, 20),
      ]
    );
    rounds.push({
      query: queryText,
      tokenCount: likeTerms.length,
      resultCount: rows.length,
      provider: "database.semantic_units",
      sourceFilterCount: input.sourceIds.length || undefined,
    });
    for (const row of rows) {
      const ranked = scoreSemanticEvidenceRow(row, queryText, likeTerms);
      if (ranked.score <= 0) continue;
      const current = rankedByUnit.get(row.id);
      if (!current || ranked.score > current.score) {
        rankedByUnit.set(row.id, ranked);
      }
    }
  }
  const rows = Array.from(rankedByUnit.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit);
  return { rows, rounds };
}

async function searchWebEvidence(input: {
  url: string;
  q: string;
  limit: number;
  requestId: string;
}): Promise<{ items: WebEvidenceItem[]; round: { query: string; tokenCount: number; resultCount: number; provider: string } }> {
  const endpoint = new URL(input.url);
  endpoint.searchParams.set("q", input.q);
  endpoint.searchParams.set("limit", String(input.limit));
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "X-Request-Id": input.requestId,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new HttpError(503, "web_evidence_search_failed", `web evidence provider failed: HTTP ${response.status}`);
  }
  const payload = await response.json() as any;
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.results)
      ? payload.results
      : [];
  return {
    items,
    round: {
      query: input.q,
      tokenCount: tokenizeEvidenceQuery(input.q).length,
      resultCount: items.length,
      provider: "web.search",
    },
  };
}

async function searchRagflowEvidence(input: {
  config: NonNullable<RouteDependencies["config"]["evidenceRagflow"]>;
  q: string;
  limit: number;
  requestId: string;
}): Promise<{ chunks: RagflowEvidenceChunk[]; round: { query: string; tokenCount: number; resultCount: number; provider: string } }> {
  if (!input.config.baseUrl || !input.config.apiKey || input.config.datasetIds.length === 0) {
    throw new HttpError(503, "ragflow_evidence_search_not_configured", "DATABASE_EVIDENCE_RAGFLOW_URL, DATABASE_EVIDENCE_RAGFLOW_API_KEY and DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS are required when includeRagflow=true");
  }
  const endpoint = `${input.config.baseUrl.replace(/\/+$/, "")}/api/v1/retrieval`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${input.config.apiKey}`,
      "X-Request-Id": input.requestId,
    },
    body: JSON.stringify({
      question: input.q,
      dataset_ids: input.config.datasetIds,
      document_ids: input.config.documentIds,
      page: 1,
      page_size: input.limit,
      similarity_threshold: input.config.similarityThreshold,
      vector_similarity_weight: input.config.vectorSimilarityWeight,
      top_k: input.config.topK,
      keyword: true,
      highlight: false,
      use_kg: input.config.useKg,
      toc_enhance: input.config.tocEnhance,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new HttpError(503, "ragflow_evidence_search_failed", `RAGFlow evidence provider failed: HTTP ${response.status}`);
  }
  const payload = await response.json() as any;
  if (payload?.code !== 0) {
    throw new HttpError(503, "ragflow_evidence_search_failed", `RAGFlow evidence provider failed: ${String(payload?.message || "unknown error")}`);
  }
  const chunks = Array.isArray(payload?.data?.chunks) ? payload.data.chunks as RagflowEvidenceChunk[] : [];
  return {
    chunks,
    round: {
      query: input.q,
      tokenCount: tokenizeEvidenceQuery(input.q).length,
      resultCount: chunks.length,
      provider: "ragflow.retrieval",
    },
  };
}

function appendDatabaseRows(input: {
  rows: RankedEvidenceRow[];
  sourceById: Map<string, EvidenceSource>;
  chunks: EvidenceChunk[];
  citations: EvidenceCitation[];
}) {
  input.rows.forEach((row, index) => {
    const sourceId = String(row.document_id);
    const chunkMetadata = parseRecord(row.chunk_metadata);
    const locator = String(chunkMetadata.locator || "").trim();
    const chapter = String(chunkMetadata.chapter || "").trim();
    const section = String(chunkMetadata.section || "").trim();
    if (!input.sourceById.has(sourceId)) {
      input.sourceById.set(sourceId, {
        id: sourceId,
        title: fallbackTitle(row),
        sourceType: "database.search_document",
        sourceTable: row.source_table,
        sourceId: row.source_id,
        source: row.source,
        externalRefs: [],
        metadata: {
          matchedQuery: row.matchedQuery,
          matchedTokens: row.matchedTokens,
          relevanceScore: row.score,
          locator,
          chapter,
          section,
        },
      });
    }

    // chunk/citation 是写作运行时的证据边界，不承担文件本体真源。
    const chunkId = toStableId([row.document_id, row.chunk_index]);
    const text = String(row.chunk_text || "").slice(0, 1200);
    input.chunks.push({
      id: chunkId,
      sourceId,
      chunkIndex: Number(row.chunk_index || 0),
      text,
      privacyLevel: row.privacy_level,
      relevanceScore: row.score,
      location: {
        chunkIndex: row.chunk_index,
        ...(locator ? { locator } : {}),
        ...(chapter ? { chapter } : {}),
        ...(section ? { section } : {}),
        ...(chunkMetadata.startLine ? { startLine: chunkMetadata.startLine } : {}),
        ...(chunkMetadata.endLine ? { endLine: chunkMetadata.endLine } : {}),
      },
      metadata: {
        sourceTable: row.source_table,
        sourceId: row.source_id,
        locator,
        chapter,
        section,
        matchedQuery: row.matchedQuery,
        matchedTokens: row.matchedTokens,
      },
    });
    input.citations.push({
      id: toStableId(["citation", row.document_id, row.chunk_index, index]),
      sourceId,
      chunkId,
      title: fallbackTitle(row),
      excerpt: text.slice(0, 500),
      locator: locator || `chunk:${row.chunk_index}`,
      relevanceScore: row.score,
      metadata: {
        sourceTable: row.source_table,
        sourceId: row.source_id,
        locator,
        chapter,
        section,
        matchedQuery: row.matchedQuery,
        matchedTokens: row.matchedTokens,
      },
    });
  });
}

function appendSemanticRows(input: {
  rows: RankedSemanticEvidenceRow[];
  sourceById: Map<string, EvidenceSource>;
  chunks: EvidenceChunk[];
  citations: EvidenceCitation[];
}) {
  input.rows.forEach((row, index) => {
    const sourceId = toStableId(["semantic", row.id]);
    const title = row.source_title || row.source_id || row.id;
    const materialText = [row.summary, row.excerpt].filter(Boolean).join("\n\n").trim();
    const text = materialText.slice(0, 1200);
    if (!text) return;
    const tags = parseSemanticTags(row.tags);
    const materialKind = tags
      .map((tag) => String(tag.value || ""))
      .find((value) => value.startsWith("reference:"))
      ?.replace(/^reference:/, "");
    if (!input.sourceById.has(sourceId)) {
      input.sourceById.set(sourceId, {
        id: sourceId,
        title,
        sourceType: "database.semantic_unit",
        sourceTable: "semantic_units",
        sourceId: row.id,
        source: row.source_id,
        externalRefs: row.source_id ? [{ system: "semantic.source_id", externalId: row.source_id }] : [],
        metadata: {
          sourceAuthor: row.source_author,
          sourceLocator: row.source_locator,
          materialKind: materialKind || "",
          matchedQuery: row.matchedQuery,
          matchedTokens: row.matchedTokens,
          relevanceScore: row.score,
        },
      });
    }

    // 语义单元是 DataBase 已归档的资料切面，这里只投影为 EvidencePack 的 chunk/citation。
    const chunkId = toStableId([sourceId, 0]);
    input.chunks.push({
      id: chunkId,
      sourceId,
      chunkIndex: 0,
      text,
      privacyLevel: "private",
      relevanceScore: row.score,
      location: row.source_locator ? { locator: row.source_locator } : {},
      metadata: {
        sourceTable: "semantic_units",
        sourceId: row.source_id,
        semanticUnitId: row.id,
        sourceAuthor: row.source_author,
        materialKind: materialKind || "",
        matchedQuery: row.matchedQuery,
        matchedTokens: row.matchedTokens,
      },
    });
    input.citations.push({
      id: toStableId(["citation", sourceId, index]),
      sourceId,
      chunkId,
      title,
      excerpt: text.slice(0, 500),
      locator: row.source_locator || undefined,
      relevanceScore: row.score,
      metadata: {
        sourceTable: "semantic_units",
        sourceId: row.source_id,
        semanticUnitId: row.id,
        sourceAuthor: row.source_author,
        materialKind: materialKind || "",
        matchedQuery: row.matchedQuery,
        matchedTokens: row.matchedTokens,
      },
    });
  });
}

function parseSemanticTags(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Array<Record<string, unknown>>;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Array<Record<string, unknown>>
      : [];
  } catch {
    return [];
  }
}

function appendWebItems(input: {
  items: WebEvidenceItem[];
  sourceById: Map<string, EvidenceSource>;
  chunks: EvidenceChunk[];
  citations: EvidenceCitation[];
  sourcePolicy: SourceTierPolicyItem[];
}) {
  input.items.forEach((item, index) => {
    const title = String(item.title || item.url || `Web source ${index + 1}`).trim();
    const url = String(item.url || item.source || "").trim();
    const rawText = normalizeWebEvidenceText(item.fullText || item.content || item.snippet || item.excerpt || item.text || "");
    const text = rawText.slice(0, 2400);
    if (!title && !text) return;
    const sourceTier = sourceTierForUrl(url, input.sourcePolicy);
    const sourceId = toStableId(["web", item.id || url || title || index]);
    const chunkId = toStableId([sourceId, 0]);
    const score = Number.isFinite(Number(item.score)) ? Number(item.score) : input.items.length - index;
    const sourceQualityScore = score + sourceTierWeight(sourceTier) + Math.min(120, Math.floor(rawText.length / 120));
    input.sourceById.set(sourceId, {
      id: sourceId,
      title,
      sourceType: "web.search_result",
      sourceTable: "web",
      sourceId: item.id ? String(item.id) : url || sourceId,
      source: url || null,
      externalRefs: url ? [{ system: "url", url }] : [],
      metadata: {
        url,
        publishedAt: item.publishedAt || "",
        relevanceScore: score,
        sourceTier,
        fullTextChars: rawText.length,
        sourceQualityScore,
      },
    });
    input.chunks.push({
      id: chunkId,
      sourceId,
      chunkIndex: 0,
      text,
      privacyLevel: "public",
      relevanceScore: score,
      location: url ? { url } : {},
      metadata: {
        provider: "web.search",
        url,
        publishedAt: item.publishedAt || "",
        sourceTier,
        fullTextChars: rawText.length,
        sourceQualityScore,
      },
    });
    input.citations.push({
      id: toStableId(["citation", sourceId, index]),
      sourceId,
      chunkId,
      title,
      excerpt: text.slice(0, 500),
      locator: url || undefined,
      relevanceScore: score,
      metadata: {
        provider: "web.search",
        url,
        publishedAt: item.publishedAt || "",
        sourceTier,
        fullTextChars: rawText.length,
        sourceQualityScore,
      },
    });
  });
}

function appendRagflowChunks(input: {
  chunks: RagflowEvidenceChunk[];
  sourceById: Map<string, EvidenceSource>;
  outputChunks: EvidenceChunk[];
  citations: EvidenceCitation[];
}) {
  input.chunks.forEach((item, index) => {
    const datasetId = String(item.dataset_id || item.kb_id || "").trim();
    const documentId = String(item.document_id || "").trim();
    const title = String(item.document_name || item.document_keyword || documentId || `RAGFlow document ${index + 1}`).trim();
    const text = String(item.content || item.content_ltks || "").trim().slice(0, 1200);
    if (!text) return;
    const sourceId = toStableId(["ragflow", datasetId, documentId || title]);
    const chunkId = toStableId(["ragflow", item.id || index, documentId || datasetId]);
    const score = Number.isFinite(Number(item.similarity)) ? Number(item.similarity) : input.chunks.length - index;
    if (!input.sourceById.has(sourceId)) {
      input.sourceById.set(sourceId, {
        id: sourceId,
        title,
        sourceType: "ragflow.retrieval_document",
        sourceTable: "ragflow",
        sourceId: documentId || sourceId,
        source: datasetId || null,
        externalRefs: [
          datasetId ? { system: "ragflow.dataset_id", externalId: datasetId } : null,
          documentId ? { system: "ragflow.document_id", externalId: documentId } : null,
        ].filter(Boolean) as Array<Record<string, unknown>>,
        metadata: {
          provider: "ragflow.retrieval",
          datasetId,
          documentId,
          relevanceScore: score,
        },
      });
    }

    // RAGFlow 负责成熟 RAG 召回；DataBase 只把它收束成统一 EvidencePack 投影。
    input.outputChunks.push({
      id: chunkId,
      sourceId,
      chunkIndex: index,
      text,
      privacyLevel: "private",
      relevanceScore: score,
      location: { datasetId, documentId, positions: item.positions || [] },
      metadata: {
        provider: "ragflow.retrieval",
        ragflowChunkId: item.id || "",
        datasetId,
        documentId,
        termSimilarity: item.term_similarity,
        vectorSimilarity: item.vector_similarity,
        importantKeywords: item.important_keywords || [],
        tagKeywords: item.tag_kwd || [],
        questions: item.questions || [],
      },
    });
    input.citations.push({
      id: toStableId(["citation", "ragflow", item.id || index, documentId || datasetId]),
      sourceId,
      chunkId,
      title,
      excerpt: text.slice(0, 500),
      locator: documentId ? `ragflow:${documentId}` : undefined,
      relevanceScore: score,
      metadata: {
        provider: "ragflow.retrieval",
        ragflowChunkId: item.id || "",
        datasetId,
        documentId,
      },
    });
  });
}

export function evidenceRoutes({ pool, config }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/evidence/search", async (c) => {
    const q = (c.req.query("q") || "").trim();
    const topic = (c.req.query("topic") || "").trim();
    const target = (c.req.query("target") || "").trim();
    const semanticTags = parseListQuery(c.req.query("semanticTags"));
    const sourceIds = parseListQuery(c.req.query("sourceIds"));
    const includeWeb = ["1", "true", "yes", "on"].includes(String(c.req.query("includeWeb") || "").toLowerCase());
    const includeRagflow = ["1", "true", "yes", "on"].includes(String(c.req.query("includeRagflow") || "").toLowerCase());
    const maxRounds = clampLimit(c.req.query("rounds") || null, 4, 12);
    const limit = clampLimit(c.req.query("limit") || null, 10, 50);

    if (!q) {
      return c.json(validatedResponse(EvidencePackSchema, {
        version: "evidence-pack.v1",
        query: q,
        mode: "empty_query",
        queryRun: {
          id: `evidence_query_${c.get("requestId")}`,
          provider: "database.search_chunks",
          status: "read_projection",
          rounds: [],
        },
        sources: [],
        chunks: [],
        citations: [],
        constraints: ["empty query returns no evidence"],
        counts: { sources: 0, chunks: 0, citations: 0, queryRounds: 0, webSources: 0 },
        screening: {
          version: "evidence-screening.v1",
          requestedLimit: limit,
          queryCount: 0,
          sourceFilterIds: sourceIds,
          selectedChunkCount: 0,
          selectedCitationCount: 0,
          sourceDiversityCount: 0,
          droppedDuplicateChunkCount: 0,
          rankingSignals: [],
        },
        requestId: c.get("requestId"),
      }));
    }

    if (includeWeb && !config.evidenceWebSearchUrl) {
      throw new HttpError(503, "web_evidence_search_not_configured", "DATABASE_EVIDENCE_WEB_SEARCH_URL is required when includeWeb=true");
    }
    if (includeRagflow && !config.evidenceRagflow) {
      throw new HttpError(503, "ragflow_evidence_search_not_configured", "DATABASE_EVIDENCE_RAGFLOW_URL, DATABASE_EVIDENCE_RAGFLOW_API_KEY and DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS are required when includeRagflow=true");
    }

    const evidenceQueries = buildEvidenceQueries({ q, topic, target, semanticTags, maxRounds });
    const sourcePolicy = await loadSourceTierPolicy(pool);
    const databaseSearch = await searchDatabaseEvidence({ pool, queries: evidenceQueries, limit, sourceIds });
    const semanticSearch = await searchSemanticEvidence({ pool, queries: evidenceQueries, limit, sourceIds });
    const sourceById = new Map<string, EvidenceSource>();
    const chunks: EvidenceChunk[] = [];
    const citations: EvidenceCitation[] = [];
    appendDatabaseRows({ rows: databaseSearch.rows, sourceById, chunks, citations });
    appendSemanticRows({ rows: semanticSearch.rows, sourceById, chunks, citations });

    let webSources = 0;
    const rounds = [
      ...databaseSearch.rounds,
      ...semanticSearch.rounds,
    ];
    if (includeWeb && config.evidenceWebSearchUrl) {
      const web = await searchWebEvidence({
        url: config.evidenceWebSearchUrl,
        q,
        limit: Math.min(limit, 10),
        requestId: c.get("requestId"),
      });
      appendWebItems({ items: web.items, sourceById, chunks, citations, sourcePolicy });
      webSources = web.items.length;
      rounds.push(web.round);
    }
    if (includeRagflow && config.evidenceRagflow) {
      const ragflow = await searchRagflowEvidence({
        config: config.evidenceRagflow,
        q,
        limit: Math.min(limit, 20),
        requestId: c.get("requestId"),
      });
      appendRagflowChunks({ chunks: ragflow.chunks, sourceById, outputChunks: chunks, citations });
      rounds.push(ragflow.round);
    }

    const selectedChunks = chunks
      .sort((left, right) => Number(right.relevanceScore || 0) - Number(left.relevanceScore || 0))
      .slice(0, limit);
    const selectedChunkIds = new Set(selectedChunks.map((item) => item.id));
    const selectedCitations = citations
      .filter((item) => selectedChunkIds.has(item.chunkId))
      .sort((left, right) => Number(right.relevanceScore || 0) - Number(left.relevanceScore || 0))
      .slice(0, limit);
    const selectedSourceIds = new Set([
      ...selectedChunks.map((item) => item.sourceId),
      ...selectedCitations.map((item) => item.sourceId),
    ]);
    const selectedSources = Array.from(sourceById.values()).filter((item) => selectedSourceIds.has(item.id));
    const providerParts = [
      "database.search_chunks",
      semanticSearch.rows.length ? "database.semantic_units" : "",
      includeWeb ? "web.search" : "",
      includeRagflow ? "ragflow.retrieval" : "",
    ].filter(Boolean);
    const provider = providerParts.join("+");
    const mode = includeWeb && selectedChunks.some((item) => String(item.metadata?.provider || "") === "web.search")
      ? "mixed_projection"
      : includeRagflow && selectedChunks.some((item) => String(item.metadata?.provider || "") === "ragflow.retrieval")
        ? "mixed_projection"
      : evidenceQueries.length > 1
        ? "multi_query_projection"
        : "keyword_projection";

    return c.json(validatedResponse(EvidencePackSchema, {
      version: "evidence-pack.v1",
      query: q,
      mode,
      queryRun: {
        id: `evidence_query_${c.get("requestId")}`,
        provider,
        status: "read_projection",
        rounds,
      },
      sources: selectedSources,
      chunks: selectedChunks,
      citations: selectedCitations,
      constraints: [
        "DataBase owns this evidence projection",
        "OpenList and file backends are source access surfaces, not semantic search by themselves",
        "ContentBase may use citations as writing context but must not treat missing evidence as permission to invent facts",
        sourceIds.length
          ? `Evidence search was constrained to sourceIds: ${sourceIds.join(", ")}`
          : "Evidence search was not constrained to sourceIds",
        includeWeb
          ? "Web evidence entered through DataBase Gateway provider configuration and remains query-run evidence, not durable source truth until persisted by a DataBase importer"
          : "Web evidence was not requested for this query run",
        includeRagflow
          ? "RAGFlow retrieval entered through DataBase Gateway provider configuration and was projected into EvidencePack; RAGFlow remains a retrieval backend, not a ContentBase source of truth"
          : "RAGFlow retrieval was not requested for this query run",
      ],
      counts: {
        sources: selectedSources.length,
        chunks: selectedChunks.length,
        citations: selectedCitations.length,
        webSources,
        queryRounds: rounds.length,
      },
      screening: {
        version: "evidence-screening.v1",
        requestedLimit: limit,
        queryCount: evidenceQueries.length,
        sourceFilterIds: sourceIds,
        selectedChunkCount: selectedChunks.length,
        selectedCitationCount: selectedCitations.length,
        sourceDiversityCount: selectedSources.length,
        droppedDuplicateChunkCount: Math.max(0, databaseSearch.rounds.reduce((sum, round) => sum + round.resultCount, 0) - databaseSearch.rows.length),
        rankingSignals: [
          "exact query hit",
          "chunk body token overlap",
          "locator/chapter/section overlap",
          "weak title/sourceId overlap",
          "chunk length floor",
          "source diversity",
          sourceIds.length ? "explicit sourceIds filter" : "unfiltered source pool",
          semanticSearch.rows.length ? "semantic reference material recall" : "semantic reference material checked",
          includeWeb ? "explicit web provider results" : "database-only provider",
          includeRagflow ? "RAGFlow dataset retrieval" : "RAGFlow provider not requested",
        ],
      },
      requestId: c.get("requestId"),
    }));
  });

  return app;
}
