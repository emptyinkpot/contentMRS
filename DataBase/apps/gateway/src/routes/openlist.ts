import { Hono } from "hono";
import type { AppBindings, RouteDependencies } from "../types.js";
import { HttpError } from "../http.js";
import { clampLimit } from "../utils.js";
import { query } from "../db.js";

interface OpenListMountRow {
  id: string;
  mount_path: string;
  driver: string | null;
  remark: string | null;
  openlist_status: string | null;
  disabled: number | boolean;
  source: string;
  metadata_json: unknown;
  last_synced_at: Date | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

interface OpenListTargetRow {
  id: string;
  provider: string;
  purpose: string;
  display_name: string;
  mount_path: string;
  remote_dir: string;
  local_cache_path: string | null;
  status: string;
  metadata_json: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

interface OpenListFileObject {
  name: string;
  size: number;
  is_dir: boolean;
  modified: string;
  created?: string;
  thumb?: string;
  type?: number;
  [key: string]: unknown;
}

function toIsoString(value: Date | string | null): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  return null;
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

function normalizeOpenListPath(value: string): string {
  const normalized = `/${String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "")}`;
  return normalized.replace(/\/{2,}/g, "/").replace(/\/+$/g, "") || "/";
}

function joinOpenListPath(parent: string, child: string): string {
  const base = normalizeOpenListPath(parent).replace(/\/+$/g, "");
  const suffix = String(child || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  return normalizeOpenListPath(`${base}/${suffix}`);
}

function stableOpenListObjectId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const basename = String(value || "")
    .split("/")
    .pop()
    ?.replace(/\.(epub|pdf|mobi)$/i, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return `openlist-${basename || "object"}-${(hash >>> 0).toString(36)}`;
}

function mapTargetFile(row: OpenListTargetRow, item: OpenListFileObject, parentPath = row.remote_dir) {
  const path = joinOpenListPath(parentPath, item.name);
  return {
    ...item,
    id: String(item.id || stableOpenListObjectId(path)),
    path,
    parentPath
  };
}

async function getActiveTarget(pool: RouteDependencies["pool"], targetId: string): Promise<OpenListTargetRow> {
  const rows = await query<OpenListTargetRow[]>(
    pool,
    `
    SELECT id, provider, purpose, display_name, mount_path, remote_dir,
           local_cache_path, status, metadata_json, created_at, updated_at
    FROM openlist_file_targets
    WHERE id = ? AND status = 'active'
    LIMIT 1
    `,
    [targetId]
  );

  const row = rows[0];
  if (!row) {
    throw new HttpError(404, "openlist_target_not_found", `Active OpenList target not found: ${targetId}`);
  }
  return row;
}

function mapMount(row: OpenListMountRow) {
  return {
    id: row.id,
    mountPath: row.mount_path,
    driver: row.driver,
    remark: row.remark,
    openlistStatus: row.openlist_status,
    disabled: Boolean(row.disabled),
    source: row.source,
    metadata: toRecord(row.metadata_json),
    lastSyncedAt: toIsoString(row.last_synced_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapTarget(row: OpenListTargetRow) {
  return {
    id: row.id,
    provider: row.provider,
    purpose: row.purpose,
    displayName: row.display_name,
    mountPath: row.mount_path,
    remoteDir: row.remote_dir,
    localCachePath: row.local_cache_path,
    status: row.status,
    metadata: toRecord(row.metadata_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

export function openlistRoutes({ pool, openlistClient }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  function requireClient() {
    if (!openlistClient) {
      throw new HttpError(503, "openlist_not_configured", "OpenList client is not configured");
    }
    return openlistClient;
  }

  app.get("/openlist/health", async (c) => {
    const client = requireClient();
    const ping = await client.health();
    return c.json({
      ok: ping === "pong",
      service: "openlist",
      requestId: c.get("requestId")
    });
  });

  app.get("/openlist/storages", async (c) => {
    const client = requireClient();
    const page = clampLimit(c.req.query("page") ?? null, 1, 1000);
    const perPage = clampLimit(c.req.query("per_page") ?? null, 200, 1000);
    const data = await client.listStorages(page, perPage);
    return c.json({
      count: data.total,
      storages: data.content,
      requestId: c.get("requestId")
    });
  });

  app.get("/openlist/storages/:id", async (c) => {
    const client = requireClient();
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, "invalid_storage_id", "Storage id must be a positive integer");
    }
    const data = await client.getStorage(id);
    return c.json({
      storage: data,
      requestId: c.get("requestId")
    });
  });

  app.post("/openlist/fs/list", async (c) => {
    const client = requireClient();
    const input = await c.req.json();
    const data = await client.listFiles(input);
    return c.json({
      ...data,
      requestId: c.get("requestId")
    });
  });

  app.post("/openlist/fs/get", async (c) => {
    const client = requireClient();
    const input = await c.req.json();
    const data = await client.getFile(input);
    return c.json({
      item: data,
      requestId: c.get("requestId")
    });
  });

  app.get("/openlist/mounts", async (c) => {
    const limit = clampLimit(c.req.query("limit") ?? null, 100, 500);
    const rows = await query<OpenListMountRow[]>(
      pool,
      `
      SELECT id, mount_path, driver, remark, openlist_status, disabled, source,
             metadata_json, last_synced_at, created_at, updated_at
      FROM openlist_storage_mounts
      ORDER BY disabled ASC, mount_path ASC
      LIMIT ?
      `,
      [limit]
    );

    const mounts = rows.map(mapMount);
    return c.json({
      count: mounts.length,
      mounts,
      requestId: c.get("requestId")
    });
  });

  app.get("/openlist/targets", async (c) => {
    const limit = clampLimit(c.req.query("limit") ?? null, 100, 500);
    const status = (c.req.query("status") || "active").trim();
    const purpose = (c.req.query("purpose") || "").trim();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    if (purpose) {
      where.push("purpose = ?");
      params.push(purpose);
    }

    const rows = await query<OpenListTargetRow[]>(
      pool,
      `
      SELECT id, provider, purpose, display_name, mount_path, remote_dir,
             local_cache_path, status, metadata_json, created_at, updated_at
      FROM openlist_file_targets
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY purpose ASC, id ASC
      LIMIT ?
      `,
      [...params, limit]
    );

    const targets = rows.map(mapTarget);
    return c.json({
      count: targets.length,
      targets,
      requestId: c.get("requestId")
    });
  });

  app.get("/openlist/targets/:id", async (c) => {
    const targetId = c.req.param("id");
    const rows = await query<OpenListTargetRow[]>(
      pool,
      `
      SELECT id, provider, purpose, display_name, mount_path, remote_dir,
             local_cache_path, status, metadata_json, created_at, updated_at
      FROM openlist_file_targets
      WHERE id = ?
      LIMIT 1
      `,
      [targetId]
    );

    const row = rows[0];
    if (!row) {
      throw new HttpError(404, "openlist_target_not_found", `OpenList target not found: ${targetId}`);
    }

    return c.json({
      target: mapTarget(row),
      requestId: c.get("requestId")
    });
  });

  app.post("/openlist/targets/:id/list", async (c) => {
    const client = requireClient();
    const targetId = c.req.param("id");
    const input = await c.req.json().catch(() => ({}));
    const row = await getActiveTarget(pool, targetId);

    const page = clampLimit(typeof input.page === "string" ? input.page : String(input.page || ""), 1, 1000);
    const perPage = clampLimit(typeof input.per_page === "string" ? input.per_page : String(input.per_page || ""), 50, 1000);
    const refresh = typeof input.refresh === "boolean" ? input.refresh : undefined;
    const password = typeof input.password === "string" ? input.password : undefined;
    const subPath = typeof input.subPath === "string" ? input.subPath : "";
    const path = subPath ? joinOpenListPath(row.remote_dir, subPath) : row.remote_dir;
    const data = await client.listFiles({
      path,
      page,
      per_page: perPage,
      refresh,
      password
    });

    return c.json({
      target: mapTarget(row),
      ...data,
      content: (data.content || []).map((item: OpenListFileObject) => mapTargetFile(row, item, path)),
      requestId: c.get("requestId")
    });
  });

  app.post("/openlist/targets/:id/get", async (c) => {
    const client = requireClient();
    const targetId = c.req.param("id");
    const input = await c.req.json().catch(() => ({}));
    const row = await getActiveTarget(pool, targetId);
    const bookId = typeof input.bookId === "string" ? input.bookId.trim() : "";
    const pathInput = typeof input.path === "string" ? input.path.trim() : "";
    const password = typeof input.password === "string" ? input.password : undefined;

    let path = pathInput ? normalizeOpenListPath(pathInput) : "";
    let item: OpenListFileObject | null = null;

    if (!path && bookId) {
      let page = 1;
      while (page <= 1000 && !item) {
        const data = await client.listFiles({
          path: row.remote_dir,
          page,
          per_page: 200,
          refresh: false,
          password
        });
        const content = (data.content || []).map((candidate: OpenListFileObject) => mapTargetFile(row, candidate));
        item = content.find((candidate: OpenListFileObject) => String(candidate.id) === bookId) || null;
        path = item ? String(item.path) : "";
        if (!data.content?.length || data.content.length < 200 || page * 200 >= Number(data.total || 0)) break;
        page += 1;
      }
    }

    if (!path) {
      throw new HttpError(400, "invalid_openlist_target_file_request", "bookId or path is required.");
    }

    const itemPath = path.startsWith(`${normalizeOpenListPath(row.remote_dir)}/`) ? path : joinOpenListPath(row.remote_dir, path);
    if (!itemPath.startsWith(`${normalizeOpenListPath(row.remote_dir)}/`)) {
      throw new HttpError(400, "openlist_target_path_forbidden", "Requested path is outside the registered target.");
    }

    const data = await client.getFile({ path: itemPath, password });
    const mapped = {
      ...(item || {}),
      ...data,
      name: itemPath.split("/").pop() || data.name,
      path: itemPath,
      parentPath: row.remote_dir,
      id: item?.id || stableOpenListObjectId(itemPath)
    };

    return c.json({
      target: mapTarget(row),
      item: {
        ...mapped,
        path: itemPath,
        id: String(mapped.id || stableOpenListObjectId(itemPath))
      },
      requestId: c.get("requestId")
    });
  });

  return app;
}
