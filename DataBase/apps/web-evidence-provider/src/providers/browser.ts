import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WebEvidenceItem } from "./tavily.js";

type BrowserItem = WebEvidenceItem & {
  content?: string;
  fullText?: string;
  metadata?: Record<string, unknown>;
};

const pageCache = new Map<string, { text: string; storedAt: number }>();
const PAGE_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const PAGE_CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../.cache/pages");

function decodeHtml(value: string): string {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function stripTags(value: string): string {
  return decodeHtml(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function stableId(value: string): string {
  return String(value || "").trim();
}

function normalizeBingUrl(raw: string): string {
  const value = decodeHtml(raw);
  try {
    const url = new URL(value);
    if (url.hostname.endsWith("bing.com") && url.pathname === "/ck/a") {
      const target = url.searchParams.get("u");
      if (target) {
        return target.startsWith("a1")
          ? Buffer.from(target.slice(2), "base64url").toString("utf8")
          : target;
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

function hostOf(value: string | undefined): string {
  try {
    return new URL(String(value || "")).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function requestedSiteDomains(query: string): string[] {
  const domains: string[] = [];
  for (const match of String(query || "").matchAll(/\bsite:([a-z0-9.-]+\.[a-z]{2,})/gi)) {
    domains.push(match[1].replace(/^www\./, "").toLowerCase());
  }
  return Array.from(new Set(domains));
}

function hostMatchesDomain(host: string, domain: string): boolean {
  return Boolean(host && domain && (host === domain || host.endsWith(`.${domain}`)));
}

function matchesRequestedSites(url: string | undefined, domains: string[]): boolean {
  if (!domains.length) return true;
  const host = hostOf(url);
  return domains.some((domain) => hostMatchesDomain(host, domain));
}

function extractBingHtmlResults(html: string, limit: number): BrowserItem[] {
  const items: BrowserItem[] = [];
  const blocks = String(html || "").split(/<li\b[^>]*class="[^"]*\bb_algo\b[^"]*"[^>]*>/i).slice(1);
  for (const block of blocks) {
    if (items.length >= limit) break;
    const linkMatch = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const url = normalizeBingUrl(linkMatch[1]);
    if (!/^https?:\/\//i.test(url) || /\/\/[^/]*bing\.com\//i.test(url)) continue;
    const title = stripTags(linkMatch[2]);
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
      || block.match(/<div[^>]+class="b_caption"[^>]*>([\s\S]*?)<\/div>/i);
    const snippet = stripTags(snippetMatch?.[1] || "");
    if (!title && !snippet) continue;
    items.push({
      id: stableId(url),
      title: title || url,
      url,
      source: url,
      snippet: snippet.slice(0, 1800),
      score: limit - items.length,
      metadata: { discovery: "bing.html" },
    });
  }
  return items;
}

function extractRssTag(item: string, tag: string): string {
  const match = String(item || "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return stripTags(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
}

function extractBingRssResults(xml: string, limit: number): BrowserItem[] {
  const items: BrowserItem[] = [];
  const blocks = String(xml || "").split(/<item\b/i).slice(1);
  for (const block of blocks) {
    if (items.length >= limit) break;
    const title = extractRssTag(block, "title");
    const url = normalizeBingUrl(extractRssTag(block, "link"));
    const snippet = extractRssTag(block, "description");
    const publishedAt = extractRssTag(block, "pubDate");
    if (!/^https?:\/\//i.test(url)) continue;
    items.push({
      id: stableId(url),
      title: title || url,
      url,
      source: url,
      snippet: snippet.slice(0, 1800),
      publishedAt,
      score: limit - items.length,
      metadata: { discovery: "bing.rss" },
    });
  }
  return items;
}

function queryTerms(query: string): string[] {
  const text = String(query || "").toLowerCase();
  const terms = new Set<string>();
  for (const token of text.match(/[a-z0-9]{3,}/g) || []) terms.add(token);
  const hanRuns = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  for (const run of hanRuns) {
    terms.add(run);
    for (let size = 2; size <= Math.min(5, run.length); size += 1) {
      for (let index = 0; index <= run.length - size; index += 1) {
        terms.add(run.slice(index, index + size));
      }
    }
  }
  return Array.from(terms).filter((term) => !["and", "the", "for", "with", "official", "source", "report", "data"].includes(term));
}

function relevanceScore(item: BrowserItem, terms: string[]): number {
  const hay = `${item.title || ""} ${item.snippet || ""} ${item.url || ""}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (hay.includes(term)) score += term.length >= 4 ? 3 : 1;
  }
  return score;
}

async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,text/plain",
      "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.7,en;q=0.6",
      "user-agent": "Mozilla/5.0 EvidenceCollector/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return "";
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("html") && !contentType.includes("text")) return "";
  const html = await response.text();
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = stripTags(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || "");
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] || "";
  const body = article || html;
  const bodyText = stripTags(body
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " "));
  return [title, description, bodyText].filter(Boolean).join(" ").slice(0, 12000);
}

async function fetchPageTextCached(url: string | undefined): Promise<string> {
  const key = String(url || "").trim();
  if (!key) return "";
  const cached = pageCache.get(key);
  if (cached && Date.now() - cached.storedAt < PAGE_CACHE_TTL_MS) return cached.text;
  const disk = readPageCache(key);
  if (disk && Date.now() - disk.storedAt < PAGE_CACHE_TTL_MS) {
    pageCache.set(key, disk);
    return disk.text;
  }
  const text = await fetchPageText(key).catch(() => "");
  if (text) {
    const entry = { text, storedAt: Date.now() };
    pageCache.set(key, entry);
    writePageCache(key, entry);
  }
  return text;
}

function cachePathForUrl(url: string): string {
  const hash = createHash("sha256").update(String(url || "")).digest("hex");
  return join(PAGE_CACHE_DIR, `${hash}.json`);
}

function readPageCache(url: string): { text: string; storedAt: number } | null {
  try {
    const path = cachePathForUrl(url);
    if (!existsSync(path)) return null;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { text?: string; storedAt?: number };
    const text = String(parsed.text || "");
    const storedAt = Number(parsed.storedAt || 0);
    return text && storedAt ? { text, storedAt } : null;
  } catch {
    return null;
  }
}

function writePageCache(url: string, entry: { text: string; storedAt: number }): void {
  try {
    mkdirSync(PAGE_CACHE_DIR, { recursive: true });
    writeFileSync(cachePathForUrl(url), JSON.stringify(entry), "utf8");
  } catch {
    // Cache write failures must not break search.
  }
}

function isSearchNoise(url: string | undefined): boolean {
  const host = hostOf(url);
  return /youtube\.com|youtu\.be|reddit\.com|bilibili\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|pinterest\.com|medium\.com|substack\.com|blogspot\.com|imdb\.com|rottentomatoes\.com|fandom\.com|slideshare\.net|scribd\.com/.test(host);
}

function contentQualityScore(text: string): number {
  const value = String(text || "").trim();
  if (!value) return -20;
  let score = Math.min(50, Math.floor(value.length / 400));
  const navigationNoise = (value.match(/登录|注册|菜单|首页|分享到|版权|隐私|cookie|subscribe|sign in|advertisement|all rights reserved/gi) || []).length;
  score -= Math.min(30, navigationNoise * 3);
  const sentenceLike = (value.match(/[。！？.!?]\s*/g) || []).length;
  score += Math.min(20, sentenceLike);
  return score;
}

function looksLikeMojibake(value: string): boolean {
  const text = String(value || "").slice(0, 4000);
  if (!text) return false;
  const replacementCount = (text.match(/�/g) || []).length;
  const latinNoiseCount = (text.match(/[ÃÂÐÑØÙ][\p{L}\p{M}]?/gu) || []).length;
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return replacementCount >= 3 || (latinNoiseCount >= 12 && cjkCount < 20);
}

async function fetchBingRss(query: string, limit: number): Promise<BrowserItem[]> {
  const endpoint = new URL("https://www.bing.com/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "rss");
  endpoint.searchParams.set("setlang", "zh-CN");
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/rss+xml,application/xml,text/xml",
      "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.7,en;q=0.6",
      "user-agent": "Mozilla/5.0 EvidenceCollector/1.0",
    },
    signal: AbortSignal.timeout(16000),
  });
  if (!response.ok) throw new Error(`browser_rss_http_${response.status}`);
  return extractBingRssResults(await response.text(), limit);
}

async function fetchBingHtml(query: string, limit: number): Promise<BrowserItem[]> {
  const endpoint = new URL("https://www.bing.com/search");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("count", String(Math.max(limit, 8)));
  endpoint.searchParams.set("setlang", "zh-CN");
  const response = await fetch(endpoint, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.7,en;q=0.6",
      "user-agent": "Mozilla/5.0 EvidenceCollector/1.0",
    },
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new Error(`browser_html_http_${response.status}`);
  return extractBingHtmlResults(await response.text(), limit);
}

function buildQueryVariants(query: string): string[] {
  return Array.from(new Set([
    `${query} official source report data`,
    query,
  ].map((item) => item.trim()).filter(Boolean)));
}

export async function searchBrowser(input: {
  query: string;
  limit: number;
}): Promise<WebEvidenceItem[]> {
  const limit = Math.min(Math.max(input.limit || 5, 1), 10);
  const terms = queryTerms(input.query);
  const requestedSites = requestedSiteDomains(input.query);
  const results: BrowserItem[] = [];
  const diagnostics: Array<Record<string, unknown>> = [];

  for (const query of buildQueryVariants(input.query)) {
    const rss = await fetchBingRss(query, Math.max(limit * 2, 10)).catch(() => []);
    const html = await fetchBingHtml(query, Math.max(limit * 2, 10)).catch(() => []);
    const discovered = [...rss, ...html].filter((item) => matchesRequestedSites(item.url, requestedSites));
    diagnostics.push({ query, rss: rss.length, html: html.length, discovered: discovered.length });
    for (const item of discovered) {
      if (!results.some((seen) => seen.url === item.url)) results.push(item);
    }
  }

  const enriched: BrowserItem[] = [];
  for (const item of results) {
    if (isSearchNoise(item.url)) continue;
    let fullText = await fetchPageTextCached(item.url);
    if (looksLikeMojibake(fullText)) fullText = "";
    const snippet = fullText || item.snippet || "";
    const candidate: BrowserItem = { ...item, snippet, content: fullText || undefined, fullText: fullText || undefined };
    const score = relevanceScore(candidate, terms);
    if (score <= 0) continue;
    const fullTextBoost = fullText ? Math.min(45, Math.floor(fullText.length / 500)) : 0;
    const qualityScore = contentQualityScore(snippet);
    const finalScore = score + fullTextBoost + qualityScore;
    if (finalScore <= -20) continue;
    enriched.push({
      ...candidate,
      score: finalScore,
      metadata: {
        ...(candidate.metadata || {}),
        extraction: {
          host: hostOf(candidate.url),
          fullTextLength: fullText.length,
          contentQualityScore: qualityScore,
        },
      },
    });
  }

  return enriched
    .filter((item) => item.snippet || item.title)
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
    .slice(0, limit)
    .map((item) => ({
      ...item,
      metadata: {
        ...(item.metadata || {}),
        providerDiagnostics: {
          queryVariantCount: diagnostics.length,
          requestedSites,
          discoveredCount: results.length,
          acceptedCount: enriched.length,
          fullTextCount: enriched.filter((entry) => entry.fullText).length,
        },
      },
    }));
}
