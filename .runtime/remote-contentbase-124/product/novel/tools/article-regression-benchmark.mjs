#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const args = parseArgs(process.argv.slice(2));
const gatewayUrl = String(args.gatewayUrl || args.baseUrl || process.env.DATABASE_GATEWAY_URL || 'http://127.0.0.1:18090').replace(/\/+$/, '');
const includeWeb = args.includeWeb !== 'false';
const includeRagflow = args.includeRagflow !== 'false';
const minSources = readPositiveInt(args.minSources || 6, 'minSources');
const minChunks = readPositiveInt(args.minChunks || 6, 'minChunks');
const minCitations = readPositiveInt(args.minCitations || 6, 'minCitations');
const minWritableAtoms = readPositiveInt(args.minWritableAtoms || 6, 'minWritableAtoms');
const limit = readPositiveInt(args.limit || 10, 'limit');
const rounds = readPositiveInt(args.rounds || 6, 'rounds');
const topics = readTopics(args);
const startedAt = new Date().toISOString();

if (!gatewayUrl) {
  throw new Error('DATABASE_GATEWAY_URL is required');
}
if (!topics.length) {
  throw new Error('benchmark requires at least one topic');
}

const client = createGatewayClient();
const results = [];
for (const topic of topics) {
  const pack = await client.searchEvidencePack({
    q: topic,
    topic,
    limit,
    rounds,
    includeWeb,
    includeRagflow,
  });
  const metrics = summarizePack(topic, pack);
  const passed = metrics.sourceCount >= minSources
    && metrics.chunkCount >= minChunks
    && metrics.citationCount >= minCitations
    && metrics.writableFactAtomCount >= minWritableAtoms;
  results.push({
    topic,
    passed,
    metrics,
  });
}

const passed = results.every((item) => item.passed);
const report = {
  version: 'article-regression-benchmark.v1',
  startedAt,
  finishedAt: new Date().toISOString(),
  gatewayUrl,
  thresholds: {
    minSources,
    minChunks,
    minCitations,
    minWritableAtoms,
  },
  request: {
    includeWeb,
    includeRagflow,
    limit,
    rounds,
  },
  passed,
  results,
};
const reportPath = writeReport(report);

console.log(JSON.stringify({
  success: passed,
  report: reportPath,
  topics: results.length,
  failedTopics: results.filter((item) => !item.passed).map((item) => item.topic),
  results: results.map((item) => ({
    topic: item.topic,
    passed: item.passed,
    sourceCount: item.metrics.sourceCount,
    chunkCount: item.metrics.chunkCount,
    citationCount: item.metrics.citationCount,
    writableFactAtomCount: item.metrics.writableFactAtomCount,
    webSources: item.metrics.webSources,
    ragflowSources: item.metrics.ragflowSources,
  })),
}, null, 2));

if (!passed) {
  process.exit(1);
}

function createGatewayClient() {
  const { createDatabaseClient } = require('@emptyinkpot/database-gateway-generated-client');
  return createDatabaseClient({
    baseUrl: gatewayUrl,
    apiKey: process.env.DATABASE_GATEWAY_API_KEY,
    actor: 'contentbase-article-regression-benchmark',
  }).raw;
}

function summarizePack(topic, pack) {
  const sources = Array.isArray(pack?.sources) ? pack.sources : [];
  const chunks = Array.isArray(pack?.chunks) ? pack.chunks : [];
  const citations = Array.isArray(pack?.citations) ? pack.citations : [];
  const rounds = Array.isArray(pack?.queryRun?.rounds) ? pack.queryRun.rounds : [];
  const writableAtoms = buildWritableFactAtoms({ topic, chunks, citations });
  return {
    sourceCount: sources.length,
    chunkCount: chunks.length,
    citationCount: citations.length,
    queryRoundCount: rounds.length,
    webSources: Number(pack?.counts?.webSources || 0),
    ragflowSources: Number(pack?.counts?.ragflowSources || 0),
    sourceDiversityCount: Number(pack?.screening?.sourceDiversityCount || sources.length),
    writableFactAtomCount: writableAtoms.length,
    sourceTitles: sources.slice(0, 12).map((item) => String(item?.title || item?.id || '')),
    queryRounds: rounds.slice(0, 16).map((round) => ({
      query: String(round?.query || ''),
      provider: String(round?.provider || ''),
      resultCount: Number(round?.resultCount || 0),
    })),
    writableAtoms: writableAtoms.slice(0, 16),
  };
}

function buildWritableFactAtoms(input) {
  const candidates = [
    ...input.chunks.map((item) => ({
      sourceId: item.sourceId || item.id,
      text: item.text || item.content || item.excerpt || '',
    })),
    ...input.citations.map((item) => ({
      sourceId: item.sourceId || item.id,
      text: item.excerpt || item.text || item.summary || '',
    })),
  ];
  const atoms = [];
  const seen = new Set();
  for (const item of candidates) {
    const sourceId = String(item.sourceId || '').trim();
    if (!sourceId) continue;
    for (const fact of splitFactText(item.text)) {
      if (!isWritableFactText(fact)) continue;
      const key = `${sourceId}|${fact}`;
      if (seen.has(key)) continue;
      seen.add(key);
      atoms.push({ sourceId, value: fact });
    }
  }
  return atoms;
}

function splitFactText(value) {
  return String(value || '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？；;])\s*|(?<=\.)\s+/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 18)
    .slice(0, 8);
}

function isWritableFactText(value) {
  const text = String(value || '').trim();
  if (text.length < 18) return false;
  if (/Reuters provides business|Skip to main content|Purchase Licensing Rights|Photo|GettyImages|opens new tab/i.test(text)) return false;
  const hasAction = /(?:称|表示|宣布|警告|指出|披露|发布|记录|显示|涉及|购买|出口|进口|运往|占|约|超过|低于|上调|下降|中断|受阻|暂停|恢复|批准|拒绝|调查|审查|制裁|谈判|签署|关闭|开放|延迟|取消|faces|warns|said|shows|accounts|flows|transported|disruption|blockade|risk)/i.test(text);
  const hasMeasure = /(?:\d+(?:\.\d+)?\s*(?:%|percent|million|billion|barrels?|bpd|tons?|days?|years?)|百分之|约|超过|低于|至少|不足|多数|多家|若干)/i.test(text);
  const hasNamedActor = /(?:[\u4e00-\u9fa5]{2,12}(?:国|部|委|署|局|院|会|社|公司|集团|政府|机构|组织|银行|港|厂|市场|供应链|通道|海峡|地区|国家|联盟|报告|指数|价格|数据)|[A-Z][A-Za-z0-9._-]{2,})/.test(text);
  return hasAction || (hasNamedActor && hasMeasure);
}

function readTopics(input) {
  if (input.topic) return [String(input.topic).trim()].filter(Boolean);
  if (input.topics) {
    return String(input.topics)
      .split(/\r?\n|[|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (input.topicsFile) {
    return fs.readFileSync(path.resolve(input.topicsFile), 'utf8')
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item && !item.startsWith('#'));
  }
  return [];
}

function writeReport(report) {
  const outputDir = path.join(productRoot, '.runtime', 'acceptance');
  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, `article-regression-benchmark-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
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
