#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const args = parseArgs(process.argv.slice(2));
const gatewayUrl = String(args.gatewayUrl || args.baseUrl || process.env.DATABASE_GATEWAY_URL || '').replace(/\/+$/, '');
const query = String(args.query || args.q || '').trim();
const sourceIds = splitList(args.sourceIds || args.evidenceSourceIds || '');
const includeWeb = args.includeWeb === 'true';
const includeRagflow = args.includeRagflow === 'true';
const requireWebEvidence = args.requireWebEvidence === 'true' || includeWeb;
const requireRagflowEvidence = args.requireRagflowEvidence === 'true' || includeRagflow;
const requireSourceIds = args.requireSourceIds !== 'false' && sourceIds.length > 0;
const minRounds = readPositiveInt(args.minRounds || args.rounds || 2, 'minRounds');
const minSources = readPositiveInt(args.minSources || 1, 'minSources');
const minChunks = readPositiveInt(args.minChunks || 1, 'minChunks');
const minCitations = readPositiveInt(args.minCitations || 1, 'minCitations');
const limit = readPositiveInt(args.limit || args.evidenceLimit || 8, 'limit');
const rounds = readPositiveInt(args.rounds || Math.max(4, minRounds), 'rounds');
const startedAt = new Date().toISOString();

if (!gatewayUrl) {
  throw new Error('DATABASE_GATEWAY_URL is required for DataBase EvidencePack smoke');
}
if (!query) {
  throw new Error('query is required. Example: pnpm run smoke:evidence-pack -- --query "文明 秩序"');
}

const request = {
  q: query,
  topic: String(args.topic || query).trim(),
  target: String(args.target || 'article').trim(),
  sourceIds: sourceIds.join(','),
  limit,
  rounds,
  includeWeb,
  includeRagflow,
};

let pack;
try {
  pack = await createGatewayClient().searchEvidencePack(request);
  assertEvidencePack(pack, {
    minRounds,
    minSources,
    minChunks,
    minCitations,
    requireWebEvidence,
    requireRagflowEvidence,
    requireSourceIds,
    sourceIds,
  });
} catch (error) {
  const reportPath = writeReport({
    version: 'contentbase-evidence-pack-smoke.v1',
    startedAt,
    finishedAt: new Date().toISOString(),
    gatewayUrl,
    request,
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
    response: error && typeof error === 'object' ? error.payload || null : null,
  });
  console.error(JSON.stringify({
    success: false,
    report: reportPath,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}

const report = {
  version: 'contentbase-evidence-pack-smoke.v1',
  startedAt,
  finishedAt: new Date().toISOString(),
  gatewayUrl,
  request,
  status: 'succeeded',
  summary: summarizeEvidencePack(pack),
  pack,
};
const reportPath = writeReport(report);

console.log(JSON.stringify({
  success: true,
  report: reportPath,
  query: pack.query,
  mode: pack.mode,
  provider: pack.queryRun?.provider || null,
  rounds: Array.isArray(pack.queryRun?.rounds) ? pack.queryRun.rounds.length : 0,
  sources: Array.isArray(pack.sources) ? pack.sources.length : 0,
  chunks: Array.isArray(pack.chunks) ? pack.chunks.length : 0,
  citations: Array.isArray(pack.citations) ? pack.citations.length : 0,
  webSources: Number(pack.counts?.webSources || 0),
}, null, 2));

function createGatewayClient() {
  const { createDatabaseClient } = require('@emptyinkpot/database-gateway-generated-client');
  return createDatabaseClient({
    baseUrl: gatewayUrl,
    apiKey: process.env.DATABASE_GATEWAY_API_KEY,
    actor: 'contentbase-evidence-pack-smoke',
  }).raw;
}

function assertEvidencePack(pack, options) {
  if (!pack || typeof pack !== 'object') {
    throw new Error('EvidencePack smoke requires a DataBase EvidencePack object');
  }
  const sources = Array.isArray(pack.sources) ? pack.sources : [];
  const chunks = Array.isArray(pack.chunks) ? pack.chunks : [];
  const citations = Array.isArray(pack.citations) ? pack.citations : [];
  const queryRun = pack.queryRun && typeof pack.queryRun === 'object' ? pack.queryRun : {};
  const rounds = Array.isArray(queryRun.rounds) ? queryRun.rounds : [];
  const screening = pack.screening && typeof pack.screening === 'object' ? pack.screening : {};

  if (!queryRun.provider || rounds.length < options.minRounds) {
    throw new Error(`EvidencePack queryRun must include provider and at least ${options.minRounds} rounds`);
  }
  if (!screening.version || Number(screening.queryCount || 0) < options.minRounds) {
    throw new Error(`EvidencePack screening must include version and at least ${options.minRounds} query records`);
  }
  if (sources.length < options.minSources || chunks.length < options.minChunks || citations.length < options.minCitations) {
    throw new Error(`EvidencePack must include sources/chunks/citations >= ${options.minSources}/${options.minChunks}/${options.minCitations}`);
  }

  // 这里验证的是检索边界，不评价正文。正文生成必须另走 generate-article-mvp。
  const providerText = JSON.stringify([queryRun.provider, rounds, sources, chunks, citations, pack.counts || {}, screening]);
  if (!/database\.search_chunks|database\.search_documents|DataBase/i.test(providerText)) {
    throw new Error('EvidencePack must prove DataBase private corpus retrieval participated');
  }
  if (options.requireWebEvidence && (!/web\.search/.test(providerText) || Number(pack.counts?.webSources || 0) < 1)) {
    throw new Error('EvidencePack must include web.search evidence because includeWeb=true');
  }
  if (options.requireRagflowEvidence) {
    const ragflowRoundHit = rounds.some((round) => String(round?.provider || '') === 'ragflow.retrieval' && Number(round?.resultCount || 0) > 0);
    if (!/ragflow\.retrieval/.test(providerText) || !ragflowRoundHit) {
      throw new Error('EvidencePack must include real ragflow.retrieval evidence because includeRagflow=true');
    }
  }
  if (options.requireSourceIds) {
    const filterIds = Array.isArray(screening.sourceFilterIds) ? screening.sourceFilterIds.map(String) : [];
    const selectedText = JSON.stringify([sources, chunks, citations]);
    for (const sourceId of options.sourceIds) {
      if (!filterIds.includes(sourceId)) {
        throw new Error(`EvidencePack screening.sourceFilterIds must include constrained sourceId ${sourceId}`);
      }
      if (!selectedText.includes(sourceId)) {
        throw new Error(`EvidencePack selected sources/chunks/citations must include constrained sourceId ${sourceId}`);
      }
    }
  }
}

function summarizeEvidencePack(pack) {
  const rounds = Array.isArray(pack.queryRun?.rounds) ? pack.queryRun.rounds : [];
  return {
    version: pack.version,
    query: pack.query,
    mode: pack.mode,
    provider: pack.queryRun?.provider || null,
    queryRoundCount: rounds.length,
    queryRounds: rounds.slice(0, 12).map((round) => ({
      query: round?.query || null,
      provider: round?.provider || null,
      resultCount: Number(round?.resultCount || 0),
      tokenCount: Number(round?.tokenCount || 0),
    })),
    screening: pack.screening || null,
    counts: pack.counts || null,
    sourceTitles: (Array.isArray(pack.sources) ? pack.sources : []).slice(0, 12).map((item) => item?.title || item?.id || ''),
    chunkExcerpts: (Array.isArray(pack.chunks) ? pack.chunks : []).slice(0, 8).map((item) => String(item?.text || '').slice(0, 160)),
    citationExcerpts: (Array.isArray(pack.citations) ? pack.citations : []).slice(0, 8).map((item) => String(item?.excerpt || '').slice(0, 160)),
  };
}

function writeReport(report) {
  const outputDir = path.join(os.tmpdir(), 'contentbase', 'acceptance');
  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, `evidence-pack-smoke-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}

function splitList(value) {
  return String(value || '')
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readPositiveInt(value, field) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return Math.trunc(parsed);
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
