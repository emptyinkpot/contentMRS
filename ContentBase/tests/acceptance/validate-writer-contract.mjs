import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function extractFunction(source, name) {
  const asyncMarker = `async function ${name}`;
  const functionMarker = `function ${name}`;
  const marker = source.includes(asyncMarker) ? asyncMarker : functionMarker;
  const start = source.indexOf(marker);
  assert(start >= 0, `missing function ${name}`);
  const braceStart = source.indexOf("{", start);
  assert(braceStart >= 0, `missing function body for ${name}`);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

const server = read("server.mjs");
const writer = stripComments(extractFunction(server, "callSingleWriter"));
const envLoader = stripComments(extractFunction(server, "loadRuntimeEnv"));
const contextEngine = stripComments(read("product/novel/app/article/context-engine.ts"));
const normalizeEvidencePackChunks = extractFunction(contextEngine, "normalizeEvidencePackChunks");
const readEvidencePackProviders = extractFunction(contextEngine, "readEvidencePackProviders");
const smokeTool = read("product/novel/tools/generate-article-mvp.mjs");
const rootReadme = read("README.md");
const novelReadme = read("product/novel/README.md");

assert(writer.includes("process.env.CONTENTBASE_LLM_BASE_URL"), "Writer must read CONTENTBASE_LLM_BASE_URL");
assert(writer.includes("process.env.CONTENTBASE_LLM_API_KEY"), "Writer must read CONTENTBASE_LLM_API_KEY");
assert(writer.includes("process.env.CONTENTBASE_LLM_MODEL"), "Writer must read CONTENTBASE_LLM_MODEL");
assert(writer.includes("CONTENTBASE_LLM_BASE_URL is required"), "Writer must fail when base URL is missing");
assert(writer.includes("CONTENTBASE_LLM_API_KEY is required"), "Writer must fail when API key is missing");
assert(writer.includes("CONTENTBASE_LLM_MODEL is required"), "Writer must fail when model is missing");
assert(writer.includes("/chat/completions"), "Writer must use the OpenAI-compatible chat completion route");
assert(writer.includes("stream: true"), "Writer must exercise the streaming runtime path");

assert(!/settings\?\.model|request\?\.model|DATABASE_RESEARCH_LLM_MODEL|DASHSCOPE|qwen|qwen-plus|gpt-5\.5/i.test(writer),
  "Writer must not accept request/default/fallback models; it is pinned by CONTENTBASE_LLM_MODEL");

assert(envLoader.includes("SUB2API_NOVEL_MODEL"), "Runtime env loader must support the canonical sub2api novel model env");
assert(envLoader.includes("CONTENTBASE_LLM_MODEL"), "Runtime env loader must populate CONTENTBASE_LLM_MODEL");

assert(smokeTool.includes("/api/content/runtime/generate/article"), "Article smoke must call the canonical generation endpoint");
assert(smokeTool.includes("runtime.generate.article did not report a real model invocation provider/model"),
  "Article smoke must fail without a real model invocation");
assert(smokeTool.includes("smoke requires DataBase EvidencePack"), "Article smoke must require EvidencePack");
assert(smokeTool.includes("smoke requires RAGFlow evidence because includeRagflow=true"),
  "Article smoke must require RAGFlow evidence by default");

assert(readEvidencePackProviders.includes("queryRun.provider"),
  "Context engine must read EvidencePack queryRun.provider");
assert(readEvidencePackProviders.includes("queryRun.rounds"),
  "Context engine must read EvidencePack queryRun.rounds");
assert(readEvidencePackProviders.includes(".provider"),
  "Context engine must read per-round provider values");
assert(normalizeEvidencePackChunks.includes("readEvidencePackProviders(payload)"),
  "Context engine must propagate EvidencePack provider identity into chunk normalization");
assert(normalizeEvidencePackChunks.includes("evidencePackProviders"),
  "Context engine must retain pack provider hints on normalized evidence chunks");
assert(/classifyCorpusChannel\(\{[\s\S]*provider[\s\S]*evidencePackProviders/.test(normalizeEvidencePackChunks),
  "Context engine must pass EvidencePack provider hints into corpus channel classification");

for (const doc of [rootReadme, novelReadme]) {
  assert(doc.includes("CONTENTBASE_LLM_MODEL"), "Docs must name CONTENTBASE_LLM_MODEL as a required Writer input");
  assert(doc.includes("POST /api/content/runtime/generate/article"), "Docs must name the canonical generation endpoint");
}

console.log(JSON.stringify({
  ok: true,
  root,
  writerModelContract: "CONTENTBASE_LLM_MODEL only",
  generationEndpoint: "/api/content/runtime/generate/article",
  smokeRequires: ["modelInvocation", "EvidencePack", "RAGFlow evidence"],
  realityClassificationContract: "EvidencePack queryRun provider hints feed chunk channel classification"
}, null, 2));
