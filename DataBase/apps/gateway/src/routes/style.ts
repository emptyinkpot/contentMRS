import { Hono } from "hono";
import {
  StylePackSchema,
  StyleRevisionPairSchema,
  type StylePackProfile,
  type StyleRevisionPair,
} from "@emptyinkpot/database-semantic-contracts";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { validatedResponse } from "../http.js";
import { clampLimit } from "../utils.js";

interface StylePackRow {
  id: string;
  source_id: string | null;
  source_title: string;
  source_author: string | null;
  source_locator: string | null;
  excerpt: string;
  summary: string | null;
  tags: string | null;
  updated_at?: string | Date | null;
}

interface RankedStylePackRow extends StylePackRow {
  score: number;
}

interface RankedStyleRevisionPairRow extends StylePackRow {
  score: number;
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

function normalizeSearchText(value: string) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenizeStyleQuery(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const cjk = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const ascii = normalized.match(/[a-z0-9_]{2,}/g) || [];
  const tokens = new Set<string>();
  for (const token of [...cjk, ...ascii]) {
    tokens.add(token);
    if (/[\u4e00-\u9fa5]/.test(token)) {
      for (let size = 2; size <= Math.min(5, token.length); size += 1) {
        for (let index = 0; index <= token.length - size; index += 1) {
          tokens.add(token.slice(index, index + size));
        }
      }
    }
  }
  return Array.from(tokens)
    .filter((item) => item.length >= 2)
    .filter((item) => !/^(文章|正文|生成|风格|文风|style|syntax)$/.test(item))
    .slice(0, 24);
}

function parseJsonArray(value: unknown): Array<Record<string, unknown>> {
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

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
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

function scoreStyleRow(row: StylePackRow, tokens: string[]) {
  const body = normalizeSearchText([row.source_title, row.source_author, row.source_locator, row.summary, row.excerpt, row.tags].filter(Boolean).join(" "));
  const tokenHits = tokens.filter((token) => body.includes(normalizeSearchText(token))).length;
  const tagText = String(row.tags || "");
  const restrictedBoost = /restricted-style-reference|syntax-profile|style-reference/.test(tagText) || /restricted-style-reference|style-reference/.test(body) ? 20 : 0;
  const literaryBoost = /reference:literary|literary/.test(tagText) || /literary|文学/.test(body) ? 8 : 0;
  const sourceTitleBoost = /金阁寺|三岛|mishima|kinkakuji/i.test([row.source_title, row.source_author, row.source_id].join(" ")) ? 6 : 0;
  return tokenHits * 10 + restrictedBoost + literaryBoost + sourceTitleBoost;
}

async function readStyleRows(input: {
  pool: RouteDependencies["pool"];
  q: string;
  sourceIds: string[];
  limit: number;
}): Promise<RankedStylePackRow[]> {
  const tokens = tokenizeStyleQuery(input.q);
  const likeTerms = uniqueStrings([input.q, ...tokens, "restricted-style-reference", "syntax-profile", "style-reference"]).slice(0, 10);
  const searchWhere = likeTerms.map(() => "(u.summary LIKE ? OR u.excerpt LIKE ? OR u.source_title LIKE ? OR st_search.tag_value LIKE ? OR st_search.description LIKE ?)").join(" OR ");
  const sourceWhere = input.sourceIds.length
    ? `AND u.source_id IN (${input.sourceIds.map(() => "?").join(", ")})`
    : "";
  const params = [
    ...input.sourceIds,
    ...likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`]),
    Math.max(input.limit * 4, 20),
  ];
  const rows = await query<StylePackRow[]>(
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
      JSON_ARRAYAGG(JSON_OBJECT(
        'id', st.id,
        'layer', st.tag_layer,
        'value', st.tag_value,
        'description', st.description
      )) AS tags,
      u.updated_at
    FROM semantic_units u
    LEFT JOIN semantic_unit_tags sut ON sut.unit_id = u.id
    LEFT JOIN semantic_tag_taxonomy st ON st.id = sut.tag_id
    LEFT JOIN semantic_unit_tags sut_search ON sut_search.unit_id = u.id
    LEFT JOIN semantic_tag_taxonomy st_search ON st_search.id = sut_search.tag_id
    WHERE u.status = 'active'
      ${sourceWhere}
      AND (
        st.tag_value IN ('style-reference', 'syntax-profile', 'restricted-style-reference', 'reference:literary')
      )
      AND (${searchWhere})
    GROUP BY u.id
    ORDER BY u.updated_at DESC
    LIMIT ?
    `,
    params
  );
  return rows
    .map((row) => ({ ...row, score: scoreStyleRow(row, tokens) }))
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit);
}

async function readRevisionPairRows(input: {
  pool: RouteDependencies["pool"];
  q: string;
  sourceIds: string[];
  limit: number;
}): Promise<RankedStyleRevisionPairRow[]> {
  const tokens = tokenizeStyleQuery(input.q);
  const likeTerms = uniqueStrings([input.q, ...tokens, "style-revision-pair", "syntax-eval-case"]).slice(0, 10);
  const searchWhere = likeTerms.map(() => "(u.summary LIKE ? OR u.excerpt LIKE ? OR u.source_title LIKE ? OR st_search.tag_value LIKE ? OR st_search.description LIKE ?)").join(" OR ");
  const sourceWhere = input.sourceIds.length
    ? `AND u.source_id IN (${input.sourceIds.map(() => "?").join(", ")})`
    : "";
  const params = [
    ...input.sourceIds,
    ...likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`]),
    Math.max(input.limit * 3, 12),
  ];
  const rows = await query<StylePackRow[]>(
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
      JSON_ARRAYAGG(JSON_OBJECT(
        'id', st.id,
        'layer', st.tag_layer,
        'value', st.tag_value,
        'description', st.description
      )) AS tags,
      u.updated_at
    FROM semantic_units u
    LEFT JOIN semantic_unit_tags sut ON sut.unit_id = u.id
    LEFT JOIN semantic_tag_taxonomy st ON st.id = sut.tag_id
    LEFT JOIN semantic_unit_tags sut_search ON sut_search.unit_id = u.id
    LEFT JOIN semantic_tag_taxonomy st_search ON st_search.id = sut_search.tag_id
    WHERE u.status = 'active'
      ${sourceWhere}
      AND st.tag_value IN ('style-revision-pair', 'syntax-eval-case')
      AND (${searchWhere})
    GROUP BY u.id
    ORDER BY u.updated_at DESC
    LIMIT ?
    `,
    params
  );
  return rows
    .map((row) => ({ ...row, score: scoreStyleRow(row, tokens) + 12 }))
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit);
}

function firstLineMatching(text: string, label: string): string {
  const pattern = new RegExp(`${label}\\s*[:：]?\\s*([^。\\n]+(?:。|$))`, "i");
  const match = text.match(pattern);
  return match?.[1]?.trim().replace(/[。；;]+$/, "") || "";
}

function linesMatchingAny(text: string, labels: string[]): string[] {
  const values: string[] = [];
  for (const label of labels) {
    const value = firstLineMatching(text, label);
    if (value) values.push(value);
  }
  return uniqueStrings(values.flatMap((item) => item.split(/[；;。]/).map((part) => part.trim()).filter(Boolean)));
}

function mapStyleProfile(row: RankedStylePackRow): StylePackProfile {
  const text = [row.summary, row.excerpt].filter(Boolean).join("\n");
  const seenTags = new Set<string>();
  const constraints = [
    ...linesMatchingAny(text, ["使用边界", "边界", "约束"]),
    "只能学习句法节奏、段落推进、修辞功能和意象组织，不得复写受限版权来源原句",
  ];
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceTitle: row.source_title,
    sourceAuthor: row.source_author,
    sourceLocator: row.source_locator,
    summary: String(row.summary || row.excerpt || "").trim(),
    sentenceLengthBand: firstLineMatching(text, "句长分布") || firstLineMatching(text, "句法") || "未标注",
    paragraphDensity: firstLineMatching(text, "段落密度") || firstLineMatching(text, "段落") || "未标注",
    progressionMoves: linesMatchingAny(text, ["推进方式", "推进", "段落推进"]),
    rhetoricalMoves: linesMatchingAny(text, ["修辞倾向", "修辞", "比拟"]),
    imageryClusters: linesMatchingAny(text, ["意象簇", "意象", "物象"]),
    constraints: uniqueStrings(constraints),
    tags: parseJsonArray(row.tags)
      .map((tag) => ({
        id: String(tag.id || ""),
        layer: String(tag.layer || ""),
        value: String(tag.value || ""),
        description: tag.description == null ? null : String(tag.description),
      }))
      .filter((tag) => tag.id || tag.value)
      .filter((tag) => {
        const key = [tag.id, tag.layer, tag.value].join(":");
        if (seenTags.has(key)) return false;
        seenTags.add(key);
        return true;
      }),
    searchScore: row.score,
  };
}

function mapRevisionPair(row: RankedStyleRevisionPairRow): StyleRevisionPair | null {
  const payload = parseJsonRecord(row.excerpt);
  const reviewerEvidence = parseJsonRecord(payload.reviewerEvidence);
  const mapped = {
    id: row.id,
    sourceId: row.source_id,
    sourceTitle: row.source_title,
    sourceLocator: row.source_locator,
    issueType: String(payload.issueType || ""),
    ruleId: String(payload.ruleId || ""),
    severity: String(payload.severity || ""),
    originalText: String(payload.originalText || ""),
    revisedText: payload.revisedText == null ? null : String(payload.revisedText),
    reviewerEvidence: {
      badReason: String(reviewerEvidence.badReason || ""),
      rewriteActions: Array.isArray(reviewerEvidence.rewriteActions)
        ? reviewerEvidence.rewriteActions.map((item) => String(item)).filter(Boolean)
        : [],
      forbiddenMoves: Array.isArray(reviewerEvidence.forbiddenMoves)
        ? reviewerEvidence.forbiddenMoves.map((item) => String(item)).filter(Boolean)
        : [],
      targetShape: String(reviewerEvidence.targetShape || ""),
    },
    tags: parseJsonArray(row.tags)
      .map((tag) => ({
        id: String(tag.id || ""),
        layer: String(tag.layer || ""),
        value: String(tag.value || ""),
        description: tag.description == null ? null : String(tag.description),
      }))
      .filter((tag) => tag.id || tag.value),
    searchScore: row.score,
  };
  const parsed = StyleRevisionPairSchema.safeParse(mapped);
  return parsed.success ? parsed.data : null;
}

export function styleRoutes({ pool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/style/pack", async (c) => {
    const q = String(c.req.query("q") || "").trim();
    const sourceIds = parseListQuery(c.req.query("sourceIds"));
    const limit = clampLimit(c.req.query("limit") || null, 6, 20);

    if (!q) {
      return c.json(validatedResponse(StylePackSchema, {
        version: "style-pack.v1",
        query: q,
        mode: "empty_query",
        sourceIds,
        profiles: [],
        syntaxProfiles: [],
        rhetoricalMoves: [],
        imageryClusters: [],
        paragraphMoves: [],
        revisionPairs: [],
        constraints: ["empty query returns no style profile"],
        counts: { sources: 0, profiles: 0, syntaxProfiles: 0, rhetoricalMoves: 0, imageryClusters: 0, revisionPairs: 0 },
        screening: {
          version: "style-screening.v1",
          requestedLimit: limit,
          sourceFilterIds: sourceIds,
          selectedProfileCount: 0,
          sourceDiversityCount: 0,
          rankingSignals: [],
        },
        requestId: c.get("requestId"),
      }));
    }

    const rows = await readStyleRows({ pool, q, sourceIds, limit });
    const revisionRows = await readRevisionPairRows({ pool, q, sourceIds, limit });
    const profiles = rows.map(mapStyleProfile);
    const revisionPairs = revisionRows.map(mapRevisionPair).filter((item): item is StyleRevisionPair => Boolean(item));
    const selectedSourceIds = uniqueStrings(profiles.map((item) => item.sourceId || item.sourceTitle));
    const syntaxProfiles = uniqueStrings(profiles.flatMap((item) => [item.sentenceLengthBand, item.paragraphDensity]).filter((item) => item && item !== "未标注"));
    const rhetoricalMoves = uniqueStrings(profiles.flatMap((item) => item.rhetoricalMoves));
    const imageryClusters = uniqueStrings(profiles.flatMap((item) => item.imageryClusters));
    const paragraphMoves = uniqueStrings(profiles.flatMap((item) => item.progressionMoves));

    return c.json(validatedResponse(StylePackSchema, {
      version: "style-pack.v1",
      query: q,
      mode: "style_reference_projection",
      sourceIds,
      profiles,
      syntaxProfiles,
      rhetoricalMoves,
      imageryClusters,
      paragraphMoves,
      revisionPairs,
      constraints: uniqueStrings([
        "DataBase owns StylePack projection; ContentBase must consume it through Gateway/SDK",
        "StylePack is syntax/rhetoric reference, not factual evidence",
        "Style revision pairs are reviewer evidence for future prompting/evaluation, not automatic string replacement rules",
        "Restricted copyright sources may guide cadence and rhetorical function only; no reusable sentence-copy corpus is exposed",
        sourceIds.length
          ? `StylePack search was constrained to sourceIds: ${sourceIds.join(", ")}`
          : "StylePack search was not constrained to sourceIds",
        ...profiles.flatMap((item) => item.constraints),
      ]),
      counts: {
        sources: selectedSourceIds.length,
        profiles: profiles.length,
        syntaxProfiles: syntaxProfiles.length,
        rhetoricalMoves: rhetoricalMoves.length,
        imageryClusters: imageryClusters.length,
        revisionPairs: revisionPairs.length,
      },
      screening: {
        version: "style-screening.v1",
        requestedLimit: limit,
        sourceFilterIds: sourceIds,
        selectedProfileCount: profiles.length,
        sourceDiversityCount: selectedSourceIds.length,
        rankingSignals: [
          "style-reference tag",
          "syntax-profile tag",
          "restricted-style-reference boundary",
          "query token overlap",
          sourceIds.length ? "explicit sourceIds filter" : "unfiltered style pool",
        ],
      },
      requestId: c.get("requestId"),
    }));
  });

  return app;
}
