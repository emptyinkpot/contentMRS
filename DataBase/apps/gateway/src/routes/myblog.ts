import { Hono } from "hono";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { HttpError } from "../http.js";
import { clampLimit } from "../utils.js";

interface ReaderMemoryRow {
  object_id: string;
  object_type: string;
  title: string;
  href: string | null;
  progress: number | string;
  location_json: unknown;
  scroll_top: number | string;
  last_read_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ReaderHighlightRow {
  id: string;
  object_id: string;
  object_type: string;
  title: string;
  text: string;
  color: string;
  note: string | null;
  anchor_json: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

interface VisualSourceRow {
  id: string;
  source_type: string;
  provider: string;
  source_url: string;
  board_id: string | null;
  provider_config_json: unknown;
  title: string;
  collection_title: string;
  partition_pattern_json: unknown;
  sync_interval_seconds: number | string;
  last_cursor: string | null;
  last_synced_at: Date | string | null;
  sync_status: string;
  pins_snapshot_hash: string | null;
  last_error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface VisualPinRow {
  source_id: string;
  pin_id: string;
  pin_url: string;
  image_preview_url: string;
  title: string | null;
  description: string | null;
  board_id: string | null;
  position_index: number | string;
  downloaded: number | boolean;
  raw_json: unknown;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  deleted_at: Date | string | null;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toEpoch(value: Date | string | null): number {
  if (!value) return Date.now();
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : Date.now();
}

function mysqlDate(value: unknown = Date.now()): string {
  const date = value instanceof Date ? value : new Date(Number(value) || Date.now());
  return date.toISOString().slice(0, 23).replace("T", " ");
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function stableNow() {
  return mysqlDate(Date.now());
}

function mapMemory(row: ReaderMemoryRow) {
  return {
    id: row.object_id,
    objectId: row.object_id,
    objectType: row.object_type,
    title: row.title,
    href: row.href || "",
    progress: Number(row.progress || 0),
    location: parseJsonValue(row.location_json),
    scrollTop: Number(row.scroll_top || 0),
    timestamp: toEpoch(row.created_at),
    lastReadAt: toEpoch(row.last_read_at),
    updatedAt: toEpoch(row.updated_at)
  };
}

function mapHighlight(row: ReaderHighlightRow) {
  return {
    id: row.id,
    articleId: row.object_id,
    objectId: row.object_id,
    objectType: row.object_type,
    title: row.title,
    text: row.text,
    color: row.color || "gold",
    note: row.note || "",
    anchor: parseJsonValue(row.anchor_json),
    createdAt: toEpoch(row.created_at),
    updatedAt: toEpoch(row.updated_at)
  };
}

function mapSource(row: VisualSourceRow, pinCount = 0) {
  return {
    id: row.id,
    sourceType: row.source_type,
    provider: row.provider,
    sourceUrl: row.source_url,
    boardId: row.board_id || "",
    providerConfig: parseJsonValue(row.provider_config_json) || {},
    title: row.title,
    collectionTitle: row.collection_title,
    partitionPattern: parseJsonValue(row.partition_pattern_json) || [6, 4, 9, 12],
    syncIntervalSeconds: Number(row.sync_interval_seconds || 600),
    lastCursor: row.last_cursor || "",
    lastSyncedAt: row.last_synced_at ? toEpoch(row.last_synced_at) : null,
    syncStatus: row.sync_status,
    pinsSnapshotHash: row.pins_snapshot_hash || "",
    lastError: row.last_error || "",
    pinCount,
    createdAt: toEpoch(row.created_at),
    updatedAt: toEpoch(row.updated_at)
  };
}

function mapPin(row: VisualPinRow) {
  return {
    id: row.pin_id,
    pinId: row.pin_id,
    sourceId: row.source_id,
    pinUrl: row.pin_url,
    imagePreviewUrl: row.image_preview_url,
    title: row.title || "",
    description: row.description || "",
    boardId: row.board_id || "",
    positionIndex: Number(row.position_index || 0),
    downloaded: Boolean(row.downloaded),
    raw: parseJsonValue(row.raw_json) || {},
    firstSeenAt: toEpoch(row.first_seen_at),
    lastSeenAt: toEpoch(row.last_seen_at),
    deletedAt: row.deleted_at ? toEpoch(row.deleted_at) : null
  };
}

export function myblogRoutes({ pool, writePool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/myblog/runtime/reader/memory", async (c) => {
    const objectId = (c.req.query("objectId") || "").trim();
    const limit = clampLimit(c.req.query("limit") ?? null, 20, 50);

    if (objectId) {
      const rows = await query<ReaderMemoryRow[]>(
        pool,
        "SELECT * FROM myblog_reader_memory WHERE object_id = ? LIMIT 1",
        [objectId]
      );
      return c.json({ ok: true, item: rows[0] ? mapMemory(rows[0]) : null, requestId: c.get("requestId") });
    }

    const rows = await query<ReaderMemoryRow[]>(
      pool,
      `
      SELECT * FROM myblog_reader_memory
      ORDER BY last_read_at DESC
      LIMIT ?
      `,
      [limit]
    );
    return c.json({ ok: true, items: rows.map(mapMemory), requestId: c.get("requestId") });
  });

  app.post("/myblog/runtime/reader/memory", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const objectId = String(body.objectId || body.id || "").trim();
    if (!objectId) throw new HttpError(400, "invalid_payload", "objectId is required.");

    const objectTypeInput = String(body.objectType || body.type || "article").trim();
    const objectType = objectId.startsWith("book:") ? "book" : objectTypeInput;
    const title = String(body.title || "Untitled").trim();
    const href = String(body.href || "");
    const hasProgress = Object.prototype.hasOwnProperty.call(body, "progress")
      || Object.prototype.hasOwnProperty.call(body, "percent");
    const hasLocation = Object.prototype.hasOwnProperty.call(body, "location");
    const hasScrollTop = Object.prototype.hasOwnProperty.call(body, "scrollTop");
    const progress = hasProgress ? clamp01(Number(body.progress ?? body.percent ?? 0)) : 0;
    const scrollTop = hasScrollTop ? Math.max(0, Number(body.scrollTop || 0)) : 0;
    const now = mysqlDate(body.updatedAt || body.lastReadAt || Date.now());
    const locationJson = hasLocation && body.location != null ? JSON.stringify(body.location) : null;

    await query(
      writePool,
      `
      INSERT INTO myblog_reader_memory
        (object_id, object_type, title, href, progress, location_json, scroll_top, last_read_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        object_type = VALUES(object_type),
        title = VALUES(title),
        href = VALUES(href),
        progress = IF(?, VALUES(progress), progress),
        location_json = IF(?, VALUES(location_json), location_json),
        scroll_top = IF(?, VALUES(scroll_top), scroll_top),
        last_read_at = VALUES(last_read_at),
        updated_at = VALUES(updated_at)
      `,
      [
        objectId,
        objectType,
        title,
        href,
        progress,
        locationJson,
        scrollTop,
        now,
        now,
        now,
        hasProgress ? 1 : 0,
        hasLocation ? 1 : 0,
        hasScrollTop ? 1 : 0
      ]
    );

    const rows = await query<ReaderMemoryRow[]>(
      pool,
      "SELECT * FROM myblog_reader_memory WHERE object_id = ? LIMIT 1",
      [objectId]
    );
    return c.json({ ok: true, item: rows[0] ? mapMemory(rows[0]) : null, requestId: c.get("requestId") });
  });

  app.get("/myblog/runtime/reader/highlights", async (c) => {
    const objectId = (c.req.query("objectId") || c.req.query("articleId") || "").trim();
    const limit = clampLimit(c.req.query("limit") ?? null, 100, 200);
    const where = objectId ? "WHERE object_id = ?" : "";
    const params = objectId ? [objectId, limit] : [limit];
    const rows = await query<ReaderHighlightRow[]>(
      pool,
      `
      SELECT * FROM myblog_reader_highlights
      ${where}
      ORDER BY updated_at DESC
      LIMIT ?
      `,
      params
    );
    return c.json({ ok: true, items: rows.map(mapHighlight), requestId: c.get("requestId") });
  });

  app.post("/myblog/runtime/reader/highlights", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    const objectId = String(body.objectId || body.articleId || "").trim();
    const text = String(body.text || "").trim();
    if (!id || !objectId || !text) {
      throw new HttpError(400, "invalid_payload", "id, objectId and text are required.");
    }

    const objectType = String(body.objectType || body.type || "article").trim();
    const title = String(body.title || "Untitled").trim();
    const color = String(body.color || "gold").trim();
    const note = body.note == null ? null : String(body.note);
    const now = mysqlDate(body.updatedAt || Date.now());
    const createdAt = mysqlDate(body.createdAt || body.updatedAt || Date.now());
    const anchorJson = body.anchor == null ? null : JSON.stringify(body.anchor);

    await query(
      writePool,
      `
      INSERT INTO myblog_reader_highlights
        (id, object_id, object_type, title, text, color, note, anchor_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        object_id = VALUES(object_id),
        object_type = VALUES(object_type),
        title = VALUES(title),
        text = VALUES(text),
        color = VALUES(color),
        note = VALUES(note),
        anchor_json = VALUES(anchor_json),
        updated_at = VALUES(updated_at)
      `,
      [id, objectId, objectType, title, text, color, note, anchorJson, createdAt, now]
    );

    return c.json({
      ok: true,
      item: {
        id,
        articleId: objectId,
        objectId,
        objectType,
        title,
        text,
        color,
        note: note || "",
        anchor: body.anchor ?? null,
        createdAt: toEpoch(createdAt),
        updatedAt: toEpoch(now)
      },
      requestId: c.get("requestId")
    });
  });

  app.get("/myblog/runtime/visuals/snapshot", async (c) => {
    const sourceRows = await query<VisualSourceRow[]>(
      pool,
      "SELECT * FROM myblog_visual_sources ORDER BY id ASC"
    );
    const sources = [];
    const pinsBySource: Record<string, ReturnType<typeof mapPin>[]> = {};

    for (const source of sourceRows) {
      const pins = await query<VisualPinRow[]>(
        pool,
        `
        SELECT * FROM myblog_visual_pins
        WHERE source_id = ? AND deleted_at IS NULL
        ORDER BY position_index ASC, first_seen_at ASC
        `,
        [source.id]
      );
      const normalizedPins = pins.map(mapPin);
      pinsBySource[source.id] = normalizedPins;
      sources.push(mapSource(source, normalizedPins.length));
    }

    return c.json({
      ok: true,
      version: 1,
      mode: "bookmark-mirror",
      downloaded: false,
      generatedAt: new Date().toISOString(),
      sources,
      pinsBySource,
      requestId: c.get("requestId")
    });
  });

  app.post("/myblog/runtime/visuals/sync-result", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const sourceId = String(body.sourceId || "pinterest-saved-pins").trim();
    const provider = String(body.provider || "pinterest_api").trim();
    const status = body.ok === false ? "error" : "ok";
    const pins = Array.isArray(body.pins) ? body.pins : [];
    const now = stableNow();
    const runId = String(body.runId || `visual-sync:${sourceId}:${Date.now()}`);
    const snapshotHash = String(body.snapshotHash || "");
    const error = body.error == null ? null : String(body.error);

    await query(
      writePool,
      `
      INSERT INTO myblog_visual_sync_runs
        (id, source_id, provider, status, synced_items, active_items, snapshot_hash, error, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        synced_items = VALUES(synced_items),
        active_items = VALUES(active_items),
        snapshot_hash = VALUES(snapshot_hash),
        error = VALUES(error),
        finished_at = VALUES(finished_at)
      `,
      [runId, sourceId, provider, status, pins.length, pins.length, snapshotHash || null, error, now, now]
    );

    for (const [index, pin] of pins.entries()) {
      const pinId = String(pin.pinId || pin.id || "").trim();
      const imagePreviewUrl = String(pin.imagePreviewUrl || pin.image || "").trim();
      if (!pinId || !imagePreviewUrl) continue;
      await query(
        writePool,
        `
        INSERT INTO myblog_visual_pins
          (source_id, pin_id, pin_url, image_preview_url, title, description, board_id, position_index, downloaded, raw_json, first_seen_at, last_seen_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)
        ON DUPLICATE KEY UPDATE
          pin_url = VALUES(pin_url),
          image_preview_url = VALUES(image_preview_url),
          title = VALUES(title),
          description = VALUES(description),
          board_id = VALUES(board_id),
          position_index = VALUES(position_index),
          downloaded = 0,
          raw_json = VALUES(raw_json),
          last_seen_at = VALUES(last_seen_at),
          deleted_at = NULL
        `,
        [
          sourceId,
          pinId,
          String(pin.pinUrl || ""),
          imagePreviewUrl,
          String(pin.title || ""),
          String(pin.description || ""),
          String(pin.boardId || ""),
          Number(pin.positionIndex ?? index),
          JSON.stringify(pin.raw || pin),
          now,
          now
        ]
      );
    }

    await query(
      writePool,
      `
      UPDATE myblog_visual_sources
      SET last_synced_at = ?,
          sync_status = ?,
          pins_snapshot_hash = ?,
          last_error = ?,
          updated_at = ?
      WHERE id = ?
      `,
      [now, status, snapshotHash || null, error, now, sourceId]
    );

    return c.json({
      ok: status === "ok",
      sourceId,
      syncedItems: pins.length,
      snapshotHash,
      requestId: c.get("requestId")
    });
  });

  return app;
}
