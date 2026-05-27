type MaterialRecord = Record<string, any>;

const WEAK_TOPIC_TOKENS = /^(事件|资料|聚合|文章|正文|生成|理论|材料|分析|视频|文案|阶级|地主|社会|制度|公共|资源|recovered|article|draft|为什么|如何|怎样|什么)$/i;

/** Multi-volume / omnibus corpus signatures from DataBase source ids or titles. */
const BROAD_CORPUS_SIGNATURE = /book_xingwang_world_history|兴亡的世界史|world_history_\d+|全\s*\d+\s*卷.*(?:世界史|通史)|sd_[a-f0-9]{32,}/i;

import { isStyleOnlyMaterialRecord } from './style-profile-guard';

export function tokenizeArticleMaterialText(value: string): string[] {
  const normalized = String(value || '').replace(/[^\u4e00-\u9fa5A-Za-z0-9_-]+/g, ' ').trim();
  if (!normalized) {
    return [];
  }
  const tokens: string[] = [];
  for (const segment of normalized.split(/\s+/).filter(Boolean)) {
    if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(segment)) {
      tokens.push(segment);
      continue;
    }
    if (!/[\u4e00-\u9fa5]/.test(segment)) {
      continue;
    }
    const slice = segment.slice(0, 48);
    for (let size = 4; size >= 2; size -= 1) {
      for (let index = 0; index + size <= slice.length; index += 1) {
        tokens.push(slice.slice(index, index + size));
      }
    }
  }
  return uniqueStrings(tokens);
}

export function isWeakArticleMaterialToken(token: string): boolean {
  return WEAK_TOPIC_TOKENS.test(String(token || '').trim());
}

export function buildTopicMaterialTokens(topic: string): string[] {
  const normalizedTopic = String(topic || '')
    .replace(/[（(][^）)]*(?:验证|测试|debug|smoke)[^）)]*[）)]/gi, ' ')
    .trim();
  return tokenizeArticleMaterialText(normalizedTopic).filter((token) => !isWeakArticleMaterialToken(token));
}

export function materialRecordHaystack(item: MaterialRecord): string {
  const metadata = item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, any>
    : {};
  return [
    item.id,
    item.sourceId,
    item.title,
    item.sourceTitle,
    item.text,
    item.excerpt,
    item.summary,
    item.locator,
    item.uri,
    item.sourceType,
    JSON.stringify(metadata),
  ].map((value) => String(value || '')).join(' ');
}

export function readMaterialRelevanceScore(item: MaterialRecord, metadata?: Record<string, any>): number {
  const meta = metadata ?? (item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
    ? item.metadata as Record<string, any>
    : {});
  if (Number.isFinite(Number(item.relevanceScore))) return normalizeMaterialRelevanceScore(Number(item.relevanceScore));
  if (Number.isFinite(Number(meta.relevanceScore))) return normalizeMaterialRelevanceScore(Number(meta.relevanceScore));
  if (Number.isFinite(Number(item.searchScore))) return normalizeMaterialRelevanceScore(Number(item.searchScore));
  return 0;
}

function normalizeMaterialRelevanceScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 0 && value <= 1) return value * 100;
  return value;
}

export function countTopicMaterialOverlap(topicTokens: string[], haystack: string): number {
  const rawText = String(haystack || '');
  const haystackTokens = new Set(tokenizeArticleMaterialText(rawText));
  return topicTokens
    .filter((token) => !isWeakArticleMaterialToken(token))
    .filter((token) => haystackTokens.has(token) || rawText.includes(token))
    .length;
}

export function hasStrongTopicMaterialOverlap(topic: string, haystack: string): boolean {
  const topicTokens = buildTopicMaterialTokens(topic);
  if (!topicTokens.length) {
    return true;
  }
  const rawText = String(haystack || '');
  const hits = topicTokens.filter((token) => !isWeakArticleMaterialToken(token) && rawText.includes(token));
  if (hits.some((token) => token.length >= 3)) {
    return true;
  }
  return hits.length >= 2;
}

export function isKnownBroadCorpusSignature(text: string): boolean {
  return BROAD_CORPUS_SIGNATURE.test(String(text || ''));
}

export function isStyleOnlyMaterialSignature(text: string): boolean {
  const value = String(text || '');
  return isStyleOnlyMaterialRecord({ title: value, summary: value, text: value });
}

export function isStyleOrBroadCorpusAnchorMaterial(text: string): boolean {
  const value = String(text || '');
  return isStyleOnlyMaterialSignature(value) || isKnownBroadCorpusSignature(value);
}

/**
 * Drop materials that DataBase ranked highly but share no topic overlap with known omnibus corpora.
 */
export function shouldRejectOffTopicMaterial(topic: string, item: MaterialRecord): boolean {
  const haystack = materialRecordHaystack(item);
  if (isStyleOnlyMaterialSignature(haystack)) {
    return false;
  }
  if (isKnownBroadCorpusSignature(haystack) && !hasStrongTopicMaterialOverlap(topic, haystack)) {
    return true;
  }
  const relevance = readMaterialRelevanceScore(item);
  if (item.factEligible && relevance >= 60 && !isKnownBroadCorpusSignature(haystack)) {
    return false;
  }
  if (item.factEligible && relevance >= 30 && hasStrongTopicMaterialOverlap(topic, haystack)) {
    return false;
  }
  if (relevance >= 45 && hasStrongTopicMaterialOverlap(topic, haystack)) {
    return false;
  }
  if (!hasStrongTopicMaterialOverlap(topic, haystack) && relevance < 22) {
    return true;
  }
  return false;
}

export function filterMaterialEvidenceByTopic(input: {
  topic: string;
  items: Array<MaterialRecord>;
}): Array<MaterialRecord> {
  const topic = String(input.topic || '').trim();
  if (!topic) {
    return input.items;
  }
  return input.items.filter((item) => !shouldRejectOffTopicMaterial(topic, item));
}

export function shouldRejectOffTopicMaterialText(topic: string, text: string): boolean {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return false;
  }
  return shouldRejectOffTopicMaterial(topic, { title: normalized, summary: normalized, text: normalized });
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}
