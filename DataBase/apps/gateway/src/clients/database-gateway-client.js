export class DataBaseGatewayClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || "http://127.0.0.1:18090").replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl || fetch;
  }

  async status() {
    return this.getJson("/status", false);
  }

  async health() {
    return this.getJson("/health", false);
  }

  async inventoryTables() {
    return this.getJson("/inventory/tables", true);
  }

  async listWorks(limit = 50) {
    return this.getJson(`/content/works?limit=${encodeURIComponent(String(limit))}`, true);
  }

  async listChapters(workId, limit = 200) {
    return this.getJson(
      `/content/works/${encodeURIComponent(String(workId))}/chapters?limit=${encodeURIComponent(String(limit))}`,
      true
    );
  }

  async searchVocabulary(query, limit = 20) {
    return this.getJson(
      `/vocabulary/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`,
      true
    );
  }

  async search(query, limit = 10) {
    return this.getJson(`/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`, true);
  }

  async createWork(payload, idempotencyKey) {
    return this.postJson("/writes/create-work", payload, true, idempotencyKey);
  }

  async appendChapter(payload, idempotencyKey) {
    return this.postJson("/writes/append-chapter", payload, true, idempotencyKey);
  }

  async upsertVocabularyItem(payload, idempotencyKey) {
    return this.postJson("/writes/upsert-vocabulary-item", payload, true, idempotencyKey);
  }

  async recordNote(payload, idempotencyKey) {
    return this.postJson("/writes/record-note", payload, true, idempotencyKey);
  }

  async recordExperience(payload, idempotencyKey) {
    return this.postJson("/writes/record-experience", payload, true, idempotencyKey);
  }

  async projectObsidianMarkdown(payload, idempotencyKey) {
    return this.postJson("/writes/project-obsidian-markdown", payload, true, idempotencyKey);
  }

  async postJson(path, body, requiresApiKey, idempotencyKey) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };

    if (requiresApiKey && this.apiKey) {
      headers["X-DataBase-Api-Key"] = this.apiKey;
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
      const error = parsed || {};
      const message = error.message || `Gateway request failed: ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.requestId = error.requestId;
      throw err;
    }

    return parsed;
  }

  async getJson(path, requiresApiKey) {
    const headers = {
      Accept: "application/json"
    };

    if (requiresApiKey && this.apiKey) {
      headers["X-DataBase-Api-Key"] = this.apiKey;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, { headers });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = body || {};
      const message = error.message || `Gateway request failed: ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.requestId = error.requestId;
      throw err;
    }

    return body;
  }
}
