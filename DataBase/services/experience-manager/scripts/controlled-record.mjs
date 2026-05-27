import fs from "node:fs/promises";
import crypto from "node:crypto";

import { config, getMissingDatabaseConfig } from "../lib/config.mjs";
import { getPool, closePools } from "../lib/db.mjs";

const allowedTypes = new Set(["experience", "note"]);

function parseArgs(argv) {
  const parsed = {
    type: "",
    input: "",
    commit: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--type") {
      parsed.type = next || "";
      index += 1;
    } else if (arg === "--input") {
      parsed.input = next || "";
      index += 1;
    } else if (arg === "--commit") {
      parsed.commit = true;
    }
  }

  return parsed;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  return String(value)
    .split(/[,|\n]+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function slugPart(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "memory";
}

function stableId(prefix, payload) {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 12);
  return `${prefix}_${slugPart(payload.title)}_${hash}`;
}

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function mysqlDatetime(value = Date.now()) {
  const date = new Date(value);
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  return valid.toISOString().slice(0, 19).replace("T", " ");
}

function buildExperience(input) {
  const title = normalizeText(input.title);
  const summary = normalizeText(input.summary || input.description || input.solution || title);
  const record = {
    id: normalizeText(input.id),
    timestamp: Number(input.timestamp) || Date.now(),
    type: normalizeText(input.type || "learning"),
    title,
    difficulty: Number(input.difficulty) || 1,
    xpGained: Number(input.xpGained ?? input.xp_gained) || 0,
    description: normalizeText(input.description || summary),
    userQuery: normalizeText(input.userQuery || input.user_query || ""),
    solution: normalizeText(input.solution || ""),
    experienceApplied: normalizeList(input.experienceApplied || input.experience_applied),
    experienceGained: normalizeList(input.experienceGained || input.experience_gained),
    tags: normalizeList(input.tags),
    summary,
    rootCause: normalizeText(input.rootCause || input.root_cause || ""),
    verification: normalizeList(input.verification),
    source: input.source && typeof input.source === "object" ? input.source : {},
    cloud: input.cloud && typeof input.cloud === "object" ? input.cloud : {},
  };
  if (!record.id) record.id = stableId("exp", record);
  return record;
}

function buildNote(input) {
  const title = normalizeText(input.title);
  const content = normalizeText(input.content);
  const note = {
    id: normalizeText(input.id),
    title,
    content,
    category: normalizeText(input.category || "general"),
    tags: normalizeList(input.tags),
    summary: normalizeText(input.summary || content.slice(0, 220)),
    sections: input.sections && typeof input.sections === "object" ? input.sections : {},
    relatedExperienceIds: normalizeList(input.relatedExperienceIds || input.related_experience_ids),
    cloud: input.cloud && typeof input.cloud === "object" ? input.cloud : {},
    createdAt: input.createdAt || input.created_at || Date.now(),
    updatedAt: input.updatedAt || input.updated_at || Date.now(),
  };
  if (!note.id) note.id = stableId("note", note);
  return note;
}

function validateRecord(type, record) {
  const errors = [];
  if (!record.title) errors.push("title is required");
  if (type === "note" && !record.content) errors.push("content is required for note");
  if (type === "experience" && !record.summary) errors.push("summary or description is required for experience");
  return errors;
}

async function findDuplicate(type, record) {
  const pool = await getPool();
  if (type === "experience") {
    const [rows] = await pool.execute(
      `SELECT id, title, updated_at FROM ${config.tables.experiences} WHERE id = ? OR title = ? LIMIT 5`,
      [record.id, record.title]
    );
    return rows;
  }

  const [rows] = await pool.execute(
    `SELECT id, title, updated_at FROM ${config.tables.notes} WHERE id = ? OR title = ? LIMIT 5`,
    [record.id, record.title]
  );
  return rows;
}

async function insertExperience(record) {
  const pool = await getPool();
  const createdAt = mysqlDatetime(record.timestamp);
  await pool.execute(
    `INSERT INTO ${config.tables.experiences}
      (id, timestamp, type, title, difficulty, xp_gained, description, user_query, solution,
       experience_applied, experience_gained, tags_text, summary, root_cause, verification,
       source_text, cloud_text, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.timestamp,
      record.type,
      record.title,
      record.difficulty,
      record.xpGained,
      record.description,
      record.userQuery,
      record.solution,
      toJson(record.experienceApplied),
      toJson(record.experienceGained),
      toJson(record.tags),
      record.summary,
      record.rootCause || null,
      toJson(record.verification),
      toJson(record.source),
      toJson(record.cloud),
      toJson(record),
      createdAt,
      createdAt,
    ]
  );
}

async function insertNote(record) {
  const pool = await getPool();
  const createdAt = mysqlDatetime(record.createdAt);
  const updatedAt = mysqlDatetime(record.updatedAt);
  await pool.execute(
    `INSERT INTO ${config.tables.notes}
      (id, title, category, tags_text, summary, sections_text, related_experience_ids,
       cloud_text, payload, created_at, updated_at, content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.title,
      record.category,
      toJson(record.tags),
      record.summary || null,
      toJson(record.sections),
      toJson(record.relatedExperienceIds),
      toJson(record.cloud),
      toJson(record),
      createdAt,
      updatedAt,
      record.content,
    ]
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!allowedTypes.has(options.type)) {
    throw new Error("Usage: controlled-record.mjs --type <experience|note> --input <json-file> [--commit]");
  }
  if (!options.input) throw new Error("--input is required");

  const input = JSON.parse(await fs.readFile(options.input, "utf8"));
  const record = options.type === "experience" ? buildExperience(input) : buildNote(input);
  const errors = validateRecord(options.type, record);
  const missingDb = getMissingDatabaseConfig();
  if (options.commit && missingDb.length > 0) {
    errors.push(`commit requires database env: ${missingDb.join(", ")}`);
  }
  const canCheckDuplicates = missingDb.length === 0;
  const duplicates = errors.length === 0 && canCheckDuplicates ? await findDuplicate(options.type, record) : [];
  const writeEnabled = process.env.EXPERIENCE_MEMORY_WRITE_ENABLED === "true";
  const canWrite = options.commit && writeEnabled && errors.length === 0 && duplicates.length === 0;

  if (canWrite) {
    if (options.type === "experience") {
      await insertExperience(record);
    } else {
      await insertNote(record);
    }
  }

  const result = {
    ok: errors.length === 0,
    type: options.type,
    mode: canWrite ? "committed" : "dry-run",
    commitRequested: options.commit,
    writeEnabled,
    id: record.id,
    duplicateCount: duplicates.length,
    duplicateCheck: canCheckDuplicates ? "checked" : "skipped-missing-db-env",
    duplicates,
    errors,
    record,
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePools();
  });
