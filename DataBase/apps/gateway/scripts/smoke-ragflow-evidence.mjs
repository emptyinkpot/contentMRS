import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkRagflowReadiness } from "../src/ragflow-readiness.ts";

const args = parseArgs(process.argv.slice(2));

if (args.envFile) {
  loadEnvFile(args.envFile);
}

const config = {
  baseUrl: requireEnv("DATABASE_EVIDENCE_RAGFLOW_URL"),
  apiKey: requireEnv("DATABASE_EVIDENCE_RAGFLOW_API_KEY"),
  datasetIds: listEnv("DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS"),
  documentIds: listEnv("DATABASE_EVIDENCE_RAGFLOW_DOCUMENT_IDS"),
  similarityThreshold: numberEnv("DATABASE_EVIDENCE_RAGFLOW_SIMILARITY_THRESHOLD", 0.2),
  vectorSimilarityWeight: numberEnv("DATABASE_EVIDENCE_RAGFLOW_VECTOR_WEIGHT", 0.3),
  topK: numberEnv("DATABASE_EVIDENCE_RAGFLOW_TOP_K", 1024),
  useKg: booleanEnv("DATABASE_EVIDENCE_RAGFLOW_USE_KG", false),
  tocEnhance: booleanEnv("DATABASE_EVIDENCE_RAGFLOW_TOC_ENHANCE", false),
};

const report = await checkRagflowReadiness({
  config,
  query: String(args.query || process.env.DATABASE_EVIDENCE_RAGFLOW_SMOKE_QUERY || "新地主阶级 通道租").trim(),
  limit: clampNumber(args.limit || process.env.DATABASE_EVIDENCE_RAGFLOW_SMOKE_LIMIT, 10, 1, 50),
  timeoutMs: clampNumber(args.timeoutMs || process.env.DATABASE_EVIDENCE_RAGFLOW_TIMEOUT_MS, 30000, 1000, 120000),
  requireRetrievalChunks: true,
});

if (!report.ok) {
  // smoke 是完成门禁，失败时输出结构化状态，方便直接定位卡在配置、HTTP、dataset、embedding 还是 retrieval。
  console.error(JSON.stringify(report, null, 2));
  throw new Error(report.message);
}

const out = {
  ...report,
  config: {
    vectorSimilarityWeight: config.vectorSimilarityWeight,
    similarityThreshold: config.similarityThreshold,
    datasetIds: config.datasetIds,
  },
};
console.log(JSON.stringify(out, null, 2));

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

function numberEnv(name, fallback) {
  return clampNumber(process.env[name], fallback, 0, Number.MAX_SAFE_INTEGER);
}

function booleanEnv(name, fallback) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
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
