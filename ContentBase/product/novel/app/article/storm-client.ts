export type StormResult = {
  perspectives: Array<{ role: string; focus: string }>;
  questions: Array<{ perspective: string; question: string }>;
  outline: string;
  citations: Array<{ title: string; url: string; snippet: string; score: number }>;
  elapsed_ms: number;
};

export async function callStormResearch(
  topic: string,
  target: string,
  genre: string,
): Promise<StormResult | null> {
  const url = process.env.CONTENTBASE_STORM_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic, target, genre, n_perspectives: 4, n_questions_per: 3 }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return null;
    return await res.json() as StormResult;
  } catch {
    return null;
  }
}
