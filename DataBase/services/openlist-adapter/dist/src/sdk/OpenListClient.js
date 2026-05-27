export class OpenListHttpError extends Error {
    status;
    body;
    constructor(status, body) {
        super(`OpenList HTTP ${status}: ${body}`);
        this.name = "OpenListHttpError";
        this.status = status;
        this.body = body;
    }
}
export class OpenListApiError extends Error {
    code;
    constructor(code, message) {
        super(`OpenList API ${code}: ${message}`);
        this.name = "OpenListApiError";
        this.code = code;
    }
}
export class OpenListClient {
    baseUrl;
    fetchImpl;
    token;
    username;
    passwordHash;
    constructor(config) {
        if (!config.baseUrl) {
            throw new Error("OpenListClient requires baseUrl");
        }
        this.baseUrl = config.baseUrl.replace(/\/+$/, "");
        this.token = config.token;
        this.username = config.username;
        this.passwordHash = config.passwordHash;
        this.fetchImpl = config.fetchImpl || fetch;
    }
    async health() {
        const response = await this.fetchImpl(`${this.baseUrl}/ping`);
        const text = await response.text();
        if (!response.ok) {
            throw new OpenListHttpError(response.status, text);
        }
        const trimmed = text.trim();
        if (trimmed === "pong") {
            return "pong";
        }
        const basePath = this.extractOpenListBasePath(trimmed);
        if (basePath) {
            const nextBaseUrl = this.withBasePath(basePath);
            const retry = await this.fetchImpl(`${nextBaseUrl}/ping`);
            const retryText = await retry.text();
            if (!retry.ok) {
                throw new OpenListHttpError(retry.status, retryText);
            }
            if (retryText.trim() === "pong") {
                this.baseUrl = nextBaseUrl;
                return "pong";
            }
        }
        throw new Error(`Unexpected OpenList ping response: ${text}`);
    }
    extractOpenListBasePath(html) {
        const match = html.match(/base_path:\s*['"]([^'"]+)['"]/);
        const value = match?.[1]?.trim();
        return value ? `/${value.replace(/^\/+/, "").replace(/\/+$/, "")}` : null;
    }
    withBasePath(basePath) {
        const current = new URL(this.baseUrl);
        const currentPath = current.pathname.replace(/\/+$/, "");
        const normalizedBasePath = `/${basePath.replace(/^\/+/, "").replace(/\/+$/, "")}`;
        if (currentPath === normalizedBasePath || currentPath.endsWith(normalizedBasePath)) {
            return current.toString().replace(/\/+$/, "");
        }
        current.pathname = `${currentPath}/${normalizedBasePath.replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/");
        return current.toString().replace(/\/+$/, "");
    }
    async loginHash(username = this.username, passwordHash = this.passwordHash) {
        if (!username || !passwordHash) {
            throw new Error("OpenList loginHash requires username and passwordHash");
        }
        const data = await this.request("/api/auth/login/hash", {
            method: "POST",
            body: {
                username,
                password: passwordHash
            },
            auth: false
        });
        this.token = data.token;
        return data.token;
    }
    async listStorages(page = 1, perPage = 200) {
        return this.request(`/api/admin/storage/list?page=${page}&per_page=${perPage}`);
    }
    async getStorage(id) {
        return this.request(`/api/admin/storage/get?id=${id}`);
    }
    async listFiles(input) {
        return this.request("/api/fs/list", {
            method: "POST",
            body: input
        });
    }
    async getFile(input) {
        return this.request("/api/fs/get", {
            method: "POST",
            body: input
        });
    }
    async request(path, options = {}) {
        const useAuth = options.auth !== false;
        if (useAuth && !this.token && this.username && this.passwordHash) {
            await this.loginHash();
        }
        const headers = {};
        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }
        if (useAuth && this.token) {
            headers.Authorization = this.token;
        }
        const requestInit = {
            method: options.method || (options.body === undefined ? "GET" : "POST"),
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body)
        };
        let response = await this.fetchImpl(`${this.baseUrl}${path}`, requestInit);
        let text = await response.text();
        if (!response.ok) {
            throw new OpenListHttpError(response.status, text);
        }
        let envelope;
        try {
            envelope = JSON.parse(text);
        }
        catch (error) {
            const basePath = this.extractOpenListBasePath(text);
            if (!basePath)
                throw error;
            this.baseUrl = this.withBasePath(basePath);
            response = await this.fetchImpl(`${this.baseUrl}${path}`, requestInit);
            text = await response.text();
            if (!response.ok) {
                throw new OpenListHttpError(response.status, text);
            }
            envelope = JSON.parse(text);
        }
        if (envelope.code !== 200) {
            throw new OpenListApiError(envelope.code, envelope.message);
        }
        return envelope.data;
    }
}
