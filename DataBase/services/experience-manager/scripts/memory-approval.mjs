import fs from "node:fs/promises";
import crypto from "node:crypto";

import { getPool, closePools } from "../lib/db.mjs";

const TABLE = process.env.EXPERIENCE_MEMORY_APPROVAL_TABLE || "memory_write_candidates";
const allowedTypes = new Set(["experience", "note"]);
const allowedStatuses = new Set(["pending", "approved", "rejected", "superseded"]);

function parseArgs(argv) {
  const parsed = {
    command: argv[0] || "",
    type: "",
    input: "",
    candidateId: "",
    status: "",
    reviewer: "",
    reason: "",
    limit: 20,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--type") {
      parsed.type = next || "";
      index += 1;
    } else if (arg === "--input") {
      parsed.input = next || "";
      index += 1;
    } else if (arg === "--candidate-id") {
      parsed.candidateId = next || "";
      index += 1;
    } else if (arg === "--status") {
      parsed.status = next || "";
      index += 1;
    } else if (arg === "--reviewer") {
      parsed.reviewer = next || "";
      index += 1;
    } else if (arg === "--reason") {
      parsed.reason = next || "";
      index += 1;
    } else if (arg === "--limit") {
      parsed.limit = Number.parseInt(next || "20", 10);
      index += 1;
    }
  }

  return parsed;
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  return String(value).split(/[,|\n]+/).map((item) => normalizeText(item)).filter(Boolean);
}

function canonicalPayload(type, input) {
  const base = {
    type,
    title: normalizeText(input.title),
    summary: normalizeText(input.summary || input.description || input.content || ""),
    tags: normalizeList(input.tags),
    source: input.source && typeof input.source === "object" ? input.source : {},
  };

  if (type === "experience") {
    return {
      ...base,
      description: normalizeText(input.description || ""),
      userQuery: normalizeText(input.userQuery || input.user_query || ""),
      solution: normalizeText(input.solution || ""),
      verification: normalizeList(input.verification),
    };
  }

  return {
    ...base,
    content: normalizeText(input.content || ""),
    category: normalizeText(input.category || "general"),
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function candidateId(type, payloadHash) {
  return `memcand_${type}_${payloadHash.slice(0, 16)}`;
}

function validateCandidate(type, payload) {
  const errors = [];
  if (!allowedTypes.has(type)) errors.push("type must be experience or note");
  if (!payload.title) errors.push("title is required");
  if (!payload.summary || payload.summary.length < 12) errors.push("summary must be at least 12 characters");
  if (type === "note" && !payload.content) errors.push("note content is required");
  if (type === "experience" && !payload.description && !payload.solution) {
    errors.push("experience requires description or solution");
  }
  return errors;
}

async function ensureTable() {
  const pool = await getPool();
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        candidate_id varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
        memory_type varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
        status varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
        title varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        payload_hash char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
        payload_json longtext COLLATE utf8mb4_unicode_ci NOT NULL,
        quality_errors longtext COLLATE utf8mb4_unicode_ci NOT NULL,
        duplicate_of varchar(96) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        submitted_by varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        submitted_from varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        reviewer varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        review_reason longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT current_timestamp(),
        updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        reviewed_at timestamp NULL DEFAULT NULL,
        PRIMARY KEY (candidate_id),
        UNIQUE KEY uq_memory_write_candidates_payload_hash (payload_hash),
        KEY idx_memory_write_candidates_status (status),
        KEY idx_memory_write_candidates_type (memory_type),
        KEY idx_memory_write_candidates_title (title)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (error) {
    if (error?.code !== "ER_TABLEACCESS_DENIED_ERROR") {
      throw error;
    }
  }
}

async function findExistingCandidate(payloadHash, title) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    `SELECT candidate_id, status, title, payload_hash, created_at, updated_at
     FROM ${TABLE}
     WHERE payload_hash = ? OR title = ?
     ORDER BY updated_at DESC
     LIMIT 5`,
    [payloadHash, title]
  );
  return rows;
}

async function submitCandidate(type, input) {
  await ensureTable();
  const payload = canonicalPayload(type, input);
  const qualityErrors = validateCandidate(type, payload);
  const payloadJson = JSON.stringify(payload);
  const payloadHash = sha256(payloadJson);
  const id = candidateId(type, payloadHash);
  const duplicates = await findExistingCandidate(payloadHash, payload.title);
  const duplicateOf = duplicates[0]?.candidate_id || null;
  const status = qualityErrors.length > 0 ? "rejected" : "pending";

  const pool = await getPool();
  await pool.execute(
    `INSERT INTO ${TABLE}
      (candidate_id, memory_type, status, title, payload_hash, payload_json, quality_errors,
       duplicate_of, submitted_by, submitted_from)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       updated_at = CURRENT_TIMESTAMP`,
    [
      id,
      type,
      status,
      payload.title,
      payloadHash,
      payloadJson,
      JSON.stringify(qualityErrors),
      duplicateOf,
      process.env.MEMORY_SUBMITTED_BY || process.env.USER || process.env.USERNAME || "unknown",
      process.env.MEMORY_SUBMITTED_FROM || process.cwd(),
    ]
  );

  return {
    ok: qualityErrors.length === 0,
    candidateId: id,
    status,
    duplicateCount: duplicates.length,
    duplicateOf,
    qualityErrors,
    payload,
  };
}

async function listCandidates(status, limit) {
  await ensureTable();
  const pool = await getPool();
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 20));
  if (status) {
    const [rows] = await pool.query(
      `SELECT candidate_id, memory_type, status, title, payload_hash, duplicate_of, submitted_by, reviewer, created_at, updated_at, reviewed_at
       FROM ${TABLE}
       WHERE status = ?
       ORDER BY updated_at DESC
       LIMIT ${safeLimit}`,
      [status]
    );
    return rows;
  }

  const [rows] = await pool.query(
    `SELECT candidate_id, memory_type, status, title, payload_hash, duplicate_of, submitted_by, reviewer, created_at, updated_at, reviewed_at
     FROM ${TABLE}
     ORDER BY updated_at DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

async function reviewCandidate(candidateIdValue, status, reviewer, reason) {
  await ensureTable();
  if (!allowedStatuses.has(status) || status === "pending") {
    throw new Error("--status must be approved, rejected, or superseded");
  }
  if (!candidateIdValue) throw new Error("--candidate-id is required");

  const pool = await getPool();
  const [result] = await pool.execute(
    `UPDATE ${TABLE}
     SET status = ?, reviewer = ?, review_reason = ?, reviewed_at = CURRENT_TIMESTAMP
     WHERE candidate_id = ?`,
    [status, reviewer || "operator", reason || "", candidateIdValue]
  );

  return {
    ok: result.affectedRows === 1,
    candidateId: candidateIdValue,
    status,
    affectedRows: result.affectedRows || 0,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.command === "submit") {
    if (!allowedTypes.has(options.type)) throw new Error("submit requires --type <experience|note>");
    if (!options.input) throw new Error("submit requires --input <json-file>");
    const input = JSON.parse(await fs.readFile(options.input, "utf8"));
    console.log(JSON.stringify(await submitCandidate(options.type, input), null, 2));
    return;
  }

  if (options.command === "list") {
    console.log(JSON.stringify(await listCandidates(options.status, options.limit), null, 2));
    return;
  }

  if (options.command === "review") {
    console.log(JSON.stringify(await reviewCandidate(options.candidateId, options.status, options.reviewer, options.reason), null, 2));
    return;
  }

  throw new Error("Usage: memory-approval.mjs <submit|list|review> [options]");
}

main()
  .catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePools();
  });
