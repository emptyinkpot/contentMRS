import {
  getLastInvokeMeta,
  invokeContentCraftLlm,
} from '../../core/manuscript/content-craft/src/utils/llm-client';
import { resolveContentCraftModel } from '../../core/manuscript/content-craft/src/utils/model-default';

export type ArticleModelOutputParseStatus = 'not_required' | 'parsed' | 'failed';

export interface ArticleModelProviderInput {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature: number;
  maxTokens: number;
}

export interface ArticleModelProviderResult {
  text: string;
  provider?: string;
  model?: string;
}

export interface ArticleModelRuntimeDeps {
  invokeArticleModel?: (input: ArticleModelProviderInput) => Promise<ArticleModelProviderResult>;
}

export interface ParsedArticleModelOutput {
  body: string;
  factClaims?: Array<{ text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  outputParseStatus?: ArticleModelOutputParseStatus;
}

export function readArticleGenerationMode(value: unknown, options?: {
  hasInjectedModelProvider?: boolean;
}): 'model' {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'model';
  }
  const mode = String((value as Record<string, unknown>).mode || '');
  if (mode === 'model') return 'model';
  if (mode === 'ast') {
    throw new Error('runtime.generate.article only supports model prose generation; AST is semantic topology, not an article body path');
  }
  return 'model';
}

export async function invokeArticleModelOnce(input: {
  prompt: string;
  systemPrompt: string;
  model?: string;
  temperature: number;
  maxTokens: number;
  factBoundaryStrict: boolean;
  deps: ArticleModelRuntimeDeps;
}) {
  if (input.deps.invokeArticleModel) {
    const result = await input.deps.invokeArticleModel({
      systemPrompt: input.systemPrompt,
      userPrompt: input.prompt,
      model: input.model,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });
    const parsed = parseArticleModelOutput(result.text, input.factBoundaryStrict);
    const body = normalizeGeneratedArticleBody(parsed.body);
    return {
      text: body,
      factClaims: parsed.factClaims,
      outputParseStatus: parsed.outputParseStatus,
      provider: result.provider,
      model: result.model || input.model,
    };
  }

  const text = await invokeContentCraftLlm([
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: input.prompt },
  ], {
    temperature: input.temperature,
    model: input.model || resolveContentCraftModel(),
  });
  const parsed = parseArticleModelOutput(text, input.factBoundaryStrict);
  const body = normalizeGeneratedArticleBody(parsed.body);
  return {
    text: body,
    factClaims: parsed.factClaims,
    outputParseStatus: parsed.outputParseStatus,
    ...getLastInvokeMeta(),
  };
}

export function buildArticleModelSystemPrompt(input?: { factBoundaryStrict?: boolean }) {
  return [
    '你是 ContentBase 文章生成模型。必须直接写出完整中文正文。',
    input?.factBoundaryStrict
      ? '严格事实边界开启：输出必须是 JSON 对象，且只能使用 paragraphs 数组承载正文和事实声明。'
      : '正文必须连续成段，不能输出大纲、JSON、Markdown 表格、系统字段、材料编号或内部流程。',
    '正文不得写 [S01] [S34] 这类来源锚点；来源只能被化用进自然段判断。',
    '不得把 AST、plan、pressureRuntime、DataBase、runtime 等内部词写入正文。',
    input?.factBoundaryStrict
      ? '严格格式为 {"paragraphs":[{"paragraphIndex":0,"body":"单个自然段","factClaims":[{"text":"本段具体事实","atomIds":["fact_atom_1"],"inference":false,"paragraphIndex":0}]}]}。禁止顶层 body 和顶层 factClaims。'
      : '可直接输出正文；如输出 JSON，只允许 body 和 factClaims 字段。',
  ].filter(Boolean).join('\n');
}

export function parseArticleModelOutput(text: string, factBoundaryStrict: boolean): ParsedArticleModelOutput {
  const raw = String(text || '').trim();
  if (!raw) {
    throw new Error('article model returned empty prose');
  }
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();
  const candidate = fenced || raw;
  if (candidate.startsWith('{')) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, any>;
      const paragraphOutput = normalizeArticleModelParagraphOutput(parsed.paragraphs);
      const body = paragraphOutput?.body || String(parsed.body || parsed.text || parsed.article || '').trim();
      if (!body) {
        return {
          body: raw,
          outputParseStatus: 'failed',
        };
      }
      return {
        body,
        factClaims: mergeArticleModelFactClaims(
          factBoundaryStrict && !paragraphOutput
            ? undefined
            : normalizeArticleModelFactClaims(parsed.factClaims),
          paragraphOutput?.factClaims,
        ),
        outputParseStatus: factBoundaryStrict && !paragraphOutput ? 'failed' : 'parsed',
      };
    } catch (_error) {
      if (factBoundaryStrict) {
        return {
          body: raw,
          outputParseStatus: 'failed',
        };
      }
    }
  }
  return {
    body: raw,
    outputParseStatus: factBoundaryStrict ? 'failed' : 'not_required',
  };
}

export function normalizeGeneratedArticleBody(value: string) {
  const body = String(value || '')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  if (!body) {
    throw new Error('article model returned empty prose');
  }
  if (/^\s*(\{|\[)/.test(body) && /"body"\s*:/.test(body)) {
    throw new Error('article model output was not parsed into prose body');
  }
  return body;
}

function normalizeArticleModelFactClaims(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const claims = value
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item: any) => ({
      text: item.text == null ? undefined : String(item.text),
      atomIds: Array.isArray(item.atomIds) ? item.atomIds.map(String).filter(Boolean) : [],
      inference: Boolean(item.inference),
      paragraphIndex: Number.isInteger(Number(item.paragraphIndex)) ? Number(item.paragraphIndex) : undefined,
    }));
  return claims.length ? claims : undefined;
}

function normalizeArticleModelParagraphOutput(value: unknown): {
  body: string;
  factClaims?: Array<{ text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
} | undefined {
  if (!Array.isArray(value)) return undefined;
  const paragraphs: string[] = [];
  const factClaims: Array<{ text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }> = [];
  value.forEach((item, fallbackIndex) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const record = item as Record<string, any>;
    const paragraphIndex = Number.isInteger(Number(record.paragraphIndex))
      ? Number(record.paragraphIndex)
      : fallbackIndex;
    const body = String(record.body || record.text || record.paragraph || '').trim();
    if (body) {
      paragraphs.push(body);
    }
    const paragraphClaims = normalizeArticleModelFactClaims(record.factClaims);
    if (paragraphClaims?.length) {
      for (const claim of paragraphClaims) {
        factClaims.push({
          ...claim,
          paragraphIndex: Number.isInteger(Number(claim.paragraphIndex))
            ? Number(claim.paragraphIndex)
            : paragraphIndex,
        });
      }
    }
  });
  if (!paragraphs.length) return undefined;
  return {
    body: paragraphs.join('\n\n'),
    factClaims: factClaims.length ? factClaims : undefined,
  };
}

function mergeArticleModelFactClaims(
  topLevel?: Array<{ text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>,
  paragraphLevel?: Array<{ text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>,
) {
  const claims = [
    ...(Array.isArray(topLevel) ? topLevel : []),
    ...(Array.isArray(paragraphLevel) ? paragraphLevel : []),
  ];
  if (!claims.length) return undefined;
  const seen = new Set<string>();
  return claims.filter((claim) => {
    const key = JSON.stringify({
      text: claim.text || '',
      atomIds: claim.atomIds || [],
      paragraphIndex: claim.paragraphIndex,
      inference: Boolean(claim.inference),
    });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
