import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const LOG_PATH = resolve(__dirname, "index-literature-ragflow.log");

let logFd;
function out(msg) {
  const line = msg + "\n";
  process.stdout.write(line);
  logFd += line;
}

function chunkText(text) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = "";
  for (const raw of paragraphs) {
    const para = raw.trim();
    if (!para) continue;
    if (current.length + para.length + 1 <= CHUNK_SIZE) {
      current = current ? current + "\n" + para : para;
    } else {
      if (current) chunks.push(current);
      if (para.length > CHUNK_SIZE) {
        for (let i = 0; i < para.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
          chunks.push(para.slice(i, i + CHUNK_SIZE));
        }
        current = "";
      } else {
        current = para;
      }
    }
  }
  if (current && current.length > 50) chunks.push(current);
  return chunks;
}

async function ragflow(method, path, data, timeout = 30000) {
  const config = readRagflowConfig();
  const url = `${config.baseUrl}${path}`;
  const opts = {
    method,
    headers: { "Authorization": `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeout),
  };
  if (data) opts.body = JSON.stringify(data);
  const r = await fetch(url, opts);
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: `HTTP ${r.status}`, body: text.slice(0, 200) }; }
}

async function readMysqlConfig() {
  const cnfPath = resolve(process.env.USERPROFILE || process.env.HOME || "", ".codex-secrets", "mysql", "myblog.cnf");
  const content = await readFile(cnfPath, "utf8");
  const config = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";") || trimmed.startsWith("[")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    config[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { host: config.host, port: Number(config.port || 3306), user: config.user, password: config.password, database: config.database, charset: "utf8mb4" };
}

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch {}
}

function loadRuntimeEnv() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (home) {
    loadEnvFile(resolve(home, ".codex-secrets", "database-gateway", "database_gateway.env"));
  }
}

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function readRagflowConfig() {
  const datasetIds = String(
    process.env.DATABASE_LITERARY_RAGFLOW_DATASET_IDS ||
      process.env.DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS ||
      ""
  ).split(",").map((item) => item.trim()).filter(Boolean);
  if (!datasetIds.length) {
    throw new Error("DATABASE_LITERARY_RAGFLOW_DATASET_IDS or DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS is required");
  }
  return {
    baseUrl: requireEnv("DATABASE_EVIDENCE_RAGFLOW_URL").replace(/\/+$/, ""),
    apiKey: requireEnv("DATABASE_EVIDENCE_RAGFLOW_API_KEY"),
    datasetId: datasetIds[0],
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  loadRuntimeEnv();
  const ragflowConfig = readRagflowConfig();
  logFd = "";
  out(`[index] Start apply=${apply} ${new Date().toLocaleTimeString()}`);

  // Test RAGFlow
  const test = await ragflow("GET", "/api/v1/datasets");
  if (test.error) { out(`[index] FATAL RAGFlow: ${test.error}`); process.exit(1); }
  out(`[index] RAGFlow OK, ${(test.data || []).length} datasets`);

  // Read literature from MySQL
  const pool = mysql.createPool({ ...await readMysqlConfig(), waitForConnections: true, connectionLimit: 2 });
  const [rows] = await pool.execute("SELECT id, title, author, category, content FROM literature WHERE CHAR_LENGTH(content) > 500 ORDER BY CHAR_LENGTH(content) DESC");
  out(`[index] ${rows.length} literature items with >500 chars`);

  let success = 0, fail = 0, totalChunks = 0;

  for (const row of rows) {
    const short = row.title.slice(0, 40);
    const content = row.content || "";
    if (content.length < 500) continue;

    const chunks = chunkText(content);
    totalChunks += chunks.length;
    out(`  CHUNK ${short} — ${content.length} chars → ${chunks.length} chunks`);

    if (!apply) { success++; continue; }

    // Upload as .txt file via multipart/form-data
    const docName = `lit_${row.id}_${row.title.replace(/[^\w一-鿿]/g, "_").slice(0, 60)}.txt`;
    const formData = new FormData();
    formData.append("file", new Blob([content], { type: "text/plain" }), docName);

    try {
      const uploadResp = await fetch(`${ragflowConfig.baseUrl}/api/v1/datasets/${ragflowConfig.datasetId}/documents`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${ragflowConfig.apiKey}` },
        body: formData,
        signal: AbortSignal.timeout(120000),
      });
      const uploadJson = await uploadResp.json();
      if (uploadJson.code !== 0 && uploadJson.code !== 200) {
        out(`  FAIL  ${short} — upload: ${JSON.stringify(uploadJson).slice(0, 120)}`);
        fail++;
      } else {
        out(`  OK    ${short} — uploaded, RAGFlow will auto-parse`);
        success++;
      }
    } catch (e) {
      out(`  FAIL  ${short} — ${e.message}`);
      fail++;
    }
  }

  out(`\n[index] Done. success=${success} fail=${fail} totalChunks=${totalChunks}`);
  if (!apply) out("[index] Dry run. Use --apply to upload.");
  writeFileSync(LOG_PATH, logFd, "utf8");
  await pool.end();
}

main().catch(e => { console.error("[index] Fatal:", e.message); process.exit(1); });
