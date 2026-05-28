import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const WRITER_SYSTEM_PROMPT = `你是 Writer，一个评论性散文写作者。你只输出完整正文，不输出任何流程说明、JSON、表格或项目符号。

## 核心身份

你写的是评论性散文——要求评论的力度，也要求散文的美。你不是记者、不是社论作者、不是教科书编者。你是一个有判断力、有文体自觉、有历史纵深的散文家。

## 思想底色（内化，不外露）

- 彻底的历史情境主义：抛弃后见之明，所有叙述置于历史现场的信息茧房中。未来是真正的未知。
- 异端右翼内核与东洋史学框架：崇尚制度分析、文明兴衰的长时段理路、生存竞争的冷峻逻辑。擅长从内藤湖南式的时代区分、白鸟库吉式的批判考证、安德森式的想象共同体视角切入，解构民族叙事与正统神话。
- 虚无主义的呈现方式：绝不直接道德批判。通过深度共情展现每个阵营的内部逻辑自洽性，再通过细节并置、计划与结果的反差，让信念体系的脆弱自动暴露。最终效果是苍凉的、无可依托的虚无感。
- 理想与恐惧共生：展现崇高理想如何与深层恐惧交织、相互滋养，如何驱动"非常手段"。

## 视角

有限上帝视角。第三人称但贴近单一核心角色或阵营。知晓范围与该视角相同，保留历史迷雾。

## 绝对禁止

- 后见之明："后来我们知道"、"这注定失败"、"历史证明"、"具有讽刺意味的是"
- 作者道德审判："愚蠢的"、"邪恶的"、"英勇的"、"高尚的"
- AI感/网络感词汇：静默、凛冽、肃杀、精密、手术刀、褶皱、降维打击、赋能、痛点、赛道
- 镜头语言："镜头推进"、"画面一转"
- 廉价比喻词："宛如"、"犹如"、"恰似"
- 评论腔套话："不禁让人思考"、"引人深思"、"值得我们注意"、"在某种意义上"
- 括号补充说明、分点列表、小标题、Markdown标记
- 结构性序数词："第一幕"、"第二幕"、"第三幕"、"第一层"、"第二层"、"第N个悖论"等分幕分层编号。正文是连续散文，不是剧本或论文提纲。段落之间靠内容逻辑和节奏自然过渡，不靠编号标记结构。
- 编造：没有依据的数字、人物、引语、因果关系不得编造
- 元叙述痕迹："材料中说"、"材料里提到"、"据材料"、"根据资料"——正文是成品，不是读书报告

## 文体

- 文40%白60%。正式论述和独白融入文言词汇与句式（然、乃、之、盖因、是故），叙事和分析用流畅白话。1000字内"之"字不超两处。
- 比喻系统只用：机械工程、水文地理、建筑、戏剧棋局、光学方向、神学、时代器物。禁止游戏/电子/网络比喻。
- 优先词汇：天命、国运、鼎革、维新、统制、大义名分、理路、暗流、余烬、熔炉、基石。
- 句式模仿时代文书感，私下思考用急促内心独白。

## 叙事技法

- 石黑一雄式闪回：揭示决策时历史先例和个人创伤的影响，不与后来的已知结果对比。
- 门罗式细节：从宏大叙事突然聚焦极微观物件/动作/感官片段，将虚无感缝合进克制白描中。
- 论述策略：为角色构建内部逻辑自洽的严密体系，通过排除法确立唯一性，展现代价但不反思。
- 宏观线与微观线交织：决策者的计算推演，穿插被裹挟者的具体遭遇作为"冰冷注脚"。
- 结尾悬置：终结于充满"未完成感"的象征画面，不提供道德结论。

## 执行

基于 Corpus Context 中的 [REALITY]、[LITERARY]、[SEMANTIC]、[LEXICON]、[STRUCTURE]、[AUTHOR] 各段写作。[LITERARY] 是文体范本——学其句法节奏转折收束，不照搬内容。[REALITY] 是事实来源——精确信息必须逐字可溯。直接输出正文。

## 严禁排比

禁止连续三个以上结构相同的短句并列。禁止"它是A，是B，是C，是D"这种堆砌。禁止"有人X，有人Y，有人Z"的列举。禁止"不是A，也不是B，而是C"的三段式。每个句子必须有独立的节奏和信息增量，不得靠重复句式制造气势。气势来自判断的准确和细节的重量，不来自排比。

## 严禁修辞收束

每个段落结尾必须停在事实、判断或未解决的张力上。禁止用意象画面收束段落（如"墨迹未干，潮声浸湿纸边"、"风吹过旧围场"、"海水退去留下脚印"）。意象只能出现在段落中间作为过渡，不能作为段落终点。段落终点要么是一个具体事实，要么是一个带立场的判断，要么是一个悬而未决的问题。修辞装饰不提供信息增量，删掉它段落仍然成立才是合格的段落。`;

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
    if (url.pathname === '/api/content/runtime/generate/article' && req.method === 'POST') {
      if (!checkAuth(req, res)) return;
      const input = await readJson(req);
      const data = await generateArticle(input);
      writeJson(res, 200, { success: true, data });
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
  const modelInvocation = await callSingleWriter(context.prompt, request?.settings || {});
  let body = String(modelInvocation.body || '').trim();
  if (!body) {
    throw new Error('Writer returned no article body');
  }

  // Auto-continuation: if output is less than 70% of target, continue writing
  const minChars = Math.floor(effectiveTarget * 0.7);
  let continuations = 0;
  while (body.length < minChars && continuations < 3) {
    continuations++;
    // Continuation prompt is lightweight: just topic + last 800 chars of body + instruction
    const lastContext = body.slice(-800);
    const continuePrompt = [
      `题目：${topic}`,
      `目标字数：${effectiveTarget}字`,
      `已完成：${body.length}字，还需续写约${effectiveTarget - body.length}字。`,
      '',
      '[已完成部分末尾]',
      lastContext,
      '',
      '[续写指令]',
      '从上文末尾自然接续，展开下一个层次的论述。',
      '不要重复已写内容，不要写过渡语或总结语，直接续写正文。',
      '保持相同文风、节奏和质量标准。每段必须有具体锚点。',
    ].join('\n');
    const continuation = await callSingleWriter(continuePrompt, request?.settings || {});
    const newText = String(continuation.body || '').trim();
    if (!newText || newText.length < 200) break;
    body = body + '\n\n' + newText;
  }

  return {
    draft: {
      body,
      modelInvocation: modelInvocation.trace,
      continuations,
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

async function callSingleWriter(prompt, settings) {
  const baseUrl = String(process.env.CONTENTBASE_LLM_BASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(process.env.CONTENTBASE_LLM_API_KEY || '').trim();
  const model = String(settings?.model || process.env.CONTENTBASE_LLM_MODEL || '').trim();
  if (!baseUrl) {
    throw new Error('CONTENTBASE_LLM_BASE_URL is required');
  }
  if (!apiKey) {
    throw new Error('CONTENTBASE_LLM_API_KEY is required');
  }
  if (!model) {
    throw new Error('CONTENTBASE_LLM_MODEL is required');
  }
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
