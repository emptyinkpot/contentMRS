export interface WebEvidenceItem {
  id?: string;
  title?: string;
  url?: string;
  source?: string;
  snippet?: string;
  excerpt?: string;
  text?: string;
  content?: string;
  fullText?: string;
  publishedAt?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  score?: number;
  published_date?: string;
}

export async function searchTavily(input: {
  apiKey: string;
  query: string;
  limit: number;
  searchDepth?: string;
}): Promise<WebEvidenceItem[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      api_key: input.apiKey,
      query: input.query,
      search_depth: input.searchDepth === "advanced" ? "advanced" : "basic",
      max_results: Math.min(Math.max(input.limit, 1), 20),
      include_answer: false,
      include_raw_content: true,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`tavily_http_${response.status}:${detail.slice(0, 240)}`);
  }

  const payload = await response.json() as { results?: TavilyResult[] };
  const results = Array.isArray(payload?.results) ? payload.results : [];

  const items: WebEvidenceItem[] = [];
  results.forEach((row, index) => {
    const rawContent = String(row.raw_content || "").trim();
    const snippet = String(row.content || rawContent).trim().slice(0, 1200);
    const url = String(row.url || "").trim();
    const title = String(row.title || url || `Web result ${index + 1}`).trim();
    if (!snippet && !url && !title) return;
    items.push({
      id: url || `tavily-${index + 1}`,
      title,
      url,
      source: url,
      snippet,
      content: rawContent || snippet,
      fullText: rawContent || undefined,
      score: Number.isFinite(Number(row.score)) ? Number(row.score) : results.length - index,
      publishedAt: row.published_date || undefined,
    });
  });
  return items;
}
