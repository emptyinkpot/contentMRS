export class GatewayClient {
  private baseUrl: string;
  private apiKey: string;
  private headerName: string;
  private defaultTimeout: number;

  constructor(opts?: { baseUrl?: string; apiKey?: string; headerName?: string; timeout?: number }) {
    this.baseUrl = (opts?.baseUrl || String(process.env.DATABASE_GATEWAY_URL || '')).trim().replace(/\/+$/, '');
    this.apiKey = (opts?.apiKey || String(process.env.DATABASE_GATEWAY_API_KEY || '')).trim();
    this.headerName = (opts?.headerName || String(process.env.DATABASE_GATEWAY_HEADER || 'X-DataBase-Api-Key')).trim();
    this.defaultTimeout = opts?.timeout || 240000;
  }

  get url(): string { return this.baseUrl; }

  private headers(): Record<string, string> | undefined {
    if (!this.apiKey) return undefined;
    return { [this.headerName]: this.apiKey };
  }

  async getJson<T = Record<string, any>>(
    path: string,
    params?: Record<string, string>,
    label = 'gateway',
    ragflowDatasetIds: string[] = [],
    timeoutMs?: number,
  ): Promise<T> {
    const urlParams = new URLSearchParams(params || {});
    for (const id of ragflowDatasetIds) urlParams.append('ragflowDatasetIds', id);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs || this.defaultTimeout);
    try {
      const response = await fetch(`${this.baseUrl}${path}?${urlParams.toString()}`, {
        signal: controller.signal,
        headers: this.headers(),
      });
      const text = await response.text();
      let payload: any = {};
      if (text.trim()) {
        try { payload = JSON.parse(text); }
        catch { throw new Error(`${label} returned non-JSON: HTTP ${response.status}`); }
      }
      if (!response.ok) {
        const msg = String(payload.message || payload.error || text).slice(0, 240);
        throw new Error(`${label} returned HTTP ${response.status}: ${msg}`);
      }
      return payload as T;
    } catch (error) {
      if (error instanceof Error) throw new Error(`${label} unavailable: ${error.message}`);
      throw new Error(`${label} unavailable: ${String(error)}`);
    } finally { clearTimeout(timeout); }
  }
}
