import type { WebEvidenceItem } from "./tavily.js";

/** Lightweight fallback when TAVILY_API_KEY is not configured. */
export async function searchDuckDuckGo(input: {
  query: string;
  limit: number;
}): Promise<WebEvidenceItem[]> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", input.query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_redirect", "1");
  url.searchParams.set("no_html", "1");

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15000),
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`duckduckgo_http_${response.status}`);
  }

  const payload = await response.json() as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<Record<string, unknown>>;
  };
  const items: WebEvidenceItem[] = [];
  const abstract = String(payload.AbstractText || "").trim();
  const abstractUrl = String(payload.AbstractURL || "").trim();
  const heading = String(payload.Heading || input.query).trim();

  if (abstract) {
    items.push({
      id: abstractUrl || "ddg-abstract",
      title: heading,
      url: abstractUrl || undefined,
      source: abstractUrl || "duckduckgo",
      snippet: abstract.slice(0, 1200),
      score: 10,
    });
  }

  const topics = Array.isArray(payload.RelatedTopics) ? payload.RelatedTopics : [];
  for (const entry of topics) {
    if (items.length >= input.limit) break;
    const rows = Array.isArray(entry.Topics) ? entry.Topics as Array<Record<string, unknown>> : [entry];
    for (const row of rows) {
      if (items.length >= input.limit) break;
      const text = String(row.Text || "").trim();
      const firstUrl = String(row.FirstURL || "").trim();
      if (!text) continue;
      items.push({
        id: firstUrl || `ddg-${items.length + 1}`,
        title: text.split(" - ")[0] || text.slice(0, 80),
        url: firstUrl || undefined,
        source: firstUrl || "duckduckgo",
        snippet: text.slice(0, 1200),
        score: input.limit - items.length,
      });
    }
  }

  return items.slice(0, input.limit);
}
