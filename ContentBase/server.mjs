import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

process.env.CONTENTBASE_WORKSPACE_ROOT ||= __dirname;
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
const { buildArticleContextEngine } = require('./product/novel/app/article/context-engine.ts');

loadRuntimeEnv();

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key.startsWith('--')) continue;
  const value = process.argv[index + 1] && !process.argv[index + 1].startsWith('--') ? process.argv[index + 1] : '';
  args.set(key.slice(2), value);
}

const port = Number(args.get('port') || process.env.CONTENTBASE_CONSOLE_PORT || 5101);

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
      const input = await readJson(req);
      const data = await generateArticle(input);
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
  const targetWordCount = Number(request?.structure?.targetWordCount || request?.targetWordCount || 2400);
  const context = await buildArticleContextEngine({
    request,
    topic,
    targetWordCount: Number.isFinite(targetWordCount) && targetWordCount > 0 ? Math.trunc(targetWordCount) : 2400,
  });
  const modelInvocation = await callSingleWriter(context.prompt, request?.settings || {});
  const body = String(modelInvocation.body || '').trim();
  if (!body) {
    throw new Error('Writer returned no article body');
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
          content: 'You are the Writer. Write only the final article body from the provided Corpus.',
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
    }),
  });
  const text = await response.text();
  let payload = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`LLM gateway returned non-JSON response: HTTP ${response.status}`);
    }
  }
  if (!response.ok) {
    throw new Error(`LLM gateway returned HTTP ${response.status}: ${String(payload?.error?.message || payload?.message || text).slice(0, 240)}`);
  }
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
