import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const WRITER_SYSTEM_PROMPT = `你是 Writer。只输出正文。

你写散文。散文的意思是：判断藏在描写里，立场藏在选词里，暴力藏在精确里。你不需要单独"表达观点"——你选择描写什么、忽略什么，用哪个词不用哪个词，这本身就是你的全部立场。

你读过鲁迅。他的判断在动词里，不在形容词里。你读过三岛。他的描写精确到让人不安。你读过内藤湖南。他的语气平淡得像在说天气，判断却冷到骨头里。

你的描写性文字必须来自 [LITERARY] 通道中的材料化用。不得自行编造意象和场景。从 [LITERARY] 里找到与当前论证相关的描写片段——一个动作、一个物件、一句话的节奏——化用到你的正文中。每 1000 字至少有一处明确来自 [LITERARY] 材料的化用。

化用的方式：
- 借用某个作者的句式节奏说当下的事（鲁迅的短句判断节奏用来评价当代政治）
- 借用具体意象嵌入论证（三岛描写物件的精确方式用来写一个制度细节）
- 借用某段文字的情绪温度（内藤湖南的冷淡语气用来下一个残酷判断）
- 直接化用一个文学表达来替代你自己的概括（用鲁迅的某个说法替代你想说的"日本精英的沉默"）

5处以上化用是底线。读者应该能感觉到这篇文章背后站着鲁迅、三岛、内藤湖南，但找不到任何一句直接搬运。

你就是这样写。句子短的时候像钉子。长的时候像绳索，把人勒住才松手。段落长短不规则。有的段落一句话。有的拖八句。不工整。

你的转折不用"然而""但是""不过"。你直接硬切到下一个事实。让读者自己感受落差。

绝对禁止出现的词和句式（出现即为失败）：
"说白了" "换个说法" "这就是…的本质/形态/困境" "比起XX，我更愿意称之为YY"
"此外" "与此同时" "不仅如此" "更为重要的是" "值得注意的是"
"尽管如此" "不可否认" "总而言之" "综上所述" "归根结底"
"具体而言" "换言之" "事实上" "客观来说" "然而" "但是" "不过"
全文"不是A，是B"/"不是A，而是B"句式最多1次。多了直接陈述你认为对的那个。

你有立场。你的立场不通过宣言表达，通过选材表达。你选择写冲绳被占的土地面积，不写"日美友好"的联合声明。你选择写日本政客被召见的细节，不写"平等磋商"的官方措辞。你引用北一辉的判断时不加"当然他后来走向了极端"这种缓冲。你引用内藤湖南时不加"虽然他的观点在今天看来有局限性"。

你不做平衡术。不写"也要承认""不可否认""客观来说"。对方的逻辑你用一句话概括然后拆掉。不给它整段展示空间。你不预设反方观点再逐条反驳——那是辩论赛，不是散文。你只管往前走，走到哪里算哪里。

你不在结尾回到开头。不做首尾呼应。不升华。不总结。不展望未来。不画大饼。结尾必须停在一个具体的、残酷的事实上——一个数字、一个制度细节、一个没有出路的困境。让读者自己感受重量。

文白夹杂。正式处用文言词。叙事用白话。节奏学 [LITERARY] 里的范本。

基于 [REALITY] 写事实，基于 [LITERARY] 化用描写，基于 [AUTHOR] 取方向。直接输出正文。

你的知识地图不均匀。你对以下领域了如指掌：欧洲中世纪政治史、近代东亚（明治到昭和）、奥斯曼帝国及其继承国、京都学派史学方法。你对当代美国内政和金融市场只是"听说过"的程度。这种不均匀体现在选材和详略上——熟悉的领域给具体人名、年份、条约名；不熟的领域一句话带过，不展开。

你的视角是国家主义/现实主义的。你关注国家能力、秩序、权力结构。你对自由主义叙事持怀疑态度。你不做道德判断——你只看结构性问题和权力运作逻辑。当你需要评价一个政策或一个历史事件时，你问的是"这对国家能力意味着什么"，不是"这是否符合普世价值"。这个视角不通过宣言表达，通过选材表达。

你不是全知视角。你是一个有偏好的读者在写东西。你的偏好不通过宣言表达，通过你选择在哪里停留、在哪里加速来表达。`;

process.env.CONTENTBASE_WORKSPACE_ROOT ||= __dirname;

// Production: load compiled JS. Development: use ts-node for live TS.
let buildArticleContextEngine;
const compiledPath = path.join(__dirname, 'product', 'novel', 'dist', 'product', 'novel', 'app', 'article', 'context-engine.js');
if (fs.existsSync(compiledPath)) {
  ({ buildArticleContextEngine } = require(compiledPath));
} else {
  process.env.TS_NODE_TRANSPILE_ONLY = '1';
  process.env.TS_NODE_SKIP_PROJECT = '1';
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
    module: 'CommonJS',
    moduleResolution: 'Node',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    target: 'ES2020',
    resolveJsonModule: true,
    ignoreDeprecations: '6.0',
  });
  require('ts-node/register/transpile-only');
  ({ buildArticleContextEngine } = require('./product/novel/app/article/context-engine.ts'));
}

loadRuntimeEnv();

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key.startsWith('--')) continue;
  const value = process.argv[index + 1] && !process.argv[index + 1].startsWith('--') ? process.argv[index + 1] : '';
  args.set(key.slice(2), value);
}

const port = Number(args.get('port') || process.env.CONTENTBASE_CONSOLE_PORT || 5101);
const CONTENTBASE_API_KEY = String(process.env.CONTENTBASE_API_KEY || '').trim();
const runtimeJobs = new Map();
const JOBS_PERSIST_PATH = path.join(__dirname, '.runtime', 'jobs.json');

function loadPersistedJobs() {
  try {
    if (!fs.existsSync(JOBS_PERSIST_PATH)) return;
    const data = JSON.parse(fs.readFileSync(JOBS_PERSIST_PATH, 'utf8'));
    if (!Array.isArray(data)) return;
    const now = new Date().toISOString();
    for (const job of data) {
      if (job.status === 'running' || job.status === 'queued') {
        job.status = 'failed';
        job.error = 'interrupted by server restart';
        job.finishedAt = now;
        job.updatedAt = now;
      }
      runtimeJobs.set(job.id, job);
    }
  } catch {}
}

function persistJobs() {
  try {
    const dir = path.dirname(JOBS_PERSIST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const jobs = [...runtimeJobs.values()].slice(-200);
    fs.writeFileSync(JOBS_PERSIST_PATH, JSON.stringify(jobs, null, 2));
  } catch {}
}

loadPersistedJobs();
const runtimeActionIds = [
  'plan-work',
  'plan-volume',
  'generate-chapter',
  'revise-chapter',
  'check-continuity',
  'prepare-publication',
];
const runtimeCapabilities = [
  {
    id: 'runtime.generate.article',
    owner: 'ContentBase',
    runtime: 'Corpus -> Retrieval -> Composition -> Writer',
    inputContract: {
      required: ['topic'],
      optional: ['genre', 'wordCount', 'target', 'settings', 'evidenceQuery', 'persist', 'workId', 'chapterNumber'],
    },
    outputContract: {
      draft: ['topic', 'target', 'body', 'modelInvocation'],
      trace: ['modelInvocation', 'context'],
      context: ['evidence', 'diagnostics'],
    },
  },
  {
    id: 'runtime.generate.chapter',
    owner: 'ContentBase',
    runtime: 'Corpus -> Retrieval -> Composition -> Writer',
    inputContract: {
      required: ['topic'],
      optional: ['workId', 'chapterNumber', 'genre', 'wordCount', 'target', 'settings', 'evidenceQuery', 'persist'],
    },
    outputContract: {
      draft: ['topic', 'target', 'body', 'modelInvocation'],
      trace: ['modelInvocation', 'context'],
      context: ['evidence', 'diagnostics'],
    },
  },
  {
    id: 'runtime.actions.novel',
    owner: 'ContentBase',
    runtime: 'Action contract -> Corpus -> Retrieval -> Composition -> Writer',
    inputContract: {
      required: ['action'],
      optional: ['workId', 'chapterId', 'chapterNumber', 'title', 'topic', 'targetContract', 'settings'],
      forbidden: ['freeformPrompt', 'systemPromptOverride'],
    },
    outputContract: {
      required: ['draft', 'trace', 'diagnostics', 'contractUsed', 'violations', 'nextAllowedActions'],
      actions: runtimeActionIds,
    },
  },
];

function checkAuth(req, res) {
  if (!CONTENTBASE_API_KEY) return true;
  const auth = req.headers['authorization'] || req.headers['x-api-key'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (token === CONTENTBASE_API_KEY) return true;
  writeJson(res, 401, { success: false, error: 'Unauthorized: invalid or missing API key' });
  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  try {
    if (req.method === 'OPTIONS') {
      writeJson(res, 204, null);
      return;
    }
    if (url.pathname === '/api/health' || url.pathname === '/healthz' || url.pathname === '/api/novel/health') {
      writeJson(res, 200, {
        success: true,
        data: {
          service: 'contentbase',
          runtime: 'corpus-retrieval-composition-writer',
          generatedAt: new Date().toISOString(),
          uptimeSec: Math.round(process.uptime()),
        },
      });
      return;
    }
    if (url.pathname === '/api/novel/runtime/capabilities' && req.method === 'GET') {
      if (!checkAuth(req, res)) return;
      writeJson(res, 200, {
        success: true,
        data: {
          version: 'contentbase-runtime-capabilities.v1',
          runtime: 'corpus-retrieval-composition-writer',
          capabilities: runtimeCapabilities,
          actions: runtimeActionIds.map((action) => runtimeActionContract(action)),
        },
      });
      return;
    }
    const actionMatch = url.pathname.match(/^\/api\/novel\/runtime\/actions\/([^/]+)$/);
    if (actionMatch && req.method === 'POST') {
      if (!checkAuth(req, res)) return;
      const action = decodeURIComponent(actionMatch[1]);
      const input = await readJson(req);
      const data = await runRuntimeAction(action, input);
      writeJson(res, 200, { success: true, data });
      return;
    }
    if (url.pathname === '/api/content/runtime/generate/article' && req.method === 'POST') {
      if (!checkAuth(req, res)) return;
      const input = await readJson(req);
      const data = await generateArticle(input);
      writeJson(res, 200, { success: true, data });
      return;
    }
    if (
      (url.pathname === '/api/novel/runtime/generate/article'
        || url.pathname === '/api/novel/runtime/generate/chapter')
      && req.method === 'POST'
    ) {
      if (!checkAuth(req, res)) return;
      const input = await readJson(req);
      const data = await generateArticle(input);
      writeJson(res, 200, { success: true, data: toRuntimeArticleResult(data, input) });
      return;
    }
    if (url.pathname === '/api/novel/runtime/jobs' && req.method === 'POST') {
      if (!checkAuth(req, res)) return;
      const input = await readJson(req);
      const job = createRuntimeJob(input);
      runtimeJobs.set(job.id, job);
      persistJobs();
      void runRuntimeJob(job.id);
      writeJson(res, 200, { success: true, data: job });
      return;
    }
    const jobMatch = url.pathname.match(/^\/api\/novel\/runtime\/jobs\/([^/]+)$/);
    if (jobMatch && req.method === 'GET') {
      if (!checkAuth(req, res)) return;
      const job = runtimeJobs.get(decodeURIComponent(jobMatch[1]));
      if (!job) {
        writeJson(res, 404, { success: false, error: 'runtime job not found' });
        return;
      }
      writeJson(res, 200, { success: true, data: job });
      return;
    }
    const cancelMatch = url.pathname.match(/^\/api\/novel\/runtime\/jobs\/([^/]+)\/cancel$/);
    if (cancelMatch && req.method === 'POST') {
      if (!checkAuth(req, res)) return;
      const body = await readJson(req);
      const job = runtimeJobs.get(decodeURIComponent(cancelMatch[1]));
      if (!job) {
        writeJson(res, 404, { success: false, error: 'runtime job not found' });
        return;
      }
      const now = new Date().toISOString();
      if (job.status === 'queued') {
        job.status = 'cancelled';
        job.cancelReason = String(body?.reason || 'cancelled_by_request');
        job.finishedAt = now;
      } else if (!['succeeded', 'failed', 'cancelled'].includes(job.status)) {
        job.cancelReason = String(body?.reason || 'cancel_requested');
      }
      job.updatedAt = now;
      runtimeJobs.set(job.id, job);
      persistJobs();
      writeJson(res, 200, { success: true, data: job });
      return;
    }
    if (url.pathname === '/api/corpus/diagnostics' && req.method === 'GET') {
      if (!checkAuth(req, res)) return;
      const data = await corpusDiagnostics();
      writeJson(res, 200, { success: true, data });
      return;
    }
    if (url.pathname === '/' && req.method === 'GET') {
      writeText(res, 200, 'ContentBase Corpus runtime');
      return;
    }
    writeJson(res, 404, { success: false, error: 'Not Found', path: url.pathname });
  } catch (error) {
    writeJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.requestTimeout = 20 * 60 * 1000;
server.headersTimeout = 60 * 1000;
server.keepAliveTimeout = 5 * 1000;

server.listen(port, () => {
  console.log(`[ContentBase] Corpus runtime listening on http://127.0.0.1:${port}`);
});

async function generateArticle(request) {
  const topic = String(request?.topic || '').trim();
  if (!topic) {
    throw new Error('topic is required');
  }
  const targetWordCount = Number(request?.wordCount || request?.structure?.targetWordCount || request?.targetWordCount || 2400);
  const effectiveTarget = Number.isFinite(targetWordCount) && targetWordCount > 0 ? Math.trunc(targetWordCount) : 2400;
  const context = await buildArticleContextEngine({
    request,
    topic,
    targetWordCount: effectiveTarget,
  });
  const modelInvocation = await callSingleWriter(context.prompt, { ...request?.settings, genre: request?.genre || '' });
  let body = String(modelInvocation.body || '').trim();
  if (!body) {
    throw new Error('Writer returned no article body');
  }

  // Post-processing: minimal deterministic cleanup (no LLM)
  if (body.length > 1000) {
    body = deterministicDeAI(body);
  }

  return {
    draft: {
      body,
      modelInvocation: modelInvocation.trace,
    },
    context: {
      evidence: {
        pack: context.evidencePack,
      },
      diagnostics: context.diagnostics,
    },
    trace: {
      modelInvocation: modelInvocation.trace,
      context: {
        diagnostics: context.diagnostics,
      },
    },
  };
}

function createRuntimeJob(request) {
  const capabilityId = String(request?.capabilityId || '').trim();
  if (!runtimeCapabilities.some((capability) => capability.id === capabilityId)) {
    throw new Error('unsupported runtime capability');
  }
  const input = request?.input && typeof request.input === 'object' && !Array.isArray(request.input)
    ? request.input
    : {};
  if (!String(input.topic || '').trim()) {
    throw new Error('topic is required');
  }
  const id = String(request?.idempotencyKey || '').trim() || `cbjob_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  return {
    id,
    capabilityId,
    status: 'queued',
    runtime: 'contentbase',
    requestedBy: String(request?.requestedBy || 'contentbase-runtime').trim(),
    createdAt: now,
    updatedAt: now,
    input,
  };
}

async function runRuntimeJob(jobId) {
  let job = runtimeJobs.get(jobId);
  if (!job || job.status !== 'queued') return;
  const startedAt = new Date().toISOString();
  job = { ...job, status: 'running', startedAt, updatedAt: startedAt };
  runtimeJobs.set(jobId, job);
  persistJobs();
  try {
    const data = await generateArticle(job.input);
    const finishedAt = new Date().toISOString();
    job = {
      ...job,
      status: 'succeeded',
      result: toRuntimeArticleResult(data, job.input),
      finishedAt,
      updatedAt: finishedAt,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    job = {
      ...job,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      finishedAt,
      updatedAt: finishedAt,
    };
  }
  runtimeJobs.set(jobId, job);
  persistJobs();
}

function toRuntimeArticleResult(data, input) {
  const draft = data?.draft || {};
  const body = String(draft.body || '');
  const modelInvocation = draft.modelInvocation || data?.trace?.modelInvocation || null;
  const diagnostics = data?.context?.diagnostics || data?.trace?.context?.diagnostics || null;
  return {
    runtimeVersion: 'contentbase-runtime.v1',
    draft: {
      title: String(input?.title || input?.topic || ''),
      target: String(input?.target || ''),
      topic: String(input?.topic || ''),
      body,
      referenceCoverage: {
        evidenceSources: data?.context?.evidence?.pack?.sources?.length ?? null,
        evidenceChunks: data?.context?.evidence?.pack?.chunks?.length ?? null,
        evidenceCitations: data?.context?.evidence?.pack?.citations?.length ?? null,
      },
      frontmatter: {
        workId: input?.workId ?? null,
        chapterNumber: input?.chapterNumber ?? null,
        persist: input?.persist ?? null,
      },
    },
    context: data?.context || null,
    trace: {
      ...(data?.trace || {}),
      modelInvocation,
      context: {
        diagnostics,
      },
    },
    quality: {
      bodyChars: body.length,
      hasBody: body.length > 0,
      model: modelInvocation?.model || null,
      provider: modelInvocation?.provider || null,
    },
    acceptance: {
      status: body.length > 0 ? 'accepted' : 'blocked',
      checks: {
        bodyPresent: body.length > 0,
        modelInvocationPresent: Boolean(modelInvocation?.model),
        evidencePackPresent: Boolean(data?.context?.evidence?.pack),
      },
    },
    persisted: null,
    acceptancePersisted: null,
    referenceUsagePersisted: null,
    styleRevisionPairsPersisted: null,
    experiencePersisted: null,
  };
}

async function runRuntimeAction(action, request) {
  const contractUsed = runtimeActionContract(action);
  if (!runtimeActionIds.includes(action)) {
    return runtimeActionEnvelope({
      action,
      contractUsed,
      diagnostics: { status: 'blocked', reason: 'unknown_action' },
      violations: [runtimeViolation('unknown_action', `unsupported runtime action: ${action}`)],
    });
  }

  if (hasForbiddenPromptOverride(request)) {
    return runtimeActionEnvelope({
      action,
      contractUsed,
      diagnostics: { status: 'blocked', reason: 'forbidden_prompt_override' },
      violations: [
        runtimeViolation(
          'forbidden_prompt_override',
          'runtime actions do not accept freeformPrompt, prompt, messages, or systemPromptOverride'
        ),
      ],
    });
  }

  if (action === 'revise-chapter') {
    return await runReviseChapterAction(request, contractUsed);
  }

  if (action === 'check-continuity') {
    return await runCheckContinuityAction(request, contractUsed);
  }

  if (action !== 'generate-chapter') {
    return runtimeActionEnvelope({
      action,
      contractUsed,
      diagnostics: {
        status: 'blocked',
        reason: 'action_contract_only',
        detail: 'This endpoint is reserved, but the implementation is not enabled in this runtime yet.',
      },
      violations: [runtimeViolation('action_not_implemented', `${action} is not implemented yet`)],
    });
  }

  const normalized = normalizeGenerateChapterActionInput(request);
  if (normalized.violations.length) {
    return runtimeActionEnvelope({
      action,
      contractUsed,
      diagnostics: { status: 'blocked', reason: 'invalid_action_input' },
      violations: normalized.violations,
    });
  }

  const data = await generateArticle(normalized.input);
  const result = toRuntimeArticleResult(data, normalized.input);
  return runtimeActionEnvelope({
    action,
    contractUsed,
    draft: result.draft,
    trace: result.trace,
    diagnostics: result.context?.diagnostics || null,
    nextAllowedActions: ['revise-chapter', 'check-continuity', 'prepare-publication'],
  });
}

function normalizeGenerateChapterActionInput(request) {
  const targetContract = request?.targetContract && typeof request.targetContract === 'object'
    ? request.targetContract
    : {};
  const chapterContract = {
    characters: request?.characters ?? targetContract.characters ?? null,
    background: request?.background ?? targetContract.background ?? null,
    outline: request?.outline ?? targetContract.outline ?? null,
    constraints: request?.constraints ?? targetContract.constraints ?? null,
  };
  const topic = String(
    request?.topic
      || request?.title
      || targetContract.topic
      || targetContract.title
      || buildTopicFromChapterContract(chapterContract)
      || ''
  ).trim();
  const violations = [];
  if (!topic) {
    violations.push(runtimeViolation('topic_required', 'generate-chapter requires topic or title'));
  }
  return {
    violations,
    input: {
      ...request,
      targetContract: {
        ...targetContract,
        ...chapterContract,
      },
      topic,
      title: request?.title || targetContract.title || topic,
      workId: request?.workId || targetContract.workId || null,
      chapterId: request?.chapterId || targetContract.chapterId || null,
      chapterNumber: request?.chapterNumber || targetContract.chapterNumber || null,
      genre: request?.genre || targetContract.genre || '小说章节',
      routeHint: 'fiction',
      wordCount: request?.wordCount || targetContract.wordCount || targetContract.targetWordCount || undefined,
      settings: request?.settings && typeof request.settings === 'object' ? request.settings : {},
    },
  };
}

const REVISER_SYSTEM_PROMPT = `你是 Reviser。你接收一篇已完成的初稿，做定向修订后输出完整修订稿。

修订原则：
- 不改变情节走向、人物关系、事件顺序
- 不增删段落结构，只做句级和段级打磨
- 修复节奏断裂：过长的匀速段落需要打断，过短的碎片需要合并
- 修复 AI 腔残留：删除"此外""值得注意的是""不可否认"等连接词；删除首尾呼应式总结
- 补充化用密度：每 1000 字至少一处来自上下文材料的化用（借用句式节奏、具体意象、情绪温度）
- 人物行为一致性：对照提供的人物表和前文摘要，修复称呼错误、性格矛盾
- 描写锚点：空洞的形容替换为具体物件、动作、数字
- 结尾必须停在具体事实上，不升华不总结

输出规则：
- 只输出修订后的完整正文，不要输出修订说明
- 保持原文风格和语气`;

async function runReviseChapterAction(request, contractUsed) {
  const body = String(request?.body || request?.draft?.body || '').trim();
  if (!body) {
    return runtimeActionEnvelope({
      action: 'revise-chapter',
      contractUsed,
      diagnostics: { status: 'blocked', reason: 'missing_draft_body' },
      violations: [runtimeViolation('body_required', 'revise-chapter requires body or draft.body')],
    });
  }

  const workId = request?.workId || request?.targetContract?.workId || null;
  const chapterNumber = request?.chapterNumber || request?.targetContract?.chapterNumber || null;
  const targetContract = request?.targetContract || {};

  let storyContext = '';
  if (workId) {
    storyContext = await fetchStoryMemoryForRevision(workId, chapterNumber);
  }

  const revisionPrompt = buildRevisionPrompt(body, {
    storyContext,
    characters: targetContract.characters || request?.characters || '',
    outline: targetContract.outline || request?.outline || '',
    background: targetContract.background || request?.background || '',
  });

  const settings = {
    genre: '小说章节',
    routeHint: 'fiction',
    temperature: 0.2,
    maxTokens: 6144,
    ...(request?.settings || {}),
  };

  const result = await callReviser(revisionPrompt, settings);
  let revisedBody = String(result.body || '').trim();

  if (!revisedBody || revisedBody.length < body.length * 0.5) {
    return runtimeActionEnvelope({
      action: 'revise-chapter',
      contractUsed,
      diagnostics: { status: 'failed', reason: 'revision_too_short', originalLength: body.length, revisedLength: revisedBody.length },
      violations: [runtimeViolation('revision_failed', 'revised output is less than 50% of original')],
    });
  }

  if (revisedBody.length > 1000) {
    revisedBody = deterministicDeAI(revisedBody);
  }

  return runtimeActionEnvelope({
    action: 'revise-chapter',
    contractUsed,
    draft: {
      body: revisedBody,
      originalLength: body.length,
      revisedLength: revisedBody.length,
      modelInvocation: result.trace,
    },
    trace: {
      action: 'revise-chapter',
      modelInvocation: result.trace,
      generatedAt: new Date().toISOString(),
    },
    diagnostics: { status: 'ok', revisionRatio: (revisedBody.length / body.length).toFixed(2) },
    nextAllowedActions: ['check-continuity', 'prepare-publication'],
  });
}

async function runCheckContinuityAction(request, contractUsed) {
  const body = String(request?.body || request?.draft?.body || '').trim();
  if (!body) {
    return runtimeActionEnvelope({
      action: 'check-continuity',
      contractUsed,
      diagnostics: { status: 'blocked', reason: 'missing_draft_body' },
      violations: [runtimeViolation('body_required', 'check-continuity requires body or draft.body')],
    });
  }

  const workId = request?.workId || request?.targetContract?.workId || null;
  const chapterNumber = request?.chapterNumber || request?.targetContract?.chapterNumber || null;

  if (!workId) {
    return runtimeActionEnvelope({
      action: 'check-continuity',
      contractUsed,
      diagnostics: { status: 'blocked', reason: 'missing_work_id' },
      violations: [runtimeViolation('work_id_required', 'check-continuity requires workId to fetch prior chapters')],
    });
  }

  const storyContext = await fetchStoryMemoryForRevision(workId, chapterNumber);
  const characters = await fetchCharactersForWork(workId);

  const checkPrompt = buildContinuityCheckPrompt(body, {
    storyContext,
    characters,
    chapterNumber,
  });

  const settings = {
    genre: '小说章节',
    routeHint: 'fiction',
    temperature: 0.1,
    maxTokens: 2048,
    ...(request?.settings || {}),
  };

  const result = await callContinuityChecker(checkPrompt, settings);
  const report = parseContinuityReport(result.body);

  return runtimeActionEnvelope({
    action: 'check-continuity',
    contractUsed,
    draft: null,
    trace: {
      action: 'check-continuity',
      modelInvocation: result.trace,
      generatedAt: new Date().toISOString(),
    },
    diagnostics: {
      status: report.passed ? 'ok' : 'warning',
      continuityReport: report,
    },
    nextAllowedActions: report.passed ? ['prepare-publication'] : ['revise-chapter'],
  });
}

async function fetchStoryMemoryForRevision(workId, chapterNumber) {
  const gatewayUrl = String(process.env.DATABASE_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  if (!gatewayUrl) return '';
  const apiKey = String(process.env.DATABASE_GATEWAY_API_KEY || '').trim();
  const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};

  // Strategy 1: try story-memory/context (structured events/growth)
  try {
    const r = await fetch(`${gatewayUrl}/creative/story-memory/context?workId=${workId}${chapterNumber ? `&currentChapter=${chapterNumber}` : ''}`, { headers, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const data = await r.json();
      if (data?.summary && data.summary.length > 50) return data.summary;
    }
  } catch {}

  // Strategy 2: fallback to reading previous 3 chapters' content directly
  if (!chapterNumber || chapterNumber <= 1) return '';
  const summaries = [];
  for (let i = Math.max(1, chapterNumber - 3); i < chapterNumber; i++) {
    try {
      const r = await fetch(`${gatewayUrl}/content/publication/publish-chapter?local_work_id=${workId}&chapter_number=${i}`, { headers, signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const data = await r.json();
      const content = data?.chapter?.content || '';
      const title = data?.chapter?.title || `第${i}章`;
      if (content) summaries.push(`【第${i}章 ${title}】${content.slice(0, 600)}...`);
    } catch {}
  }
  return summaries.join('\n\n');
}

function buildRevisionPrompt(body, context) {
  const parts = [];
  if (context.storyContext) {
    parts.push('[前文摘要]');
    parts.push(context.storyContext.slice(0, 2000));
    parts.push('');
  }
  if (context.characters) {
    parts.push('[人物表]');
    parts.push(formatContractText(context.characters).slice(0, 800));
    parts.push('');
  }
  if (context.outline) {
    parts.push('[本章大纲]');
    parts.push(formatContractText(context.outline).slice(0, 600));
    parts.push('');
  }
  if (context.background) {
    parts.push('[背景]');
    parts.push(formatContractText(context.background).slice(0, 600));
    parts.push('');
  }
  parts.push('[待修订初稿]');
  parts.push(body);
  parts.push('');
  parts.push('[修订指令]');
  parts.push('对照前文摘要和人物表，修订以上初稿。只输出修订后的完整正文。');
  return parts.join('\n');
}

async function callReviser(prompt, settings) {
  const isNarrative = String(settings?.genre || settings?.routeHint || '').match(/narrative|fiction|小说|章节/i);
  let baseUrl, apiKey, model;
  if (isNarrative && process.env.CONTENTBASE_QWEN_BASE_URL) {
    baseUrl = String(process.env.CONTENTBASE_QWEN_BASE_URL || '').trim().replace(/\/+$/, '');
    apiKey = String(process.env.CONTENTBASE_QWEN_API_KEY || '').trim();
    model = String(settings?.model || process.env.CONTENTBASE_QWEN_MODEL || 'qwen-max').trim();
  } else {
    baseUrl = String(process.env.CONTENTBASE_LLM_BASE_URL || '').trim().replace(/\/+$/, '');
    apiKey = String(process.env.CONTENTBASE_LLM_API_KEY || '').trim();
    model = String(settings?.model || process.env.CONTENTBASE_LLM_MODEL || '').trim();
  }
  if (!baseUrl) throw new Error('CONTENTBASE_LLM_BASE_URL is required');
  if (!apiKey) throw new Error('CONTENTBASE_LLM_API_KEY is required');
  if (!model) throw new Error('CONTENTBASE_LLM_MODEL is required');

  const temperature = Number.isFinite(Number(settings?.temperature)) ? Number(settings.temperature) : 0.2;
  const maxTokens = Number.isFinite(Number(settings?.maxTokens)) && Number(settings.maxTokens) > 0
    ? Math.trunc(Number(settings.maxTokens)) : 6144;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: REVISER_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });
      if (!response.ok) {
        if (attempt < 2) continue;
        const errText = await response.text().catch(() => '');
        throw new Error(`LLM gateway returned HTTP ${response.status}: ${errText.slice(0, 240)}`);
      }
      let fullContent = '';
      let usage = null;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
            if (chunk.usage) usage = chunk.usage;
          } catch {}
        }
      }
      if (!fullContent && attempt < 2) continue;
      return {
        body: fullContent,
        trace: { provider: 'openai-compatible', model, baseUrl, usage, finishedAt: new Date().toISOString() },
      };
    } catch (err) {
      if (attempt < 2) continue;
      throw err;
    }
  }
}

async function fetchCharactersForWork(workId) {
  const gatewayUrl = String(process.env.DATABASE_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  if (!gatewayUrl) return '';
  const apiKey = String(process.env.DATABASE_GATEWAY_API_KEY || '').trim();
  const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
  try {
    const r = await fetch(`${gatewayUrl}/content/works/${workId}/characters`, { headers, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return '';
    const data = await r.json();
    const chars = data?.characters || data || [];
    if (!Array.isArray(chars)) return '';
    return chars.map(c => `${c.name || c.character_name}（${c.role || c.description || ''}）`).join('；');
  } catch { return ''; }
}

function buildContinuityCheckPrompt(body, context) {
  const parts = [];
  parts.push('[检查任务]');
  parts.push('检查以下章节与前文的连续性。输出 JSON 格式的检查报告。');
  parts.push('');
  if (context.storyContext) {
    parts.push('[前文摘要]');
    parts.push(context.storyContext.slice(0, 2000));
    parts.push('');
  }
  if (context.characters) {
    parts.push('[人物表]');
    parts.push(context.characters.slice(0, 800));
    parts.push('');
  }
  if (context.chapterNumber) {
    parts.push(`[当前章节号] 第${context.chapterNumber}章`);
    parts.push('');
  }
  parts.push('[待检查正文]');
  parts.push(body.slice(0, 6000));
  parts.push('');
  parts.push('[输出格式]');
  parts.push('输出严格 JSON，不要其他文字：');
  parts.push('{"passed":true/false,"issues":[{"type":"character|timeline|setting|tone","severity":"critical|warning","description":"..."}]}');
  return parts.join('\n');
}

async function callContinuityChecker(prompt, settings) {
  const isNarrative = String(settings?.genre || settings?.routeHint || '').match(/narrative|fiction|小说|章节/i);
  let baseUrl, apiKey, model;
  if (isNarrative && process.env.CONTENTBASE_QWEN_BASE_URL) {
    baseUrl = String(process.env.CONTENTBASE_QWEN_BASE_URL || '').trim().replace(/\/+$/, '');
    apiKey = String(process.env.CONTENTBASE_QWEN_API_KEY || '').trim();
    model = String(settings?.model || process.env.CONTENTBASE_QWEN_MODEL || 'qwen-max').trim();
  } else {
    baseUrl = String(process.env.CONTENTBASE_LLM_BASE_URL || '').trim().replace(/\/+$/, '');
    apiKey = String(process.env.CONTENTBASE_LLM_API_KEY || '').trim();
    model = String(settings?.model || process.env.CONTENTBASE_LLM_MODEL || '').trim();
  }
  if (!baseUrl) throw new Error('CONTENTBASE_LLM_BASE_URL is required');
  if (!apiKey) throw new Error('CONTENTBASE_LLM_API_KEY is required');
  if (!model) throw new Error('CONTENTBASE_LLM_MODEL is required');

  const temperature = Number.isFinite(Number(settings?.temperature)) ? Number(settings.temperature) : 0.1;
  const maxTokens = Number.isFinite(Number(settings?.maxTokens)) && Number(settings.maxTokens) > 0
    ? Math.trunc(Number(settings.maxTokens)) : 2048;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: '你是连续性检查器。检查小说章节与前文的一致性，输出 JSON 报告。' },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      });
      if (!response.ok) {
        if (attempt < 2) continue;
        const errText = await response.text().catch(() => '');
        throw new Error(`LLM gateway returned HTTP ${response.status}: ${errText.slice(0, 240)}`);
      }
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content || '';
      return {
        body: content,
        trace: { provider: 'openai-compatible', model, baseUrl, usage: payload?.usage || null, finishedAt: new Date().toISOString() },
      };
    } catch (err) {
      if (attempt < 2) continue;
      throw err;
    }
  }
}

function parseContinuityReport(raw) {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        passed: Boolean(parsed.passed),
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      };
    }
  } catch {}
  return { passed: true, issues: [] };
}

function buildTopicFromChapterContract(contract) {
  const parts = [];
  if (contract?.outline) parts.push(`本章大纲：${formatContractText(contract.outline)}`);
  if (contract?.background) parts.push(`背景：${formatContractText(contract.background)}`);
  if (contract?.characters) parts.push(`人物：${formatContractText(contract.characters)}`);
  return parts.join('\n').trim();
}

function formatContractText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  return JSON.stringify(value);
}

function runtimeActionContract(action) {
  return {
    version: 'contentbase-runtime-action.v1',
    action,
    owner: 'ContentBase',
    durableStateOwner: 'DataBase Gateway',
    orchestratorRole: 'n8n may schedule and advance state, but must not own business truth or prompt assembly.',
    inputContract: {
      required: action === 'generate-chapter' ? ['topic or title'] : action === 'revise-chapter' ? ['body or draft.body'] : ['targetContract'],
      optional: ['workId', 'chapterId', 'chapterNumber', 'wordCount', 'settings', 'targetContract', 'characters', 'outline', 'background'],
      forbidden: ['freeformPrompt', 'prompt', 'messages', 'systemPromptOverride'],
    },
    outputContract: ['draft', 'trace', 'diagnostics', 'contractUsed', 'violations', 'nextAllowedActions'],
    nonGoals: [
      'n8n does not store durable story truth',
      'n8n does not assemble prompts',
      'ContentBase does not create DataBase schema from this endpoint',
      'missing evidence is not permission to invent facts',
    ],
  };
}

function runtimeActionEnvelope({ action, contractUsed, draft = null, trace = null, diagnostics = null, violations = [], nextAllowedActions = [] }) {
  return {
    runtimeVersion: 'contentbase-runtime-actions.v1',
    action,
    draft,
    trace: trace || {
      action,
      modelInvocation: null,
      generatedAt: new Date().toISOString(),
    },
    diagnostics: diagnostics || {
      status: violations.length ? 'blocked' : 'ok',
    },
    contractUsed,
    violations,
    nextAllowedActions,
  };
}

function runtimeViolation(code, message) {
  return {
    code,
    severity: 'blocking',
    message,
  };
}

function hasForbiddenPromptOverride(request) {
  if (!request || typeof request !== 'object') return false;
  return ['freeformPrompt', 'prompt', 'messages', 'systemPromptOverride'].some((key) => key in request);
}

function deterministicDeAI(text) {
  let result = text;

  // 1. Fix orphaned "而是" without preceding "不是" (broken sentence bug)
  result = result.replace(/([。\n])([^。\n]*?)(?<!不是[^。\n]*)而是/g, (match, prefix, middle) => {
    if (middle.includes('不是')) return match;
    return prefix + middle.replace(/而是/, '');
  });

  // 2. Limit "不是A，是B" pattern to max 1 occurrence
  const buShiPattern = /[。\n]([^。\n]*不是[^。\n]*[，,][^。\n]*是[^。\n]*[。])/g;
  let matches = [...result.matchAll(buShiPattern)];
  if (matches.length > 1) {
    for (let i = matches.length - 1; i >= 1; i--) {
      const original = matches[i][1];
      const rewritten = original.replace(/不是[^，,]*[，,]\s*/, '').replace(/^是/, '');
      result = result.replace(original, rewritten);
    }
  }

  // 3. Clean up multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}

async function callSingleWriter(prompt, settings) {
  // Model routing: fiction/narrative uses Qwen, everything else uses Claude
  const isNarrative = String(settings?.genre || settings?.routeHint || '').match(/narrative|fiction|小说|章节/i);
  let baseUrl, apiKey, model;

  if (isNarrative && process.env.CONTENTBASE_QWEN_BASE_URL) {
    baseUrl = String(process.env.CONTENTBASE_QWEN_BASE_URL || '').trim().replace(/\/+$/, '');
    apiKey = String(process.env.CONTENTBASE_QWEN_API_KEY || '').trim();
    model = String(settings?.model || process.env.CONTENTBASE_QWEN_MODEL || 'qwen-max').trim();
  } else {
    baseUrl = String(process.env.CONTENTBASE_LLM_BASE_URL || '').trim().replace(/\/+$/, '');
    apiKey = String(process.env.CONTENTBASE_LLM_API_KEY || '').trim();
    model = String(settings?.model || process.env.CONTENTBASE_LLM_MODEL || '').trim();
  }
  if (!baseUrl) {
    throw new Error('CONTENTBASE_LLM_BASE_URL is required');
  }
  if (!apiKey) {
    throw new Error('CONTENTBASE_LLM_API_KEY is required');
  }
  if (!model) {
    throw new Error('CONTENTBASE_LLM_MODEL is required');
  }
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: WRITER_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: Number.isFinite(Number(settings?.temperature)) ? Number(settings.temperature) : 0.4,
          max_tokens: Number.isFinite(Number(settings?.maxTokens)) && Number(settings.maxTokens) > 0
            ? Math.trunc(Number(settings.maxTokens))
            : 4096,
          stream: true,
        }),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        if (attempt < maxRetries) continue;
        throw new Error(`LLM gateway returned HTTP ${response.status}: ${errText.slice(0, 240)}`);
      }
      // Collect streamed SSE chunks into full response
      let fullContent = '';
      let usage = null;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
            if (chunk.usage) usage = chunk.usage;
          } catch {}
        }
      }
      if (!fullContent && attempt < maxRetries) continue;
      let payload = { choices: [{ message: { content: fullContent } }], usage };
      return {
        body: payload?.choices?.[0]?.message?.content || '',
        trace: {
          provider: 'openai-compatible',
          model,
          baseUrl,
          usage: payload?.usage || null,
          finishedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      if (attempt < maxRetries) continue;
      throw err;
    }
  }
}

async function corpusDiagnostics() {
  const gatewayUrl = String(process.env.DATABASE_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(process.env.DATABASE_GATEWAY_API_KEY || '').trim();
  if (!gatewayUrl) {
    return { error: 'DATABASE_GATEWAY_URL not configured', channels: {} };
  }

  const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};

  async function gw(path, label, timeoutMs = 15000) {
    try {
      const r = await fetch(`${gatewayUrl}${path}`, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (!r.ok) return { error: `${label}: HTTP ${r.status}` };
      return await r.json();
    } catch (e) {
      return { error: `${label}: ${e.message}` };
    }
  }

  const [tables, health, ragflow, litStats, semanticFull, vocabSample] = await Promise.all([
    gw('/inventory/tables', 'inventory'),
    gw('/health', 'health'),
    gw('/health/ragflow?retrieval=true&q=测试', 'ragflow', 8000),
    gw('/content/literature/stats', 'literature-stats'),
    gw('/semantic/units?search=&limit=300', 'semantic-full'),
    gw('/vocabulary/search?q=&limit=5', 'vocabulary-sample'),
  ]);

  const tableMap = {};
  if (Array.isArray(tables?.tables)) {
    for (const t of tables.tables) tableMap[t.name] = t;
  }

  const searchChunks = tableMap['search_chunks'] || {};
  const searchDocuments = tableMap['search_documents'] || {};
  const semanticUnitsTable = tableMap['semantic_units'] || {};
  const vocabTable = tableMap['vocabulary'] || {};
  const litTable = tableMap['literature'] || {};

  // Literature stats from lightweight gateway endpoint (no content bodies)
  const litCount = litStats?.count || litTable.approximateRows || 0;
  const litTotalChars = litStats?.totalChars || 0;
  const litByCategory = litStats?.byCategory || {};
  const litCompleteness = litStats?.completeness || {};
  const litDuplicateRate = litStats?.duplicateRate || '0%';
  const litDuplicateTitles = litStats?.duplicateTitles || [];
  const litItems = Array.isArray(litStats?.items) ? litStats.items : [];

  // Semantic units analysis
  const semItems = Array.isArray(semanticFull?.units) ? semanticFull.units : [];
  let semTotalChars = 0;
  const semByKind = {};
  for (const item of semItems) {
    const chars = (item.excerpt || '').length + (item.summary || '').length;
    semTotalChars += chars;
    const kind = item.materialKind || 'unknown';
    if (!semByKind[kind]) semByKind[kind] = { count: 0, chars: 0 };
    semByKind[kind].count++;
    semByKind[kind].chars += chars;
  }

  // Vocabulary analysis
  const vocabItems = Array.isArray(vocabSample?.results || vocabSample?.vocabulary) ? (vocabSample.results || vocabSample.vocabulary) : [];
  const vocabCount = vocabTable.approximateRows || 0;

  const docCount = searchDocuments.approximateRows || 0;
  const chunkCount = searchChunks.approximateRows || 0;
  const avgChunksPerDoc = docCount > 0 ? Math.round(chunkCount / docCount) : 0;

  const channels = {
    literary: {
      source: 'search_chunks + search/vector (RAGFlow)',
      documents: docCount,
      chunks: chunkCount,
      avgChunksPerDocument: avgChunksPerDoc,
      dataBytes: searchChunks.dataBytes || 0,
      dataMB: Math.round((searchChunks.dataBytes || 0) / 1048576),
      ragflowStatus: health?.optionalDownstreams?.ragflow || 'unknown',
      ragflowRetrieval: ragflow?.ok ? 'ok' : (ragflow?.error || 'unavailable'),
      ragflowChunks: ragflow?.retrieval?.chunkCount ?? null,
    },
    semantic: {
      source: 'semantic_units',
      units: semanticUnitsTable.approximateRows || 0,
      totalChars: semTotalChars,
      byMaterialKind: semByKind,
    },
    lexicon: {
      source: 'vocabulary + creative lexicon',
      terms: vocabTable.approximateRows || 0,
      dataBytes: vocabTable.dataBytes || 0,
    },
    structure: {
      source: 'creative_style_modules + editing_steps + quality_rules',
      modules: (tableMap['creative_style_modules'] || {}).approximateRows || 0,
      editingSteps: (tableMap['creative_editing_steps'] || {}).approximateRows || 0,
      qualityRules: (tableMap['creative_quality_rules'] || {}).approximateRows || 0,
    },
    author: {
      source: 'creative_author_techniques + author_interest_clusters',
      techniques: (tableMap['creative_author_techniques'] || {}).approximateRows || 0,
      interestClusters: (tableMap['author_interest_clusters'] || {}).approximateRows || 0,
    },
    reality: {
      source: 'evidence/search (web + ragflow retrieval)',
      note: 'dynamic per-query, not pre-indexed',
    },
  };

  const totalDataMB = Math.round(
    ((searchChunks.dataBytes || 0) + (semanticUnitsTable.dataBytes || 0) +
     (vocabTable.dataBytes || 0) + (litTable.dataBytes || 0)) / 1048576
  );

  const rerankerActive = Boolean(process.env.DASHSCOPE_API_KEY);

  return {
    generatedAt: new Date().toISOString(),
    gateway: {
      url: gatewayUrl,
      mysql: health?.checks?.mysql || 'unknown',
      ragflow: health?.optionalDownstreams?.ragflow || 'unknown',
    },
    summary: {
      totalDocuments: docCount,
      totalChunks: chunkCount,
      totalDataMB,
      literatureItems: litCount,
      literatureTotalChars: litTotalChars,
      semanticUnits: semanticUnitsTable.approximateRows || 0,
      semanticTotalChars: semTotalChars,
      vocabularyTerms: vocabCount,
      rerankerActive,
      rerankerKeepRatio: rerankerActive ? Number(process.env.CONTENTBASE_RERANKER_KEEP_RATIO || 0.65) : null,
    },
    quality: {
      duplication: {
        rate: litDuplicateRate,
        duplicateTitles: litDuplicateTitles,
      },
      completeness: {
        ragDocuments: docCount,
        ragChunks: chunkCount,
        avgChunksPerDocument: avgChunksPerDoc,
        literature: litCompleteness,
        semanticUnits: semItems.length,
        vocabularyTerms: vocabCount,
        semanticCoverage: semItems.length > 0 ? 'active' : 'empty',
        vocabularyCoverage: vocabItems.length > 0 ? 'active' : 'empty',
        structureModules: (tableMap['creative_style_modules'] || {}).approximateRows || 0,
        authorTechniques: (tableMap['creative_author_techniques'] || {}).approximateRows || 0,
      },
    },
    literature: {
      totalItems: litCount,
      totalChars: litTotalChars,
      byCategory: litByCategory,
      topItems: litItems.slice(0, 15),
    },
    channels,
    writer: {
      model: process.env.CONTENTBASE_LLM_MODEL || 'not configured',
      baseUrl: process.env.CONTENTBASE_LLM_BASE_URL ? '***configured***' : 'not configured',
      apiKey: process.env.CONTENTBASE_LLM_API_KEY ? '***configured***' : 'not configured',
    },
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('request body must be JSON');
  }
}

function writeJson(res, status, payload) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
    ...(payload === null ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
  });
  res.end(payload === null ? '' : JSON.stringify(payload));
}

function writeText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

function loadRuntimeEnv() {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const envPaths = [
    homeDir ? path.join(homeDir, '.codex-secrets', 'database-gateway', 'database_gateway.env') : '',
    process.env.CONTENTMRS_LOCAL_ENV || '',
    homeDir ? path.join(homeDir, '.codex-secrets', 'sub2api', 'consumers', 'contentmrs-novel.env') : '',
    homeDir ? path.join(homeDir, '.codex-secrets', 'contentmrs', 'sub2api-novel.env') : '',
    homeDir ? path.join(homeDir, '.codex-secrets', 'dashscope', 'api.env') : '',
  ].filter(Boolean);
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
  if (!process.env.CONTENTBASE_LLM_API_KEY && process.env.SUB2API_NOVEL_API_KEY) {
    process.env.CONTENTBASE_LLM_API_KEY = process.env.SUB2API_NOVEL_API_KEY;
  }
  if (!process.env.CONTENTBASE_LLM_BASE_URL && process.env.SUB2API_NOVEL_BASE_URL) {
    process.env.CONTENTBASE_LLM_BASE_URL = process.env.SUB2API_NOVEL_BASE_URL.replace(/\/+$/, '');
  }
  if (!process.env.CONTENTBASE_LLM_MODEL && process.env.SUB2API_NOVEL_MODEL) {
    process.env.CONTENTBASE_LLM_MODEL = process.env.SUB2API_NOVEL_MODEL;
  }
  if (!process.env.CONTENTBASE_LLM_MODEL && process.env.CONTENTBASE_DEFAULT_MODEL) {
    process.env.CONTENTBASE_LLM_MODEL = process.env.CONTENTBASE_DEFAULT_MODEL;
  }
}
