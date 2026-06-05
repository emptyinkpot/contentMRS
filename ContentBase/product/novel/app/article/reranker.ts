import type { ContextItem } from './context-engine';

const DASHSCOPE_EMBEDDING_MODEL = 'text-embedding-v3';
const BATCH_SIZE = 25;
const MAX_TEXT_CHARS = 2048;
const DEFAULT_KEEP_RATIO = 0.65;
const TIMEOUT_MS = 30_000;
const DEFAULT_TOPIC_WEIGHT = 0.6;
const DEFAULT_AUTHOR_WEIGHT = 0.4;
const REALITY_SIMILARITY_MIN = 0.35;

export type RerankerConfig = {
  apiKey: string;
  baseUrl: string;
  model?: string;
  keepRatio?: number;
  topicWeight?: number;
  authorWeight?: number;
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
    topicWeight: readWeight(process.env.CONTENTBASE_RERANKER_TOPIC_WEIGHT, DEFAULT_TOPIC_WEIGHT),
    authorWeight: readWeight(process.env.CONTENTBASE_RERANKER_AUTHOR_WEIGHT, DEFAULT_AUTHOR_WEIGHT),
  };
}

export async function rerankByEmbedding(
  query: string,
  items: ContextItem[],
  config: RerankerConfig,
  authorStateText?: string,
): Promise<ContextItem[]> {
  if (items.length <= 3) return items;

  const realityItems = items.filter(item => item.channel === 'reality');
  const rerankable = items.filter(item => item.channel !== 'reality');

  if (rerankable.length <= 3 && realityItems.length === 0) return items;

  const keepCount = Math.max(3, Math.ceil(rerankable.length * (config.keepRatio || DEFAULT_KEEP_RATIO)));
  const queryEmbedding = await embedSingle(query, config);
  if (!queryEmbedding) return items;

  const authorEmbedding = authorStateText
    ? await embedSingle(authorStateText.slice(0, MAX_TEXT_CHARS), config)
    : null;

  const topicWeight = config.topicWeight ?? DEFAULT_TOPIC_WEIGHT;
  const authorWeight = authorEmbedding ? (config.authorWeight ?? DEFAULT_AUTHOR_WEIGHT) : 0;
  const totalWeight = authorEmbedding ? topicWeight + authorWeight : 1;

  const filteredReality = await filterRealityBySimilarity(realityItems, queryEmbedding, authorEmbedding, topicWeight, authorWeight, totalWeight, config);

  const texts = rerankable.map(item => truncateForEmbedding(item.text, item.title));
  const embeddings = await embedBatch(texts, config);
  if (!embeddings || embeddings.length !== rerankable.length) return [...filteredReality, ...rerankable];

  const scored = rerankable.map((item, i) => {
    const topicSim = cosineSimilarity(queryEmbedding, embeddings[i]);
    const authorSim = authorEmbedding ? cosineSimilarity(authorEmbedding, embeddings[i]) : 0;
    const blended = (topicSim * topicWeight + authorSim * authorWeight) / totalWeight;
    return { item, similarity: blended };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return [...filteredReality, ...scored.slice(0, keepCount).map(s => s.item)];
}

async function filterRealityBySimilarity(
  realityItems: ContextItem[],
  queryEmbedding: number[],
  authorEmbedding: number[] | null,
  topicWeight: number,
  authorWeight: number,
  totalWeight: number,
  config: RerankerConfig,
): Promise<ContextItem[]> {
  if (realityItems.length === 0) return [];
  const texts = realityItems.map(item => truncateForEmbedding(item.text, item.title));
  const embeddings = await embedBatch(texts, config);
  if (!embeddings || embeddings.length !== realityItems.length) return realityItems;

  return realityItems.filter((_, i) => {
    const topicSim = cosineSimilarity(queryEmbedding, embeddings[i]);
    const authorSim = authorEmbedding ? cosineSimilarity(authorEmbedding, embeddings[i]) : 0;
    const blended = (topicSim * topicWeight + authorSim * authorWeight) / totalWeight;
    if (blended < REALITY_SIMILARITY_MIN) {
      console.log(`[reranker] dropped reality item (sim=${blended.toFixed(3)}): ${realityItems[i].title?.slice(0, 40)}`);
    }
    return blended >= REALITY_SIMILARITY_MIN;
  });
}

export async function loadAuthorStateText(gatewayUrl: string): Promise<string> {
  const apiKey = String(process.env.DATABASE_GATEWAY_API_KEY || '').trim();
  try {
    const response = await fetch(`${gatewayUrl}/creative/author-profile`, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return '';
    const payload = await response.json() as Record<string, any>;
    const parts: string[] = [];
    const profile = payload.profile;
    if (profile && typeof profile === 'object') {
      if (profile.aestheticPreferences) parts.push(String(profile.aestheticPreferences));
      if (profile.narrativeStyle) parts.push(String(profile.narrativeStyle));
      if (profile.tonalRange) parts.push(String(profile.tonalRange));
      if (profile.intellectualInterests) parts.push(String(profile.intellectualInterests));
      if (profile.description) parts.push(String(profile.description));
    }
    const techniques = Array.isArray(payload.authorTechniques) ? payload.authorTechniques : [];
    for (const t of techniques.slice(0, 5)) {
      if (t && typeof t === 'object') {
        parts.push(String(t.name || t.title || '') + ' ' + String(t.description || t.text || ''));
      }
    }
    const clusters = Array.isArray(payload.interestClusters) ? payload.interestClusters : [];
    for (const c of clusters.slice(0, 5)) {
      if (c && typeof c === 'object') {
        parts.push(String(c.name || c.label || '') + ' ' + String(c.keywords || c.terms || ''));
      }
    }
    return parts.filter(Boolean).join('\n').slice(0, MAX_TEXT_CHARS);
  } catch {
    return '';
  }
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

function readWeight(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1.0 ? parsed : defaultValue;
}
