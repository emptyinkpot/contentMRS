import type { ContextItem } from './context-engine';

export function readObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

export function readNumber(value: unknown, defaultValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function splitTerms(value: string): string[] {
  return String(value || '')
    .split(/[\s,，。；;:：、|/\\()[\]{}"'“”‘’]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 24);
}

export function dedupeKey(item: ContextItem): string {
  const head = (item.title || item.source || '').slice(0, 40);
  const body = item.text.slice(0, 80);
  return `${item.channel}::${head}::${body}`;
}

export function normalizeText(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = String(v || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
