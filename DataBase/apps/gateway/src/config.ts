import { loadConfig as loadOpenListAdapterConfig } from "@emptyinkpot/database-openlist-adapter";

export interface GatewayConfig {
  host: string;
  port: number;
  mysql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  mysqlWrite?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  apiKey?: string;
  authRequired: boolean;
  nocodbHealthUrl: string;
  evidenceWebSearchUrl?: string;
  evidenceRagflow?: {
    baseUrl: string;
    apiKey: string;
    datasetIds: string[];
    documentIds: string[];
    timeoutMs: number;
    similarityThreshold: number;
    vectorSimilarityWeight: number;
    topK: number;
    useKg: boolean;
    tocEnhance: boolean;
  };
  openlistHealthUrl?: string;
  openlist?: {
    baseUrl: string;
    token?: string;
    username?: string;
    passwordHash?: string;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value || undefined;
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return value;
}

function listEnv(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(/[,\s，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadConfig(): GatewayConfig {
  const host = requireEnv("MYSQL_HOST");
  const port = numberEnv("MYSQL_PORT", 3306);
  const database = requireEnv("MYSQL_DATABASE");
  const writeUser = optionalEnv("MYSQL_WRITE_USER");
  const writePassword = optionalEnv("MYSQL_WRITE_PASSWORD");
  const openlistConfig = loadOpenListAdapterConfig().openlist;
  const openlistEnabled = Boolean(
    openlistConfig.baseUrl && (openlistConfig.token || (openlistConfig.username && openlistConfig.passwordHash))
  );
  const openlistHealthUrl = process.env.OPENLIST_HEALTH_URL ||
    (openlistEnabled ? `${openlistConfig.baseUrl.replace(/\/+$/, "")}/ping` : undefined);
  const ragflowBaseUrl = optionalEnv("DATABASE_EVIDENCE_RAGFLOW_URL");
  const ragflowApiKey = optionalEnv("DATABASE_EVIDENCE_RAGFLOW_API_KEY");
  const ragflowDatasetIds = listEnv("DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS");

  return {
    host: process.env.DATABASE_GATEWAY_HOST || "127.0.0.1",
    port: numberEnv("DATABASE_GATEWAY_PORT", 18090),
    mysql: {
      host,
      port,
      database,
      user: requireEnv("MYSQL_USER"),
      password: requireEnv("MYSQL_PASSWORD")
    },
    mysqlWrite: writeUser && writePassword
      ? {
          host,
          port,
          database,
          user: writeUser,
          password: writePassword
        }
      : undefined,
    apiKey: process.env.DATABASE_GATEWAY_API_KEY || undefined,
    authRequired: booleanEnv("DATABASE_GATEWAY_AUTH_REQUIRED", false),
    nocodbHealthUrl: process.env.NOCODB_HEALTH_URL || "http://127.0.0.1:18088/api/v1/health",
    evidenceWebSearchUrl: optionalEnv("DATABASE_EVIDENCE_WEB_SEARCH_URL"),
    evidenceRagflow: ragflowBaseUrl || ragflowApiKey || ragflowDatasetIds.length
      ? {
          baseUrl: ragflowBaseUrl || "",
          apiKey: ragflowApiKey || "",
          datasetIds: ragflowDatasetIds,
          documentIds: listEnv("DATABASE_EVIDENCE_RAGFLOW_DOCUMENT_IDS"),
          timeoutMs: numberEnv("DATABASE_EVIDENCE_RAGFLOW_TIMEOUT_MS", 90000),
          similarityThreshold: numberEnv("DATABASE_EVIDENCE_RAGFLOW_SIMILARITY_THRESHOLD", 0.2),
          vectorSimilarityWeight: numberEnv("DATABASE_EVIDENCE_RAGFLOW_VECTOR_WEIGHT", 0.3),
          topK: numberEnv("DATABASE_EVIDENCE_RAGFLOW_TOP_K", 1024),
          useKg: booleanEnv("DATABASE_EVIDENCE_RAGFLOW_USE_KG", false),
          tocEnhance: booleanEnv("DATABASE_EVIDENCE_RAGFLOW_TOC_ENHANCE", false),
        }
      : undefined,
    openlistHealthUrl,
    openlist: openlistEnabled ? openlistConfig : undefined
  };
}
