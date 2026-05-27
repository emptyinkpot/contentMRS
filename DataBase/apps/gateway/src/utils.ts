export function clampLimit(raw: string | null, fallback: number, max: number): number {
  const parsed = raw ? Number(raw) : fallback;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export async function fetchJsonStatus(url: string): Promise<"ok" | "error"> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}
