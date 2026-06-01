import { Hono } from "hono";
import { z } from "zod";
import {
  ContentAssetSchema,
  ContentBlockSchema,
  ContentPartSchema,
  ContentSourceSummarySchema,
  ContentSourcesResponseSchema,
  ContentWorkSchema,
  EvidenceFactAtomPackSchema,
  EvidenceFactAtomSchema,
  PublicationTargetSchema
} from "@emptyinkpot/database-content-contracts";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { validatedResponse } from "../http.js";
import { clampLimit } from "../utils.js";

interface WorkRow {
  id: number | string;
  title: string;
  description_preview: string | null;
  status: string | null;
  platform: string | null;
  current_chapters: number | null;
  target_chapters: number | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface NoteRow {
  id: number | string;
  title: string;
  content: string | null;
  category: string | null;
  tags: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface ExperienceRecordRow {
  id: number | string;
  type: string | null;
  title: string | null;
  description: string | null;
  user_query: string | null;
  solution: string | null;
  experience_applied: unknown;
  experience_gained: unknown;
  tags: unknown;
  difficulty: number | null;
  xp_gained: number | null;
  tags_text: string | null;
  summary: string | null;
  root_cause: string | null;
  verification: string | null;
  source_text: string | null;
  cloud_text: string | null;
  payload: unknown;
  timestamp: Date | string | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface FanqieWorkRow {
  id: number | string;
  account_id: string | number | null;
  work_id: string | number | null;
  title: string | null;
  author?: string | null;
  cover_url?: string | null;
  chapter_count: number | null;
  word_count: number | null;
  status: string | null;
  last_synced_at: Date | string | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface CharacterRow {
  id: number | string;
  work_id: number | string;
  name: string | null;
  role_type: string | null;
  description: string | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface LiteratureRow {
  id: number | string;
  title: string | null;
  author: string | null;
  category: string | null;
  content: string | null;
  source: string | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface ContentSourceRow {
  id: string;
  source_id: string;
  title: string | null;
  kind: string | null;
  author: string | null;
  category: string | null;
  source: string | null;
  source_table: string | null;
  chunk_count: number | string | null;
  semantic_unit_count: number | string | null;
  preview: string | null;
  metadata_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface StateTransitionRow {
  id: number | string;
  chapter_id: number | string | null;
  from_status: string | null;
  to_status: string | null;
  trigger_event: string | null;
  reason: string | null;
  created_at: Date | string | null;
}

interface ChapterRow {
  id: number | string;
  work_id: number | string;
  volume_number: number | null;
  chapter_number: number;
  title: string | null;
  word_count: number | null;
  status: string | null;
  audit_status: string | null;
  audit_issues: unknown;
  suggested_action: string | null;
  published_at: Date | string | null;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface CanonicalContentWorkRow {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  status: string;
  author_profile_id: string | null;
  metadata_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface CanonicalContentPartRow {
  id: string;
  work_id: string;
  parent_part_id: string | null;
  kind: string;
  part_order: number;
  title: string | null;
  status: string;
  metadata_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface CanonicalContentBlockRow {
  id: string;
  work_id: string;
  part_id: string | null;
  asset_id: string | null;
  kind: string;
  block_order: number;
  text_content: string | null;
  payload_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface CanonicalContentAssetRow {
  id: string;
  kind: string;
  title: string | null;
  storage_provider: string;
  storage_uri: string;
  mime_type: string | null;
  byte_size: number | string | null;
  checksum_sha256: string | null;
  metadata_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface PublicationTargetRow {
  id: string;
  platform: string;
  account_identity: string;
  local_work_id: string;
  remote_work_id: string | null;
  status: string;
  metadata_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface FanqieAccountRow {
  id: number | string;
  account_id: string;
  account_name: string | null;
  aliases_json: unknown;
  status: string | null;
  browser_dir: string | null;
  cookies_storage_type: string | null;
  cookies_file: string | null;
  cookie_checksum: string | null;
  last_cookie_synced_at: Date | string | null;
  meta_json: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  session_cookies_payload: string | null;
  session_cookie_checksum: string | null;
  session_cookie_count: number | null;
  expires_summary_json: unknown;
  session_synced_at: Date | string | null;
}

interface FanqieRemoteChapterSnapshotRow {
  account_id: string | number | null;
  book_id: string | number | null;
  chapter_count: number | string | null;
  chapters_json: unknown;
  synced_at: Date | string | null;
  updated_at: Date | string | null;
}

interface ChapterContentRow extends ChapterRow {
  content: string | null;
  plot_summary: string | null;
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

function toRecord(value: unknown): Record<string, unknown> {
  const parsed = parseJsonValue(value);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}

function toNullableString(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function mapCanonicalWork(row: CanonicalContentWorkRow) {
  return ContentWorkSchema.parse({
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    status: row.status,
    authorProfileId: row.author_profile_id,
    metadata: toRecord(row.metadata_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapCanonicalPart(row: CanonicalContentPartRow) {
  return ContentPartSchema.parse({
    id: row.id,
    workId: row.work_id,
    parentPartId: row.parent_part_id,
    kind: row.kind,
    partOrder: row.part_order,
    title: row.title,
    status: row.status,
    metadata: toRecord(row.metadata_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapCanonicalBlock(row: CanonicalContentBlockRow) {
  return ContentBlockSchema.parse({
    id: row.id,
    workId: row.work_id,
    partId: row.part_id,
    assetId: row.asset_id,
    kind: row.kind,
    blockOrder: row.block_order,
    textContent: row.text_content,
    payload: toRecord(row.payload_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapCanonicalAsset(row: CanonicalContentAssetRow) {
  return ContentAssetSchema.parse({
    id: row.id,
    kind: row.kind,
    title: row.title,
    storageProvider: row.storage_provider,
    storageUri: row.storage_uri,
    mimeType: row.mime_type,
    byteSize: toNullableNumber(row.byte_size),
    checksumSha256: row.checksum_sha256,
    metadata: toRecord(row.metadata_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapPublicationTarget(row: PublicationTargetRow) {
  return PublicationTargetSchema.parse({
    id: row.id,
    platform: row.platform,
    accountIdentity: row.account_identity,
    localWorkId: row.local_work_id,
    remoteWorkId: toNullableString(row.remote_work_id),
    status: row.status,
    metadata: toRecord(row.metadata_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapFanqieAccount(row: FanqieAccountRow) {
  return {
    id: String(row.account_id),
    accountId: String(row.account_id),
    name: row.account_name ? String(row.account_name) : undefined,
    aliases: Array.isArray(parseJsonValue(row.aliases_json)) ? parseJsonValue(row.aliases_json) : [],
    status: String(row.status || "active") === "disabled" ? "disabled" : "active",
    browserDir: row.browser_dir,
    cookiesStorageType: row.cookies_storage_type || "database",
    cookiesFile: row.cookies_file,
    cookieChecksum: row.cookie_checksum,
    lastCookieSyncedAt: row.last_cookie_synced_at ? toIsoString(row.last_cookie_synced_at) : null,
    metadata: toRecord(row.meta_json),
    session: {
      type: "cookies_file",
      cookiesPayload: row.session_cookies_payload,
      cookieChecksum: row.session_cookie_checksum,
      cookieCount: row.session_cookie_count == null ? null : Number(row.session_cookie_count),
      expiresSummary: toRecord(row.expires_summary_json),
      syncedAt: row.session_synced_at ? toIsoString(row.session_synced_at) : null
    },
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapChapterContent(row: ChapterContentRow) {
  return {
    id: String(row.id),
    workId: String(row.work_id),
    volumeNumber: row.volume_number,
    chapterNumber: Number(row.chapter_number),
    title: row.title,
    content: row.content,
    plotSummary: row.plot_summary,
    wordCount: row.word_count,
    status: row.status,
    auditStatus: row.audit_status,
    auditIssues: parseJsonValue(row.audit_issues),
    suggestedAction: row.suggested_action,
    publishedAt: row.published_at ? toIsoString(row.published_at) : null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapFanqieRemoteChapterSnapshot(row: FanqieRemoteChapterSnapshotRow) {
  const parsedChapters = parseJsonValue(row.chapters_json);
  const chapters = Array.isArray(parsedChapters) ? parsedChapters : [];
  return {
    accountId: String(row.account_id || ""),
    bookId: String(row.book_id || ""),
    chapterCount: Number(row.chapter_count || chapters.length || 0),
    chapters,
    syncedAt: row.synced_at ? toIsoString(row.synced_at) : null,
    updatedAt: row.updated_at ? toIsoString(row.updated_at) : null
  };
}

function legacyWorkId(value: string) {
  const match = String(value || "").match(/^legacy_work_(\d+)$/);
  return match ? match[1] : value;
}

function normalizeEvidenceFactAtoms(block: ReturnType<typeof mapCanonicalBlock>) {
  const payload = block.payload;
  const rawAtoms = Array.isArray(payload.factAtoms)
    ? payload.factAtoms
    : Array.isArray(payload.atoms)
      ? payload.atoms
      : [];
  return rawAtoms
    .map((item) => {
      const record = item && typeof item === "object" && !Array.isArray(item)
        ? item as Record<string, unknown>
        : {};
      return EvidenceFactAtomSchema.safeParse({
        ...record,
        citationId: typeof record.citationId === "string"
          ? record.citationId
          : String(payload.citationId || payload.id || block.id),
        blockId: block.id
      });
    })
    .filter((item) => item.success)
    .map((item) => item.data);
}

function mapContentSource(row: ContentSourceRow) {
  return ContentSourceSummarySchema.parse({
    id: row.id,
    sourceId: row.source_id,
    title: row.title || row.source_id,
    kind: row.kind || "source",
    author: row.author,
    category: row.category,
    source: row.source,
    sourceTable: row.source_table || undefined,
    chunkCount: Number(row.chunk_count || 0),
    semanticUnitCount: Number(row.semantic_unit_count || 0),
    preview: row.preview,
    metadata: toRecord(row.metadata_json),
    createdAt: row.created_at ? toIsoString(row.created_at) : null,
    updatedAt: row.updated_at ? toIsoString(row.updated_at) : null
  });
}

const CanonicalWorksResponseSchema = z.object({
  count: z.number(),
  works: z.array(ContentWorkSchema),
  requestId: z.string()
});

const CanonicalPartsResponseSchema = z.object({
  workId: z.string(),
  count: z.number(),
  parts: z.array(ContentPartSchema),
  requestId: z.string()
});

const CanonicalBlocksResponseSchema = z.object({
  partId: z.string(),
  count: z.number(),
  blocks: z.array(ContentBlockSchema),
  requestId: z.string()
});

const EvidenceFactAtomPackResponseSchema = EvidenceFactAtomPackSchema;

const CanonicalAssetsResponseSchema = z.object({
  count: z.number(),
  assets: z.array(ContentAssetSchema),
  requestId: z.string()
});

const PublicationTargetsResponseSchema = z.object({
  count: z.number(),
  publicationTargets: z.array(PublicationTargetSchema),
  requestId: z.string()
});

export function contentRoutes({ pool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/content/canonical/works", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 50, 200);
    const kind = (c.req.query("kind") || "").trim();
    const status = (c.req.query("status") || "").trim();
    const search = (c.req.query("search") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (kind) {
      where.push("kind = ?");
      params.push(kind);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    if (search) {
      where.push("(title LIKE ? OR subtitle LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const rows = await query<CanonicalContentWorkRow[]>(
      pool,
      `
      SELECT id, kind, title, subtitle, status, author_profile_id, metadata_json, updated_at, created_at
      FROM content_works
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const works = rows.map(mapCanonicalWork);
    return c.json(validatedResponse(CanonicalWorksResponseSchema, {
      count: works.length,
      works,
      requestId: c.get("requestId")
    }));
  });

  app.get("/content/canonical/works/:id/parts", async (c) => {
    const workId = c.req.param("id");
    const limit = clampLimit(c.req.query("limit") || null, 200, 500);
    const kind = (c.req.query("kind") || "").trim();
    const where = ["work_id = ?"];
    const params: (string | number)[] = [workId];

    if (kind) {
      where.push("kind = ?");
      params.push(kind);
    }

    const rows = await query<CanonicalContentPartRow[]>(
      pool,
      `
      SELECT id, work_id, parent_part_id, kind, part_order, title, status, metadata_json, updated_at, created_at
      FROM content_parts
      WHERE ${where.join(" AND ")}
      ORDER BY part_order ASC, id ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const parts = rows.map(mapCanonicalPart);
    return c.json(validatedResponse(CanonicalPartsResponseSchema, {
      workId,
      count: parts.length,
      parts,
      requestId: c.get("requestId")
    }));
  });

  app.get("/content/canonical/parts/:id/blocks", async (c) => {
    const partId = c.req.param("id");
    const limit = clampLimit(c.req.query("limit") || null, 500, 1000);
    const rows = await query<CanonicalContentBlockRow[]>(
      pool,
      `
      SELECT id, work_id, part_id, asset_id, kind, block_order, text_content, payload_json, updated_at, created_at
      FROM content_blocks
      WHERE part_id = ?
      ORDER BY block_order ASC, id ASC
      LIMIT ?
      `,
      [partId, limit]
    );

    const blocks = rows.map(mapCanonicalBlock);
    return c.json(validatedResponse(CanonicalBlocksResponseSchema, {
      partId,
      count: blocks.length,
      blocks,
      requestId: c.get("requestId")
    }));
  });

  app.get("/content/canonical/parts/:id/evidence-fact-atoms", async (c) => {
    const partId = c.req.param("id");
    const limit = clampLimit(c.req.query("limit") || null, 500, 1000);
    const rows = await query<CanonicalContentBlockRow[]>(
      pool,
      `
      SELECT id, work_id, part_id, asset_id, kind, block_order, text_content, payload_json, updated_at, created_at
      FROM content_blocks
      WHERE part_id = ? AND kind = 'evidence_citation'
      ORDER BY block_order ASC, id ASC
      LIMIT ?
      `,
      [partId, limit]
    );

    const blocks = rows.map(mapCanonicalBlock);
    const atoms = blocks.flatMap(normalizeEvidenceFactAtoms);
    const workId = blocks[0]?.workId;
    return c.json(validatedResponse(EvidenceFactAtomPackResponseSchema, {
      ...(workId ? { workId } : {}),
      partId,
      atoms,
      sourceBlockIds: blocks.map((block) => block.id),
      requestId: c.get("requestId")
    }));
  });

  app.get("/content/canonical/assets", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const kind = (c.req.query("kind") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (kind) {
      where.push("kind = ?");
      params.push(kind);
    }

    const rows = await query<CanonicalContentAssetRow[]>(
      pool,
      `
      SELECT id, kind, title, storage_provider, storage_uri, mime_type, byte_size, checksum_sha256, metadata_json, updated_at, created_at
      FROM content_assets
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const assets = rows.map(mapCanonicalAsset);
    return c.json(validatedResponse(CanonicalAssetsResponseSchema, {
      count: assets.length,
      assets,
      requestId: c.get("requestId")
    }));
  });

  app.get("/content/canonical/publication-targets", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const platform = (c.req.query("platform") || "").trim();
    const accountIdentity = (c.req.query("account_identity") || "").trim();
    const localWorkId = (c.req.query("local_work_id") || "").trim();
    const remoteWorkId = (c.req.query("remote_work_id") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (platform) {
      where.push("platform = ?");
      params.push(platform);
    }
    if (accountIdentity) {
      where.push("account_identity = ?");
      params.push(accountIdentity);
    }
    if (localWorkId) {
      where.push("local_work_id = ?");
      params.push(localWorkId);
    }
    if (remoteWorkId) {
      where.push("remote_work_id = ?");
      params.push(remoteWorkId);
    }

    const rows = await query<PublicationTargetRow[]>(
      pool,
      `
      SELECT id, platform, account_identity, local_work_id, remote_work_id, status, metadata_json, updated_at, created_at
      FROM publication_targets
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const publicationTargets = rows.map(mapPublicationTarget);
    return c.json(validatedResponse(PublicationTargetsResponseSchema, {
      count: publicationTargets.length,
      publicationTargets,
      requestId: c.get("requestId")
    }));
  });

  app.get("/content/sources", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const search = (c.req.query("search") || "").trim();
    const kind = (c.req.query("kind") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      where.push("(d.source_id LIKE ? OR d.title LIKE ? OR d.source LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (kind) {
      where.push("d.content_kind = ?");
      params.push(kind);
    }

    const rows = await query<ContentSourceRow[]>(
      pool,
      `
      SELECT
        d.id,
        d.source_id,
        d.title,
        d.content_kind AS kind,
        NULL AS author,
        NULL AS category,
        d.source,
        d.source_table,
        COUNT(DISTINCT c.id) AS chunk_count,
        COUNT(DISTINCT u.id) AS semantic_unit_count,
        LEFT(MAX(c.chunk_text), 360) AS preview,
        d.metadata_json,
        d.updated_at,
        d.created_at
      FROM search_documents d
      LEFT JOIN search_chunks c
        ON c.document_id = d.id
       AND c.index_status IN ('indexed', 'ready')
       AND c.privacy_level IN ('public', 'private')
      LEFT JOIN semantic_units u
        ON u.source_id COLLATE utf8mb4_unicode_ci = d.source_id COLLATE utf8mb4_unicode_ci
       AND u.status = 'active'
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      GROUP BY
        d.id, d.source_id, d.title, d.content_kind,
        d.source, d.source_table, d.metadata_json, d.updated_at, d.created_at
      ORDER BY d.updated_at DESC, d.id ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const sources = rows.map(mapContentSource);
    return c.json(validatedResponse(ContentSourcesResponseSchema, {
      version: "content-sources.v1",
      count: sources.length,
      sources,
      requestId: c.get("requestId")
    }));
  });

  app.get("/content/publication/accounts", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const accountId = (c.req.query("account_id") || c.req.query("accountId") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (accountId) {
      where.push("a.account_id = ?");
      params.push(accountId);
    }

    const rows = await query<FanqieAccountRow[]>(
      pool,
      `
      SELECT
        a.id, a.account_id, a.account_name, a.aliases_json, a.status,
        a.browser_dir, a.cookies_storage_type, a.cookies_file, a.cookie_checksum,
        a.last_cookie_synced_at, a.meta_json, a.created_at, a.updated_at,
        s.cookies_file AS session_cookies_payload,
        s.cookie_checksum AS session_cookie_checksum,
        s.cookie_count AS session_cookie_count,
        s.expires_summary_json,
        s.synced_at AS session_synced_at
      FROM fanqie_accounts a
      LEFT JOIN fanqie_account_sessions s
        ON s.account_id = a.account_id
       AND s.session_type = 'cookies_file'
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY a.id ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const accounts = rows.map(mapFanqieAccount);
    return c.json({
      count: accounts.length,
      accounts,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/publication/publish-context", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 200, 500);
    const accountId = (c.req.query("account_id") || c.req.query("accountId") || "").trim();
    const bookId = (c.req.query("book_id") || c.req.query("bookId") || c.req.query("remote_work_id") || "").trim();
    const localWorkId = (c.req.query("local_work_id") || c.req.query("localWorkId") || "").trim();

    const targetWhere = ["platform = 'fanqie'"];
    const targetParams: (string | number)[] = [];
    if (accountId) {
      targetWhere.push("account_identity = ?");
      targetParams.push(accountId);
    }
    if (bookId) {
      targetWhere.push("remote_work_id = ?");
      targetParams.push(bookId);
    }
    if (localWorkId) {
      targetWhere.push("local_work_id = ?");
      targetParams.push(localWorkId);
    }

    const targetRows = await query<PublicationTargetRow[]>(
      pool,
      `
      SELECT id, platform, account_identity, local_work_id, remote_work_id, status, metadata_json, updated_at, created_at
      FROM publication_targets
      WHERE ${targetWhere.join(" AND ")}
      ORDER BY updated_at DESC, id ASC
      LIMIT ?
      `,
      [...targetParams, limit]
    );

    const workWhere: string[] = [];
    const workParams: (string | number)[] = [];
    if (accountId) {
      workWhere.push("account_id = ?");
      workParams.push(accountId);
    }
    if (bookId) {
      workWhere.push("work_id = ?");
      workParams.push(bookId);
    }

    const workRows = await query<FanqieWorkRow[]>(
      pool,
      `
      SELECT id, account_id, work_id, title, author, cover_url, chapter_count, word_count, status, last_synced_at, updated_at, created_at
      FROM fanqie_works
      ${workWhere.length ? `WHERE ${workWhere.join(" AND ")}` : ""}
      ORDER BY last_synced_at DESC, updated_at DESC, id DESC
      LIMIT ?
      `,
      [...workParams, limit]
    );

    const publicationTargets = targetRows.map(mapPublicationTarget);
    const fanqieWorks = workRows;
    const matchedTarget = publicationTargets[0] ?? null;
    const matchedFanqieWork = fanqieWorks[0] ?? null;
    return c.json({
      accountId: accountId || matchedTarget?.accountIdentity || matchedFanqieWork?.account_id || undefined,
      bookId: bookId || matchedTarget?.remoteWorkId || matchedFanqieWork?.work_id || undefined,
      localWorkId: localWorkId || matchedTarget?.localWorkId || undefined,
      publicationTargets,
      fanqieWorks,
      matchedTarget,
      matchedFanqieWork,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/publication/remote-chapters", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const accountId = (c.req.query("account_id") || c.req.query("accountId") || "").trim();
    const bookId = (c.req.query("book_id") || c.req.query("bookId") || c.req.query("remote_work_id") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (accountId) {
      const aliases = Array.from(new Set([
        accountId,
        /^\d+$/.test(accountId) ? `account_${Number(accountId)}` : "",
        accountId.match(/(\d+)$/)?.[1] || "",
      ].filter(Boolean)));
      where.push(`account_id IN (${aliases.map(() => "?").join(",")})`);
      params.push(...aliases);
    }
    if (bookId) {
      where.push("book_id = ?");
      params.push(bookId);
    }

    const rows = await query<FanqieRemoteChapterSnapshotRow[]>(
      pool,
      `
      SELECT account_id, book_id, chapter_count, chapters_json, synced_at, updated_at
      FROM fanqie_remote_chapter_snapshots
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, synced_at DESC
      LIMIT ?
      `,
      [...params, limit]
    );
    const snapshots = rows.map(mapFanqieRemoteChapterSnapshot);
    return c.json({
      count: snapshots.length,
      snapshots,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/publication/publish-chapter", async (c) => {
    const accountId = (c.req.query("account_id") || c.req.query("accountId") || "").trim();
    const bookId = (c.req.query("book_id") || c.req.query("bookId") || c.req.query("remote_work_id") || "").trim();
    const rawLocalWorkId = (c.req.query("local_work_id") || c.req.query("localWorkId") || "").trim();
    const chapterId = (c.req.query("chapter_id") || c.req.query("chapterId") || "").trim();
    const chapterNumber = Number(c.req.query("chapter_number") || c.req.query("chapterNumber") || 0);
    const localWorkId = legacyWorkId(rawLocalWorkId);

    if (!localWorkId || (!chapterId && !Number.isFinite(chapterNumber))) {
      return c.json({ code: "invalid_query", message: "local_work_id and chapter_id or chapter_number are required", requestId: c.get("requestId") }, 400);
    }

    const where = ["work_id = ?"];
    const params: (string | number)[] = [localWorkId];
    if (chapterId) {
      where.push("id = ?");
      params.push(chapterId);
    } else {
      where.push("chapter_number = ?");
      params.push(Math.trunc(chapterNumber));
    }

    const rows = await query<ChapterContentRow[]>(
      pool,
      `
      SELECT id, work_id, volume_number, chapter_number, title, content, plot_summary, word_count,
             status, audit_status, audit_issues, suggested_action, published_at, updated_at, created_at
      FROM chapters
      WHERE ${where.join(" AND ")}
      LIMIT 1
      `,
      params
    );

    const chapter = rows[0] ? mapChapterContent(rows[0]) : null;
    if (!chapter) {
      return c.json({ code: "chapter_not_found", message: "chapter content row not found", requestId: c.get("requestId") }, 404);
    }

    return c.json({
      accountId,
      bookId,
      localWorkId: rawLocalWorkId,
      chapter,
      publishInput: {
        accountId,
        bookId,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
        source: {
          workId: rawLocalWorkId,
          chapterId: chapter.id,
          requestId: c.req.query("request_id") || c.req.query("requestId") || undefined
        }
      },
      requestId: c.get("requestId")
    });
  });

  app.get("/content/publication/stock-depth", async (c) => {
    const workId = (c.req.query("work_id") || c.req.query("workId") || "").trim();
    if (!workId) {
      return c.json({ code: "invalid_query", message: "work_id is required", requestId: c.get("requestId") }, 400);
    }

    const snapRows = await query<FanqieRemoteChapterSnapshotRow[]>(
      pool,
      `SELECT chapter_count FROM fanqie_remote_chapter_snapshots
       WHERE book_id IN (SELECT book_id FROM works WHERE id = ? LIMIT 1)
       ORDER BY synced_at DESC LIMIT 1`,
      [workId]
    );
    const remoteLatest = snapRows[0]?.chapter_count ?? 0;

    const stockRows = await query<{ chapter_number: number }[]>(
      pool,
      `SELECT chapter_number FROM chapters
       WHERE work_id = ? AND chapter_number > ? AND content IS NOT NULL
       ORDER BY chapter_number ASC`,
      [workId, remoteLatest]
    );

    return c.json({
      workId: Number(workId),
      remoteLatest,
      localChapters: stockRows.map(r => r.chapter_number),
      stockDepth: stockRows.length,
      nextToPublish: stockRows[0]?.chapter_number ?? null,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/works", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 50, 200);
    const search = (c.req.query("search") || "").trim();
    const status = (c.req.query("status") || "").trim();
    const platform = (c.req.query("platform") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      where.push("(title LIKE ? OR description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    if (platform) {
      where.push("platform = ?");
      params.push(platform);
    }

    const rows = await query<WorkRow[]>(
      pool,
      `
      SELECT
        id,
        title,
        CASE
          WHEN description IS NULL THEN NULL
          ELSE LEFT(description, 500)
        END AS description_preview,
        status,
        platform,
        current_chapters,
        target_chapters,
        updated_at,
        created_at
      FROM works
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
      `,
      [...params, limit]
    );

    return c.json({
      count: rows.length,
      works: rows,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/works/:id/chapters", async (c) => {
    const workId = c.req.param("id");
    const limit = clampLimit(c.req.query("limit") || null, 200, 500);
    const rows = await query<ChapterRow[]>(
      pool,
      `
      SELECT id, work_id, volume_number, chapter_number, title, word_count, status, audit_status, audit_issues, suggested_action, published_at, updated_at, created_at
      FROM chapters
      WHERE work_id = ?
      ORDER BY volume_number ASC, chapter_number ASC, id ASC
      LIMIT ?
      `,
      [workId, limit]
    );

    return c.json({
      workId,
      count: rows.length,
      chapters: rows,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/works/:id/characters", async (c) => {
    const workId = c.req.param("id");
    const limit = clampLimit(c.req.query("limit") || null, 200, 500);
    const rows = await query<CharacterRow[]>(
      pool,
      `
      SELECT id, work_id, name, role_type, description, updated_at, created_at
      FROM characters
      WHERE work_id = ?
      ORDER BY id ASC
      LIMIT ?
      `,
      [workId, limit]
    );

    return c.json({
      workId,
      count: rows.length,
      characters: rows,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/notes", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const category = (c.req.query("category") || "").trim();
    const search = (c.req.query("search") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (category) {
      where.push("category = ?");
      params.push(category);
    }
    if (search) {
      where.push("(title LIKE ? OR content LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const rows = await query<NoteRow[]>(
      pool,
      `
      SELECT id, title, content, category, tags, updated_at, created_at
      FROM notes
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
      `,
      [...params, limit]
    );

    return c.json({
      count: rows.length,
      notes: rows,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/notes/:id", async (c) => {
    const id = c.req.param("id");
    const rows = await query<NoteRow[]>(
      pool,
      `
      SELECT id, title, content, category, tags, updated_at, created_at
      FROM notes
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    const note = rows[0] ?? null;
    return c.json({
      note,
      requestId: c.get("requestId")
    }, note ? 200 : 404);
  });

  app.get("/content/experience-records", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const type = (c.req.query("type") || "").trim();
    const search = (c.req.query("search") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (type) {
      where.push("type = ?");
      params.push(type);
    }
    if (search) {
      where.push("(title LIKE ? OR description LIKE ? OR summary LIKE ? OR solution LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const rows = await query<ExperienceRecordRow[]>(
      pool,
      `
      SELECT
        id, type, title, description, user_query, solution,
        experience_applied, experience_gained, tags, difficulty, xp_gained,
        tags_text, summary, root_cause, verification, source_text, cloud_text, payload,
        timestamp, updated_at, created_at
      FROM experience_records
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY COALESCE(updated_at, timestamp, created_at) DESC, id DESC
      LIMIT ?
      `,
      [...params, limit]
    );

    return c.json({
      count: rows.length,
      experienceRecords: rows,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/fanqie-works", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const search = (c.req.query("search") || "").trim();
    const accountId = (c.req.query("account_id") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      where.push("title LIKE ?");
      params.push(`%${search}%`);
    }
    if (accountId) {
      where.push("account_id = ?");
      params.push(accountId);
    }

    const rows = await query<FanqieWorkRow[]>(
      pool,
      `
      SELECT id, account_id, work_id, title, chapter_count, word_count, status, last_synced_at, updated_at, created_at
      FROM fanqie_works
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY last_synced_at DESC, updated_at DESC, id DESC
      LIMIT ?
      `,
      [...params, limit]
    );

    return c.json({
      count: rows.length,
      fanqieWorks: rows,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/literature", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 100, 500);
    const search = (c.req.query("search") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      where.push("(title LIKE ? OR author LIKE ? OR category LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const rows = await query<LiteratureRow[]>(
      pool,
      `
      SELECT id, title, author, category, LEFT(content, 3000) AS content, source, updated_at, created_at
      FROM literature
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, id DESC
      LIMIT ?
      `,
      [...params, limit]
    );

    return c.json({
      count: rows.length,
      literature: rows,
      requestId: c.get("requestId")
    });
  });

  app.get("/content/literature/stats", async (c) => {
    const rows = await query<{ id: number; title: string; author: string; category: string; charCount: number; source: string; updated_at: string }[]>(
      pool,
      `
      SELECT id, title, author, category, CHAR_LENGTH(content) AS charCount, source, updated_at
      FROM literature
      ORDER BY CHAR_LENGTH(content) DESC, id DESC
      `,
      []
    );

    let totalChars = 0;
    const byCategory: Record<string, { count: number; chars: number }> = {};
    const titles: string[] = [];
    const fingerprints = new Map<string, number[]>();

    for (const row of rows) {
      totalChars += row.charCount;
      const cat = row.category || "uncategorized";
      if (!byCategory[cat]) byCategory[cat] = { count: 0, chars: 0 };
      byCategory[cat].count++;
      byCategory[cat].chars += row.charCount;
      titles.push(row.title || "");
    }

    const duplicateTitles = titles.filter((t, i) => t && titles.indexOf(t) !== i);
    const emptyCount = rows.filter(r => r.charCount < 100).length;

    return c.json({
      count: rows.length,
      totalChars,
      byCategory,
      duplicateTitles: [...new Set(duplicateTitles)],
      duplicateRate: rows.length > 0 ? `${((duplicateTitles.length / rows.length) * 100).toFixed(1)}%` : "0%",
      completeness: {
        withContent: rows.length - emptyCount,
        empty: emptyCount,
        rate: rows.length > 0 ? `${(((rows.length - emptyCount) / rows.length) * 100).toFixed(1)}%` : "0%",
      },
      items: rows.map(r => ({
        id: r.id,
        title: r.title,
        author: r.author,
        category: r.category,
        charCount: r.charCount,
        source: r.source,
      })),
      requestId: c.get("requestId"),
    });
  });

  app.get("/content/state-machine/transitions", async (c) => {
    const limit = clampLimit(c.req.query("limit") || null, 200, 500);
    const rows = await query<StateTransitionRow[]>(
      pool,
      `
      SELECT id, chapter_id, from_status, to_status, trigger_event, reason, created_at
      FROM state_transition_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
      `,
      [limit]
    );

    return c.json({
      count: rows.length,
      transitions: rows,
      requestId: c.get("requestId")
    });
  });

  return app;
}
