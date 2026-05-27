import type { TopicCorpusEntry } from "./topic-corpus.js";
import { inferTagsFromCategoryMap } from "./category-register.js";

export interface LexiconTermRow {
  content?: string;
  word?: string;
  category?: string;
  tags?: string[] | string;
}

let categoryRegisterMap = new Map<string, string[]>();

export function setCategoryRegisterMap(map: Map<string, string[]>): void {
  categoryRegisterMap = map;
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return trimmed.split(/[,\s]+/).map(String).filter(Boolean);
    }
  }
  return [];
}

export function inferLexiconTags(term: LexiconTermRow): string[] {
  const explicit = normalizeTags(term.tags);
  if (explicit.length) return explicit;
  return inferTagsFromCategoryMap(String(term.category || "").trim(), categoryRegisterMap);
}

export function filterLexiconTermsByTopicEntry<T extends LexiconTermRow>(
  terms: T[],
  entry: TopicCorpusEntry | undefined,
): T[] {
  if (!entry) return terms;
  const allowed = new Set((entry.allowedLexiconTags || []).map(String).filter(Boolean));
  const forbidden = new Set((entry.forbiddenLexiconTags || []).map(String).filter(Boolean));
  if (!allowed.size && !forbidden.size) return terms;

  return terms.filter((term) => {
    const tags = inferLexiconTags(term);
    if (forbidden.size && tags.some((tag) => forbidden.has(tag))) return false;
    if (!allowed.size) return true;
    return tags.some((tag) => allowed.has(tag));
  });
}
