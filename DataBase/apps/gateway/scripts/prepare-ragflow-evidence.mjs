import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = parseArgs(process.argv.slice(2));
if (args.envFile) {
  loadEnvFile(args.envFile);
}

const config = {
  baseUrl: requireEnv("DATABASE_EVIDENCE_RAGFLOW_URL"),
  apiKey: requireEnv("DATABASE_EVIDENCE_RAGFLOW_API_KEY"),
  datasetIds: listEnv("DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS"),
};

const datasetId = args.datasetId || config.datasetIds[0];
if (!datasetId) {
  throw new Error("DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS is required");
}

const embeddingModel = String(args.embeddingModel || process.env.DATABASE_EVIDENCE_RAGFLOW_EMBEDDING_MODEL || "").trim();
if (!embeddingModel) {
  throw new Error("DATABASE_EVIDENCE_RAGFLOW_EMBEDDING_MODEL or --embeddingModel is required. Do not rely on RAGFlow Builtin embedding unless TEI is deliberately enabled.");
}
const filePath = resolve(__dirname, "../fixtures/ragflow-smoke-source.txt");
const fileName = args.fileName || "ragflow-smoke-source.txt";
const query = String(args.query || "新地主阶级 通道租").trim();
const timeoutMs = clampNumber(args.timeoutMs || process.env.DATABASE_EVIDENCE_RAGFLOW_TIMEOUT_MS, 60000, 1000, 300000);

const report = {
  datasetId,
  embeddingModel,
  fileName,
  uploaded: false,
  documentIds: [],
  parsed: false,
  embeddingRequested: false,
  ready: false,
};

await ensureDatasetEmbedding();
const documentIds = await ensureSmokeDocument();
if (documentIds.length === 0) {
  throw new Error("Failed to prepare smoke document for RAGFlow evidence.");
}
report.documentIds = documentIds;

await parseDocuments(documentIds);
await waitForDocumentsDone(documentIds, timeoutMs);
report.parsed = true;

await requestRagflow({
  path: `/api/v1/datasets/${datasetId}/embedding`,
  method: "POST",
});
report.embeddingRequested = true;

await waitForEvidenceReady(timeoutMs);
report.ready = true;

console.log(JSON.stringify(report, null, 2));

async function ensureDatasetEmbedding() {
  const dataset = await requestRagflow({
    path: `/api/v1/datasets/${datasetId}`,
  });
  const current = String(dataset?.data?.embedding_model || "").trim();
  if (current === embeddingModel) {
    return;
  }
  await requestRagflow({
    path: `/api/v1/datasets/${datasetId}`,
    method: "PUT",
    body: { embedding_model: embeddingModel },
  });
}

async function ensureSmokeDocument() {
  const documents = await listDocuments();
  const existing = documents.filter((item) => String(item.name || item.document_name || "") === fileName);
  if (existing.length > 0) {
    const failed = existing.filter((item) => String(item.run || "").toUpperCase() === "FAIL");
    if (failed.length > 0) {
      // 只清理本脚本固定 smoke 文件的失败文档，避免旧失败状态遮蔽新的 provider 修复结果。
      await deleteDocuments(failed.map((item) => String(item.id)).filter(Boolean));
      return uploadSmokeDocument();
    }
    return existing.map((item) => String(item.id)).filter(Boolean);
  }

  return uploadSmokeDocument();
}

async function uploadSmokeDocument() {
  const file = new File([readFileSync(filePath)], fileName, { type: "text/plain" });
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${config.baseUrl}/api/v1/datasets/${datasetId}/documents`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.apiKey}` },
    body: form,
  });
  const payload = await readJsonResponse(response, `/api/v1/datasets/${datasetId}/documents`);
  const docs = Array.isArray(payload?.data) ? payload.data : [];
  if (docs.length === 0) {
    return [];
  }
  return docs.map((item) => String(item.id)).filter(Boolean);
}

async function deleteDocuments(documentIds) {
  if (documentIds.length === 0) return;
  await requestRagflow({
    path: `/api/v1/datasets/${datasetId}/documents`,
    method: "DELETE",
    body: { ids: documentIds },
  });
}

async function parseDocuments(documentIds) {
  await requestRagflow({
    path: `/api/v1/datasets/${datasetId}/documents/parse`,
    method: "POST",
    body: { document_ids: documentIds },
  });
}

async function waitForDocumentsDone(documentIds, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const docs = await listDocuments();
    const targetDocs = docs.filter((item) => documentIds.includes(String(item.id)));
    const failedDocs = targetDocs.filter((item) => String(item.run || "").toUpperCase() === "FAIL");
    if (failedDocs.length > 0) {
      const details = failedDocs
        .map((item) => `${item.id}: ${String(item.progress_msg || "RAGFlow document parsing failed").trim()}`)
        .join("\n");
      throw new Error(`RAGFlow document parsing failed.\n${details}`);
    }
    if (targetDocs.length === documentIds.length && targetDocs.every((item) => String(item.run || "").toUpperCase() === "DONE")) {
      return;
    }
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for RAGFlow documents to finish parsing: ${documentIds.join(", ")}`);
}

async function waitForEvidenceReady(timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const dataset = await requestRagflow({
      path: `/api/v1/datasets/${datasetId}`,
    });
    if (Number(dataset?.data?.chunk_count || 0) > 0 && Number(dataset?.data?.document_count || 0) > 0) {
      const retrieval = await requestRagflow({
        path: "/api/v1/retrieval",
        method: "POST",
        body: {
          question: query,
          dataset_ids: [datasetId],
          page: 1,
          page_size: 10,
          similarity_threshold: 0.2,
          vector_similarity_weight: 0.3,
          top_k: 10,
          keyword: true,
          highlight: false,
          use_kg: false,
          toc_enhance: false,
        },
      });
      const chunks = Array.isArray(retrieval?.data?.chunks) ? retrieval.data.chunks : [];
      if (chunks.length > 0 && chunks.some((item) => String(item.content || item.content_ltks || "").trim())) {
        return;
      }
    }
    await sleep(2500);
  }
  throw new Error("Timed out waiting for RAGFlow retrieval to become ready.");
}

async function listDocuments() {
  const payload = await requestRagflow({
    path: `/api/v1/datasets/${datasetId}/documents`,
  });
  const docs = payload?.data?.docs;
  if (!Array.isArray(docs)) {
    return [];
  }
  return docs;
}

async function requestRagflow(input) {
  const response = await fetch(`${config.baseUrl}${input.path}`, {
    method: input.method || "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${config.apiKey}`,
      ...(input.body ? { "content-type": "application/json" } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return readJsonResponse(response, input.path);
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

function loadEnvFile(filePath) {
  const content = readFileSync(resolve(filePath), "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function listEnv(name) {
  return String(process.env[name] || "")
    .split(/[,\s，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = values[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = "true";
    }
  }
  return result;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
