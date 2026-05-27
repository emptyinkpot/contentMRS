import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config, publicConfig } from "../lib/config.mjs";
import { checkDatabaseHealth, getPool } from "../lib/db.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = config.packageRoot;
const qmdSyncScript = config.qmd.syncScript;
const qmdRoot = config.qmd.root;
const qmdTsxCli = config.qmd.tsxCli;
const qmdSourceCli = config.qmd.sourceCli;
const QMD_EXPERIENCE_COLLECTION = config.qmd.collection;
const QMD_EXPERIENCE_LABEL = config.qmd.label;
const QMD_EXPERIENCE_COLLECTION_DIR = config.qmd.collectionDir;
const QMD_EXPERIENCE_DISTILLED_MANIFEST = config.qmd.distilledManifest;
const QMD_EXPERIENCE_DB_PATH = config.qmd.indexPath;
const EXPERIENCE_TABLE = config.tables.experiences;
const NOTE_TABLE = config.tables.notes;
const AUTO_TAG_LIMIT = 8;
const EXPERIENCE_MCP_LABEL = "experience-manager";
let qmdStorePromise = null;
let qmdModulePromise = null;

async function getQmdModule() {
  if (!qmdModulePromise) {
    qmdModulePromise = import(process.env.EXPERIENCE_QMD_PACKAGE_IMPORT || "@tobilu/qmd").catch((error) => {
      throw new Error(`Unable to load QMD package. Set EXPERIENCE_QMD_PACKAGE_IMPORT or install @tobilu/qmd. Cause: ${error?.message || error}`);
    });
  }
  return await qmdModulePromise;
}

function safeJsonParse(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      const parsed = safeJsonParse(trimmed, []);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    }

    return trimmed
      .split(/[\n,|/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseObject(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  const parsed = safeJsonParse(value, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function toJsonText(value) {
  return JSON.stringify(value ?? null);
}

function toNullableString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function toMysqlDatetime(value) {
  const date = value instanceof Date
    ? value
    : new Date(typeof value === "number" || typeof value === "string" ? value : Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function normalizeWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function autoSummary(record) {
  if (String(record.summary || "").trim()) {
    return String(record.summary).trim();
  }

  const parts = [
    record.title,
    record.description,
    record.userQuery,
    record.solution,
  ].map((item) => String(item || "").trim()).filter(Boolean);

  if (parts.length === 0) {
    return "Recorded experience";
  }

  const lead = parts[0];
  const tail = parts[1] || parts[2] || parts[3] || "";
  const summary = tail ? `${lead} - ${tail.slice(0, 140)}` : lead;
  return summary.length > 220 ? `${summary.slice(0, 217)}...` : summary;
}

function inferTags(record) {
  const text = normalizeWords([
    record.title,
    record.description,
    record.userQuery,
    record.solution,
    record.summary,
    ...(Array.isArray(record.tags) ? record.tags : []),
  ].join(" "));

  const tags = new Set(Array.isArray(record.tags) ? record.tags.map((tag) => String(tag).trim()).filter(Boolean) : []);
  const rules = [
    ["codex", ["codex", "agent", "mcp"]],
    ["mcp", ["mcp", "modelcontextprotocol"]],
    ["skill", ["skill", "skills"]],
    ["qmd", ["qmd"]],
    ["mysql", ["mysql", "database", "sql", "schema"]],
    ["markdown", ["markdown", "md"]],
    ["sync", ["sync", "synchronize", "mirror"]],
    ["summary", ["summary", "summarize"]],
    ["knowledge-base", ["knowledge", "memory", "retrieval"]],
    ["cloud", ["cloud", "remote", "server"]],
    ["windows", ["windows", "powershell", "cmd"]],
  ];

  for (const [tag, needles] of rules) {
    if (needles.some((needle) => text.includes(needle))) {
      tags.add(tag);
    }
  }

  for (const token of text) {
    if (tags.size >= AUTO_TAG_LIMIT) break;
    if (token.length >= 4 && !["this", "that", "with", "from", "into", "about", "when", "then", "also", "have", "using"].includes(token)) {
      tags.add(token);
    }
  }

  return Array.from(tags).slice(0, AUTO_TAG_LIMIT);
}

function enrichExperienceInput(record) {
  return {
    ...record,
    summary: autoSummary(record),
    tags: inferTags(record),
  };
}

async function getQmdStore() {
  if (!qmdStorePromise) {
    const { createStore } = await getQmdModule();
    qmdStorePromise = createStore({
      dbPath: QMD_EXPERIENCE_DB_PATH,
      config: {
        collections: {
          [QMD_EXPERIENCE_COLLECTION]: {
            path: QMD_EXPERIENCE_COLLECTION_DIR,
            pattern: "**/*.md",
          },
        },
      },
    });
  }

  return await qmdStorePromise;
}

function formatQmdSearchHit(hit, index) {
  const file = hit?.file || hit?.displayPath || hit?.path || "";
  const title = hit?.title || hit?.name || file || hit?.docid || "Untitled";
  const context = hit?.context || hit?.collection || QMD_EXPERIENCE_COLLECTION;
  const score = typeof hit?.score === "number" ? Number(hit.score.toFixed(4)) : null;
  const snippet = String(hit?.snippet || hit?.body || hit?.text || "").slice(0, 420);
  return {
    index: index + 1,
    docid: hit?.docid || null,
    file,
    title,
    context,
    score,
    snippet,
  };
}

async function searchExperienceMirror(query, limit = 8, rerank = false) {
  const store = await getQmdStore();
  const results = rerank
    ? await store.search({
        query,
        collection: QMD_EXPERIENCE_COLLECTION,
        limit,
        rerank: true,
      })
    : await store.searchLex(query, {
        limit,
        collection: QMD_EXPERIENCE_COLLECTION,
      });

  const hits = Array.isArray(results) ? results : results?.results ?? [];
  return {
    collection: QMD_EXPERIENCE_COLLECTION,
    query,
    limit,
    rerank,
    count: hits.length,
    results: hits.map(formatQmdSearchHit),
  };
}

function formatFallbackHit(kind, record, index) {
  const title = String(record?.title || record?.summary || record?.id || "Untitled").trim();
  const body = kind === "note"
    ? String(record?.content || record?.summary || "")
    : String(record?.description || record?.summary || record?.solution || "");
  return {
    index: index + 1,
    kind,
    id: record?.id || null,
    title,
    category: record?.category || record?.type || null,
    context: kind === "note" ? "note record" : "experience record",
    score: null,
    snippet: body.slice(0, 420),
  };
}

async function searchExperienceFallback(query, limit = 8) {
  const [experienceHits, noteHits] = await Promise.all([
    searchExperiences(query, Math.max(1, Math.ceil(limit / 2))),
    searchNotes(query, Math.max(1, Math.floor(limit / 2))),
  ]);

  const combined = [
    ...experienceHits.map((record, index) => formatFallbackHit("experience", record, index)),
    ...noteHits.map((record, index) => formatFallbackHit("note", record, index + experienceHits.length)),
  ].slice(0, limit);

  return {
    collection: "cloud-experience-fallback",
    query,
    limit,
    rerank: false,
    count: combined.length,
    results: combined,
  };
}

async function getExperienceMirrorDocument(pathOrDocid, fromLine, maxLines) {
  const store = await getQmdStore();
  const { addLineNumbers } = await getQmdModule();
  const result = await store.get(pathOrDocid, { includeBody: true });

  if (result && typeof result === "object" && "error" in result) {
    return result;
  }

  const body = String(result?.body || "");
  const bodyLines = body.split(/\r?\n/);
  const startLine = typeof fromLine === "number" ? Math.max(1, fromLine) : 1;
  const lineCount = typeof maxLines === "number" ? Math.max(1, maxLines) : Math.min(bodyLines.length || 1, 40);
  const excerpt = bodyLines
    .slice(startLine - 1, startLine - 1 + lineCount)
    .map((line, index) => `${startLine + index}: ${line}`)
    .join("\n");
  return {
    collection: QMD_EXPERIENCE_COLLECTION,
    pathOrDocid,
    title: result?.title || result?.displayPath || pathOrDocid,
    displayPath: result?.displayPath || result?.file || pathOrDocid,
    docid: result?.docid || null,
    context: result?.context || QMD_EXPERIENCE_LABEL,
    body: addLineNumbers(body || ""),
    excerpt: excerpt || null,
  };
}

async function ensureExperienceTable() {
  const pool = await getPool();
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ${EXPERIENCE_TABLE} (
      id varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
      timestamp bigint NOT NULL,
      type varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
      title varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      difficulty tinyint NOT NULL DEFAULT '1',
      xp_gained int NOT NULL DEFAULT '0',
      description longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      user_query longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      solution longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      experience_applied longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      experience_gained longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      tags_text longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      summary longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      root_cause longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      verification longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      source_text longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      cloud_text longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      payload longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      created_at timestamp NOT NULL DEFAULT current_timestamp(),
      updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      PRIMARY KEY (id),
      KEY idx_experience_timestamp (timestamp),
      KEY idx_experience_type (type),
      KEY idx_experience_title (title)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureNoteTable() {
  const pool = await getPool();
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ${NOTE_TABLE} (
      id varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
      title varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      category varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
      tags_text longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      summary longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      sections_text longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      related_experience_ids longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      cloud_text longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      payload longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      created_at timestamp NOT NULL DEFAULT current_timestamp(),
      updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
      content longtext COLLATE utf8mb4_unicode_ci NOT NULL,
      PRIMARY KEY (id),
      KEY idx_note_category (category),
      KEY idx_note_title (title)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function reviveExperience(row) {
  const payload = parseObject(row?.payload);
  const fallback = {
    id: row?.id,
    timestamp: Number(row?.timestamp) || Date.now(),
    type: row?.type || "learning",
    title: row?.title || "",
    description: row?.description || "",
    userQuery: row?.user_query || "",
    solution: row?.solution || "",
    experienceApplied: parseList(row?.experience_applied),
    experienceGained: parseList(row?.experience_gained),
    tags: parseList(row?.tags_text),
    difficulty: Number(row?.difficulty) || 1,
    xpGained: Number(row?.xp_gained) || 0,
    summary: row?.summary || "",
    rootCause: row?.root_cause || "",
    verification: parseList(row?.verification),
    source: parseObject(row?.source_text),
    cloud: parseObject(row?.cloud_text),
  };

  return {
    ...fallback,
    ...payload,
    experienceApplied: parseList(payload.experienceApplied ?? payload.experience_applied ?? fallback.experienceApplied),
    experienceGained: parseList(payload.experienceGained ?? payload.experience_gained ?? fallback.experienceGained),
    tags: parseList(payload.tags ?? fallback.tags),
    verification: parseList(payload.verification ?? fallback.verification),
    source: parseObject(payload.source ?? fallback.source),
    cloud: parseObject(payload.cloud ?? fallback.cloud),
  };
}

function reviveNote(row) {
  const payload = parseObject(row?.payload);
  const fallback = {
    id: row?.id,
    title: row?.title || "",
    content: row?.content || "",
    category: row?.category || "",
    tags: parseList(row?.tags_text),
    created_at: row?.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updated_at: row?.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    summary: row?.summary || "",
    sections: parseObject(row?.sections_text),
    relatedExperienceIds: parseList(row?.related_experience_ids),
    cloud: parseObject(row?.cloud_text),
  };

  return {
    ...fallback,
    ...payload,
    tags: parseList(payload.tags ?? fallback.tags),
    sections: parseObject(payload.sections ?? fallback.sections),
    relatedExperienceIds: parseList(payload.relatedExperienceIds ?? payload.related_experience_ids ?? fallback.relatedExperienceIds),
    cloud: parseObject(payload.cloud ?? fallback.cloud),
  };
}

function buildExperienceRow(record) {
  const experienceApplied = parseList(record.experienceApplied ?? record.experience_applied);
  const experienceGained = parseList(record.experienceGained ?? record.experience_gained);
  const tags = parseList(record.tags);
  const verification = parseList(record.verification);
  const source = parseObject(record.source);
  const cloud = parseObject(record.cloud);
  const createdAt = toMysqlDatetime(Number(record.timestamp) || Date.now());

  return {
    id: record.id,
    timestamp: Number(record.timestamp) || Date.now(),
    type: record.type || "learning",
    title: record.title || "",
    difficulty: Number(record.difficulty) || 1,
    xp_gained: Number(record.xpGained ?? record.xp_gained) || 0,
    description: toNullableString(record.description || record.summary || record.userQuery || "") || "",
    user_query: toNullableString(record.userQuery || record.problem || "") || "",
    solution: record.solution || "",
    experience_applied: toJsonText(experienceApplied),
    experience_gained: toJsonText(experienceGained),
    tags_text: toJsonText(tags),
    summary: toNullableString(record.summary) ?? null,
    root_cause: toNullableString(record.rootCause) ?? null,
    verification: toJsonText(verification),
    source_text: toNullableString(Object.keys(source).length ? toJsonText(source) : null),
    cloud_text: toNullableString(Object.keys(cloud).length ? toJsonText(cloud) : null),
    created_at: createdAt,
    updated_at: createdAt,
    payload: toJsonText({
      ...record,
      experienceApplied,
      experienceGained,
      tags,
      verification,
      source,
      cloud,
    }),
  };
}

function buildNoteRow(note) {
  const tags = parseList(note.tags);
  const relatedExperienceIds = parseList(note.relatedExperienceIds ?? note.related_experience_ids);
  const sections = parseObject(note.sections);
  const cloud = parseObject(note.cloud);
  const createdAt = toMysqlDatetime(note.created_at || note.createdAt || Date.now());
  const updatedAt = toMysqlDatetime(note.updated_at || note.updatedAt || createdAt);

  return {
    id: note.id,
    title: note.title || "",
    category: note.category || "general",
    tags_text: toJsonText(tags),
    summary: toNullableString(note.summary),
    sections_text: toNullableString(Object.keys(sections).length ? toJsonText(sections) : null),
    related_experience_ids: toJsonText(relatedExperienceIds),
    cloud_text: toNullableString(Object.keys(cloud).length ? toJsonText(cloud) : null),
    payload: toJsonText({
      ...note,
      tags,
      sections,
      relatedExperienceIds,
      cloud,
      created_at: createdAt,
      updated_at: updatedAt,
    }),
    created_at: createdAt,
    updated_at: updatedAt,
    content: note.content || "",
  };
}

async function listExperiences(limit = 50) {
  await ensureExperienceTable();
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT * FROM ${EXPERIENCE_TABLE} ORDER BY timestamp DESC, updated_at DESC LIMIT ${safeLimit}`
  );
  return rows.map(reviveExperience);
}

async function listNotes(limit = 50) {
  await ensureNoteTable();
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT * FROM ${NOTE_TABLE} ORDER BY updated_at DESC, created_at DESC LIMIT ${safeLimit}`
  );
  return rows.map(reviveNote);
}

async function getExperienceById(id) {
  await ensureExperienceTable();
  const pool = await getPool();
  const [rows] = await pool.execute(`SELECT * FROM ${EXPERIENCE_TABLE} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? reviveExperience(rows[0]) : null;
}

async function getNoteById(id) {
  await ensureNoteTable();
  const pool = await getPool();
  const [rows] = await pool.execute(`SELECT * FROM ${NOTE_TABLE} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? reviveNote(rows[0]) : null;
}

async function searchExperiences(query, limit = 20) {
  const lower = query.toLowerCase();
  const records = await listExperiences(500);
  return records
    .filter((record) =>
      record.title.toLowerCase().includes(lower) ||
      record.description.toLowerCase().includes(lower) ||
      record.userQuery.toLowerCase().includes(lower) ||
      record.solution.toLowerCase().includes(lower) ||
      record.tags.some((tag) => tag.toLowerCase().includes(lower))
    )
    .slice(0, limit);
}

async function searchNotes(query, limit = 20) {
  const lower = query.toLowerCase();
  const notes = await listNotes(500);
  return notes
    .filter((note) =>
      note.title.toLowerCase().includes(lower) ||
      (note.content && note.content.toLowerCase().includes(lower)) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lower)) ||
      note.category.toLowerCase().includes(lower)
    )
    .slice(0, limit);
}

async function upsertExperience(record) {
  await ensureExperienceTable();
  const enriched = enrichExperienceInput(record);
  const row = buildExperienceRow(enriched);

  const pool = await getPool();
  await pool.execute(
    `INSERT INTO ${EXPERIENCE_TABLE}
      (id, timestamp, type, title, difficulty, xp_gained, description, user_query, solution,
       experience_applied, experience_gained, tags_text, summary, root_cause, verification,
       source_text, cloud_text, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       timestamp = VALUES(timestamp),
       type = VALUES(type),
       title = VALUES(title),
       difficulty = VALUES(difficulty),
       xp_gained = VALUES(xp_gained),
       description = VALUES(description),
       user_query = VALUES(user_query),
       solution = VALUES(solution),
       experience_applied = VALUES(experience_applied),
       experience_gained = VALUES(experience_gained),
       tags_text = VALUES(tags_text),
       summary = VALUES(summary),
       root_cause = VALUES(root_cause),
       verification = VALUES(verification),
       source_text = VALUES(source_text),
       cloud_text = VALUES(cloud_text),
       payload = VALUES(payload),
       updated_at = CURRENT_TIMESTAMP`,
    [
      row.id,
      row.timestamp,
      row.type,
      row.title,
      row.difficulty,
      row.xp_gained,
      row.description,
      row.user_query,
      row.solution,
      row.experience_applied,
      row.experience_gained,
      row.tags_text,
      row.summary,
      row.root_cause,
      row.verification,
      row.source_text,
      row.cloud_text,
      row.payload,
      row.created_at,
      row.updated_at,
    ]
  );

  return reviveExperience(row);
}

async function upsertNote(note) {
  await ensureNoteTable();
  const row = buildNoteRow(note);

  const pool = await getPool();
  await pool.execute(
    `INSERT INTO ${NOTE_TABLE}
      (id, title, category, tags_text, summary, sections_text, related_experience_ids,
       cloud_text, payload, created_at, updated_at, content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       category = VALUES(category),
       tags_text = VALUES(tags_text),
       summary = VALUES(summary),
       sections_text = VALUES(sections_text),
       related_experience_ids = VALUES(related_experience_ids),
       cloud_text = VALUES(cloud_text),
       payload = VALUES(payload),
       updated_at = CURRENT_TIMESTAMP,
       content = VALUES(content)`,
    [
      row.id,
      row.title,
      row.category,
      row.tags_text,
      row.summary,
      row.sections_text,
      row.related_experience_ids,
      row.cloud_text,
      row.payload,
      row.created_at,
      row.updated_at,
      row.content,
    ]
  );

  return reviveNote(row);
}

async function runSyncScript(scriptPath, disableEnvName) {
  if (disableEnvName && process.env[disableEnvName] === "false") {
    return { ok: false, skipped: true };
  }

  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: packageRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      windowsHide: true,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, skipped: false });
        return;
      }

      resolve({
        ok: false,
        skipped: false,
        error: stderr.trim() || `qmd sync exited with code ${code}`,
      });
    });
  });
}

async function refreshQmdMirror() {
  return await runSyncScript(qmdSyncScript, "EXPERIENCE_QMD_SYNC");
}

async function runQmdUpdate() {
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [qmdTsxCli, qmdSourceCli, "update"], {
      cwd: qmdRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      windowsHide: true,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, skipped: false });
        return;
      }

      resolve({
        ok: false,
        skipped: false,
        error: stderr.trim() || `qmd update exited with code ${code}`,
      });
    });
  });
}

async function refreshQmdMirrorAndIndex() {
  if (!config.qmd.refreshOnWrite) {
    return {
      qmdMirror: { ok: true, skipped: true, reason: "EXPERIENCE_QMD_REFRESH_ON_WRITE=false" },
      qmdIndex: { ok: true, skipped: true, reason: "EXPERIENCE_QMD_REFRESH_ON_WRITE=false" },
    };
  }

  const qmdMirror = await refreshQmdMirror();
  if (!qmdMirror.ok || qmdMirror.skipped) {
    return {
      qmdMirror,
      qmdIndex: { ok: false, skipped: true },
    };
  }

  const qmdIndex = await runQmdUpdate();
  return {
    qmdMirror,
    qmdIndex,
  };
}

async function readJsonFileIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function asText(value) {
  return [{ type: "text", text: value }];
}

async function main() {
  const server = new McpServer({
    name: "experience-manager",
    version: "1.0.0",
  });

  server.tool("cloud_health", {}, async () => {
    const health = await checkDatabaseHealth();
    return { content: asText(JSON.stringify(health, null, 2)) };
  });

  server.tool(
    "memory_status",
    {},
    async () => {
      const qmdStore = await getQmdStore();
      const pool = await getPool();
      const [dbPing, qmdStatus, distilledManifest] = await Promise.allSettled([
        pool.query("SELECT 1 AS ping"),
        qmdStore.getStatus(),
        readJsonFileIfExists(QMD_EXPERIENCE_DISTILLED_MANIFEST),
      ]);

      const status = {
        entrypoint: EXPERIENCE_MCP_LABEL,
        cloud: {
          ok: dbPing.status === "fulfilled",
          target: `${config.database.host}:${config.database.port}/${config.database.database}`,
          error: dbPing.status === "rejected" ? String(dbPing.reason?.message || dbPing.reason) : null,
        },
        qmd: {
          ok: qmdStatus.status === "fulfilled",
          collection: QMD_EXPERIENCE_COLLECTION,
          error: qmdStatus.status === "rejected" ? String(qmdStatus.reason?.message || qmdStatus.reason) : null,
          value: qmdStatus.status === "fulfilled" ? qmdStatus.value : null,
        },
        mirrors: {
          qmdCollection: QMD_EXPERIENCE_COLLECTION_DIR,
          distilledManifest: distilledManifest.status === "fulfilled" ? distilledManifest.value : null,
        },
      };

      return { content: asText(JSON.stringify(status, null, 2)) };
    }
  );

  server.tool(
    "list_experiences",
    {
      limit: z.number().int().min(1).max(200).optional().default(50),
    },
    async ({ limit }) => {
      const records = await listExperiences(limit);
      return { content: asText(JSON.stringify(records, null, 2)) };
    }
  );

  server.tool(
    "search_experiences",
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional().default(10),
    },
    async ({ query, limit }) => {
      const records = await searchExperiences(query, limit);
      return { content: asText(JSON.stringify(records, null, 2)) };
    }
  );

  server.tool(
    "memory_recall",
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(20).optional().default(8),
      rerank: z.boolean().optional().default(false),
    },
    async ({ query, limit, rerank }) => {
      const qmdStore = await getQmdStore();
      const status = await qmdStore.getStatus().catch(() => null);
      const hasMirrorIndex = Number(status?.totalDocuments || 0) > 0;

      if (!hasMirrorIndex) {
        const fallback = await searchExperienceFallback(query, limit);
        return { content: asText(JSON.stringify(fallback, null, 2)) };
      }

      let result;
      try {
        result = await searchExperienceMirror(query, limit, rerank);
      } catch (error) {
        result = {
          error: "qmd_recall_failed",
          message: String(error?.message || error),
        };
      }

      if (!result || result.error || !Array.isArray(result.results) || result.results.length === 0) {
        result = await searchExperienceFallback(query, limit);
      }

      return { content: asText(JSON.stringify(result, null, 2)) };
    }
  );

  server.tool(
    "memory_get",
    {
      pathOrDocid: z.string().min(1),
      fromLine: z.number().int().min(1).optional(),
      maxLines: z.number().int().min(1).max(500).optional(),
    },
    async ({ pathOrDocid, fromLine, maxLines }) => {
      const result = await getExperienceMirrorDocument(pathOrDocid, fromLine, maxLines);
      return { content: asText(JSON.stringify(result, null, 2)) };
    }
  );

  server.tool(
    "get_experience",
    {
      id: z.string().min(1),
    },
    async ({ id }) => {
      const record = await getExperienceById(id);
      return { content: asText(record ? JSON.stringify(record, null, 2) : `No experience found for id ${id}`) };
    }
  );

  server.tool(
    "record_experience",
    {
      title: z.string().min(1),
      type: z.enum(["problem_solving", "feature_dev", "bug_fix", "optimization", "learning", "refactoring"]).optional().default("learning"),
      description: z.string().optional().default(""),
      userQuery: z.string().optional().default(""),
      solution: z.string().optional().default(""),
      experienceApplied: z.array(z.string()).optional().default([]),
      experienceGained: z.array(z.string()).optional().default([]),
      tags: z.array(z.string()).optional().default([]),
      difficulty: z.number().int().min(1).max(5).optional().default(1),
      xpGained: z.number().int().min(0).optional().default(0),
      summary: z.string().optional().default(""),
      rootCause: z.string().optional().default(""),
      verification: z.array(z.string()).optional().default([]),
      source: z.object({}).passthrough().optional().default({}),
      cloud: z.object({}).passthrough().optional().default({}),
    },
    async (input) => {
      const record = {
        ...input,
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        timestamp: Date.now(),
      };
      const saved = await upsertExperience(record);
      const mirror = await refreshQmdMirrorAndIndex();
      if (!mirror.qmdMirror.ok && !mirror.qmdMirror.skipped) {
        console.warn("[experience-manager-mcp] qmd mirror refresh failed:", mirror.qmdMirror.error);
      }
      if (!mirror.qmdIndex.ok && !mirror.qmdIndex.skipped) {
        console.warn("[experience-manager-mcp] qmd index update failed:", mirror.qmdIndex.error);
      }
      return { content: asText(JSON.stringify(saved, null, 2)) };
    }
  );

  server.tool(
    "refresh_mirrors",
    {},
    async () => {
      const qmd = await refreshQmdMirrorAndIndex();
      return {
        content: asText(JSON.stringify({
          qmd,
        }, null, 2)),
      };
    }
  );

  server.tool(
    "delete_experience",
    {
      id: z.string().min(1),
    },
    async ({ id }) => {
      await ensureExperienceTable();
      const pool = await getPool();
      const [result] = await pool.execute(`DELETE FROM ${EXPERIENCE_TABLE} WHERE id = ?`, [id]);
      const affected = result?.affectedRows || 0;
      return { content: asText(affected > 0 ? `Deleted experience ${id}` : `No experience found for id ${id}`) };
    }
  );

  server.tool(
    "list_notes",
    {
      limit: z.number().int().min(1).max(200).optional().default(50),
    },
    async ({ limit }) => {
      const notes = await listNotes(limit);
      return { content: asText(JSON.stringify(notes, null, 2)) };
    }
  );

  server.tool(
    "search_notes",
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional().default(10),
    },
    async ({ query, limit }) => {
      const notes = await searchNotes(query, limit);
      return { content: asText(JSON.stringify(notes, null, 2)) };
    }
  );

  server.tool(
    "get_note",
    {
      id: z.string().min(1),
    },
    async ({ id }) => {
      const note = await getNoteById(id);
      return { content: asText(note ? JSON.stringify(note, null, 2) : `No note found for id ${id}`) };
    }
  );

  server.tool(
    "record_note",
    {
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string().optional().default("general"),
      tags: z.array(z.string()).optional().default([]),
      summary: z.string().optional().default(""),
      sections: z.object({}).passthrough().optional().default({}),
      relatedExperienceIds: z.array(z.string()).optional().default([]),
      cloud: z.object({}).passthrough().optional().default({}),
    },
    async (input) => {
      const now = new Date().toISOString();
      const note = {
        ...input,
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        created_at: now,
        updated_at: now,
      };
      const saved = await upsertNote(note);
      const qmd = await refreshQmdMirrorAndIndex();
      if (!qmd.qmdMirror.ok && !qmd.qmdMirror.skipped) {
        console.warn("[experience-manager-mcp] qmd mirror refresh failed:", qmd.qmdMirror.error);
      }
      if (!qmd.qmdIndex.ok && !qmd.qmdIndex.skipped) {
        console.warn("[experience-manager-mcp] qmd index update failed:", qmd.qmdIndex.error);
      }
      return { content: asText(JSON.stringify(saved, null, 2)) };
    }
  );

  server.tool(
    "delete_note",
    {
      id: z.string().min(1),
    },
    async ({ id }) => {
      await ensureNoteTable();
      const pool = await getPool();
      const [result] = await pool.execute(`DELETE FROM ${NOTE_TABLE} WHERE id = ?`, [id]);
      const affected = result?.affectedRows || 0;
      return { content: asText(affected > 0 ? `Deleted note ${id}` : `No note found for id ${id}`) };
    }
  );

  server.tool(
    "plugin_overview",
    {},
    async () => {
      const summary = {
        ...publicConfig(),
        tables: [EXPERIENCE_TABLE, NOTE_TABLE],
        capabilities: [
          "cloud database backed experience records",
          "note CRUD",
          "search",
          "memory recall through qmd mirror",
          "mirror refresh orchestration",
          "direct Codex MCP access",
          "closed-loop external write support",
        ],
      };
      return { content: asText(JSON.stringify(summary, null, 2)) };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[experience-manager-mcp] fatal error:", error);
  process.exitCode = 1;
});
