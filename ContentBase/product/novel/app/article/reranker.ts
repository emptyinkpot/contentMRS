import type { ContextItem } from './context-engine';

const DASHSCOPE_EMBEDDING_MODEL = 'text-embedding-v3';
const BATCH_SIZE = 25;
const MAX_TEXT_CHARS = 2048;
const DEFAULT_KEEP_RATIO = 0.65;
const TIMEOUT_MS = 30_000;

export type RerankerConfig = {
  apiKey: string;
  baseUrl: string;
  model?: string;
  keepRatio?: number;
};

export function getRerankerConfig(): RerankerConfig | null {
  const apiKey = String(process.env.DASHSCOPE_API_KEY || '').trim();
  const baseUrl = String(process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').trim().replace(/\/+$/, '');
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl,
    model: process.env.DASHSCOPE_EMBEDDING_MODEL || DASHSCOPE_EMBEDDING_MODEL,
    keepRatio: readRatio(process.env.CONTENTBASE_RERANKER_KEEP_RATIO, DEFAULT_KEEP_RATIO),
  };
}

export async function rerankByEmbedding(
  query: string,
  items: ContextItem[],
  config: RerankerConfig,
): Promise<ContextItem[]> {
  if (items.length <= 3) return items;

  const keepCount = Math.max(3, Math.ceil(items.length * (config.keepRatio || DEFAULT_KEEP_RATIO)));
  const queryEmbedding = await embedSingle(query, config);
  if (!queryEmbedding) return items;

  const texts = items.map(item => truncateForEmbedding(item.text, item.title));
  const embeddings = await embedBatch(texts, config);
  if (!embeddings || embeddings.length !== items.length) return items;

  const scored = items.map((item, i) => ({
    item,
    similarity: cosineSimilarity(queryEmbedding, embeddings[i]),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, keepCount).map(s => s.item);
}

async function embedSingle(text: string, config: RerankerConfig): Promise<number[] | null> {
  const result = await embedBatch([text.slice(0, MAX_TEXT_CHARS)], config);
  return result ? result[0] : null;
}

async function embedBatch(texts: string[], config: RerankerConfig): Promise<number[][] | null> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${config.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model || DASHSCOPE_EMBEDDING_MODEL,
          input: batch,
          encoding_format: 'float',
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[reranker] DashScope embedding failed: HTTP ${response.status} ${text.slice(0, 200)}`);
        return null;
      }

      const payload = await response.json() as { data?: Array<{ embedding: number[] }> };
      const data = payload.data;
      if (!Array.isArray(data) || data.length !== batch.length) {
        console.error(`[reranker] DashScope returned ${data?.length ?? 0} embeddings for ${batch.length} inputs`);
        return null;
      }

      for (const item of data) {
        allEmbeddings.push(item.embedding);
      }
    } catch (err) {
      console.error(`[reranker] DashScope embedding error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  return allEmbeddings;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

function truncateForEmbedding(text: string, title?: string): string {
  const prefix = title ? `${title}: ` : '';
  const combined = prefix + text;
  return combined.slice(0, MAX_TEXT_CHARS);
}

function readRatio(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0.1 && parsed <= 1.0 ? parsed : defaultValue;
}
