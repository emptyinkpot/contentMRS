import { Hono } from "hono";
import {
  SemanticRelationSchema,
  SemanticRelationsResponseSchema,
  SemanticTagSchema,
  SemanticTagsResponseSchema,
  SemanticReferenceMaterialKindSchema,
  SemanticUnitSchema,
  SemanticUnitsResponseSchema,
  type SemanticUnit
} from "@emptyinkpot/database-semantic-contracts";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { validatedResponse } from "../http.js";
import { clampLimit } from "../utils.js";

export interface SemanticUnitRow {
  id: string;
  source_id: string | null;
  source_title: string;
  source_author: string | null;
  source_locator: string | null;
  excerpt: string;
  summary: string | null;
  status: string;
  tags: string | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
  search_score?: number | string | null;
}

interface SemanticTagRow {
  id: string;
  tag_layer: string;
  tag_value: string;
  description: string | null;
  status: string;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface SemanticRelationRow {
  id: string;
  from_unit_id: string | null;
  from_tag_id: string | null;
  relation_type: string;
  to_unit_id: string | null;
  to_tag_id: string | null;
  description: string | null;
  status: string;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

function parseStatus(value: string | undefined): string {
  const status = value?.trim();
  return status || "active";
}

function toIsoString(value: Date | string | null): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  return new Date(0).toISOString();
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function mapSemanticUnit(row: SemanticUnitRow) {
  const tagsValue = parseJsonValue(row.tags);
  const tags = Array.isArray(tagsValue) ? tagsValue : [];
  const materialTag = tags.find((tag) => {
    if (!tag || typeof tag !== "object" || Array.isArray(tag)) return false;
    const record = tag as Record<string, unknown>;
    return record.layer === "usable_for" && String(record.value || "").startsWith("reference:");
  }) as Record<string, unknown> | undefined;
  const rawMaterialKind = String(materialTag?.value || "").replace(/^reference:/, "");
  const parsedMaterialKind = SemanticReferenceMaterialKindSchema.safeParse(rawMaterialKind);

  return SemanticUnitSchema.parse({
    id: row.id,
    sourceId: row.source_id,
    sourceTitle: row.source_title,
    sourceAuthor: row.source_author,
    sourceLocator: row.source_locator,
    excerpt: row.excerpt,
    summary: row.summary,
    materialKind: parsedMaterialKind.success ? parsedMaterialKind.data : null,
    status: row.status,
    tags,
    searchScore: toNullableNumber(row.search_score),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapSemanticTag(row: SemanticTagRow) {
  return SemanticTagSchema.parse({
    id: row.id,
    layer: row.tag_layer,
    value: row.tag_value,
    description: row.description,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapSemanticRelation(row: SemanticRelationRow) {
  return SemanticRelationSchema.parse({
    id: row.id,
    fromUnitId: row.from_unit_id,
    fromTagId: row.from_tag_id,
    relationType: row.relation_type,
    toUnitId: row.to_unit_id,
    toTagId: row.to_tag_id,
    description: row.description,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function buildSearchTokens(search: string): string[] {
  const normalized = search.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const tokens = new Set<string>();
  for (const token of normalized.split(/[^\p{L}\p{N}]+/u)) {
    const trimmed = token.trim();
    if (trimmed.length >= 2) tokens.add(trimmed);
  }

  const cjkRuns = normalized.match(/[\p{Script=Han}]+/gu) || [];
  for (const run of cjkRuns) {
    if (run.length >= 2) {
      tokens.add(run);
    }
    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= run.length - size; index += 1) {
        tokens.add(run.slice(index, index + size));
      }
    }
  }

  return Array.from(tokens).slice(0, 40);
}

function createTextScoreExpression(tokens: string[]): { expression: string; params: string[] } {
  if (tokens.length === 0) {
    return { expression: "0", params: [] };
  }

  const clauses: string[] = [];
  const params: string[] = [];
  for (const token of tokens) {
    const like = `%${token}%`;
    clauses.push("(CASE WHEN u.source_title LIKE ? THEN 8 ELSE 0 END)");
    params.push(like);
    clauses.push("(CASE WHEN u.summary LIKE ? THEN 5 ELSE 0 END)");
    params.push(like);
    clauses.push("(CASE WHEN u.excerpt LIKE ? THEN 3 ELSE 0 END)");
    params.push(like);
  }

  return { expression: clauses.join(" + "), params };
}

function createTagScoreExpression(tokens: string[]): { expression: string; params: string[] } {
  if (tokens.length === 0) {
    return { expression: "0", params: [] };
  }

  const clauses: string[] = [];
  const params: string[] = [];
  for (const token of tokens) {
    const like = `%${token}%`;
    clauses.push("(CASE WHEN stt_score.tag_value LIKE ? THEN 6 ELSE 0 END)");
    params.push(like);
    clauses.push("(CASE WHEN stt_score.description LIKE ? THEN 2 ELSE 0 END)");
    params.push(like);
  }

  return { expression: `COALESCE(SUM(${clauses.join(" + ")}), 0)`, params };
}

export async function resolveSemanticUnits(
  pool: RouteDependencies["pool"],
  options: {
    status: string;
    search: string;
    tag: string;
    materialKind: string;
    limit: number;
  }
): Promise<SemanticUnit[]> {
  const where: string[] = ["u.status = ?"];
  const params: (string | number)[] = [options.status];
  const having: string[] = [];
  const searchTokens = buildSearchTokens(options.search);
  const textScore = createTextScoreExpression(searchTokens);
  const tagScore = createTagScoreExpression(searchTokens);
  const searchScoreExpression = `(${textScore.expression}) + (${tagScore.expression})`;

  if (options.search) {
    having.push("search_score > 0");
  }

  if (options.tag) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM semantic_unit_tags sut_filter
        JOIN semantic_tag_taxonomy stt_filter ON stt_filter.id = sut_filter.tag_id
        WHERE sut_filter.unit_id = u.id
          AND stt_filter.tag_value = ?
          AND stt_filter.status = 'active'
      )
    `);
    params.push(options.tag);
  }

  const parsedMaterialKind = SemanticReferenceMaterialKindSchema.safeParse(options.materialKind);
  if (options.materialKind && parsedMaterialKind.success) {
    where.push(`
      EXISTS (
        SELECT 1
        FROM semantic_unit_tags sut_material
        JOIN semantic_tag_taxonomy stt_material ON stt_material.id = sut_material.tag_id
        WHERE sut_material.unit_id = u.id
          AND stt_material.tag_layer = 'usable_for'
          AND stt_material.tag_value = ?
          AND stt_material.status = 'active'
      )
    `);
    params.push(`reference:${parsedMaterialKind.data}`);
  }

  const rows = await query<SemanticUnitRow[]>(
    pool,
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
      ${searchScoreExpression} AS search_score,
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
      u.updated_at,
      u.created_at
    FROM semantic_units u
    LEFT JOIN semantic_unit_tags sut_score ON sut_score.unit_id = u.id
    LEFT JOIN semantic_tag_taxonomy stt_score ON stt_score.id = sut_score.tag_id AND stt_score.status = 'active'
    WHERE ${where.join(" AND ")}
    GROUP BY
      u.id,
      u.source_id,
      u.source_title,
      u.source_author,
      u.source_locator,
      u.excerpt,
      u.summary,
      u.status,
      u.updated_at,
      u.created_at
    ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
    ORDER BY search_score DESC, u.updated_at DESC, u.id ASC
    LIMIT ?
    `,
    [
      ...textScore.params,
      ...tagScore.params,
      ...params,
      options.limit
    ]
  );
  return rows.map(mapSemanticUnit);
}

export function semanticRoutes({ pool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/semantic/units", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 50, 200);
    const status = parseStatus(c.req.query("status"));
    const search = (c.req.query("search") || "").trim();
    const tag = (c.req.query("tag") || "").trim();
    const materialKind = (c.req.query("materialKind") || "").trim();
    const rows = await resolveSemanticUnits(pool, { status, search, tag, materialKind, limit });

    return c.json(validatedResponse(SemanticUnitsResponseSchema, {
      count: rows.length,
      units: rows,
      filters: { status, search, tag, materialKind },
      requestId: c.get("requestId")
    }));
  });

  app.get("/semantic/tags", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 200, 500);
    const status = parseStatus(c.req.query("status"));
    const layer = (c.req.query("layer") || "").trim();
    const where: string[] = ["status = ?"];
    const params: (string | number)[] = [status];

    if (layer) {
      where.push("tag_layer = ?");
      params.push(layer);
    }

    const rows = await query<SemanticTagRow[]>(
      pool,
      `
      SELECT id, tag_layer, tag_value, description, status, updated_at, created_at
      FROM semantic_tag_taxonomy
      WHERE ${where.join(" AND ")}
      ORDER BY tag_layer ASC, tag_value ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const tags = rows.map(mapSemanticTag);
    return c.json(validatedResponse(SemanticTagsResponseSchema, {
      count: tags.length,
      tags,
      filters: { status, layer },
      requestId: c.get("requestId")
    }));
  });

  app.get("/semantic/relations", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 300);
    const status = parseStatus(c.req.query("status"));
    const relationType = (c.req.query("type") || "").trim();
    const unitId = (c.req.query("unit") || "").trim();
    const where: string[] = ["status = ?"];
    const params: (string | number)[] = [status];

    if (relationType) {
      where.push("relation_type = ?");
      params.push(relationType);
    }

    if (unitId) {
      where.push("(from_unit_id = ? OR to_unit_id = ?)");
      params.push(unitId, unitId);
    }

    const rows = await query<SemanticRelationRow[]>(
      pool,
      `
      SELECT id, from_unit_id, from_tag_id, relation_type, to_unit_id, to_tag_id, description, status, updated_at, created_at
      FROM semantic_relations
      WHERE ${where.join(" AND ")}
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const relations = rows.map(mapSemanticRelation);
    return c.json(validatedResponse(SemanticRelationsResponseSchema, {
      count: relations.length,
      relations,
      filters: { status, type: relationType, unit: unitId },
      requestId: c.get("requestId")
    }));
  });

  return app;
}
