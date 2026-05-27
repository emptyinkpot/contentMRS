import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { loadLocalEnvFiles } from "../dist/load-local-env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

loadLocalEnvFiles();

const config = {
  ragflowUrl: String(args.ragflowUrl || process.env.DATABASE_EVIDENCE_RAGFLOW_URL || "").replace(/\/+$/, ""),
  ragflowApiKey: requireEnv("DATABASE_EVIDENCE_RAGFLOW_API_KEY"),
  embeddingModel: String(args.embeddingModel || process.env.DATABASE_EVIDENCE_RAGFLOW_EMBEDDING_MODEL || "").trim(),
  datasetName: String(args.datasetName || "contentmrs-literary-corpus").trim(),
  outputDir: resolve(String(args.outputDir || join(__dirname, "../.runtime/ragflow-literary-corpus"))),
  partChars: clampNumber(args.partChars, 2_000_000, 200_000, 20_000_000),
  uploadBatch: clampNumber(args.uploadBatch, 8, 1, 32),
  parseBatch: clampNumber(args.parseBatch, 12, 1, 64),
  timeoutMs: clampNumber(args.timeoutMs, 60_000, 5_000, 600_000),
  waitTimeoutMs: clampNumber(args.waitTimeoutMs, 3_600_000, 30_000, 24 * 60 * 60 * 1000),
  limitDocuments: clampNumber(args.limitDocuments, 0, 0, 10_000),
  verifyQuery: String(args.verifyQuery || "伊朗 封锁 海峡").trim(),
  dryRun: Boolean(args.dryRun),
  skipExport: Boolean(args.skipExport),
  skipUpload: Boolean(args.skipUpload),
  skipParse: Boolean(args.skipParse),
  resumeDataset: Boolean(args.resumeDataset),
};

if (!config.ragflowUrl) {
  throw new Error("DATABASE_EVIDENCE_RAGFLOW_URL or --ragflowUrl is required");
}
if (!config.embeddingModel) {
  throw new Error("DATABASE_EVIDENCE_RAGFLOW_EMBEDDING_MODEL or --embeddingModel is required");
}

const report = {
  datasetName: config.datasetName,
  datasetId: null,
  outputDir: config.outputDir,
  exportedFiles: 0,
  uploadedFiles: 0,
  reusedDocuments: 0,
  parsedDocuments: 0,
  readyDocuments: 0,
  retrievalChunks: 0,
};

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "124.220.245.121",
  port: Number(process.env.MYSQL_PORT || 22295),
  database: process.env.MYSQL_DATABASE || "cloudbase-4glvyyq9f61b19cd",
  user: process.env.MYSQL_USER || process.env.DATABASE_READONLY_USER,
  password: process.env.MYSQL_PASSWORD || process.env.DATABASE_READONLY_PASSWORD,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 10,
});

try {
  const dataset = await ensureDataset();
  report.datasetId = dataset.id;

  const files = config.skipExport
    ? listExistingExportFiles(config.outputDir)
    : await exportLiteraryCorpus();
  report.exportedFiles = files.length;

  if (!config.skipUpload) {
    if (config.dryRun) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    }
    const documentIds = await ensureUploadedDocuments(dataset.id, files);
    if (!config.skipParse) {
      await parseAndWait(dataset.id, documentIds);
    }
    await requestEmbedding(dataset.id);
    const chunks = await verifyRetrieval(dataset.id);
    report.retrievalChunks = chunks.length;
  } else if (config.resumeDataset) {
    const documents = await listDocuments(dataset.id);
    const documentIds = documents.map((item) => String(item.id)).filter(Boolean);
    if (!config.skipParse) {
      await parseAndWait(dataset.id, documentIds);
    }
    await requestEmbedding(dataset.id);
    const chunks = await verifyRetrieval(dataset.id);
    report.retrievalChunks = chunks.length;
  }

  console.log(JSON.stringify(report, null, 2));
} finally {
  await pool.end();
}

async function ensureDataset() {
  const datasets = await listDatasets();
  const existing = datasets.find((item) => String(item.name || "").toLowerCase() === config.datasetName.toLowerCase());
  if (existing) {
    await ensureDatasetEmbedding(existing.id);
    return existing;
  }

  if (config.dryRun) {
    return { id: "dry-run", name: config.datasetName };
  }

  const created = await requestRagflow({
    path: "/api/v1/datasets",
    method: "POST",
    body: {
      name: config.datasetName,
      embedding_model: config.embeddingModel,
      chunk_method: "naive",
      permission: "team",
      parser_config: {
        chunk_token_num: 512,
        delimiter: "\n\n",
        layout_recognize: "DeepDOC",
        raptor: { use_raptor: false },
        graphrag: { use_graphrag: false },
      },
    },
  });
  return created.data;
}

async function ensureDatasetEmbedding(datasetId) {
  if (config.dryRun || datasetId === "dry-run") return;
  const dataset = await requestRagflow({ path: `/api/v1/datasets/${datasetId}` });
  const current = String(dataset?.data?.embedding_model || dataset?.data?.embd_id || "").trim();
  if (current === config.embeddingModel) return;
  await requestRagflow({
    path: `/api/v1/datasets/${datasetId}`,
    method: "PUT",
    body: { embedding_model: config.embeddingModel },
  });
}

async function listDatasets() {
  const payload = await requestRagflow({ path: "/api/v1/datasets?page=1&page_size=100" });
  return Array.isArray(payload.data) ? payload.data : [];
}

async function exportLiteraryCorpus() {
  mkdirSync(config.outputDir, { recursive: true });
  const docs = await mysqlQuery(`
    SELECT
      d.id,
      d.source_id,
      d.title,
      COUNT(c.id) AS chunk_count,
      SUM(CHAR_LENGTH(c.chunk_text)) AS char_count
    FROM search_documents d
    JOIN search_chunks c ON c.document_id = d.id
    WHERE d.source_table = 'literary_corpus'
      AND c.privacy_level IN ('public', 'private')
      AND c.index_status IN ('ready', 'indexed')
    GROUP BY d.id, d.source_id, d.title
    ORDER BY chunk_count DESC, d.title ASC
  `);

  const selectedDocs = config.limitDocuments > 0 ? docs.slice(0, config.limitDocuments) : docs;
  const allFiles = [];
  for (const doc of selectedDocs) {
    const files = await exportDocument(doc);
    allFiles.push(...files);
  }
  return allFiles;
}

async function exportDocument(doc) {
  const title = String(doc.title || doc.source_id || doc.id).trim();
  const prefix = `${safeFileName(title)}--${String(doc.id).slice(0, 16)}`;
  const chunks = await mysqlQuery(
    `
    SELECT chunk_index, chunk_text
    FROM search_chunks
    WHERE document_id = ?
      AND privacy_level IN ('public', 'private')
      AND index_status IN ('ready', 'indexed')
    ORDER BY chunk_index ASC, id ASC
    `,
    [doc.id],
  );

  const files = [];
  let part = 1;
  let chars = 0;
  let stream = null;
  let currentPath = "";

  function openPart() {
    currentPath = join(config.outputDir, `${prefix}--part-${String(part).padStart(3, "0")}.txt`);
    stream = createWriteStream(currentPath, { encoding: "utf8" });
    stream.write(`# ${title}\n`);
    stream.write(`source_id: ${doc.source_id || ""}\n`);
    stream.write(`document_id: ${doc.id}\n`);
    stream.write(`part: ${part}\n\n`);
    chars = 0;
  }

  async function closePart() {
    if (!stream) return;
    await new Promise((resolve, reject) => {
      stream.end((error) => (error ? reject(error) : resolve()));
    });
    files.push(currentPath);
    stream = null;
    part += 1;
  }

  openPart();
  for (const row of chunks) {
    const text = String(row.chunk_text || "").trim();
    if (text.length < 20) continue;
    const block = `\n\n[chunk ${row.chunk_index}]\n${text}\n`;
    if (chars > 0 && chars + block.length > config.partChars) {
      await closePart();
      openPart();
    }
    stream.write(block);
    chars += block.length;
  }
  await closePart();
  return files;
}

function listExistingExportFiles(outputDir) {
  if (!existsSync(outputDir)) return [];
  return readDirRecursive(outputDir).filter((item) => item.endsWith(".txt"));
}

async function ensureUploadedDocuments(datasetId, files) {
  const existingDocs = await listDocuments(datasetId);
  const byName = new Map(existingDocs.map((item) => [documentName(item), item]));
  const documentIds = [];
  for (let index = 0; index < files.length; index += config.uploadBatch) {
    const batch = files.slice(index, index + config.uploadBatch);
    for (const filePath of batch) {
      const name = basename(filePath);
      const existing = byName.get(name);
      if (existing?.id) {
        report.reusedDocuments += 1;
        documentIds.push(String(existing.id));
        continue;
      }
      if (config.dryRun) continue;
      const ids = await uploadDocument(datasetId, filePath, name);
      report.uploadedFiles += ids.length;
      documentIds.push(...ids);
    }
    console.error(`uploaded/reused ${Math.min(index + config.uploadBatch, files.length)}/${files.length}`);
  }
  return [...new Set(documentIds)];
}

async function uploadDocument(datasetId, filePath, fileName) {
  const file = new File([readFileSync(filePath)], fileName, { type: "text/plain" });
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${config.ragflowUrl}/api/v1/datasets/${datasetId}/documents`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.ragflowApiKey}`,
    },
    body: form,
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  const payload = await readJsonResponse(response, `/api/v1/datasets/${datasetId}/documents`);
  const docs = Array.isArray(payload?.data) ? payload.data : [];
  return docs.map((item) => String(item.id)).filter(Boolean);
}

async function parseAndWait(datasetId, documentIds) {
  if (documentIds.length === 0 || config.dryRun) return;
  for (let index = 0; index < documentIds.length; index += config.parseBatch) {
    const batch = documentIds.slice(index, index + config.parseBatch);
    const docs = await listDocuments(datasetId);
    const pending = batch.filter((id) => {
      const doc = docs.find((item) => String(item.id) === id);
      const status = String(doc?.run || "").toUpperCase();
      return status === "" || status === "UNSTART";
    });
    if (pending.length > 0) {
      await requestRagflow({
        path: `/api/v1/datasets/${datasetId}/documents/parse`,
        method: "POST",
        body: { document_ids: pending },
      });
      report.parsedDocuments += pending.length;
    }
    await waitForDocumentsDone(datasetId, batch);
    console.error(`parsed ${Math.min(index + config.parseBatch, documentIds.length)}/${documentIds.length}`);
  }
}

async function waitForDocumentsDone(datasetId, documentIds) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < config.waitTimeoutMs) {
    const docs = await listDocuments(datasetId);
    const targetDocs = docs.filter((item) => documentIds.includes(String(item.id)));
    const failedDocs = targetDocs.filter((item) => String(item.run || "").toUpperCase() === "FAIL");
    if (failedDocs.length > 0) {
      const details = failedDocs
        .map((item) => `${documentName(item)}: ${String(item.progress_msg || "failed").trim()}`)
        .join("\n");
      throw new Error(`RAGFlow literary document parsing failed.\n${details}`);
    }
    if (targetDocs.length === documentIds.length && targetDocs.every((item) => String(item.run || "").toUpperCase() === "DONE")) {
      report.readyDocuments += targetDocs.length;
      return;
    }
    await sleep(5000);
  }
  throw new Error(`Timed out waiting for RAGFlow literary documents: ${documentIds.join(", ")}`);
}

async function requestEmbedding(datasetId) {
  if (config.dryRun) return;
  await requestRagflow({
    path: `/api/v1/datasets/${datasetId}/embedding`,
    method: "POST",
  });
}

async function verifyRetrieval(datasetId) {
  if (config.dryRun) return [];
  const payload = await requestRagflow({
    path: "/api/v1/retrieval",
    method: "POST",
    body: {
      question: config.verifyQuery,
      dataset_ids: [datasetId],
      page: 1,
      page_size: 10,
      similarity_threshold: 0.2,
      vector_similarity_weight: 0.35,
      top_k: 64,
      keyword: true,
      highlight: false,
      use_kg: false,
      toc_enhance: false,
    },
  });
  return Array.isArray(payload?.data?.chunks) ? payload.data.chunks : [];
}

async function listDocuments(datasetId) {
  const docs = [];
  for (let page = 1; page <= 1000; page += 1) {
    const payload = await requestRagflow({
      path: `/api/v1/datasets/${datasetId}/documents?page=${page}&page_size=100`,
    });
    const batch = Array.isArray(payload?.data?.docs) ? payload.data.docs : [];
    docs.push(...batch);
    if (batch.length < 100) break;
  }
  return docs;
}

async function requestRagflow(input) {
  const response = await fetch(`${config.ragflowUrl}${input.path}`, {
    method: input.method || "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${config.ragflowApiKey}`,
      ...(input.body ? { "content-type": "application/json" } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  return readJsonResponse(response, input.path);
}

async function mysqlQuery(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    if (!isTransientMysqlConnectionError(error)) throw error;
    await sleep(1000);
    const [rows] = await pool.query(sql, params);
    return rows;
  }
}

function isTransientMysqlConnectionError(error) {
  if (!(error instanceof Error)) return false;
  const code = error.code;
  return code === "ECONNRESET"
    || code === "PROTOCOL_CONNECTION_LOST"
    || code === "PROTOCOL_PACKETS_OUT_OF_ORDER"
    || code === "ER_MALFORMED_PACKET"
    || error.message.includes("Malformed communication packet");
}

async function readJsonResponse(response, path) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = `RAGFlow ${path} returned HTTP ${response.status}.`;
    throw new Error(payload?.message ? `${message} ${payload.message}` : message);
  }
  if (payload?.code !== 0) {
    throw new Error(`RAGFlow ${path} failed: ${String(payload?.message || "unknown error")}.`);
  }
  return payload;
}

function documentName(item) {
  return String(item.name || item.document_name || item.location || "").trim();
}

function safeFileName(value) {
  return String(value || "untitled")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "untitled";
}

function readDirRecursive(root) {
  const entries = [];
  for (const item of readdirSafe(root)) {
    const fullPath = join(root, item.name);
    if (item.isDirectory()) entries.push(...readDirRecursive(fullPath));
    else entries.push(fullPath);
  }
  return entries;
}

function readdirSafe(root) {
  return existsSync(root) ? Array.from(readdirSync(root, { withFileTypes: true })) : [];
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    if (item === "--") continue;
    if (!item.startsWith("--")) continue;
    const rawKey = item.slice(2);
    const eq = rawKey.indexOf("=");
    if (eq >= 0) {
      result[rawKey.slice(0, eq)] = rawKey.slice(eq + 1);
      continue;
    }
    const next = values[index + 1];
    if (next && !next.startsWith("--")) {
      result[rawKey] = next;
      index += 1;
    } else {
      result[rawKey] = true;
    }
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
