import { createHash } from "node:crypto";
import { Hono } from "hono";
import {
  RecordAuditResultMutationResponseSchema,
  RecordChapterTransitionMutationResponseSchema,
  RecordGenerationOutputMutationResponseSchema,
  RecordPublicationResultMutationResponseSchema,
  ReplaceWorkStructureMutationResponseSchema
} from "@emptyinkpot/database-content-contracts";
import {
  RecordStyleRevisionPairMutationResponseSchema,
  RecordStyleRevisionPairPayloadSchema,
  RecordSemanticReferenceMaterialMutationResponseSchema,
  RecordSemanticReferenceMaterialPayloadSchema
} from "@emptyinkpot/database-semantic-contracts";
import {
  ArticleAcceptanceReportSchema,
  RecordArticleAcceptanceReportMutationResponseSchema,
  ArticleReferenceUsageReportSchema,
  RecordArticleReferenceUsageReportMutationResponseSchema,
  RecordAuthorLexiconReviewMutationResponseSchema,
  RecordAuthorLexiconReviewPayloadSchema,
  RecordStoryMemoryMutationResponseSchema
} from "@emptyinkpot/database-creative-contracts";
import type { Context } from "hono";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import type { AppBindings, RouteDependencies } from "../types.js";
import type { DbPool } from "../db.js";
import { errorBody, validatedResponse } from "../http.js";

class BadRequestError extends Error {
  readonly code = "invalid_payload";
}

function invalidPayload(message: string): never {
  throw new BadRequestError(message);
}

interface WriteEnvelope {
  requestId?: string;
  actor?: string;
  payload?: Record<string, unknown>;
}

interface MutationRow extends RowDataPacket {
  id: number;
  idempotency_key: string;
  action: string;
  actor: string;
  request_id: string | null;
  target_type: string | null;
  target_id: string | null;
  payload_hash: string;
  response_json: string | Record<string, unknown> | null;
  status: "started" | "succeeded" | "failed";
  error_code: string | null;
}

interface MutationResult {
  targetType: string;
  targetId: string | number | null;
  body: Record<string, unknown>;
}

type MutationHandler = (ctx: MutationContext) => Promise<MutationResult>;

interface MutationContext {
  pool: DbPool;
  action: string;
  idempotencyKey: string;
  envelope: WriteEnvelope;
  payload: Record<string, unknown>;
  actor: string;
  requestId: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(payload: Record<string, unknown>, key: string, fallback?: string): string | null {
  const value = payload[key];
  if (value == null || value === "") return fallback ?? null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || (fallback ?? null);
}

function readNumber(payload: Record<string, unknown>, key: string, fallback?: number): number | null {
  const value = payload[key];
  if (value == null || value === "") return fallback ?? null;
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.trunc(numberValue);
}

function readRequiredString(payload: Record<string, unknown>, key: string): string {
  const value = readString(payload, key);
  if (!value) invalidPayload(`payload.${key} must be a non-empty string`);
  return value;
}

function readRequiredRecord(payload: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = asRecord(payload[key]);
  if (!value) invalidPayload(`payload.${key} must be an object`);
  return value;
}

function readOptionalRecord(payload: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = payload[key];
  if (value == null) return null;
  const record = asRecord(value);
  if (!record) invalidPayload(`payload.${key} must be an object when provided`);
  return record;
}

function readRecordArray(payload: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = payload[key];
  if (value == null) return [];
  if (!Array.isArray(value)) invalidPayload(`payload.${key} must be an array when provided`);
  return value.map((item, index) => {
    const record = asRecord(item);
    if (!record) invalidPayload(`payload.${key}[${index}] must be an object`);
    return record;
  });
}

function readStringArray(payload: Record<string, unknown>, key: string): string[] {
  const value = payload[key];
  if (value == null) return [];
  if (!Array.isArray(value)) invalidPayload(`payload.${key} must be an array when provided`);
  return value.map((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      invalidPayload(`payload.${key}[${index}] must be a non-empty string`);
    }
    return item.trim();
  });
}

function readNullableString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  if (value == null || value === "") return null;
  if (typeof value !== "string") invalidPayload(`payload.${key} must be a string when provided`);
  const trimmed = value.trim();
  return trimmed || null;
}

function readBoolean(payload: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = payload[key];
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  invalidPayload(`payload.${key} must be a boolean when provided`);
}

function readStringAlias(payload: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = readString(payload, key, undefined);
    if (value) return value;
  }
  return null;
}

function readNumberAlias(payload: Record<string, unknown>, fallback: number | undefined, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = readNumber(payload, key, undefined);
    if (value != null) return value;
  }
  return fallback ?? null;
}

function normalizeJsonArray(value: unknown): string | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  return JSON.stringify(value.map((item) => String(item)));
}

function normalizeJsonValue(value: unknown, fallback: unknown): string {
  return JSON.stringify(value == null ? fallback : value);
}

function normalizeJsonRecord(value: Record<string, unknown> | null): string {
  return JSON.stringify(value ?? {});
}

function canonicalStatusForGeneration(status: string): "draft" | "reviewing" {
  return status === "polished" ? "reviewing" : "draft";
}

function isChapterStatus(value: string): boolean {
  return [
    "outline",
    "first_draft",
    "polished",
    "audited",
    "published_unconfirmed",
    "published"
  ].includes(value);
}

function isChapterTransitionReason(value: string): boolean {
  return [
    "content_generated",
    "content_polished",
    "audit_passed",
    "audit_failed",
    "published_unconfirmed",
    "publish_submitted",
    "published",
    "publish_confirmed",
    "content_cleared",
    "manual_adjustment",
    "system_migration"
  ].includes(value);
}

function isAuditStatus(value: string): boolean {
  return ["pending", "reviewing", "passed", "failed"].includes(value);
}

function isSuggestedAction(value: string): boolean {
  return ["auto_fix", "rewrite", "manual", "none"].includes(value);
}

function readAuditIssues(payload: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const issues = readRecordArray(payload, key);
  return issues.map((issue, index) => {
    const type = readString(issue, "type");
    const message = readString(issue, "message");
    const severity = readString(issue, "severity");
    if (!type || !message || !severity) {
      invalidPayload(`payload.${key}[${index}] must include type, message, and severity`);
    }
    if (!["error", "warning", "info"].includes(severity)) {
      invalidPayload(`payload.${key}[${index}].severity must be error, warning, or info`);
    }

    const position = readOptionalRecord(issue, "position");
    if (position) {
      const line = position.line == null ? undefined : Number(position.line);
      const column = position.column == null ? undefined : Number(position.column);
      if ((line != null && !Number.isFinite(line)) || (column != null && !Number.isFinite(column))) {
        invalidPayload(`payload.${key}[${index}].position line and column must be numbers when provided`);
      }
      return {
        type,
        message,
        severity,
        position: {
          ...(line == null ? {} : { line }),
          ...(column == null ? {} : { column })
        }
      };
    }

    return { type, message, severity };
  });
}

function legacyChapterPartId(chapterId: number): string {
  return `legacy_chapter_${chapterId}`;
}

function legacyChapterBlockId(chapterId: number): string {
  return `legacy_chapter_${chapterId}_body`;
}

function legacyChapterAcceptanceBlockId(chapterId: number): string {
  return `legacy_chapter_${chapterId}_article_acceptance_report`;
}

function legacyChapterReferenceUsageBlockId(chapterId: number): string {
  return `legacy_chapter_${chapterId}_article_reference_usage_report`;
}

function legacyWorkId(workId: number): string {
  return `legacy_work_${workId}`;
}

function safeIdPart(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function publicationRecordId(input: {
  targetId: string;
  action: string;
  contentPartId: string | null;
  remotePartId: string | null;
  idempotencyKey: string;
}): string {
  const digest = createHash("sha256")
    .update(stableJson(input))
    .digest("hex")
    .slice(0, 24);
  return `pubrec_${digest}`;
}

function buildRelationId(input: {
  fromEntityType: string;
  fromEntityId: string;
  relationType: string;
  toEntityType: string;
  toEntityId: string;
}): string {
  const identity = {
    fromEntityType: input.fromEntityType,
    fromEntityId: input.fromEntityId,
    relationType: input.relationType,
    toEntityType: input.toEntityType,
    toEntityId: input.toEntityId
  };
  const digest = createHash("sha256")
    .update(stableJson(identity))
    .digest("hex")
    .slice(0, 24);
  return `rel_${digest}`;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function payloadHash(action: string, envelope: WriteEnvelope): string {
  return createHash("sha256")
    .update(stableJson({ action, payload: envelope.payload ?? {} }))
    .digest("hex");
}

function parseStoredResponse(value: MutationRow["response_json"]): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeIdempotencyKey(value: string | undefined): string | null {
  const key = value?.trim();
  if (!key) return null;
  if (key.length > 191) return null;
  return key;
}

async function parseWriteRequest(c: Context<AppBindings>) {
  const idempotencyKey = normalizeIdempotencyKey(c.req.header("X-DataBase-Idempotency-Key"));
  if (!idempotencyKey) {
    return {
      error: c.json(
        errorBody(c, "missing_idempotency_key", "Missing or invalid X-DataBase-Idempotency-Key"),
        400
      )
    };
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { error: c.json(errorBody(c, "invalid_json", "Request body must be valid JSON"), 400) };
  }

  const envelope = asRecord(body) as WriteEnvelope | null;
  const payload = asRecord(envelope?.payload);
  if (!envelope || !payload) {
    return {
      error: c.json(errorBody(c, "invalid_payload", "Request body must include a payload object"), 400)
    };
  }

  return { idempotencyKey, envelope, payload };
}

async function executeIdempotentMutation(
  c: Context<AppBindings>,
  writePool: DbPool,
  action: string,
  handler: MutationHandler
) {
  const parsed = await parseWriteRequest(c);
  if ("error" in parsed) return parsed.error;

  const { idempotencyKey, envelope, payload } = parsed;
  const actor = envelope.actor || "unknown";
  const hash = payloadHash(action, envelope);

  const [existingRows] = await writePool.query<MutationRow[]>(
    `SELECT * FROM database_gateway_mutations WHERE idempotency_key = ? LIMIT 1`,
    [idempotencyKey]
  );
  const existing = existingRows[0];

  if (existing) {
    if (existing.payload_hash !== hash || existing.action !== action) {
      return c.json(
        errorBody(c, "idempotency_conflict", "Idempotency key was already used for a different mutation"),
        409
      );
    }

    if (existing.status === "succeeded") {
      const stored = parseStoredResponse(existing.response_json);
      if (stored) return c.json(stored, 200);
    }

    if (existing.status === "started") {
      return c.json(
        errorBody(c, "mutation_in_progress", "Mutation with this idempotency key is already in progress"),
        409
      );
    }

    return c.json(
      errorBody(c, existing.error_code || "mutation_failed", "Mutation with this idempotency key previously failed"),
      409
    );
  }

  await writePool.execute(
    `
    INSERT INTO database_gateway_mutations
      (idempotency_key, action, actor, request_id, payload_hash, status)
    VALUES (?, ?, ?, ?, ?, 'started')
    `,
    [idempotencyKey, action, actor, envelope.requestId ?? null, hash]
  );

  try {
    const result = await handler({
      pool: writePool,
      action,
      idempotencyKey,
      envelope,
      payload,
      actor,
      requestId: c.get("requestId")
    });

    await writePool.execute(
      `
      UPDATE database_gateway_mutations
      SET status = 'succeeded', response_json = CAST(? AS JSON), error_code = NULL,
          target_type = ?, target_id = ?
      WHERE idempotency_key = ?
      `,
      [
        JSON.stringify(result.body),
        result.targetType,
        result.targetId == null ? null : String(result.targetId),
        idempotencyKey
      ]
    );

    return c.json(result.body);
  } catch (error) {
    await writePool.execute(
      `UPDATE database_gateway_mutations SET status = 'failed', error_code = ? WHERE idempotency_key = ?`,
      [
        error instanceof BadRequestError
          ? error.code
          : error instanceof Error
            ? error.name
            : "write_error",
        idempotencyKey
      ]
    );
    if (error instanceof BadRequestError) {
      return c.json(errorBody(c, error.code, error.message), 400);
    }
    throw error;
  }
}

async function createWork(ctx: MutationContext): Promise<MutationResult> {
  const title = readString(ctx.payload, "title");
  const description = readString(ctx.payload, "description", undefined);
  const alternativeTitles = ctx.payload.alternativeTitles == null
    ? null
    : Array.isArray(ctx.payload.alternativeTitles)
      ? JSON.stringify(ctx.payload.alternativeTitles.map((item) => String(item)))
      : readString(ctx.payload, "alternativeTitles", undefined);
  const tags = ctx.payload.tags == null
    ? null
    : Array.isArray(ctx.payload.tags)
      ? JSON.stringify(ctx.payload.tags.map((item) => String(item)))
      : readString(ctx.payload, "tags", undefined);
  const style = readString(ctx.payload, "style", undefined);
  const targetChapters = readNumber(ctx.payload, "targetChapters", 0);
  const currentChapters = readNumber(ctx.payload, "currentChapters", 0);
  const status = readString(ctx.payload, "status", "outline");
  const platform = readString(ctx.payload, "platform", undefined);

  if (!title || targetChapters == null || currentChapters == null || !status) {
    invalidPayload("payload.title must be a string; numeric chapter counters and status must be valid when provided");
  }

  const [result] = await ctx.pool.execute<ResultSetHeader>(
    `
    INSERT INTO works
      (title, alternative_titles, description, tags, style, target_chapters, current_chapters, status, platform)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [title, alternativeTitles, description, tags, style, targetChapters, currentChapters, status, platform]
  );

  const [rows] = await ctx.pool.query<RowDataPacket[]>(
    `
    SELECT id, title, description, status, platform, current_chapters, target_chapters, created_at, updated_at
    FROM works
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  const body = {
    ok: true,
    action: ctx.action,
    idempotencyKey: ctx.idempotencyKey,
    actor: ctx.actor,
    result: {
      affectedRows: result.affectedRows,
      insertId: result.insertId,
      warningStatus: result.warningStatus
    },
    item: rows[0] ?? null,
    requestId: ctx.requestId
  };

  return { targetType: "work", targetId: result.insertId, body };
}

async function upsertWork(ctx: MutationContext): Promise<MutationResult> {
  const title = readString(ctx.payload, "title");
  const description = readString(ctx.payload, "description", undefined);
  const alternativeTitles = ctx.payload.alternativeTitles == null
    ? null
    : Array.isArray(ctx.payload.alternativeTitles)
      ? JSON.stringify(ctx.payload.alternativeTitles.map((item) => String(item)))
      : readString(ctx.payload, "alternativeTitles", undefined);
  const tags = ctx.payload.tags == null
    ? null
    : Array.isArray(ctx.payload.tags)
      ? JSON.stringify(ctx.payload.tags.map((item) => String(item)))
      : readString(ctx.payload, "tags", undefined);
  const style = readString(ctx.payload, "style", undefined);
  const targetChapters = readNumber(ctx.payload, "targetChapters", 0);
  const status = readString(ctx.payload, "status", "outline");
  const platform = readString(ctx.payload, "platform", undefined);

  if (!title || targetChapters == null || !status) {
    invalidPayload("payload.title must be a string; targetChapters and status must be valid when provided");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM works WHERE title = ? LIMIT 1 FOR UPDATE`,
      [title]
    );
    const existing = existingRows[0];
    const created = !existing;
    let workId = Number(existing?.id || 0);
    let affectedRows = 0;
    let warningStatus = 0;

    if (workId) {
      const [result] = await connection.execute<ResultSetHeader>(
        `
        UPDATE works
        SET alternative_titles = COALESCE(?, alternative_titles),
            description = COALESCE(?, description),
            tags = COALESCE(?, tags),
            style = COALESCE(?, style),
            target_chapters = CASE WHEN ? > 0 THEN ? ELSE target_chapters END,
            status = COALESCE(?, status),
            platform = COALESCE(?, platform),
            updated_at = NOW()
        WHERE id = ?
        `,
        [
          alternativeTitles,
          description,
          tags,
          style,
          targetChapters,
          targetChapters,
          status,
          platform,
          workId
        ]
      );
      affectedRows = result.affectedRows;
      warningStatus = result.warningStatus;
    } else {
      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO works
          (title, alternative_titles, description, tags, style, target_chapters, current_chapters, status, platform)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        `,
        [title, alternativeTitles, description, tags, style, targetChapters, status, platform]
      );
      workId = result.insertId;
      affectedRows = result.affectedRows;
      warningStatus = result.warningStatus;
    }

    const [rows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, title, description, status, platform, current_chapters, target_chapters, created_at, updated_at
      FROM works
      WHERE id = ?
      LIMIT 1
      `,
      [workId]
    );

    await connection.commit();

    const body = {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows,
        insertId: created ? workId : 0,
        warningStatus
      },
      item: {
        ...(rows[0] ?? {}),
        created
      },
      requestId: ctx.requestId
    };

    return { targetType: "work", targetId: workId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function appendChapter(ctx: MutationContext): Promise<MutationResult> {
  const workId = readNumber(ctx.payload, "workId");
  const volumeNumber = readNumber(ctx.payload, "volumeNumber", 1);
  const chapterNumber = readNumber(ctx.payload, "chapterNumber");
  const title = readString(ctx.payload, "title", undefined);
  const content = readString(ctx.payload, "content", undefined);
  const plotSummary = readString(ctx.payload, "plotSummary", undefined);
  const wordCount = readNumber(ctx.payload, "wordCount", content ? content.length : 0);
  const status = readString(ctx.payload, "status", "draft");
  const auditStatus = readString(ctx.payload, "auditStatus", "pending");
  const auditIssues = normalizeJsonValue(ctx.payload.auditIssues, []);

  if (!workId || !chapterNumber || volumeNumber == null || wordCount == null || !status || !auditStatus) {
    invalidPayload("payload.workId, payload.chapterNumber, and chapter metadata must be valid");
  }

  const [result] = await ctx.pool.execute<ResultSetHeader>(
    `
    INSERT INTO chapters
      (work_id, volume_number, chapter_number, title, content, plot_summary, word_count, status, audit_status, audit_issues)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
    `,
    [workId, volumeNumber, chapterNumber, title, content, plotSummary, wordCount, status, auditStatus, auditIssues]
  );

  await ctx.pool.execute(
    `
    UPDATE works
    SET current_chapters = GREATEST(COALESCE(current_chapters, 0), ?)
    WHERE id = ?
    `,
    [chapterNumber, workId]
  );

  const [rows] = await ctx.pool.query<RowDataPacket[]>(
    `
    SELECT id, work_id, volume_number, chapter_number, title, word_count, status, audit_status, created_at, updated_at
    FROM chapters
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  const body = {
    ok: true,
    action: ctx.action,
    idempotencyKey: ctx.idempotencyKey,
    actor: ctx.actor,
    result: {
      affectedRows: result.affectedRows,
      insertId: result.insertId,
      warningStatus: result.warningStatus
    },
    item: rows[0] ?? null,
    requestId: ctx.requestId
  };

  return { targetType: "chapter", targetId: result.insertId, body };
}

async function recordGenerationOutput(ctx: MutationContext): Promise<MutationResult> {
  const workId = readNumber(ctx.payload, "workId");
  const chapterNumber = readNumber(ctx.payload, "chapterNumber");
  const chapterIdInput = readNumber(ctx.payload, "chapterId", undefined);
  const title = readString(ctx.payload, "title", undefined);
  const bodyText = readString(ctx.payload, "body");
  const status = readString(ctx.payload, "status", "first_draft");
  const operator = readString(ctx.payload, "operator", ctx.actor) ?? ctx.actor;
  const metadata = readOptionalRecord(ctx.payload, "metadata");
  const createIfMissing = readBoolean(ctx.payload, "createIfMissing", false);
  const volumeNumber = readNumber(ctx.payload, "volumeNumber", 1);

  if (!workId || !chapterNumber || !bodyText || !status) {
    invalidPayload("payload.workId, payload.chapterNumber, payload.body, and payload.status must be valid");
  }
  if (status !== "first_draft" && status !== "polished") {
    invalidPayload("payload.status must be first_draft or polished");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [chapterRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, work_id, volume_number, chapter_number, title, content, word_count, status, audit_status, audit_issues,
             published_at, audit_score, suggested_action, audited_at, created_at, updated_at
      FROM chapters
      WHERE ${chapterIdInput ? "id = ?" : "work_id = ? AND chapter_number = ?"}
      LIMIT 1
      `,
      chapterIdInput ? [chapterIdInput] : [workId, chapterNumber]
    );
    let chapter = chapterRows[0];
    if (!chapter && createIfMissing) {
      if (chapterIdInput) {
        invalidPayload("payload.createIfMissing cannot be used with a missing explicit chapterId");
      }
      const [insertedChapter] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO chapters
          (work_id, volume_number, chapter_number, title, content, plot_summary, word_count, status, audit_status, audit_issues)
        VALUES (?, ?, ?, ?, '', NULL, 0, 'draft', 'pending', CAST('[]' AS JSON))
        `,
        [workId, volumeNumber ?? 1, chapterNumber, title]
      );
      const [createdRows] = await connection.query<RowDataPacket[]>(
        `
        SELECT id, work_id, volume_number, chapter_number, title, content, word_count, status, audit_status, audit_issues,
               published_at, audit_score, suggested_action, audited_at, created_at, updated_at
        FROM chapters
        WHERE id = ?
        LIMIT 1
        `,
        [insertedChapter.insertId]
      );
      chapter = createdRows[0];
    }
    if (!chapter) {
      invalidPayload(`chapter not found for workId=${workId}, chapterNumber=${chapterNumber}`);
    }
    if (Number(chapter.work_id) !== workId || Number(chapter.chapter_number) !== chapterNumber) {
      invalidPayload("payload chapter identity does not match the stored chapter");
    }

    const chapterId = Number(chapter.id);
    const wordCount = bodyText.length;
    const finalTitle = title ?? (typeof chapter.title === "string" ? chapter.title : null);
    const canonicalStatus = canonicalStatusForGeneration(status);
    const previousStatus = String(chapter.status || "");
    const partId = legacyChapterPartId(chapterId);
    const blockId = legacyChapterBlockId(chapterId);
    const canonicalWorkId = legacyWorkId(workId);

    const [workRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, title, description, status, platform, current_chapters, target_chapters, created_at, updated_at
      FROM works
      WHERE id = ?
      LIMIT 1
      `,
      [workId]
    );
    const work = workRows[0];
    if (!work) {
      invalidPayload(`work not found for workId=${workId}`);
    }

    const outputMetadata = {
      ...(metadata ?? {}),
      source: "chapters",
      sourceId: chapterId,
      volumeNumber: Number(chapter.volume_number || 1),
      chapterNumber,
      wordCount,
      legacyStatus: status,
      auditStatus: chapter.audit_status ?? "pending",
      auditIssues: chapter.audit_issues ?? [],
      publishedAt: chapter.published_at ?? null,
      auditScore: chapter.audit_score ?? null,
      suggestedAction: chapter.suggested_action ?? null,
      auditedAt: chapter.audited_at ?? null,
      operator,
      updatedBy: ctx.actor
    };

    await connection.execute(
      `
      INSERT INTO content_works
        (id, kind, title, subtitle, status, author_profile_id, metadata_json)
      VALUES (?, 'manuscript', ?, NULL, 'active', NULL, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        kind = VALUES(kind),
        title = VALUES(title),
        subtitle = VALUES(subtitle),
        status = VALUES(status),
        author_profile_id = VALUES(author_profile_id),
        metadata_json = VALUES(metadata_json),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        canonicalWorkId,
        String(work.title || `legacy work ${workId}`),
        JSON.stringify({
          source: "works",
          sourceId: workId,
          legacyStatus: work.status ?? null,
          platform: work.platform ?? null,
          currentChapters: work.current_chapters ?? null,
          targetChapters: work.target_chapters ?? null,
          description: work.description ?? null,
          updatedBy: ctx.actor
        })
      ]
    );

    const [chapterUpdate] = await connection.execute<ResultSetHeader>(
      `
      UPDATE chapters
      SET title = COALESCE(?, title),
          content = ?,
          word_count = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [finalTitle, bodyText, wordCount, chapterId]
    );

    await connection.execute(
      `
      UPDATE works
      SET current_chapters = GREATEST(COALESCE(current_chapters, 0), ?)
      WHERE id = ?
      `,
      [chapterNumber, workId]
    );

    await connection.execute(
      `
      INSERT INTO content_parts
        (id, work_id, parent_part_id, kind, part_order, title, status, metadata_json)
      VALUES (?, ?, NULL, 'chapter', ?, ?, ?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        work_id = VALUES(work_id),
        parent_part_id = VALUES(parent_part_id),
        kind = VALUES(kind),
        part_order = VALUES(part_order),
        title = VALUES(title),
        status = VALUES(status),
        metadata_json = VALUES(metadata_json),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        partId,
        canonicalWorkId,
        chapterNumber,
        finalTitle,
        canonicalStatus,
        JSON.stringify(outputMetadata)
      ]
    );

    await connection.execute(
      `
      INSERT INTO content_blocks
        (id, work_id, part_id, asset_id, kind, block_order, text_content, payload_json)
      VALUES (?, ?, ?, NULL, 'paragraph', 1, ?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        work_id = VALUES(work_id),
        part_id = VALUES(part_id),
        asset_id = VALUES(asset_id),
        kind = VALUES(kind),
        block_order = VALUES(block_order),
        text_content = VALUES(text_content),
        payload_json = VALUES(payload_json),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        blockId,
        canonicalWorkId,
        partId,
        bodyText,
        JSON.stringify({
          source: "chapters.content",
      sourceId: chapterId,
      chapterNumber,
      wordCount,
      previousStatus,
      legacyStatus: status,
      operator,
      updatedBy: ctx.actor
        })
      ]
    );

    await connection.commit();

    const body = validatedResponse(RecordGenerationOutputMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows: chapterUpdate.affectedRows,
        insertId: 0,
        warningStatus: chapterUpdate.warningStatus
      },
      item: {
        workId,
        chapterId,
        chapterNumber,
        partId,
        blockId,
        status,
        canonicalStatus,
        wordCount
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return { targetType: "chapter", targetId: chapterId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordArticleAcceptanceReport(ctx: MutationContext): Promise<MutationResult> {
  const workId = readNumber(ctx.payload, "workId");
  const chapterNumber = readNumber(ctx.payload, "chapterNumber");
  const chapterIdInput = readNumber(ctx.payload, "chapterId", undefined);
  const operator = readString(ctx.payload, "operator", ctx.actor) ?? ctx.actor;
  const metadata = readOptionalRecord(ctx.payload, "metadata");
  const reportRecord = readRequiredRecord(ctx.payload, "report");
  const parsedReport = ArticleAcceptanceReportSchema.safeParse(reportRecord);
  if (!parsedReport.success) {
    invalidPayload(`payload.report violates article acceptance report contract: ${parsedReport.error.message}`);
  }
  const report = parsedReport.data;

  if (!workId || !chapterNumber) {
    invalidPayload("payload.workId and payload.chapterNumber must be valid");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [chapterRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, work_id, chapter_number
      FROM chapters
      WHERE ${chapterIdInput ? "id = ?" : "work_id = ? AND chapter_number = ?"}
      LIMIT 1
      `,
      chapterIdInput ? [chapterIdInput] : [workId, chapterNumber]
    );
    const chapter = chapterRows[0];
    if (!chapter) {
      invalidPayload(`chapter not found for workId=${workId}, chapterNumber=${chapterNumber}`);
    }
    if (Number(chapter.work_id) !== workId || Number(chapter.chapter_number) !== chapterNumber) {
      invalidPayload("payload chapter identity does not match the stored chapter");
    }

    const chapterId = Number(chapter.id);
    const partId = readString(ctx.payload, "partId", legacyChapterPartId(chapterId)) ?? legacyChapterPartId(chapterId);
    const canonicalWorkId = legacyWorkId(workId);
    const blockId = legacyChapterAcceptanceBlockId(chapterId);
    const reportId = readString(ctx.payload, "reportId", `${blockId}:${report.contractId}`) ?? `${blockId}:${report.contractId}`;
    const blockCount = report.violations.filter((item) => item.severity === "block").length;
    const warningCount = report.violations.filter((item) => item.severity === "warn").length;

    const [partRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM content_parts WHERE id = ? AND work_id = ? LIMIT 1`,
      [partId, canonicalWorkId]
    );
    if (!partRows[0]) {
      invalidPayload(`content part not found for acceptance report: ${partId}`);
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO content_blocks
        (id, work_id, part_id, asset_id, kind, block_order, text_content, payload_json)
      VALUES (?, ?, ?, NULL, 'prompt_context', 900000, ?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        work_id = VALUES(work_id),
        part_id = VALUES(part_id),
        asset_id = VALUES(asset_id),
        kind = VALUES(kind),
        block_order = VALUES(block_order),
        text_content = VALUES(text_content),
        payload_json = VALUES(payload_json),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        blockId,
        canonicalWorkId,
        partId,
        `article acceptance report: ${report.passed ? "passed" : "failed"}; blocks=${blockCount}; warnings=${warningCount}`,
        JSON.stringify({
          ...(metadata ?? {}),
          source: "contentbase-runtime.generate.article.acceptance",
          reportId,
          report,
          workId,
          chapterId,
          chapterNumber,
          partId,
          operator,
          updatedBy: ctx.actor
        })
      ]
    );

    await connection.commit();

    const body = validatedResponse(RecordArticleAcceptanceReportMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows: insertResult.affectedRows,
        insertId: 0,
        warningStatus: insertResult.warningStatus
      },
      item: {
        workId,
        chapterId,
        chapterNumber,
        partId,
        blockId,
        reportId,
        passed: report.passed,
        contractId: report.contractId,
        blockCount,
        warningCount
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return { targetType: "content_block", targetId: blockId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordArticleReferenceUsageReport(ctx: MutationContext): Promise<MutationResult> {
  const workId = readNumber(ctx.payload, "workId");
  const chapterNumber = readNumber(ctx.payload, "chapterNumber");
  const chapterIdInput = readNumber(ctx.payload, "chapterId", undefined);
  const operator = readString(ctx.payload, "operator", ctx.actor) ?? ctx.actor;
  const metadata = readOptionalRecord(ctx.payload, "metadata");
  const reportRecord = readRequiredRecord(ctx.payload, "report");
  const parsedReport = ArticleReferenceUsageReportSchema.safeParse(reportRecord);
  if (!parsedReport.success) {
    invalidPayload(`payload.report violates article reference usage report contract: ${parsedReport.error.message}`);
  }
  const report = parsedReport.data;

  if (!workId || !chapterNumber) {
    invalidPayload("payload.workId and payload.chapterNumber must be valid");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [chapterRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, work_id, chapter_number
      FROM chapters
      WHERE ${chapterIdInput ? "id = ?" : "work_id = ? AND chapter_number = ?"}
      LIMIT 1
      `,
      chapterIdInput ? [chapterIdInput] : [workId, chapterNumber]
    );
    const chapter = chapterRows[0];
    if (!chapter) {
      invalidPayload(`chapter not found for workId=${workId}, chapterNumber=${chapterNumber}`);
    }
    if (Number(chapter.work_id) !== workId || Number(chapter.chapter_number) !== chapterNumber) {
      invalidPayload("payload chapter identity does not match the stored chapter");
    }

    const chapterId = Number(chapter.id);
    const partId = readString(ctx.payload, "partId", legacyChapterPartId(chapterId)) ?? legacyChapterPartId(chapterId);
    const canonicalWorkId = legacyWorkId(workId);
    const blockId = legacyChapterReferenceUsageBlockId(chapterId);
    const reportId = readString(ctx.payload, "reportId", `${blockId}:${report.referenceWeaveVersion}`) ?? `${blockId}:${report.referenceWeaveVersion}`;

    const [partRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM content_parts WHERE id = ? AND work_id = ? LIMIT 1`,
      [partId, canonicalWorkId]
    );
    if (!partRows[0]) {
      invalidPayload(`content part not found for reference usage report: ${partId}`);
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO content_blocks
        (id, work_id, part_id, asset_id, kind, block_order, text_content, payload_json)
      VALUES (?, ?, ?, NULL, 'prompt_context', 900100, ?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        work_id = VALUES(work_id),
        part_id = VALUES(part_id),
        asset_id = VALUES(asset_id),
        kind = VALUES(kind),
        block_order = VALUES(block_order),
        text_content = VALUES(text_content),
        payload_json = VALUES(payload_json),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        blockId,
        canonicalWorkId,
        partId,
        `article reference usage report: anchors=${report.anchors.length}; sections=${report.sectionUsage.length}`,
        JSON.stringify({
          ...(metadata ?? {}),
          source: "contentbase-runtime.generate.article.reference-usage",
          reportId,
          report,
          workId,
          chapterId,
          chapterNumber,
          partId,
          operator,
          updatedBy: ctx.actor
        })
      ]
    );

    await connection.commit();

    const body = validatedResponse(RecordArticleReferenceUsageReportMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows: insertResult.affectedRows,
        insertId: 0,
        warningStatus: insertResult.warningStatus
      },
      item: {
        workId,
        chapterId,
        chapterNumber,
        partId,
        blockId,
        reportId,
        anchorCount: report.anchors.length,
        sectionCount: report.sectionUsage.length
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return { targetType: "chapter", targetId: chapterId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordAuthorLexiconReview(ctx: MutationContext): Promise<MutationResult> {
  const parsedPayload = RecordAuthorLexiconReviewPayloadSchema.safeParse(ctx.payload);
  if (!parsedPayload.success) {
    invalidPayload(`payload violates author lexicon review contract: ${parsedPayload.error.message}`);
  }

  const payload = parsedPayload.data;
  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [profileRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM author_profiles WHERE id = ? LIMIT 1`,
      [payload.authorProfileId]
    );
    if (!profileRows[0]) {
      invalidPayload(`author profile not found: ${payload.authorProfileId}`);
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO author_lexicon_reviews
        (author_profile_id, term, decision, source_kind, source_ref, reason)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        payload.authorProfileId,
        payload.term,
        payload.decision,
        payload.sourceKind,
        payload.sourceRef ?? null,
        payload.reason
      ]
    );

    let promotionApplied = false;
    let promotedTable: "vocabulary" | "banned_words" | null = null;
    let activeRecordId: string | null = null;
    let activeSummary: string | null = null;

    if (payload.decision === "approved_preferred") {
      const tags = Array.from(new Set(["creative-style", "author-active", ...(payload.tags ?? [])]));
      const note = payload.note ?? `creative-style import: author lexicon review ${payload.sourceKind}; ${payload.reason}`;
      await connection.execute<ResultSetHeader>(
        `
        INSERT INTO vocabulary (content, type, category, tags, note)
        VALUES (?, ?, ?, CAST(? AS JSON), ?)
        ON DUPLICATE KEY UPDATE
          type = VALUES(type),
          category = VALUES(category),
          tags = VALUES(tags),
          note = VALUES(note),
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          payload.term,
          payload.category ?? "author-active",
          payload.category ?? "author-active",
          JSON.stringify(tags),
          note
        ]
      );
      promotionApplied = true;
      promotedTable = "vocabulary";
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT id, content, type, category, note, created_at, updated_at FROM vocabulary WHERE content = ? LIMIT 1`,
        [payload.term]
      );
      const item = rows[0] ?? null;
      activeRecordId = item?.id != null ? String(item.id) : payload.term;
      activeSummary = item
        ? `preferred term active in vocabulary: ${item.content}`
        : `preferred term active in vocabulary: ${payload.term}`;
    } else if (payload.decision === "approved_banned") {
      const reason = `creative-style ban: author lexicon review ${payload.sourceKind}; ${payload.reason}`;
      await connection.execute<ResultSetHeader>(
        `
        INSERT INTO banned_words (content, type, category, reason, alternative)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          type = VALUES(type),
          category = VALUES(category),
          reason = VALUES(reason),
          alternative = VALUES(alternative),
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          payload.term,
          payload.category ?? "author-review",
          payload.category ?? "author-review",
          reason,
          payload.alternative ?? null
        ]
      );
      promotionApplied = true;
      promotedTable = "banned_words";
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT content, type, category, reason, alternative, created_at, updated_at FROM banned_words WHERE content = ? LIMIT 1`,
        [payload.term]
      );
      const item = rows[0] ?? null;
      activeRecordId = item?.content != null ? String(item.content) : payload.term;
      activeSummary = item
        ? `banned term active in banned_words: ${item.content}`
        : `banned term active in banned_words: ${payload.term}`;
    }

    await connection.commit();

    const body = validatedResponse(RecordAuthorLexiconReviewMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows: insertResult.affectedRows,
        insertId: insertResult.insertId,
        warningStatus: insertResult.warningStatus
      },
      item: {
        reviewId: insertResult.insertId,
        authorProfileId: payload.authorProfileId,
        term: payload.term,
        decision: payload.decision,
        sourceKind: payload.sourceKind,
        sourceRef: payload.sourceRef ?? null,
        promotionApplied,
        promotedTable,
        activeRecordId,
        activeSummary
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return {
      targetType: "author_lexicon_review",
      targetId: insertResult.insertId,
      body
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordChapterTransition(ctx: MutationContext): Promise<MutationResult> {
  const chapterId = readNumber(ctx.payload, "chapterId");
  const fromState = readString(ctx.payload, "fromState");
  const toState = readString(ctx.payload, "toState");
  const reason = readString(ctx.payload, "reason");
  const operator = readString(ctx.payload, "operator", ctx.actor) ?? ctx.actor;
  const metadata = readOptionalRecord(ctx.payload, "metadata");
  const logTransition = ctx.payload.logTransition !== false;
  const sealAuditPassed = ctx.payload.sealAuditPassed === true;

  if (!chapterId || !fromState || !toState || !reason) {
    invalidPayload("payload.chapterId, payload.fromState, payload.toState, and payload.reason must be valid");
  }
  if (!isChapterStatus(fromState) || !isChapterStatus(toState)) {
    invalidPayload("payload.fromState and payload.toState must be valid chapter statuses");
  }
  if (!isChapterTransitionReason(reason)) {
    invalidPayload("payload.reason must be a valid chapter transition reason");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [chapterRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, work_id, chapter_number, status
      FROM chapters
      WHERE id = ?
      LIMIT 1
      `,
      [chapterId]
    );
    const chapter = chapterRows[0];
    if (!chapter) {
      invalidPayload(`chapter not found for chapterId=${chapterId}`);
    }
    if (String(chapter.status || "") !== fromState) {
      invalidPayload("payload.fromState does not match the stored chapter status");
    }

    const parts: string[] = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
    const params: (string | number | null)[] = [toState];

    if (toState === "published") {
      parts.push("published_at = COALESCE(published_at, CURRENT_TIMESTAMP)");
      if (sealAuditPassed) {
        parts.push("audit_status = 'passed'", "suggested_action = 'none'");
      }
    } else if (toState === "published_unconfirmed") {
      parts.push("published_at = NULL");
    } else if (
      toState === "audited"
      && (fromState === "published_unconfirmed" || fromState === "published")
    ) {
      parts.push("published_at = NULL");
      if (reason === "system_migration" && fromState === "published") {
        parts.push("audit_status = 'passed'", "suggested_action = 'none'");
      }
    }

    params.push(chapterId);
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE chapters SET ${parts.join(", ")} WHERE id = ?`,
      params
    );

    let logged = false;
    if (logTransition) {
      await connection.execute(
        `
        CREATE TABLE IF NOT EXISTS state_transition_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          chapter_id INT NOT NULL,
          work_id INT NOT NULL,
          chapter_number INT NOT NULL,
          from_state VARCHAR(50) NOT NULL,
          to_state VARCHAR(50) NOT NULL,
          reason VARCHAR(50) NOT NULL,
          timestamp DATETIME NOT NULL,
          operator VARCHAR(100),
          metadata JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_chapter (chapter_id),
          INDEX idx_work (work_id),
          INDEX idx_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `
      );

      await connection.execute(
        `
        INSERT INTO state_transition_logs (
          chapter_id, work_id, chapter_number,
          from_state, to_state, reason,
          timestamp, operator, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CAST(? AS JSON))
        `,
        [
          chapterId,
          Number(chapter.work_id),
          Number(chapter.chapter_number),
          fromState,
          toState,
          reason,
          operator,
          normalizeJsonRecord(metadata)
        ]
      );
      logged = true;
    }

    await connection.commit();

    const body = validatedResponse(RecordChapterTransitionMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows: updateResult.affectedRows,
        insertId: 0,
        warningStatus: updateResult.warningStatus
      },
      item: {
        chapterId,
        workId: Number(chapter.work_id),
        chapterNumber: Number(chapter.chapter_number),
        fromState,
        toState,
        reason,
        logged
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return { targetType: "chapter", targetId: chapterId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordAuditResult(ctx: MutationContext): Promise<MutationResult> {
  const workId = readNumber(ctx.payload, "workId");
  const chapterNumber = readNumber(ctx.payload, "chapterNumber");
  const auditStatus = readString(ctx.payload, "auditStatus");
  const suggestedAction = readString(ctx.payload, "suggestedAction");
  const auditIssues = readAuditIssues(ctx.payload, "auditIssues");

  if (!workId || !chapterNumber || !auditStatus || !suggestedAction) {
    invalidPayload("payload.workId, payload.chapterNumber, payload.auditStatus, and payload.suggestedAction must be valid");
  }
  if (!isAuditStatus(auditStatus)) {
    invalidPayload("payload.auditStatus must be pending, reviewing, passed, or failed");
  }
  if (!isSuggestedAction(suggestedAction)) {
    invalidPayload("payload.suggestedAction must be auto_fix, rewrite, manual, or none");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [chapterRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, work_id, chapter_number
      FROM chapters
      WHERE work_id = ? AND chapter_number = ?
      LIMIT 1
      `,
      [workId, chapterNumber]
    );
    const chapter = chapterRows[0];
    if (!chapter) {
      invalidPayload(`chapter not found for workId=${workId}, chapterNumber=${chapterNumber}`);
    }

    const chapterId = Number(chapter.id);
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `
      UPDATE chapters
      SET audit_status = ?,
          audit_issues = CAST(? AS JSON),
          suggested_action = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [auditStatus, JSON.stringify(auditIssues), suggestedAction, chapterId]
    );

    await connection.commit();

    const body = validatedResponse(RecordAuditResultMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows: updateResult.affectedRows,
        insertId: 0,
        warningStatus: updateResult.warningStatus
      },
      item: {
        workId,
        chapterId,
        chapterNumber,
        auditStatus,
        suggestedAction,
        issueCount: auditIssues.length
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return { targetType: "chapter", targetId: chapterId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function upsertVocabularyItem(ctx: MutationContext): Promise<MutationResult> {
  const content = readString(ctx.payload, "content");
  const type = readString(ctx.payload, "type", "vocabulary");
  const category = readString(ctx.payload, "category", "通用");
  const note = readString(ctx.payload, "note", undefined);
  const tags = normalizeJsonArray(ctx.payload.tags);

  if (!content || !type || !category) {
    invalidPayload("payload.content, payload.type, and payload.category must be strings");
  }

  if (ctx.payload.tags != null && tags == null) {
    invalidPayload("payload.tags must be an array when provided");
  }

  const [result] = await ctx.pool.execute<ResultSetHeader>(
    `
    INSERT INTO vocabulary (content, type, category, tags, note)
    VALUES (?, ?, ?, CAST(? AS JSON), ?)
    ON DUPLICATE KEY UPDATE
      type = VALUES(type),
      category = VALUES(category),
      tags = VALUES(tags),
      note = VALUES(note),
      updated_at = CURRENT_TIMESTAMP
    `,
    [content, type, category, tags, note]
  );

  const [rows] = await ctx.pool.query<RowDataPacket[]>(
    `SELECT id, content, type, category, note, created_at, updated_at FROM vocabulary WHERE content = ? LIMIT 1`,
    [content]
  );

  const item = rows[0] ?? null;
  const body = {
    ok: true,
    action: ctx.action,
    idempotencyKey: ctx.idempotencyKey,
    actor: ctx.actor,
    result: {
      affectedRows: result.affectedRows,
      insertId: result.insertId,
      warningStatus: result.warningStatus
    },
    item,
    requestId: ctx.requestId
  };

  return { targetType: "vocabulary", targetId: item?.id ?? content, body };
}

async function recordNote(ctx: MutationContext): Promise<MutationResult> {
  const title = readString(ctx.payload, "title");
  const content = readString(ctx.payload, "content", undefined);
  const category = readString(ctx.payload, "category", "general");
  const tags = normalizeJsonArray(ctx.payload.tags);

  if (!title || !category) {
    invalidPayload("payload.title and payload.category must be strings");
  }

  if (ctx.payload.tags != null && tags == null) {
    invalidPayload("payload.tags must be an array when provided");
  }

  const [result] = await ctx.pool.execute<ResultSetHeader>(
    `
    INSERT INTO notes (title, content, category, tags)
    VALUES (?, ?, ?, CAST(? AS JSON))
    `,
    [title, content, category, tags]
  );

  const [rows] = await ctx.pool.query<RowDataPacket[]>(
    `SELECT id, title, content, category, tags, created_at, updated_at FROM notes WHERE id = ? LIMIT 1`,
    [result.insertId]
  );

  const body = {
    ok: true,
    action: ctx.action,
    idempotencyKey: ctx.idempotencyKey,
    actor: ctx.actor,
    result: {
      affectedRows: result.affectedRows,
      insertId: result.insertId,
      warningStatus: result.warningStatus
    },
    item: rows[0] ?? null,
    requestId: ctx.requestId
  };

  return { targetType: "note", targetId: result.insertId, body };
}

async function recordExperience(ctx: MutationContext): Promise<MutationResult> {
  const type = readString(ctx.payload, "type", "note");
  const title = readString(ctx.payload, "title");
  const description = readString(ctx.payload, "description", undefined);
  const userQuery = readString(ctx.payload, "userQuery", undefined);
  const solution = readString(ctx.payload, "solution", undefined);
  const summary = readString(ctx.payload, "summary", undefined);
  const rootCause = readString(ctx.payload, "rootCause", undefined);
  const verification = readString(ctx.payload, "verification", "");
  const sourceText = readString(ctx.payload, "sourceText", undefined);
  const cloudText = readString(ctx.payload, "cloudText", undefined);
  const tags = normalizeJsonArray(ctx.payload.tags) ?? "[]";
  const tagsText = Array.isArray(ctx.payload.tags) ? ctx.payload.tags.map((item) => String(item)).join(",") : "";
  const experienceApplied = normalizeJsonValue(ctx.payload.experienceApplied, []);
  const experienceGained = normalizeJsonValue(ctx.payload.experienceGained, []);
  const difficulty = readNumber(ctx.payload, "difficulty", 1);
  const xpGained = readNumber(ctx.payload, "xpGained", 50);
  const payload = JSON.stringify(ctx.payload);

  if (!type || !title || difficulty == null || xpGained == null) {
    invalidPayload("payload.type, payload.title, payload.difficulty, and payload.xpGained must be valid");
  }

  const [result] = await ctx.pool.execute<ResultSetHeader>(
    `
    INSERT INTO experience_records
      (type, title, description, user_query, solution, experience_applied, experience_gained,
       tags, difficulty, xp_gained, tags_text, summary, root_cause, verification, source_text, cloud_text, payload)
    VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      type,
      title,
      description,
      userQuery,
      solution,
      experienceApplied,
      experienceGained,
      tags,
      difficulty,
      xpGained,
      tagsText,
      summary,
      rootCause,
      verification,
      sourceText,
      cloudText,
      payload
    ]
  );

  const [rows] = await ctx.pool.query<RowDataPacket[]>(
    `
    SELECT id, type, title, summary, root_cause, verification, tags_text, created_at, updated_at
    FROM experience_records
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  const body = {
    ok: true,
    action: ctx.action,
    idempotencyKey: ctx.idempotencyKey,
    actor: ctx.actor,
    result: {
      affectedRows: result.affectedRows,
      insertId: result.insertId,
      warningStatus: result.warningStatus
    },
    item: rows[0] ?? null,
    requestId: ctx.requestId
  };

  return { targetType: "experience_record", targetId: result.insertId, body };
}

function semanticReferenceUnitId(input: {
  materialKind: string;
  sourceId?: string;
  sourceTitle: string;
  sourceLocator?: string;
  excerpt: string;
}): string {
  const digest = createHash("sha256")
    .update(stableJson(input))
    .digest("hex")
    .slice(0, 24);
  return `sem_ref_${digest}`;
}

function semanticTagId(layer: string, value: string): string {
  const digest = createHash("sha256")
    .update(stableJson({ layer, value }))
    .digest("hex")
    .slice(0, 24);
  return `tag_${digest}`;
}

function styleRevisionPairUnitId(input: {
  issueType: string;
  ruleId: string;
  originalText: string;
  revisedText?: string;
}): string {
  const digest = createHash("sha256")
    .update(stableJson(input))
    .digest("hex")
    .slice(0, 24);
  return `style_rev_${digest}`;
}

async function recordSemanticReferenceMaterial(ctx: MutationContext): Promise<MutationResult> {
  const parsedPayload = RecordSemanticReferenceMaterialPayloadSchema.safeParse(ctx.payload);
  if (!parsedPayload.success) {
    invalidPayload(`payload violates semantic reference material contract: ${parsedPayload.error.message}`);
  }

  const payload = parsedPayload.data;
  const unitId = payload.unitId || semanticReferenceUnitId({
    materialKind: payload.materialKind,
    sourceId: payload.sourceId,
    sourceTitle: payload.sourceTitle,
    sourceLocator: payload.sourceLocator,
    excerpt: payload.excerpt
  });
  const materialTag = {
    layer: "usable_for" as const,
    value: `reference:${payload.materialKind}`,
    description: `Reusable ${payload.materialKind} material for writing reference selection.`
  };
  const tags = [
    materialTag,
    ...payload.tags
  ];

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();
    let affectedRows = 0;

    const [unitResult] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO semantic_units
        (id, source_id, source_title, source_author, source_locator, excerpt, summary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        source_id = VALUES(source_id),
        source_title = VALUES(source_title),
        source_author = VALUES(source_author),
        source_locator = VALUES(source_locator),
        excerpt = VALUES(excerpt),
        summary = VALUES(summary),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        unitId,
        payload.sourceId ?? null,
        payload.sourceTitle,
        payload.sourceAuthor ?? null,
        payload.sourceLocator ?? null,
        payload.excerpt,
        payload.summary ?? null,
        payload.status
      ]
    );
    affectedRows += unitResult.affectedRows;

    for (const tag of tags) {
      const tagId = semanticTagId(tag.layer, tag.value);
      const [tagResult] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO semantic_tag_taxonomy
          (id, tag_layer, tag_value, description, status)
        VALUES (?, ?, ?, ?, 'active')
        ON DUPLICATE KEY UPDATE
          description = COALESCE(VALUES(description), description),
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
        `,
        [tagId, tag.layer, tag.value, tag.description ?? null]
      );
      affectedRows += tagResult.affectedRows;

      const [linkResult] = await connection.execute<ResultSetHeader>(
        `
        INSERT IGNORE INTO semantic_unit_tags (unit_id, tag_id)
        VALUES (?, ?)
        `,
        [unitId, tagId]
      );
      affectedRows += linkResult.affectedRows;
    }

    await connection.commit();

    const body = validatedResponse(RecordSemanticReferenceMaterialMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows,
        insertId: 0,
        warningStatus: 0
      },
      item: {
        unitId,
        sourceId: payload.sourceId ?? null,
        sourceTitle: payload.sourceTitle,
        materialKind: payload.materialKind,
        status: payload.status,
        tagCount: tags.length
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return { targetType: "semantic_unit", targetId: unitId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordStyleRevisionPair(ctx: MutationContext): Promise<MutationResult> {
  const parsedPayload = RecordStyleRevisionPairPayloadSchema.safeParse(ctx.payload);
  if (!parsedPayload.success) {
    invalidPayload(`payload violates style revision pair contract: ${parsedPayload.error.message}`);
  }

  const payload = parsedPayload.data;
  const unitId = payload.pairId || styleRevisionPairUnitId({
    issueType: payload.issueType,
    ruleId: payload.ruleId,
    originalText: payload.originalText,
    revisedText: payload.revisedText
  });
  // 风格修订样本进入 semantic_units：这是长期学习证据，不是运行时替换规则。
  const excerptJson = JSON.stringify({
    version: "style-revision-pair.v1",
    issueType: payload.issueType,
    ruleId: payload.ruleId,
    severity: payload.severity,
    originalText: payload.originalText,
    revisedText: payload.revisedText ?? null,
    reviewerEvidence: payload.reviewerEvidence,
    topic: payload.topic ?? null,
    target: payload.target ?? null,
    metadata: payload.metadata ?? {}
  });
  const summary = [
    `issueType: ${payload.issueType}`,
    `badReason: ${payload.reviewerEvidence.badReason}`,
    `targetShape: ${payload.reviewerEvidence.targetShape}`,
    payload.revisedText ? "has revisedText" : "revisedText pending"
  ].join("\n");
  const canonicalTags = [
    {
      layer: "usable_for" as const,
      value: "style-revision-pair",
      description: "ContentBase reviewer evidence for future style prompting and evaluation."
    },
    {
      layer: "usable_for" as const,
      value: "syntax-eval-case",
      description: "Syntax reviewer case with bad reason, rewrite action, forbidden move, and target shape."
    },
    {
      layer: "style" as const,
      value: payload.issueType,
      description: `Syntax issue type observed by ContentBase: ${payload.issueType}.`
    }
  ];
  const tags = [
    ...canonicalTags,
    ...payload.tags
  ];

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();
    let affectedRows = 0;

    const [unitResult] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO semantic_units
        (id, source_id, source_title, source_author, source_locator, excerpt, summary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        source_id = VALUES(source_id),
        source_title = VALUES(source_title),
        source_author = VALUES(source_author),
        source_locator = VALUES(source_locator),
        excerpt = VALUES(excerpt),
        summary = VALUES(summary),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        unitId,
        payload.sourceId ?? "contentbase.syntax-reviewer",
        payload.sourceTitle,
        "ContentBase",
        payload.sourceLocator ?? null,
        excerptJson,
        summary,
        payload.status
      ]
    );
    affectedRows += unitResult.affectedRows;

    for (const tag of tags) {
      const tagId = semanticTagId(tag.layer, tag.value);
      const [tagResult] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO semantic_tag_taxonomy
          (id, tag_layer, tag_value, description, status)
        VALUES (?, ?, ?, ?, 'active')
        ON DUPLICATE KEY UPDATE
          description = COALESCE(VALUES(description), description),
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
        `,
        [tagId, tag.layer, tag.value, tag.description ?? null]
      );
      affectedRows += tagResult.affectedRows;

      const [linkResult] = await connection.execute<ResultSetHeader>(
        `
        INSERT IGNORE INTO semantic_unit_tags (unit_id, tag_id)
        VALUES (?, ?)
        `,
        [unitId, tagId]
      );
      affectedRows += linkResult.affectedRows;
    }

    await connection.commit();

    const body = validatedResponse(RecordStyleRevisionPairMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows,
        insertId: 0,
        warningStatus: 0
      },
      item: {
        unitId,
        sourceId: payload.sourceId ?? "contentbase.syntax-reviewer",
        sourceTitle: payload.sourceTitle,
        issueType: payload.issueType,
        status: payload.status,
        tagCount: tags.length
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return { targetType: "semantic_unit", targetId: unitId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordStoryMemory(ctx: MutationContext): Promise<MutationResult> {
  const workId = readNumber(ctx.payload, "workId");
  const chapterNumber = readNumber(ctx.payload, "chapterNumber");
  const events = readRecordArray(ctx.payload, "events");
  const characterGrowth = readRecordArray(ctx.payload, "characterGrowth");
  const importantItems = readRecordArray(ctx.payload, "importantItems");

  if (!workId || !chapterNumber) {
    invalidPayload("payload.workId and payload.chapterNumber must be valid");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();
    let affectedRows = 0;

    for (const event of events) {
      const eventType = readRequiredString(event, "eventType");
      const title = readRequiredString(event, "title");
      const description = readString(event, "description", "");
      const charactersInvolved = normalizeJsonValue(event.charactersInvolved, []);
      const importance = readString(event, "importance", "medium");

      await connection.execute(
        `
        INSERT INTO story_events
          (work_id, chapter_number, event_type, title, description, characters_involved, importance)
        VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?)
        `,
        [workId, chapterNumber, eventType, title, description, charactersInvolved, importance]
      );
      affectedRows += 1;
    }

    for (const growth of characterGrowth) {
      const characterName = readRequiredString(growth, "characterName");
      const growthType = readRequiredString(growth, "growthType");
      const before = readString(growth, "before", "");
      const after = readString(growth, "after", "");
      const description = readString(growth, "description", "");

      await connection.execute(
        `
        INSERT INTO character_growth
          (work_id, character_name, chapter_number, growth_type, before_change, after_change, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [workId, characterName, chapterNumber, growthType, before, after, description]
      );
      affectedRows += 1;
    }

    for (const item of importantItems) {
      const name = readRequiredString(item, "name");
      const itemType = readString(item, "type", "other") ?? "other";
      const description = readString(item, "description", "");
      const currentOwner = readString(item, "currentOwner", undefined);
      const acquiredAt = normalizeJsonValue(item.acquiredAt, { chapterNumber, description: "" });
      const currentLocation = readString(item, "currentLocation", undefined);
      const properties = normalizeJsonValue(item.properties, {});

      await connection.execute(
        `
        INSERT INTO important_items
          (work_id, name, item_type, description, current_owner, acquired_at, current_location, properties)
        VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, CAST(? AS JSON))
        ON DUPLICATE KEY UPDATE
          item_type = VALUES(item_type),
          description = VALUES(description),
          current_owner = VALUES(current_owner),
          current_location = VALUES(current_location),
          properties = VALUES(properties),
          updated_at = CURRENT_TIMESTAMP
        `,
        [workId, name, itemType, description, currentOwner, acquiredAt, currentLocation, properties]
      );
      affectedRows += 1;
    }

    await connection.commit();

    const body = validatedResponse(RecordStoryMemoryMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows,
        insertId: 0,
        warningStatus: 0
      },
      item: {
        workId,
        chapterNumber,
        events: events.length,
        characterGrowth: characterGrowth.length,
        importantItems: importantItems.length
      },
      requestId: ctx.requestId
    });

    return { targetType: "story_memory", targetId: `${workId}:${chapterNumber}`, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordFanqieAccountSession(ctx: MutationContext): Promise<MutationResult> {
  const accountId = readRequiredString(ctx.payload, "accountId");
  const cookiesPayload = readRequiredRecord(ctx.payload, "cookiesPayload");
  const cookieChecksum = readString(ctx.payload, "cookieChecksum", undefined)
    || readString(cookiesPayload, "checksum", undefined);
  const cookieCount = readNumber(ctx.payload, "cookieCount", undefined)
    ?? readNumber(cookiesPayload, "cookieCount", undefined);
  const expiresSummary = readOptionalRecord(ctx.payload, "expiresSummary")
    ?? readOptionalRecord(cookiesPayload, "expiresSummary")
    ?? {};

  if (!cookieChecksum || cookieCount == null) {
    invalidPayload("payload.cookieChecksum and payload.cookieCount are required");
  }

  const cookiesJson = JSON.stringify(cookiesPayload);
  const expiresJson = JSON.stringify(expiresSummary);
  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();
    const [updatedSession] = await connection.execute<ResultSetHeader>(
      `
      UPDATE fanqie_account_sessions
      SET
        cookies_file = ?,
        cookie_checksum = ?,
        cookie_count = ?,
        expires_summary_json = CAST(? AS JSON),
        synced_at = NOW(),
        updated_at = NOW()
      WHERE account_id = ?
        AND session_type = 'cookies_file'
      `,
      [cookiesJson, cookieChecksum, cookieCount, expiresJson, accountId]
    );
    if (updatedSession.affectedRows === 0) {
      await connection.execute(
        `
        INSERT INTO fanqie_account_sessions
          (account_id, session_type, cookies_file, cookie_checksum, cookie_count, expires_summary_json, synced_at, created_at, updated_at)
        VALUES
          (?, 'cookies_file', ?, ?, ?, CAST(? AS JSON), NOW(), NOW(), NOW())
        `,
        [accountId, cookiesJson, cookieChecksum, cookieCount, expiresJson]
      );
    }

    await connection.execute(
      `
      UPDATE fanqie_accounts
      SET cookies_storage_type = 'database',
          cookies_file = 'database:fanqie_account_sessions.cookies_file',
          cookie_checksum = ?,
          last_cookie_synced_at = NOW(),
          updated_at = NOW()
      WHERE account_id = ?
      `,
      [cookieChecksum, accountId]
    );
    await connection.commit();

    const body = {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: { affectedRows: 2, insertId: 0, warningStatus: 0 },
      item: { accountId, cookieCount, cookieChecksum },
      requestId: ctx.requestId
    };
    return { targetType: "fanqie_account_session", targetId: accountId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function syncFanqieWorks(ctx: MutationContext): Promise<MutationResult> {
  const works = readRecordArray(ctx.payload, "works");
  if (works.length === 0) invalidPayload("payload.works must contain at least one work");

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();
    let affectedRows = 0;
    const changed: Record<string, unknown>[] = [];

    for (const work of works) {
      const accountId = readRequiredString(work, "accountId");
      const bookId = readStringAlias(work, "bookId", "workId", "remoteWorkId");
      const title = readRequiredString(work, "title");
      const chapterCount = readNumberAlias(work, 0, "latestChapterNumber", "chapterCount") ?? 0;
      const raw = readOptionalRecord(work, "raw") ?? {};
      const wordCount = readNumberAlias(raw, undefined, "wordCount", "word_count");
      const status = readStringAlias(raw, "status", "remoteStatus") || "unknown";
      const author = readStringAlias(raw, "author");
      const coverUrl = readStringAlias(raw, "coverUrl", "cover_url");
      if (!bookId) invalidPayload("payload.works items must include bookId");

      const [updated] = await connection.execute<ResultSetHeader>(
        `
        UPDATE fanqie_works
        SET title = ?,
          author = COALESCE(?, author),
          cover_url = COALESCE(?, cover_url),
          chapter_count = ?,
          word_count = COALESCE(?, word_count),
          status = ?,
          last_synced_at = NOW(),
          updated_at = NOW()
        WHERE account_id = ?
          AND work_id = ?
        `,
        [title, author, coverUrl, chapterCount, wordCount, status, accountId, bookId]
      );
      if (updated.affectedRows > 0) {
        affectedRows += updated.affectedRows;
        changed.push({ accountId, bookId, title, action: "updated" });
      } else {
        const [inserted] = await connection.execute<ResultSetHeader>(
          `
          INSERT INTO fanqie_works
            (account_id, work_id, title, author, cover_url, chapter_count, word_count, status, last_synced_at, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
          `,
          [accountId, bookId, title, author, coverUrl, chapterCount, wordCount, status]
        );
        affectedRows += inserted.affectedRows;
        changed.push({ accountId, bookId, title, action: "inserted" });
      }
    }

    await connection.commit();
    const body = {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: { affectedRows, insertId: 0, warningStatus: 0 },
      item: { syncedAt: new Date().toISOString(), count: changed.length, works: changed },
      requestId: ctx.requestId
    };
    return { targetType: "fanqie_works", targetId: null, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function syncFanqieRemoteChapters(ctx: MutationContext): Promise<MutationResult> {
  const accountId = readRequiredString(ctx.payload, "accountId");
  const bookId = readRequiredString(ctx.payload, "bookId");
  const chapters = readRecordArray(ctx.payload, "chapters");
  const chapterCount = readNumber(ctx.payload, "chapterCount", chapters.length) ?? chapters.length;
  if (chapters.length === 0) invalidPayload("payload.chapters must contain at least one chapter");

  await ctx.pool.execute(
    `
    INSERT INTO fanqie_remote_chapter_snapshots
      (account_id, book_id, chapter_count, chapters_json, synced_at, created_at, updated_at)
    VALUES
      (?, ?, ?, ?, NOW(), NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      chapter_count = VALUES(chapter_count),
      chapters_json = VALUES(chapters_json),
      synced_at = NOW(),
      updated_at = NOW()
    `,
    [accountId, bookId, chapterCount, JSON.stringify(chapters)]
  );

  const body = {
    ok: true,
    action: ctx.action,
    idempotencyKey: ctx.idempotencyKey,
    actor: ctx.actor,
    result: { affectedRows: 1, insertId: 0, warningStatus: 0 },
    item: { accountId, bookId, chapterCount, syncedAt: new Date().toISOString() },
    requestId: ctx.requestId
  };
  return { targetType: "fanqie_remote_chapter_snapshots", targetId: `${accountId}:${bookId}`, body };
}

async function registerPublicationTarget(ctx: MutationContext): Promise<MutationResult> {
  const accountId = readStringAlias(ctx.payload, "accountId", "accountIdentity");
  const bookId = readStringAlias(ctx.payload, "bookId", "remoteWorkId");
  const localWorkIdRaw = readRequiredString(ctx.payload, "localWorkId");
  if (!accountId || !bookId) invalidPayload("payload.accountId and payload.bookId are required");

  const candidates = [
    localWorkIdRaw,
    /^\d+$/.test(localWorkIdRaw) ? `legacy_work_${localWorkIdRaw}` : ""
  ].filter(Boolean);
  const [workRows] = await ctx.pool.query<RowDataPacket[]>(
    `SELECT id FROM content_works WHERE id IN (${candidates.map(() => "?").join(",")}) LIMIT 1`,
    candidates
  );
  const localWorkId = workRows[0]?.id ? String(workRows[0].id) : null;
  if (!localWorkId) invalidPayload(`content_works id not found for localWorkId=${localWorkIdRaw}`);

  const targetId = readString(ctx.payload, "targetId", undefined)
    || `fanqie_${safeIdPart(accountId)}_${safeIdPart(bookId)}`.slice(0, 128);
  const status = readString(ctx.payload, "status", "active");
  const metadata = {
    source: "database-gateway.registerPublicationTarget",
    title: readString(ctx.payload, "title", undefined),
    author: readString(ctx.payload, "author", undefined),
    ...(readOptionalRecord(ctx.payload, "metadata") ?? {})
  };

  await ctx.pool.execute(
    `
    INSERT INTO publication_targets
      (id, platform, account_identity, local_work_id, remote_work_id, status, metadata_json, created_at, updated_at)
    VALUES
      (?, 'fanqie', ?, ?, ?, ?, CAST(? AS JSON), NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      local_work_id = VALUES(local_work_id),
      status = VALUES(status),
      metadata_json = VALUES(metadata_json),
      updated_at = NOW()
    `,
    [targetId, accountId, localWorkId, bookId, status, JSON.stringify(metadata)]
  );

  const body = {
    ok: true,
    action: ctx.action,
    idempotencyKey: ctx.idempotencyKey,
    actor: ctx.actor,
    result: { affectedRows: 1, insertId: 0, warningStatus: 0 },
    item: { id: targetId, platform: "fanqie", accountIdentity: accountId, localWorkId, remoteWorkId: bookId, status, metadata },
    requestId: ctx.requestId
  };
  return { targetType: "publication_target", targetId, body };
}

async function recordPublicationResult(ctx: MutationContext): Promise<MutationResult> {
  const accountId = readRequiredString(ctx.payload, "accountId");
  const bookId = readRequiredString(ctx.payload, "bookId");
  const localWorkIdRaw = readRequiredString(ctx.payload, "localWorkId");
  const chapterIdInput = readNumber(ctx.payload, "chapterId");
  const chapterNumber = readNumber(ctx.payload, "chapterNumber");
  const contentPartIdInput = readString(ctx.payload, "contentPartId", undefined);
  const action = readRequiredString(ctx.payload, "action");
  const remotePartId = readString(ctx.payload, "remotePartId", undefined);
  const observedStatus = readRequiredString(ctx.payload, "observedStatus");
  const publishedAt = readString(ctx.payload, "publishedAt", undefined);
  const result = readOptionalRecord(ctx.payload, "result") ?? {};
  if (!chapterNumber) invalidPayload("payload.chapterNumber must be valid");
  if (!["publish_chapter", "edit_chapter"].includes(action)) {
    invalidPayload("payload.action must be publish_chapter or edit_chapter");
  }
  if (!["submitted", "published", "edited", "failed"].includes(observedStatus)) {
    invalidPayload("payload.observedStatus must be submitted, published, edited, or failed");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    const targetIdInput = readString(ctx.payload, "targetId", undefined);
    let targetId = targetIdInput;
    if (!targetId) {
      const [targetRows] = await connection.query<RowDataPacket[]>(
        `
        SELECT id
        FROM publication_targets
        WHERE platform = 'fanqie'
          AND account_identity = ?
          AND remote_work_id = ?
          AND status = 'active'
        LIMIT 1
        `,
        [accountId, bookId]
      );
      targetId = targetRows[0]?.id ? String(targetRows[0].id) : null;
    }
    if (!targetId) invalidPayload(`publication target not found for accountId=${accountId}, bookId=${bookId}`);

    const legacyWorkId = String(localWorkIdRaw).replace(/^legacy_work_/, "");
    const chapterWhere = chapterIdInput
      ? "id = ?"
      : "work_id = ? AND chapter_number = ?";
    const chapterParams = chapterIdInput
      ? [chapterIdInput]
      : [legacyWorkId, chapterNumber];
    const [chapterRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id, work_id, chapter_number, status
      FROM chapters
      WHERE ${chapterWhere}
      LIMIT 1
      `,
      chapterParams
    );
    const chapter = chapterRows[0] ?? null;
    const chapterId = chapter ? Number(chapter.id) : null;
    const contentPartId = contentPartIdInput || (chapterId ? legacyChapterPartId(chapterId) : null);
    const recordId = publicationRecordId({
      targetId,
      action,
      contentPartId,
      remotePartId: remotePartId ?? null,
      idempotencyKey: ctx.idempotencyKey
    });
    const statusForChapter = observedStatus === "published" || observedStatus === "edited"
      ? "published"
      : observedStatus === "submitted"
        ? "published_unconfirmed"
        : null;
    const statusForPart = observedStatus === "published" || observedStatus === "edited" ? "published" : null;

    let affectedRows = 0;
    const [insertRecord] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO publication_records
        (id, target_id, content_part_id, action, remote_part_id, observed_status, idempotency_key, result_json, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        observed_status = VALUES(observed_status),
        remote_part_id = VALUES(remote_part_id),
        result_json = VALUES(result_json)
      `,
      [recordId, targetId, contentPartId, action, remotePartId ?? null, observedStatus, ctx.idempotencyKey, normalizeJsonValue(result, {})]
    );
    affectedRows += insertRecord.affectedRows;

    if (chapterId && statusForChapter) {
      const [chapterUpdate] = await connection.execute<ResultSetHeader>(
        `
        UPDATE chapters
        SET status = ?,
            published_at = CASE
              WHEN ? IS NOT NULL THEN ?
              WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP)
              ELSE published_at
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [statusForChapter, publishedAt ?? null, publishedAt ?? null, statusForChapter, chapterId]
      );
      affectedRows += chapterUpdate.affectedRows;
    }

    if (contentPartId && statusForPart) {
      const [partUpdate] = await connection.execute<ResultSetHeader>(
        `
        UPDATE content_parts
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [statusForPart, contentPartId]
      );
      affectedRows += partUpdate.affectedRows;
    }

    await connection.commit();

    const body = validatedResponse(RecordPublicationResultMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows,
        insertId: 0,
        warningStatus: insertRecord.warningStatus
      },
      item: {
        recordId,
        targetId,
        contentPartId,
        chapterId,
        chapterNumber,
        action,
        remotePartId: remotePartId ?? null,
        observedStatus,
        chapterStatus: statusForChapter,
        contentPartStatus: statusForPart
      },
      requestId: ctx.requestId
    }) as Record<string, unknown>;

    return { targetType: "publication_record", targetId: recordId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function replaceWorkStructure(ctx: MutationContext): Promise<MutationResult> {
  const workId = readNumber(ctx.payload, "workId");
  const volumes = readRecordArray(ctx.payload, "volumes");
  const chapterOutlines = readRecordArray(ctx.payload, "chapterOutlines");
  const characters = readRecordArray(ctx.payload, "characters");
  const worldSettings = readRecordArray(ctx.payload, "worldSettings");
  const storyEvents = readRecordArray(ctx.payload, "storyEvents");
  const characterGrowth = readRecordArray(ctx.payload, "characterGrowth");
  const importantItems = readRecordArray(ctx.payload, "importantItems");
  const replaceStoryMemory = readBoolean(ctx.payload, "replaceStoryMemory", true);

  if (!workId) {
    invalidPayload("payload.workId must be valid");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();
    let affectedRows = 0;

    for (const table of ["volume_outlines", "chapter_outlines", "characters", "world_settings"]) {
      const [result] = await connection.execute<ResultSetHeader>(
        `DELETE FROM ${table} WHERE work_id = ?`,
        [workId]
      );
      affectedRows += result.affectedRows;
    }

    if (replaceStoryMemory) {
      for (const table of ["story_events", "character_growth", "important_items"]) {
        const [result] = await connection.execute<ResultSetHeader>(
          `DELETE FROM ${table} WHERE work_id = ?`,
          [workId]
        );
        affectedRows += result.affectedRows;
      }
    }

    for (const volume of volumes) {
      const volumeNumber = readNumber(volume, "volumeNumber") ?? readNumber(volume, "volume_number");
      const volumeTitle = readString(volume, "volumeTitle") ?? readString(volume, "volume_title");
      const chapterRange = readString(volume, "chapterRange") ?? readString(volume, "chapter_range", undefined);
      const mainContent = readString(volume, "mainContent") ?? readString(volume, "main_content", undefined);
      const startStatus = readString(volume, "startStatus") ?? readString(volume, "start_status", undefined);
      const endStatus = readString(volume, "endStatus") ?? readString(volume, "end_status", undefined);

      if (!volumeNumber || !volumeTitle) {
        invalidPayload("payload.volumes items must include volumeNumber and volumeTitle");
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO volume_outlines
          (work_id, volume_number, volume_title, chapter_range, main_content, start_status, end_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [workId, volumeNumber, volumeTitle, chapterRange, mainContent, startStatus, endStatus]
      );
      affectedRows += result.affectedRows;
    }

    for (const outline of chapterOutlines) {
      const volumeNumber = readNumber(outline, "volumeNumber") ?? readNumber(outline, "volume_number", undefined);
      const chapterNumber = readNumber(outline, "chapterNumber") ?? readNumber(outline, "chapter_number");
      const title = readString(outline, "title", undefined);
      const plotSummary = readString(outline, "plotSummary") ?? readString(outline, "plot_summary", undefined);
      const mainScenes = normalizeJsonValue(outline.mainScenes ?? outline.main_scenes, null);
      const outlineCharacters = normalizeJsonValue(outline.characters, null);
      const plotFunction = readString(outline, "plotFunction") ?? readString(outline, "plot_function", undefined);
      const emotionTone = readString(outline, "emotionTone") ?? readString(outline, "emotion_tone", undefined);

      if (!chapterNumber) {
        invalidPayload("payload.chapterOutlines items must include chapterNumber");
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO chapter_outlines
          (work_id, volume_number, chapter_number, title, plot_summary, main_scenes, characters, plot_function, emotion_tone, created_at)
        VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, NOW())
        `,
        [workId, volumeNumber, chapterNumber, title, plotSummary, mainScenes, outlineCharacters, plotFunction, emotionTone]
      );
      affectedRows += result.affectedRows;
    }

    for (const character of characters) {
      const name = readRequiredString(character, "name");
      const roleType = readString(character, "roleType") ?? readString(character, "role_type", "supporting");
      const description = readString(character, "description", undefined);

      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO characters (work_id, name, role_type, description, created_at)
        VALUES (?, ?, ?, ?, NOW())
        `,
        [workId, name, roleType, description]
      );
      affectedRows += result.affectedRows;
    }

    for (const setting of worldSettings) {
      const settingType = readString(setting, "settingType") ?? readString(setting, "setting_type", "setting");
      const title = readRequiredString(setting, "title");
      const content = readString(setting, "content", "");
      const examples = setting.examples == null
        ? null
        : Array.isArray(setting.examples)
          ? JSON.stringify(setting.examples.map((item) => String(item)))
          : readString(setting, "examples", undefined);

      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO world_settings (work_id, setting_type, title, content, examples, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        `,
        [workId, settingType, title, content, examples]
      );
      affectedRows += result.affectedRows;
    }

    if (replaceStoryMemory) {
      for (const event of storyEvents) {
        const chapterNumber = readNumber(event, "chapterNumber") ?? readNumber(event, "chapter_number");
        const eventType = readString(event, "eventType") ?? readString(event, "event_type", "key_plot");
        const title = readRequiredString(event, "title");
        const description = readString(event, "description", "");
        const charactersInvolved = normalizeJsonValue(event.charactersInvolved ?? event.characters_involved, []);
        const importance = readString(event, "importance", "medium");

        if (!chapterNumber || !eventType) {
          invalidPayload("payload.storyEvents items must include chapterNumber and eventType");
        }

        const [result] = await connection.execute<ResultSetHeader>(
          `
          INSERT INTO story_events
            (work_id, chapter_number, event_type, title, description, characters_involved, importance)
          VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?)
          `,
          [workId, chapterNumber, eventType, title, description, charactersInvolved, importance]
        );
        affectedRows += result.affectedRows;
      }

      for (const growth of characterGrowth) {
        const characterName = readString(growth, "characterName") ?? readString(growth, "character_name");
        const chapterNumber = readNumber(growth, "chapterNumber") ?? readNumber(growth, "chapter_number");
        const growthType = readString(growth, "growthType") ?? readString(growth, "growth_type", "status");
        const before = readString(growth, "before") ?? readString(growth, "before_change", "");
        const after = readString(growth, "after") ?? readString(growth, "after_change", "");
        const description = readString(growth, "description", "");

        if (!characterName || !chapterNumber || !growthType) {
          invalidPayload("payload.characterGrowth items must include characterName, chapterNumber, and growthType");
        }

        const [result] = await connection.execute<ResultSetHeader>(
          `
          INSERT INTO character_growth
            (work_id, character_name, chapter_number, growth_type, before_change, after_change, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [workId, characterName, chapterNumber, growthType, before, after, description]
        );
        affectedRows += result.affectedRows;
      }

      for (const item of importantItems) {
        const name = readRequiredString(item, "name");
        const itemType = readString(item, "type") ?? readString(item, "itemType") ?? readString(item, "item_type", "other");
        const description = readString(item, "description", "");
        const currentOwner = readString(item, "currentOwner") ?? readString(item, "current_owner", undefined);
        const acquiredAt = normalizeJsonValue(item.acquiredAt ?? item.acquired_at, {});
        const currentLocation = readString(item, "currentLocation") ?? readString(item, "current_location", undefined);
        const properties = normalizeJsonValue(item.properties, {});

        const [result] = await connection.execute<ResultSetHeader>(
          `
          INSERT INTO important_items
            (work_id, name, item_type, description, current_owner, acquired_at, current_location, properties)
          VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, CAST(? AS JSON))
          ON DUPLICATE KEY UPDATE
            item_type = VALUES(item_type),
            description = VALUES(description),
            current_owner = VALUES(current_owner),
            current_location = VALUES(current_location),
            properties = VALUES(properties),
            updated_at = CURRENT_TIMESTAMP
          `,
          [workId, name, itemType, description, currentOwner, acquiredAt, currentLocation, properties]
        );
        affectedRows += result.affectedRows;
      }
    }

    await connection.commit();

    const body = validatedResponse(ReplaceWorkStructureMutationResponseSchema, {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows,
        insertId: 0,
        warningStatus: 0
      },
      item: {
        workId,
        volumes: volumes.length,
        chapterOutlines: chapterOutlines.length,
        characters: characters.length,
        worldSettings: worldSettings.length,
        storyEvents: replaceStoryMemory ? storyEvents.length : 0,
        characterGrowth: replaceStoryMemory ? characterGrowth.length : 0,
        importantItems: replaceStoryMemory ? importantItems.length : 0
      },
      requestId: ctx.requestId
    });

    return { targetType: "work_structure", targetId: workId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function projectObsidianMarkdown(ctx: MutationContext): Promise<MutationResult> {
  const source = readRequiredRecord(ctx.payload, "source");
  const work = readRequiredRecord(ctx.payload, "work");
  const part = readRequiredRecord(ctx.payload, "part");
  const blocks = readRecordArray(ctx.payload, "blocks");
  const assets = readRecordArray(ctx.payload, "assets");
  const relations = readRecordArray(ctx.payload, "relations");

  if (blocks.length === 0) {
    invalidPayload("payload.blocks must contain at least one canonical block");
  }

  const sourceProvider = readRequiredString(source, "provider");
  if (sourceProvider !== "obsidian-vault") {
    invalidPayload("payload.source.provider must be obsidian-vault");
  }

  const sourcePath = readRequiredString(source, "sourcePath");
  const sourceUri = readRequiredString(source, "sourceUri");
  const sourceSha256 = readRequiredString(source, "sha256");
  const sourceMtime = readRequiredString(source, "mtime");
  const frontmatter = readOptionalRecord(source, "frontmatter");

  const workId = readRequiredString(work, "id");
  const workKind = readRequiredString(work, "kind");
  const workTitle = readRequiredString(work, "title");
  const workSubtitle = readString(work, "subtitle", undefined);
  const workStatus = readString(work, "status", "active") ?? "active";
  const authorProfileId = readString(work, "authorProfileId", "emptyinkpot_primary_author") ?? "emptyinkpot_primary_author";
  const workMetadata = readOptionalRecord(work, "metadata");

  const partId = readRequiredString(part, "id");
  const parentPartId = readString(part, "parentPartId", undefined);
  const partKind = readRequiredString(part, "kind");
  const partOrder = readNumber(part, "partOrder");
  const partTitle = readString(part, "title", workTitle);
  const partStatus = readString(part, "status", workStatus);
  const partMetadata = readOptionalRecord(part, "metadata");

  if (partOrder == null) {
    invalidPayload("payload.part.partOrder must be a valid number");
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const asset of assets) {
      await upsertCanonicalAsset(connection, asset);
    }

    const sourceMetadata = {
      ...(workMetadata ?? {}),
      sourceProvider,
      sourcePath,
      sourceUri,
      sourceSha256,
      sourceMtime,
      frontmatter
    };

    await connection.execute(
      `
      INSERT INTO content_works
        (id, kind, title, subtitle, status, author_profile_id, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        kind = VALUES(kind),
        title = VALUES(title),
        subtitle = VALUES(subtitle),
        status = VALUES(status),
        author_profile_id = VALUES(author_profile_id),
        metadata_json = VALUES(metadata_json),
        updated_at = CURRENT_TIMESTAMP
      `,
      [workId, workKind, workTitle, workSubtitle, workStatus, authorProfileId, JSON.stringify(sourceMetadata)]
    );

    await connection.execute(
      `
      INSERT INTO content_parts
        (id, work_id, parent_part_id, kind, part_order, title, status, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        work_id = VALUES(work_id),
        parent_part_id = VALUES(parent_part_id),
        kind = VALUES(kind),
        part_order = VALUES(part_order),
        title = VALUES(title),
        status = VALUES(status),
        metadata_json = VALUES(metadata_json),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        partId,
        workId,
        parentPartId,
        partKind,
        partOrder,
        partTitle,
        partStatus,
        JSON.stringify({
          ...(partMetadata ?? {}),
          sourceProvider,
          sourcePath,
          sourceUri,
          sourceSha256,
          sourceMtime
        })
      ]
    );

    await connection.execute(`DELETE FROM content_blocks WHERE part_id = ?`, [partId]);

    for (const block of blocks) {
      const blockId = readRequiredString(block, "id");
      const blockKind = readRequiredString(block, "kind");
      const blockOrder = readNumber(block, "blockOrder");
      const textContent = readString(block, "textContent", undefined);
      const assetId = readString(block, "assetId", undefined);
      const payload = readOptionalRecord(block, "payload");

      if (blockOrder == null) {
        invalidPayload(`payload.blocks item ${blockId} must include numeric blockOrder`);
      }

      await connection.execute(
        `
        INSERT INTO content_blocks
          (id, work_id, part_id, asset_id, kind, block_order, text_content, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
        `,
        [
          blockId,
          workId,
          partId,
          assetId,
          blockKind,
          blockOrder,
          textContent,
          normalizeJsonRecord({
            ...(payload ?? {}),
            sourceProvider,
            sourcePath,
            sourceSha256
          })
        ]
      );
    }

    await connection.execute(
      `
      DELETE FROM content_relations
      WHERE payload_json ->> '$.sourceProvider' = ?
        AND payload_json ->> '$.sourcePath' = ?
      `,
      [sourceProvider, sourcePath]
    );

    await insertCanonicalRelation(connection, {
      fromEntityType: "content_work",
      fromEntityId: workId,
      relationType: "uses_style",
      toEntityType: "author_profile",
      toEntityId: authorProfileId,
      payload: {
        sourceProvider,
        sourcePath,
        sourceSha256
      }
    });

    await insertCanonicalRelation(connection, {
      fromEntityType: "content_part",
      fromEntityId: partId,
      relationType: "derived_from",
      toEntityType: "content_work",
      toEntityId: workId,
      payload: {
        sourceProvider,
        sourcePath,
        sourceUri,
        sourceSha256,
        sourceMtime
      }
    });

    for (const relation of relations) {
      await insertCanonicalRelation(connection, {
        fromEntityType: readRequiredString(relation, "fromEntityType"),
        fromEntityId: readRequiredString(relation, "fromEntityId"),
        relationType: readRequiredString(relation, "relationType"),
        toEntityType: readRequiredString(relation, "toEntityType"),
        toEntityId: readRequiredString(relation, "toEntityId"),
        payload: {
          ...(readOptionalRecord(relation, "payload") ?? {}),
          sourceProvider,
          sourcePath,
          sourceSha256
        }
      });
    }

    await connection.commit();

    const body = {
      ok: true,
      action: ctx.action,
      idempotencyKey: ctx.idempotencyKey,
      actor: ctx.actor,
      result: {
        affectedRows: blocks.length + assets.length + relations.length + 2,
        insertId: 0,
        warningStatus: 0
      },
      item: {
        workId,
        partId,
        sourceProvider,
        sourcePath,
        sourceUri,
        sourceSha256,
        blocks: blocks.length,
        assets: assets.length,
        relations: relations.length + 2
      },
      requestId: ctx.requestId
    };

    return { targetType: "content_part", targetId: partId, body };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function upsertCanonicalAsset(connection: PoolConnection, asset: Record<string, unknown>) {
  const id = readRequiredString(asset, "id");
  const kind = readRequiredString(asset, "kind");
  const title = readString(asset, "title", undefined);
  const storageProvider = readRequiredString(asset, "storageProvider");
  const storageUri = readRequiredString(asset, "storageUri");
  const mimeType = readString(asset, "mimeType", undefined);
  const byteSize = readNumber(asset, "byteSize", undefined);
  const checksumSha256 = readString(asset, "checksumSha256", undefined);
  const metadata = readOptionalRecord(asset, "metadata");

  await connection.execute(
    `
    INSERT INTO content_assets
      (id, kind, title, storage_provider, storage_uri, mime_type, byte_size, checksum_sha256, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
    ON DUPLICATE KEY UPDATE
      kind = VALUES(kind),
      title = VALUES(title),
      storage_provider = VALUES(storage_provider),
      storage_uri = VALUES(storage_uri),
      mime_type = VALUES(mime_type),
      byte_size = VALUES(byte_size),
      checksum_sha256 = VALUES(checksum_sha256),
      metadata_json = VALUES(metadata_json),
      updated_at = CURRENT_TIMESTAMP
    `,
    [id, kind, title, storageProvider, storageUri, mimeType, byteSize, checksumSha256, normalizeJsonRecord(metadata)]
  );
}

async function insertCanonicalRelation(
  connection: PoolConnection,
  input: {
    fromEntityType: string;
    fromEntityId: string;
    relationType: string;
    toEntityType: string;
    toEntityId: string;
    payload: Record<string, unknown>;
  }
) {
  await connection.execute(
    `
    INSERT INTO content_relations
      (id, from_entity_type, from_entity_id, relation_type, to_entity_type, to_entity_id, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))
    ON DUPLICATE KEY UPDATE
      payload_json = VALUES(payload_json)
    `,
    [
      buildRelationId(input),
      input.fromEntityType,
      input.fromEntityId,
      input.relationType,
      input.toEntityType,
      input.toEntityId,
      JSON.stringify(input.payload)
    ]
  );
}

export function writeRoutes({ writePool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.post("/writes/create-work", (c) =>
    executeIdempotentMutation(c, writePool, "create_work", createWork)
  );

  app.post("/writes/upsert-work", (c) =>
    executeIdempotentMutation(c, writePool, "upsert_work", upsertWork)
  );

  app.post("/writes/append-chapter", (c) =>
    executeIdempotentMutation(c, writePool, "append_chapter", appendChapter)
  );

  app.post("/writes/record-generation-output", (c) =>
    executeIdempotentMutation(c, writePool, "record_generation_output", recordGenerationOutput)
  );

  app.post("/writes/record-article-acceptance-report", (c) =>
    executeIdempotentMutation(c, writePool, "record_article_acceptance_report", recordArticleAcceptanceReport)
  );

  app.post("/writes/record-article-reference-usage-report", (c) =>
    executeIdempotentMutation(c, writePool, "record_article_reference_usage_report", recordArticleReferenceUsageReport)
  );

  app.post("/writes/record-chapter-transition", (c) =>
    executeIdempotentMutation(c, writePool, "record_chapter_transition", recordChapterTransition)
  );

  app.post("/writes/record-audit-result", (c) =>
    executeIdempotentMutation(c, writePool, "record_audit_result", recordAuditResult)
  );

  app.post("/writes/upsert-vocabulary-item", (c) =>
    executeIdempotentMutation(c, writePool, "upsert_vocabulary_item", upsertVocabularyItem)
  );

  app.post("/writes/record-note", (c) =>
    executeIdempotentMutation(c, writePool, "record_note", recordNote)
  );

  app.post("/writes/record-experience", (c) =>
    executeIdempotentMutation(c, writePool, "record_experience", recordExperience)
  );

  app.post("/writes/record-semantic-reference-material", (c) =>
    executeIdempotentMutation(c, writePool, "record_semantic_reference_material", recordSemanticReferenceMaterial)
  );

  app.post("/writes/record-style-revision-pair", (c) =>
    executeIdempotentMutation(c, writePool, "record_style_revision_pair", recordStyleRevisionPair)
  );

  app.post("/writes/record-story-memory", (c) =>
    executeIdempotentMutation(c, writePool, "record_story_memory", recordStoryMemory)
  );

  app.post("/writes/publication/record-fanqie-account-session", (c) =>
    executeIdempotentMutation(c, writePool, "publication_record_fanqie_account_session", recordFanqieAccountSession)
  );

  app.post("/writes/publication/sync-fanqie-works", (c) =>
    executeIdempotentMutation(c, writePool, "publication_sync_fanqie_works", syncFanqieWorks)
  );

  app.post("/writes/publication/sync-fanqie-remote-chapters", (c) =>
    executeIdempotentMutation(c, writePool, "publication_sync_fanqie_remote_chapters", syncFanqieRemoteChapters)
  );

  app.post("/writes/publication/register-target", (c) =>
    executeIdempotentMutation(c, writePool, "publication_register_target", registerPublicationTarget)
  );

  app.post("/writes/publication/record-result", (c) =>
    executeIdempotentMutation(c, writePool, "publication_record_result", recordPublicationResult)
  );

  app.post("/writes/record-author-lexicon-review", (c) =>
    executeIdempotentMutation(c, writePool, "record_author_lexicon_review", recordAuthorLexiconReview)
  );

  app.post("/writes/replace-work-structure", (c) =>
    executeIdempotentMutation(c, writePool, "replace_work_structure", replaceWorkStructure)
  );

  app.post("/writes/project-obsidian-markdown", (c) =>
    executeIdempotentMutation(c, writePool, "project_obsidian_markdown", projectObsidianMarkdown)
  );

  return app;
}
