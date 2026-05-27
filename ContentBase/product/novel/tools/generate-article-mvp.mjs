#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args.baseUrl || process.env.CONTENTBASE_BASE_URL || 'http://127.0.0.1:5101').replace(/\/+$/, '');
const topic = String(args.topic || '').trim();
const requireWebEvidence = args.requireWebEvidence === 'true' || args.includeWeb === 'true';
const includeRagflow = args.includeRagflow !== 'false';
const requireRagflowEvidence = args.requireRagflowEvidence !== 'false' && includeRagflow;
const sourceIds = splitList(args.evidenceSourceIds || args.sourceIds || '');
const startedAt = new Date().toISOString();

if (!topic) {
  throw new Error('topic is required. Example: node tools/generate-article-mvp.mjs --topic "..."');
}

const request = {
  topic,
  target: String(args.target || 'article'),
  structure: {
    targetWordCount: Number(args.targetWordCount || args.targetWords || 0) || 2400,
  },
  evidenceQuery: {
    query: String(args.evidenceQuery || topic).trim() || topic,
    sourceIds,
    limit: Number(args.evidenceLimit || args.limit || 0) || undefined,
    rounds: Number(args.evidenceRounds || args.rounds || 0) || undefined,
    includeWeb: args.includeWeb === 'true' ? true : undefined,
    includeRagflow,
    requireCorpus: args.requireCorpus !== 'false',
  },
  settings: buildRuntimeSettings(args),
};
if (requireWebEvidence) {
  request.evidenceQuery.includeWeb = true;
}

let result;
try {
  result = await postRuntimeJson(`${baseUrl}/api/content/runtime/generate/article`, request);
} catch (error) {
  fail({
    startedAt,
    baseUrl,
    request,
    status: 'failed',
    error,
    response: error && typeof error === 'object' ? error.payload || null : null,
  });
}

let body = '';
let modelInvocation = null;
let evidencePack = null;
try {
  body = String(result?.draft?.body || result?.body || result?.article?.body || result?.finalBody || '').trim();
  if (!body) {
    throw new Error('runtime.generate.article returned no article body');
  }
  modelInvocation = result?.trace?.modelInvocation || result?.draft?.modelInvocation || null;
  if (!modelInvocation?.provider || !modelInvocation?.model) {
    throw new Error('runtime.generate.article did not report a real model invocation provider/model');
  }
  evidencePack = result?.context?.evidence?.pack || null;
  assertEvidencePack(evidencePack, { requireWebEvidence, requireRagflowEvidence, sourceIds });
} catch (error) {
  fail({
    startedAt,
    baseUrl,
    request,
    status: 'failed_after_runtime_response',
    error,
    response: result || null,
    bodyLength: body.length,
    modelInvocation,
    evidencePack,
  });
}

const bodyPath = writeBodyFile(body, topic);
const reportPath = writeReport({
  version: 'contentbase-generate-article-mvp.v2',
  startedAt,
  finishedAt: new Date().toISOString(),
  baseUrl,
  request,
  status: 'succeeded',
  runtimeTransport: {
    mode: 'sync_http',
    endpoint: '/api/content/runtime/generate/article',
  },
  bodyLength: body.length,
  bodyOutput: {
    source: 'runtime.generate.article response',
    field: readBodyField(result),
    bodyLength: body.length,
    excerpt: body.slice(0, 280),
    bodyPath,
  },
  modelInvocation,
  evidencePack,
  corpusDiagnostics: result?.context?.diagnostics?.corpus || null,
  trace: result?.trace || null,
});

console.log(JSON.stringify({
  success: true,
  report: reportPath,
  bodyPath,
  bodyLength: body.length,
  bodyField: readBodyField(result),
  provider: modelInvocation.provider,
  model: modelInvocation.model,
  corpus: result?.context?.diagnostics?.corpus || null,
}, null, 2));

function assertEvidencePack(pack, options) {
  if (!pack || typeof pack !== 'object') {
    throw new Error('smoke requires DataBase EvidencePack in runtime response');
  }
  const queryRun = pack.queryRun || {};
  const screening = pack.screening || {};
  const sources = Array.isArray(pack.sources) ? pack.sources : [];
  const chunks = Array.isArray(pack.chunks) ? pack.chunks : [];
  const citations = Array.isArray(pack.citations) ? pack.citations : [];
  const rounds = Array.isArray(queryRun.rounds) ? queryRun.rounds : [];
  if (!queryRun.provider || rounds.length < 1) {
    throw new Error('smoke requires EvidencePack queryRun');
  }
  if (!screening.version && Number(screening.queryCount || 0) < 1) {
    throw new Error('smoke requires EvidencePack screening');
  }
  if (sources.length < 1 || chunks.length < 1 || citations.length < 1) {
    throw new Error('smoke requires EvidencePack sources/chunks/citations');
  }
  const evidenceText = JSON.stringify([queryRun.provider, rounds, sources, chunks, citations, pack.counts || {}, screening]);
  if (options.requireWebEvidence && (!/web\.search/.test(evidenceText) || Number(pack.counts?.webSources || 0) < 1)) {
    throw new Error('smoke requires web evidence because includeWeb=true');
  }
  if (options.requireRagflowEvidence && !/ragflow\.retrieval/.test(evidenceText)) {
    throw new Error('smoke requires RAGFlow evidence because includeRagflow=true');
  }
  for (const sourceId of options.sourceIds || []) {
    if (!evidenceText.includes(sourceId)) {
      throw new Error(`smoke requires selected EvidencePack metadata to include constrained sourceId ${sourceId}`);
    }
  }
}

async function postRuntimeJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`runtime.generate.article returned non-JSON response: HTTP ${response.status}`);
    }
  }
  if (!response.ok || payload?.success === false) {
    const error = new Error(`runtime.generate.article failed: HTTP ${response.status} ${payload?.error || text}`);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload?.data || payload;
}

function fail(input) {
  const error = input.error instanceof Error ? input.error.message : String(input.error);
  const report = writeReport({
    version: 'contentbase-generate-article-mvp.v2',
    startedAt: input.startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: input.baseUrl,
    request: input.request,
    status: input.status,
    error,
    bodyLength: input.bodyLength || 0,
    response: input.response || null,
    modelInvocation: input.modelInvocation || null,
    evidencePack: input.evidencePack || null,
  });
  console.error(JSON.stringify({ success: false, report, error }, null, 2));
  process.exit(1);
}

function readBodyField(result) {
  if (typeof result?.draft?.body === 'string' && result.draft.body.trim()) return 'draft.body';
  if (typeof result?.body === 'string' && result.body.trim()) return 'body';
  if (typeof result?.article?.body === 'string' && result.article.body.trim()) return 'article.body';
  if (typeof result?.finalBody === 'string' && result.finalBody.trim()) return 'finalBody';
  return 'unknown';
}

function buildRuntimeSettings(input) {
  const settings = {};
  const maxTokens = Number(input.maxTokens ?? input.max_tokens ?? 0);
  if (Number.isFinite(maxTokens) && maxTokens > 0) settings.maxTokens = Math.trunc(maxTokens);
  const temperature = Number(input.temperature);
  if (Number.isFinite(temperature)) settings.temperature = temperature;
  const model = String(input.model || '').trim();
  if (model) settings.model = model;
  return settings;
}

function writeReport(report) {
  const outputDir = path.join(os.tmpdir(), 'contentbase', 'acceptance');
  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, `generate-article-mvp-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}

function writeBodyFile(body, topic) {
  const outputDir = path.join(os.tmpdir(), 'contentbase', 'acceptance', 'bodies');
  fs.mkdirSync(outputDir, { recursive: true });
  const safeTopic = String(topic || 'article').replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 48) || 'article';
  const bodyPath = path.join(outputDir, `generate-article-mvp-${Date.now()}-${safeTopic}.md`);
  fs.writeFileSync(bodyPath, `${String(body || '').trim()}\n`, 'utf8');
  return bodyPath;
}

function splitList(value) {
  return String(value || '').split(/[，,、\s]+/).map((item) => item.trim()).filter(Boolean);
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--' || !item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      index += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}
