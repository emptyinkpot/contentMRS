#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args.baseUrl || process.env.CONTENTBASE_BASE_URL || 'http://127.0.0.1:5101').replace(/\/+$/, '');
const topic = String(args.topic || '').trim();
const workId = readPositiveInt(args.workId || process.env.CONTENTBASE_MVP_WORK_ID, 'workId');
const chapterNumber = readPositiveInt(args.chapterNumber || process.env.CONTENTBASE_MVP_CHAPTER_NUMBER, 'chapterNumber');
const persist = args.persist !== 'false';
const recordAcceptanceReport = args.recordAcceptanceReport === 'true' || (persist && args.recordAcceptanceReport !== 'false');
const recordReferenceUsageReport = args.recordReferenceUsageReport === 'true' || (persist && args.recordReferenceUsageReport !== 'false');
const requireWebEvidence = args.requireWebEvidence === 'true' || args.includeWeb === 'true';
const requireRagflowEvidence = args.requireRagflowEvidence === 'true' || args.includeRagflow === 'true';
const requireExperienceEvidence = args.requireExperienceEvidence === 'true';
const evidenceSourceIds = String(args.evidenceSourceIds || args.sourceIds || '').split(/[，,、\s]+/).map((item) => item.trim()).filter(Boolean);
const styleSourceIds = String(args.styleSourceIds || process.env.CONTENTBASE_STYLE_SOURCE_IDS || 'book_kinkakuji_restricted_style')
  .split(/[，,、\s]+/)
  .map((item) => item.trim())
  .filter(Boolean);
const useRuntimeJob = args.job !== 'false' && args.sync !== 'true';
const jobPollIntervalMs = Number(args.jobPollIntervalMs || 2000);
const jobTimeoutMs = Number(args.jobTimeoutMs || 20 * 60 * 1000);
enforceSingleWriterRuntimeBoundary({ args, useRuntimeJob });

if (!topic) {
  throw new Error('topic is required. Example: node tools/generate-article-mvp.mjs --workId 1 --chapterNumber 1 --topic "..."');
}

const request = {
  topic,
  workId,
  chapterNumber,
  persist,
  recordAcceptanceReport,
  recordReferenceUsageReport,
  generation: { mode: 'model' },
  revision: buildRevisionSettings(args),
  operator: String(args.operator || 'contentbase-mvp-smoke'),
  target: String(args.target || 'article'),
  structure: {
    targetWordCount: Number(args.targetWordCount || args.targetWords || 0) || undefined,
  },
  acceptance: {
    minNonWhitespaceChars: Number(args.minNonWhitespaceChars || args.minChars || 0) || undefined,
  },
  evidenceQuery: {
    query: String(args.evidenceQuery || topic).trim() || topic,
    semanticTags: String(args.semanticTags || '').split(/[，,、\s]+/).map((item) => item.trim()).filter(Boolean),
    sourceIds: evidenceSourceIds,
    limit: Number(args.evidenceLimit || args.limit || 0) || 10,
    rounds: Number(args.evidenceRounds || args.rounds || 0) || 6,
    includeWeb: args.includeWeb === 'true',
    includeRagflow: args.includeRagflow === 'true',
  },
  styleQuery: {
    query: String(args.styleQuery || '金阁寺 三岛由纪夫 句法 修辞 意象 段落推进 文白节奏').trim(),
    sourceIds: styleSourceIds,
    limit: Number(args.styleLimit || 0) || 6,
  },
  // 显式透传模型返修参数。runtime 默认不自动返修，改善循环会主动打开。
  settings: buildRuntimeSettings(args),
};

const startedAt = new Date().toISOString();
let result;
let runtimeTransport = null;
try {
  if (useRuntimeJob) {
    const jobResult = await runGenerateArticleJob({
      baseUrl,
      request,
      timeoutMs: jobTimeoutMs,
      pollIntervalMs: jobPollIntervalMs,
    });
    result = jobResult.result;
    runtimeTransport = jobResult.transport;
  } else {
    result = await postRuntimeJson(`${baseUrl}/api/content/runtime/generate/article`, request);
    runtimeTransport = {
      mode: 'sync_http',
      endpoint: '/api/content/runtime/generate/article',
    };
  }
} catch (error) {
  const reportPath = writeReport({
    version: 'contentbase-generate-article-mvp.v1',
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl,
    request,
    runtimeTransport,
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

function enforceSingleWriterRuntimeBoundary(input) {
  const productionRuntime = process.env.NODE_ENV === 'production'
    || String(process.env.CONTENTBASE_WORKSPACE_ROOT || '').startsWith('/srv/contentbase/')
    || productRoot.startsWith('/srv/contentbase/');
  if (!productionRuntime || args.allowDirectRuntimeSmoke === 'true') {
    return;
  }
  if (!input.useRuntimeJob) {
    throw new Error('Direct sync article generation is disabled on production. Use Dify -> ContentBase runtime job; do not run a parallel Writer path.');
  }
  if (args.includeRagflow !== 'true') {
    throw new Error('Production article smoke must request RAGFlow evidence. Use --includeRagflow true or run the Dify workflow.');
  }
}

let body = '';
let modelInvocation = null;
let evidencePack = null;
let stylePack = null;
let materialScreening = null;
let experienceEvidence = null;
let evaluationPassed = false;
let readback = null;
try {
  body = String(result?.draft?.body || result?.body || result?.article?.body || result?.finalBody || '').trim();
  if (!body) {
    throw new Error('runtime.generate.article returned no article body');
  }
  modelInvocation = readModelInvocation(result);
  if (!modelInvocation?.provider || !modelInvocation?.model) {
    throw new Error('runtime.generate.article did not report a real model invocation provider/model');
  }
  evidencePack = result?.context?.evidence?.pack || result?.trace?.evidencePack || null;
  assertEvidencePackForSmoke(evidencePack, { requireWebEvidence, requireRagflowEvidence, sourceIds: evidenceSourceIds });
  stylePack = result?.context?.stylePack?.pack || result?.trace?.stylePack || null;
  assertStylePackForSmoke(stylePack, { sourceIds: styleSourceIds });
  materialScreening = result?.trace?.review?.materialScreening || result?.trace?.materialScreening || result?.trace?.research?.retrievalPolicy || null;
  assertMaterialScreeningForSmoke(materialScreening, { requireWebEvidence, requireRagflowEvidence });
  experienceEvidence = readExperienceEvidenceForSmoke(result);
  assertExperienceEvidenceForSmoke(experienceEvidence, { requireExperienceEvidence });
  evaluationPassed = result?.quality?.passed !== false && result?.acceptance?.passed !== false;

  readback = persist
    ? await readGeneratedArticleBack({ workId, chapterNumber })
    : null;
  if (persist && !readback?.body) {
    throw new Error('DataBase readback did not return persisted article body');
  }
  if (persist && readback.body.trim() !== body.trim()) {
    throw new Error(`DataBase readback body does not match generated body: generated=${body.length}, readback=${readback.body.length}`);
  }
} catch (error) {
  const reportPath = writeReport({
    version: 'contentbase-generate-article-mvp.v1',
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl,
    request,
    status: 'failed_after_runtime_response',
    error: error instanceof Error ? error.message : String(error),
    bodyLength: body.length,
    bodyReadback: body
      ? {
        source: 'runtime.generate.article response',
        field: readBodyField(result),
        bodyLength: body.length,
        excerpt: body.slice(0, 280),
      }
      : null,
    response: result || null,
    runtimeTransport,
    modelInvocation,
    evidencePack,
    stylePack,
    materialScreening,
    experienceEvidence,
  });
  console.error(JSON.stringify({
    success: false,
    report: reportPath,
    error: error instanceof Error ? error.message : String(error),
    bodyLength: body.length,
    bodyField: readBodyField(result),
  }, null, 2));
  process.exit(1);
}

const bodyFilePath = writeBodyFile(body, {
  topic,
  workId,
  chapterNumber,
});

const report = {
  version: 'contentbase-generate-article-mvp.v1',
  startedAt,
  finishedAt: new Date().toISOString(),
  baseUrl,
  request,
  runtimeTransport,
  bodyLength: body.length,
  status: evaluationPassed ? 'succeeded' : 'generated_with_observation_violations',
  quality: result?.quality || null,
  acceptance: result?.acceptance || null,
  trace: result?.trace || null,
  persistence: result?.persistence || result?.persisted || null,
  modelInvocation,
  evidencePack,
  stylePack,
  materialScreening,
  experienceEvidence,
  bodyReadback: {
    source: 'runtime.generate.article response',
    field: readBodyField(result),
    bodyLength: body.length,
    excerpt: body.slice(0, 280),
    // 完整正文单独落盘，避免验收 JSON 只剩短摘录，后续风格对照和人工复看都读这个文件。
    bodyPath: bodyFilePath,
  },
  readback: readback
    ? {
      bodyLength: readback.body.length,
      title: readback.title,
      status: readback.status,
      chapterId: readback.chapterId,
      bodyMatchesGenerated: readback.body.trim() === body.trim(),
      lengthDelta: readback.body.length - body.length,
      excerptMatches: readback.body.includes(body.slice(0, Math.min(120, body.length)).trim().slice(0, 40)),
    }
    : null,
};

const reportPath = writeReport(report);

console.log(JSON.stringify({
  success: true,
  report: reportPath,
  bodyPath: bodyFilePath,
  bodyLength: body.length,
  readbackBodyLength: readback?.body?.length || 0,
  bodyField: report.bodyReadback.field,
  provider: modelInvocation.provider,
  model: modelInvocation.model,
  experienceHitCount: experienceEvidence?.hitCount || 0,
  experienceTopHitCount: experienceEvidence?.topHitCount || 0,
}, null, 2));

function readBodyField(result) {
  if (typeof result?.draft?.body === 'string' && result.draft.body.trim()) return 'draft.body';
  if (typeof result?.body === 'string' && result.body.trim()) return 'body';
  if (typeof result?.article?.body === 'string' && result.article.body.trim()) return 'article.body';
  if (typeof result?.finalBody === 'string' && result.finalBody.trim()) return 'finalBody';
  return 'unknown';
}

function readModelInvocation(result) {
  return result?.trace?.modelInvocation
    || result?.draft?.modelInvocation
    || result?.trace?.workflow?.draft?.modelInvocation
    || null;
}

function assertEvidencePackForSmoke(pack, options) {
  const queryRun = pack?.queryRun || {};
  const screening = pack?.screening || {};
  const sources = Array.isArray(pack?.sources) ? pack.sources : [];
  const chunks = Array.isArray(pack?.chunks) ? pack.chunks : [];
  const citations = Array.isArray(pack?.citations) ? pack.citations : [];
  const rounds = Array.isArray(queryRun.rounds) ? queryRun.rounds : [];
  if (!pack || typeof pack !== 'object') {
    throw new Error('smoke requires DataBase EvidencePack in runtime response');
  }
  if (!queryRun.provider || rounds.length < 2) {
    throw new Error('smoke requires EvidencePack queryRun with at least two retrieval rounds');
  }
  if (!screening.version || Number(screening.queryCount || 0) < 2) {
    throw new Error('smoke requires EvidencePack screening with multi-query evidence');
  }
  if (sources.length < 1 || chunks.length < 1 || citations.length < 1) {
    throw new Error('smoke requires EvidencePack sources/chunks/citations');
  }
  if (Array.isArray(options.sourceIds) && options.sourceIds.length > 0) {
    const filterIds = Array.isArray(screening.sourceFilterIds) ? screening.sourceFilterIds.map(String) : [];
    const evidenceText = JSON.stringify([sources, chunks, citations]);
    for (const sourceId of options.sourceIds) {
      if (!filterIds.includes(sourceId)) {
        throw new Error(`smoke requires EvidencePack screening.sourceFilterIds to include ${sourceId}`);
      }
      if (!evidenceText.includes(sourceId)) {
        throw new Error(`smoke requires selected EvidencePack metadata to include constrained sourceId ${sourceId}`);
      }
    }
  }
  if (options.requireWebEvidence) {
    const providerText = JSON.stringify([queryRun.provider, rounds, sources, chunks, citations, pack.counts || {}]);
    if (!/web\.search/.test(providerText) || Number(pack?.counts?.webSources || 0) < 1) {
      throw new Error('smoke requires web evidence because includeWeb=true');
    }
  }
  if (options.requireRagflowEvidence) {
    const providerText = JSON.stringify([queryRun.provider, rounds, sources, chunks, citations, pack.counts || {}]);
    const ragflowSelected = /ragflow\.retrieval/.test(JSON.stringify([sources, chunks, citations]));
    const ragflowRoundHit = rounds.some((round) => String(round?.provider || '') === 'ragflow.retrieval' && Number(round?.resultCount || 0) > 0);
    if (!/ragflow\.retrieval/.test(providerText) || !ragflowSelected || !ragflowRoundHit) {
      throw new Error('smoke requires RAGFlow evidence because includeRagflow=true');
    }
  }
}

function assertStylePackForSmoke(pack, options) {
  const profiles = Array.isArray(pack?.profiles) ? pack.profiles : [];
  const constraints = Array.isArray(pack?.constraints) ? pack.constraints : [];
  const screening = pack?.screening || {};
  if (!pack || typeof pack !== 'object') {
    throw new Error('smoke requires DataBase StylePack in runtime response');
  }
  if (String(pack.version || '') !== 'style-pack.v1') {
    throw new Error('smoke requires StylePack version style-pack.v1');
  }
  if (profiles.length < 1 || constraints.length < 1) {
    throw new Error('smoke requires StylePack profiles and constraints');
  }
  if (!screening.version || Number(screening.selectedProfileCount || 0) < 1) {
    throw new Error('smoke requires StylePack screening with selected profiles');
  }
  if (Array.isArray(options.sourceIds) && options.sourceIds.length > 0) {
    const filterIds = Array.isArray(screening.sourceFilterIds) ? screening.sourceFilterIds.map(String) : [];
    const styleText = JSON.stringify(pack);
    for (const sourceId of options.sourceIds) {
      if (!filterIds.includes(sourceId)) {
        throw new Error(`smoke requires StylePack screening.sourceFilterIds to include ${sourceId}`);
      }
      if (!styleText.includes(sourceId)) {
        throw new Error(`smoke requires selected StylePack metadata to include constrained sourceId ${sourceId}`);
      }
    }
  }
  if (!JSON.stringify(pack).includes('不得复写') && !JSON.stringify(pack).includes('no-copy')) {
    throw new Error('smoke requires StylePack copyright no-copy boundary');
  }
}

function assertMaterialScreeningForSmoke(screening, options) {
  if (!screening || typeof screening !== 'object') {
    throw new Error('smoke requires ReviewerAgent material screening evidence');
  }
  const queryRounds = Number(screening.queryRounds || screening.queryRunRounds || screening.queryRun?.rounds?.length || 0);
  const sourceCount = Number(screening.sourceCount || 0);
  const chunkCount = Number(screening.chunkCount || 0);
  const citationCount = Number(screening.citationCount || 0);
  if (queryRounds < 2 || sourceCount < 1 || chunkCount < 1 || citationCount < 1) {
    throw new Error('smoke requires material screening to prove multi-round source/chunk/citation coverage');
  }
  if (options.requireWebEvidence && Number(screening.webSourceCount || 0) < 1) {
    throw new Error('smoke requires material screening to include web source coverage');
  }
  if (options.requireRagflowEvidence) {
    const providerText = JSON.stringify(screening);
    if (!/ragflow\.retrieval/.test(providerText)) {
      throw new Error('smoke requires material screening to include RAGFlow provider coverage');
    }
  }
}

function readExperienceEvidenceForSmoke(result) {
  const materialPack = result?.trace?.workflow?.materialPack || {};
  const writingBrief = result?.trace?.workflow?.writingBrief || {};
  const retrievalPolicy = materialPack?.retrievalPolicy || {};
  const materialItems = Array.isArray(materialPack?.experienceItems) ? materialPack.experienceItems : [];
  const topHits = Array.isArray(retrievalPolicy?.experienceTopHits) ? retrievalPolicy.experienceTopHits : [];
  const briefItems = Array.isArray(writingBrief?.materialPolicy?.experienceItems)
    ? writingBrief.materialPolicy.experienceItems
    : [];
  return {
    version: 'article-experience-smoke-evidence.v1',
    hitCount: materialItems.length,
    topHitCount: topHits.length,
    writingBriefHitCount: briefItems.length,
    materialItems: materialItems.slice(0, 8).map(summarizeExperienceItem),
    topHits: topHits.slice(0, 8).map(summarizeExperienceItem),
    writingBriefItems: briefItems.slice(0, 8).map(summarizeExperienceItem),
  };
}

function summarizeExperienceItem(item) {
  return {
    id: String(item?.id || ''),
    title: String(item?.title || ''),
    topic: item?.topic == null ? null : String(item.topic),
    target: item?.target == null ? null : String(item.target),
    passed: typeof item?.passed === 'boolean' ? item.passed : null,
    score: Number.isFinite(Number(item?.score)) ? Number(item.score) : null,
    reasons: Array.isArray(item?.reasons) ? item.reasons.map(String).slice(0, 8) : [],
    version: item?.version == null ? null : String(item.version),
  };
}

function assertExperienceEvidenceForSmoke(evidence, options) {
  if (!options.requireExperienceEvidence) {
    return;
  }
  if (!evidence || evidence.hitCount < 1 || evidence.writingBriefHitCount < 1) {
    throw new Error('smoke requires article experience evidence in material pack and writing brief');
  }
  const hasScoredHit = evidence.topHits.some((item) => Number(item.score || 0) > 0);
  if (!hasScoredHit) {
    throw new Error('smoke requires ranked article experience top hit with score');
  }
}

async function readGeneratedArticleBack(input) {
  const gateway = createDataBaseGatewayClientForTool();
  const response = await gateway.listWorkChapters({
    id: String(input.workId),
    limit: 10000,
  });
  const chapter = (Array.isArray(response.chapters) ? response.chapters : [])
    .find((item) => Number(item.chapterNumber || 0) === Number(input.chapterNumber));
  const chapterId = String(chapter?.id || '').replace(/^legacy_chapter_/, '');
  const partsResponse = await gateway.listCanonicalContentParts({
    id: `legacy_work_${Number(input.workId)}`,
    kind: 'chapter',
    limit: 10000,
  });
  const part = (Array.isArray(partsResponse.parts) ? partsResponse.parts : [])
    .find((item) => {
      const metadata = item?.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
        ? item.metadata
        : {};
      const partChapterNumber = Number(metadata.chapterNumber || metadata.chapter_number || item.partOrder || 0);
      return partChapterNumber === Number(input.chapterNumber);
    });
  if (!part?.id) {
    return {
      chapterId,
      title: chapter?.title || '',
      status: chapter?.status || '',
      body: '',
    };
  }
  const blocksResponse = await gateway.listCanonicalContentBlocks({
    id: String(part.id),
    limit: 10000,
  });
  const body = (Array.isArray(blocksResponse.blocks) ? blocksResponse.blocks : [])
    .sort((a, b) => Number(a.blockOrder || 0) - Number(b.blockOrder || 0))
    .map((block) => String(block.textContent || '').trim())
    .filter(Boolean)
    .join('\n');
  return {
    chapterId,
    title: chapter?.title || part.title || '',
    status: chapter?.status || '',
    body,
  };
}

function createDataBaseGatewayClientForTool() {
  const baseUrl = String(process.env.DATABASE_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('DATABASE_GATEWAY_URL is required for DataBase readback');
  }
  const { createDatabaseClient } = require('@emptyinkpot/database-gateway-generated-client');
  return createDatabaseClient({
    baseUrl,
    apiKey: process.env.DATABASE_GATEWAY_API_KEY,
    actor: 'contentbase-mvp-smoke',
  }).raw;
}

function readPositiveInt(value, field) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} is required and must be a positive integer`);
  }
  return Math.trunc(parsed);
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--') continue;
    if (!item.startsWith('--')) continue;
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

function buildRuntimeSettings(args) {
  const settings = {};
  const rewriteFeedbackMaxAttempts = Number(args.rewriteFeedbackMaxAttempts ?? args.rewrite_feedback_max_attempts ?? 0);
  if (Number.isFinite(rewriteFeedbackMaxAttempts) && rewriteFeedbackMaxAttempts > 0) {
    settings.rewriteFeedbackMaxAttempts = Math.max(0, Math.min(4, Math.trunc(rewriteFeedbackMaxAttempts)));
  }
  const maxTokens = Number(args.maxTokens ?? args.max_tokens ?? 0);
  if (Number.isFinite(maxTokens) && maxTokens > 0) {
    settings.maxTokens = Math.trunc(maxTokens);
  }
  const layeredRevisionMaxAttempts = Number(args.layeredRevisionMaxAttempts ?? args.layered_revision_max_attempts ?? 0);
  if (Number.isFinite(layeredRevisionMaxAttempts) && layeredRevisionMaxAttempts > 0) {
    settings.layeredRevisionMaxAttempts = Math.max(1, Math.min(6, Math.trunc(layeredRevisionMaxAttempts)));
  }
  const globalRevisionCandidateMaxAttempts = Number(args.globalRevisionCandidateMaxAttempts ?? args.global_revision_candidate_max_attempts ?? 0);
  if (Number.isFinite(globalRevisionCandidateMaxAttempts) && globalRevisionCandidateMaxAttempts > 0) {
    settings.globalRevisionCandidateMaxAttempts = Math.max(1, Math.min(8, Math.trunc(globalRevisionCandidateMaxAttempts)));
  }
  const temperature = Number(args.temperature);
  if (Number.isFinite(temperature)) {
    settings.temperature = temperature;
  }
  const model = String(args.model || '').trim();
  if (model) {
    settings.model = model;
  }
  const autoRetrievalPlanning = args.autoRetrievalPlanning ?? args.auto_retrieval_planning;
  if (autoRetrievalPlanning === 'true') {
    settings.autoRetrievalPlanning = true;
  }
  const retrievalPlannerTemperature = Number(args.retrievalPlannerTemperature ?? args.retrieval_planner_temperature);
  if (Number.isFinite(retrievalPlannerTemperature)) {
    settings.retrievalPlannerTemperature = retrievalPlannerTemperature;
  }
  const retrievalPlannerMaxTokens = Number(args.retrievalPlannerMaxTokens ?? args.retrieval_planner_max_tokens);
  if (Number.isFinite(retrievalPlannerMaxTokens) && retrievalPlannerMaxTokens > 0) {
    settings.retrievalPlannerMaxTokens = Math.trunc(retrievalPlannerMaxTokens);
  }
  return settings;
}

function buildRevisionSettings(args) {
  if (args.revision === 'false' || args.revisionEnabled === 'false' || args.revision_enabled === 'false') {
    return undefined;
  }
  const layered = args.layeredRevision === 'true'
    || args.layered_revision === 'true'
    || args.revisionLayered === 'true'
    || args.revision_layered === 'true';
  const enabled = args.revision !== 'false' && (args.revision === 'true'
    || args.revisionEnabled === 'true'
    || args.revision_enabled === 'true'
    || layered
    || args.revision == null);
  return {
    enabled,
    layered: layered || enabled,
  };
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

async function runGenerateArticleJob(input) {
  const idempotencyKey = `contentbase-article-smoke-${Date.now()}`;
  const created = await postRuntimeJson(`${input.baseUrl}/api/novel/runtime/jobs`, {
    capabilityId: 'runtime.generate.article',
    idempotencyKey,
    requestedBy: 'contentbase-mvp-smoke',
    input: input.request,
  });
  if (!created?.id) {
    throw new Error('runtime.jobs.create did not return a job id');
  }
  let job = created;
  const startedAt = Date.now();
  while (Date.now() - startedAt <= input.timeoutMs) {
    if (job.status === 'succeeded') {
      if (!job.result || typeof job.result !== 'object') {
        throw new Error(`runtime job ${job.id} succeeded without result`);
      }
      return {
        result: job.result,
        transport: {
          mode: 'runtime_job',
          createEndpoint: '/api/novel/runtime/jobs',
          getEndpoint: `/api/novel/runtime/jobs/${job.id}`,
          jobId: job.id,
          status: job.status,
          runtime: job.runtime,
          idempotencyKey,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
        },
      };
    }
    if (job.status === 'failed' || job.status === 'cancelled') {
      const error = new Error(`runtime job ${job.id} ${job.status}: ${job.error || job.cancelReason || 'unknown error'}`);
      error.payload = job;
      throw error;
    }
    await sleep(input.pollIntervalMs);
    job = await getRuntimeJson(`${input.baseUrl}/api/novel/runtime/jobs/${encodeURIComponent(job.id)}`);
  }
  const error = new Error(`runtime job ${job.id} did not finish within ${input.timeoutMs}ms`);
  error.payload = job;
  throw error;
}

async function getRuntimeJson(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  const text = await response.text();
  let payload = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`runtime job read returned non-JSON response: HTTP ${response.status}`);
    }
  }
  if (!response.ok || payload?.success === false) {
    const error = new Error(`runtime job read failed: HTTP ${response.status} ${payload?.error || text}`);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload?.data || payload;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeReport(report) {
  const outputDir = path.join(productRoot, '.runtime', 'acceptance');
  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, `generate-article-mvp-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  return reportPath;
}

function writeBodyFile(body, input) {
  const outputDir = path.join(productRoot, '.runtime', 'acceptance', 'bodies');
  fs.mkdirSync(outputDir, { recursive: true });
  const safeTopic = String(input.topic || 'article')
    .replace(/[\\/:*?"<>|\r\n]+/g, '_')
    .slice(0, 48)
    || 'article';
  const bodyPath = path.join(
    outputDir,
    `generate-article-mvp-${Date.now()}-w${input.workId}-c${input.chapterNumber}-${safeTopic}.md`,
  );
  fs.writeFileSync(bodyPath, `${String(body || '').trim()}\n`, 'utf8');
  return bodyPath;
}
