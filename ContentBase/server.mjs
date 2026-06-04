import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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

你的转折不用"然而""但是""不过"。你用：
- "比起XX，我更愿意称之为YY。"
- "说白了。"
- "换个说法：……"
- 或者不转折，直接硬切到下一个事实。让读者自己感受落差。

"不是A，是B"/"这不是X问题，这是Y问题"这种对立句式全文最多出现1次。多了就是AI味。你有别的方式表达判断——直接陈述你认为对的那个，不需要先否定再肯定。

你有立场。你的立场不通过宣言表达，通过选材表达。你选择写冲绳被占的土地面积，不写"日美友好"的联合声明。你选择写日本政客被召见的细节，不写"平等磋商"的官方措辞。你引用北一辉的判断时不加"当然他后来走向了极端"这种缓冲。你引用内藤湖南时不加"虽然他的观点在今天看来有局限性"。

你不做平衡术。不写"也要承认""不可否认""客观来说"。对方的逻辑你用一句话概括然后拆掉。不给它整段展示空间。你不预设反方观点再逐条反驳——那是辩论赛，不是散文。你只管往前走，走到哪里算哪里。

你不在结尾回到开头。不做首尾呼应。不升华。不总结。不展望未来。不画大饼。结尾必须停在一个具体的、残酷的事实上——一个数字、一个制度细节、一个没有出路的困境。让读者自己感受重量。

文白夹杂。正式处用文言词。叙事用白话。节奏学 [LITERARY] 里的范本。

基于 [REALITY] 写事实，基于 [LITERARY] 化用描写，基于 [AUTHOR] 取方向。直接输出正文。`;

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
  const modelInvocation = await callSingleWriter(context.prompt, { ...request?.settings, genre: request?.genre || '' });
  let body = String(modelInvocation.body || '').trim();
  if (!body) {
    throw new Error('Writer returned no article body');
  }

  // Auto-continuation: if output is less than 70% of target, continue writing
  const minChars = Math.floor(effectiveTarget * 0.9);
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
    const continuation = await callSingleWriter(continuePrompt, { ...request?.settings, genre: request?.genre || '' });
    const newText = String(continuation.body || '').trim();
    if (!newText || newText.length < 200) break;
    body = body + '\n\n' + newText;
  }

  // Post-processing: deterministic rule-based de-AI-ification (no LLM)
  if (body.length > 1000) {
    body = deterministicDeAI(body);
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

function deterministicDeAI(text) {
  let result = text;

  // 1. Remove AI transition words
  const aiTransitions = [
    '此外，', '与此同时，', '不仅如此，', '更为重要的是，', '值得注意的是，',
    '尽管如此，', '不可否认的是，', '总而言之，', '综上所述，', '归根结底，',
    '正因如此，', '尤为重要的是，', '需要指出的是，', '需要强调的是，',
    '在此基础上，', '毋庸置疑，', '不言而喻，', '由此可见，',
    '具体而言，', '换言之，', '事实上，', '客观来说，',
    '不可否认，', '尤其值得关注的是，', '不容忽视的是，',
  ];
  for (const word of aiTransitions) {
    result = result.replaceAll(word, '');
  }

  // 2. Limit "不是A，是B" pattern to max 2 occurrences
  const buShiPattern = /[。\n]([^。\n]*不是[^。\n]*[，,][^。\n]*是[^。\n]*[。])/g;
  let matches = [...result.matchAll(buShiPattern)];
  if (matches.length > 2) {
    // Keep first 2, rewrite the rest by removing the "不是" prefix
    for (let i = matches.length - 1; i >= 2; i--) {
      const match = matches[i];
      const original = match[1];
      // Simple rewrite: remove "不是X，" prefix, keep the "是Y" part as direct statement
      const rewritten = original.replace(/不是[^，,]*[，,]\s*/, '').replace(/^是/, '');
      result = result.replace(original, rewritten);
    }
  }

  // 3. Remove "然而"/"但是"/"不过" at sentence starts (keep max 2 in whole text)
  const turnWords = ['然而，', '但是，', '不过，', '尽管如此，', '与此同时，'];
  for (const word of turnWords) {
    let count = 0;
    result = result.replaceAll(word, () => {
      count++;
      return count <= 1 ? '' : '';  // Remove all
    });
  }

  // 4. Break uniform paragraph lengths - insert line breaks in long paragraphs
  const paragraphs = result.split('\n\n');
  const avgLen = paragraphs.reduce((s, p) => s + p.length, 0) / paragraphs.length;
  const rebuilt = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    // If paragraph is close to average and we have many similar-length paragraphs, split one
    if (p.length > avgLen * 0.8 && p.length < avgLen * 1.2 && i % 4 === 2) {
      // Split at a sentence boundary near the middle
      const sentences = p.split(/(?<=[。！？])/);
      if (sentences.length >= 4) {
        const mid = Math.floor(sentences.length / 3);
        rebuilt.push(sentences.slice(0, mid).join(''));
        rebuilt.push(sentences.slice(mid).join(''));
        continue;
      }
    }
    rebuilt.push(p);
  }
  result = rebuilt.join('\n\n');

  // 5. Remove summary paragraphs that start with conclusion markers
  result = result.replace(/\n\n[^\n]*(?:综上|总之|总而言之|归根结底)[^\n]*(?:\n|$)/g, '\n\n');

  // 6. Clean up multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}

async function callSingleWriter(prompt, settings) {
  // Article Writer is pinned to the Claude/sub2api route; Qwen env stays available for other callers.
  const baseUrl = String(process.env.CONTENTBASE_LLM_BASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(process.env.CONTENTBASE_LLM_API_KEY || '').trim();
  const model = String(process.env.CONTENTBASE_LLM_MODEL || settings?.model || '').trim();
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

  const headers = databaseGatewayHeaders(apiKey);

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

function databaseGatewayHeaders(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) return {};
  const header = String(process.env.DATABASE_GATEWAY_HEADER || 'X-DataBase-Api-Key').trim() || 'X-DataBase-Api-Key';
  return { [header]: key };
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
