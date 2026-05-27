export interface DataBaseGatewayClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export interface DataBaseGatewayError {
  ok: false;
  error: string;
  message: string;
  requestId?: string;
}

export interface DataBaseGatewayRequestId {
  requestId?: string;
}

export interface DataBaseGatewayStatusResponse extends DataBaseGatewayRequestId {
  ok: true;
  service: "database-gateway";
  version: string;
  mode: "read-write-facade";
  bind: {
    host: string;
    port: number;
  };
  auth: {
    dataRoutes: "api-key";
    header: "X-DataBase-Api-Key";
  };
  downstream: {
    mysql: {
      database: string;
      user: string;
    };
    nocodbHealthUrl: string;
    openlistHealthConfigured: boolean;
  };
  contracts: {
    openapi: string;
    operations: string;
  };
}

export interface DataBaseGatewayHealthResponse extends DataBaseGatewayRequestId {
  ok: boolean;
  service: "database-gateway";
  checks: {
    mysql: string;
    nocodb: string;
    openlist: string;
  };
}

export interface DataBaseGatewaySearchResult {
  document_id: string;
  source_table: string;
  source_id: string;
  source: string | null;
  title: string | null;
  privacy_level: string;
  chunk_index: number;
  snippet: string;
}

export interface DataBaseGatewaySearchResponse extends DataBaseGatewayRequestId {
  query: string;
  count: number;
  results: DataBaseGatewaySearchResult[];
}

export interface DataBaseGatewayVocabularyItem {
  id: string | number;
  content: string;
  type: string;
  category: string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DataBaseGatewayVocabularySearchResponse extends DataBaseGatewayRequestId {
  query: string;
  count: number;
  items: DataBaseGatewayVocabularyItem[];
}

export interface DataBaseGatewayOpenListStorage {
  id: number;
  mount_path: string;
  driver?: string;
  status?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface DataBaseGatewayOpenListFileObject {
  name: string;
  size: number;
  is_dir: boolean;
  modified: string;
  created: string;
  [key: string]: unknown;
}

export interface DataBaseGatewayOpenListMount {
  id: string;
  mountPath: string;
  driver: string | null;
  remark: string | null;
  openlistStatus: string | null;
  disabled: boolean;
  source: string;
  metadata: Record<string, unknown>;
  lastSyncedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DataBaseGatewayOpenListTarget {
  id: string;
  provider: string;
  purpose: string;
  displayName: string;
  mountPath: string;
  remoteDir: string;
  localCachePath: string | null;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DataBaseGatewayCreativeStyleContractResponse extends DataBaseGatewayRequestId {
  protocol: Record<string, unknown>;
  modules: Record<string, unknown>[];
  editingSteps: Record<string, unknown>[];
  qualityRules: Record<string, unknown>[];
  sourceMaterials: Record<string, unknown>[];
  lexicon: {
    preferred: Record<string, unknown>[];
    banned: Record<string, unknown>[];
  };
  counts: Record<string, number>;
}

export interface DataBaseGatewayCreativeContextResponse extends DataBaseGatewayRequestId {
  ok: true;
  contextVersion: "creative-context.v1";
  work: Record<string, unknown>;
  currentPart: Record<string, unknown> | null;
  parts: Record<string, unknown>[];
  recentBlocks: Record<string, unknown>[];
  authorProfile: {
    profile: Record<string, unknown>;
    interestClusters: Record<string, unknown>[];
    authorTechniques: Record<string, unknown>[];
  };
  styleContract: Record<string, unknown>;
  semanticContext: {
    query: string;
    units: Record<string, unknown>[];
  };
  publicationTargets: Record<string, unknown>[];
  snapshot: {
    workId: string;
    partId: string | null;
    authorProfileId: string;
    protocol: string;
    semanticLimit: number;
    resolvedAt: string;
  };
  counts: Record<string, number>;
}

export class DataBaseGatewayClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DataBaseGatewayClientOptions = {}) {
    this.baseUrl = (options.baseUrl || "http://127.0.0.1:18090").replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl || fetch;
  }

  async status(): Promise<DataBaseGatewayStatusResponse> {
    return this.getJson("/status", false);
  }

  async health(): Promise<DataBaseGatewayHealthResponse> {
    return this.getJson("/health", false);
  }

  async inventoryTables() {
    return this.getJson("/inventory/tables", true);
  }

  async listWorks(limit = 50) {
    return this.getJson(`/content/works?limit=${encodeURIComponent(String(limit))}`, true);
  }

  async listChapters(workId: string | number, limit = 200) {
    return this.getJson(
      `/content/works/${encodeURIComponent(String(workId))}/chapters?limit=${encodeURIComponent(String(limit))}`,
      true
    );
  }

  async searchVocabulary(query: string, limit = 20): Promise<DataBaseGatewayVocabularySearchResponse> {
    return this.getJson(
      `/vocabulary/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`,
      true
    );
  }

  async creativeStyleContract(
    protocol = "immersive_historical_synthetic_narrative"
  ): Promise<DataBaseGatewayCreativeStyleContractResponse> {
    return this.getJson(
      `/creative/style-contract?protocol=${encodeURIComponent(protocol)}`,
      true
    );
  }

  async resolveCreativeContext(params: {
    workId: string;
    partId?: string;
    protocol?: string;
    semanticSearch?: string;
    semanticLimit?: number;
  }): Promise<DataBaseGatewayCreativeContextResponse> {
    const search = new URLSearchParams();
    search.set("workId", params.workId);
    if (params.partId) search.set("partId", params.partId);
    if (params.protocol) search.set("protocol", params.protocol);
    if (params.semanticSearch) search.set("semanticSearch", params.semanticSearch);
    if (params.semanticLimit) search.set("semanticLimit", String(params.semanticLimit));

    return this.getJson(
      `/creative/context?${search.toString()}`,
      true
    );
  }

  async search(query: string, limit = 10): Promise<DataBaseGatewaySearchResponse> {
    return this.getJson(
      `/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`,
      true
    );
  }

  async openlistHealth(): Promise<{ ok: boolean; service: "openlist"; requestId?: string }> {
    return this.getJson("/openlist/health", true);
  }

  async listOpenListStorages(page = 1, perPage = 200): Promise<{
    count: number;
    storages: DataBaseGatewayOpenListStorage[];
    requestId?: string;
  }> {
    return this.getJson(
      `/openlist/storages?page=${encodeURIComponent(String(page))}&per_page=${encodeURIComponent(String(perPage))}`,
      true
    );
  }

  async getOpenListStorage(id: number): Promise<{
    storage: DataBaseGatewayOpenListStorage;
    requestId?: string;
  }> {
    return this.getJson(`/openlist/storages/${encodeURIComponent(String(id))}`, true);
  }

  async listOpenListFiles(payload: Record<string, unknown>): Promise<{
    content: DataBaseGatewayOpenListFileObject[];
    total: number;
    requestId?: string;
  }> {
    return this.postJson("/openlist/fs/list", payload, true);
  }

  async getOpenListFile(payload: Record<string, unknown>): Promise<{
    item: DataBaseGatewayOpenListFileObject;
    requestId?: string;
  }> {
    return this.postJson("/openlist/fs/get", payload, true);
  }

  async listOpenListMounts(limit = 100): Promise<{
    count: number;
    mounts: DataBaseGatewayOpenListMount[];
    requestId?: string;
  }> {
    return this.getJson(`/openlist/mounts?limit=${encodeURIComponent(String(limit))}`, true);
  }

  async listOpenListTargets(params: { limit?: number; status?: string; purpose?: string } = {}): Promise<{
    count: number;
    targets: DataBaseGatewayOpenListTarget[];
    requestId?: string;
  }> {
    const search = new URLSearchParams();
    if (params.limit) search.set("limit", String(params.limit));
    if (params.status) search.set("status", params.status);
    if (params.purpose) search.set("purpose", params.purpose);
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return this.getJson(`/openlist/targets${suffix}`, true);
  }

  async getOpenListTarget(id: string): Promise<{
    target: DataBaseGatewayOpenListTarget;
    requestId?: string;
  }> {
    return this.getJson(`/openlist/targets/${encodeURIComponent(id)}`, true);
  }

  async listOpenListTargetFiles(id: string, payload: Record<string, unknown> = {}): Promise<{
    target: DataBaseGatewayOpenListTarget;
    content: DataBaseGatewayOpenListFileObject[];
    total: number;
    requestId?: string;
  }> {
    return this.postJson(`/openlist/targets/${encodeURIComponent(id)}/list`, payload, true);
  }

  async createWork(payload: Record<string, unknown>, idempotencyKey: string): Promise<unknown> {
    return this.postJson("/writes/create-work", payload, true, idempotencyKey);
  }

  async appendChapter(payload: Record<string, unknown>, idempotencyKey: string): Promise<unknown> {
    return this.postJson("/writes/append-chapter", payload, true, idempotencyKey);
  }

  async upsertVocabularyItem(payload: Record<string, unknown>, idempotencyKey: string): Promise<unknown> {
    return this.postJson("/writes/upsert-vocabulary-item", payload, true, idempotencyKey);
  }

  async recordNote(payload: Record<string, unknown>, idempotencyKey: string): Promise<unknown> {
    return this.postJson("/writes/record-note", payload, true, idempotencyKey);
  }

  async recordExperience(payload: Record<string, unknown>, idempotencyKey: string): Promise<unknown> {
    return this.postJson("/writes/record-experience", payload, true, idempotencyKey);
  }

  async projectObsidianMarkdown(payload: Record<string, unknown>, idempotencyKey: string): Promise<unknown> {
    return this.postJson("/writes/project-obsidian-markdown", payload, true, idempotencyKey);
  }

  private async postJson<T>(
    path: string,
    body: unknown,
    requiresApiKey: boolean,
    idempotencyKey?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };

    if (requiresApiKey) {
      if (this.apiKey) {
        headers["X-DataBase-Api-Key"] = this.apiKey;
      }
    }
    if (idempotencyKey) {
      headers["X-DataBase-Idempotency-Key"] = idempotencyKey;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = parsed as DataBaseGatewayError | null;
      const message = error?.message || `Gateway request failed: ${response.status}`;
      const err = new Error(message);
      (err as Error & { status?: number; requestId?: string }).status = response.status;
      (err as Error & { requestId?: string }).requestId = error?.requestId;
      throw err;
    }

    return parsed as T;
  }

  private async getJson<T>(path: string, requiresApiKey: boolean): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json"
    };

    if (requiresApiKey) {
      if (this.apiKey) {
        headers["X-DataBase-Api-Key"] = this.apiKey;
      }
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = body as DataBaseGatewayError | null;
      const message = error?.message || `Gateway request failed: ${response.status}`;
      const err = new Error(message);
      (err as Error & { status?: number; requestId?: string }).status = response.status;
      (err as Error & { requestId?: string }).requestId = error?.requestId;
      throw err;
    }

    return body as T;
  }
}
