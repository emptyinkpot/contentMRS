import path from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const packageRoot = path.resolve(__dirname, "..");

function env(name, fallback = "") {
  const value = process.env[name];
  return value == null || value === "" ? fallback : value;
}

function envPath(name, fallback) {
  const value = env(name);
  return value ? path.resolve(value) : fallback;
}

function envInt(name, fallback) {
  const parsed = Number.parseInt(env(name, String(fallback)), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(name, fallback) {
  const value = env(name);
  if (!value) return fallback;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

export const qmdRoot = envPath("EXPERIENCE_QMD_ROOT", "E:\\My Project\\my-project-qmd");
export const qmdCollection = env("EXPERIENCE_QMD_COLLECTION", "experience-manager");
export const qmdCollectionDir = envPath(
  "QMD_EXPERIENCE_COLLECTION_DIR",
  path.join(qmdRoot, "collections", qmdCollection)
);

export const config = {
  packageRoot,
  database: {
    host: env("EXPERIENCE_DB_HOST", env("DB_HOST")),
    port: envInt("EXPERIENCE_DB_PORT", envInt("DB_PORT", 3306)),
    user: env("EXPERIENCE_DB_USER", env("DB_USER")),
    password: env("EXPERIENCE_DB_PASSWORD", env("DB_PASSWORD")),
    database: env("EXPERIENCE_DB_NAME", env("DB_NAME")),
    charset: "utf8mb4",
    connectionLimit: envInt("EXPERIENCE_DB_CONNECTION_LIMIT", 4),
    connectTimeout: envInt("EXPERIENCE_DB_CONNECT_TIMEOUT_MS", 30000),
  },
  tables: {
    experiences: env("EXPERIENCE_TABLE", "experience_records_cloud"),
    notes: env("EXPERIENCE_NOTE_TABLE", "experience_notes_cloud"),
  },
  qmd: {
    root: qmdRoot,
    syncScript: envPath("EXPERIENCE_QMD_SYNC_SCRIPT", path.join(packageRoot, "scripts", "sync-to-qmd.mjs")),
    tsxCli: envPath("EXPERIENCE_QMD_TSX_CLI", path.join(qmdRoot, "node_modules", "tsx", "dist", "cli.mjs")),
    sourceCli: envPath("EXPERIENCE_QMD_SOURCE_CLI", path.join(qmdRoot, "src", "cli", "qmd.ts")),
    collection: qmdCollection,
    label: "experience mirror",
    collectionDir: qmdCollectionDir,
    distilledManifest: path.join(qmdCollectionDir, "distilled", "manifest.json"),
    indexPath: env("EXPERIENCE_QMD_INDEX_PATH", env("INDEX_PATH", path.join(homedir(), ".cache", "qmd", "index.sqlite"))),
    refreshOnWrite: envBool("EXPERIENCE_QMD_REFRESH_ON_WRITE", true),
  },
};

export function getMissingDatabaseConfig() {
  const missing = [];
  if (!config.database.host) missing.push("EXPERIENCE_DB_HOST");
  if (!config.database.user) missing.push("EXPERIENCE_DB_USER");
  if (!config.database.password) missing.push("EXPERIENCE_DB_PASSWORD");
  if (!config.database.database) missing.push("EXPERIENCE_DB_NAME");
  return missing;
}

export function assertDatabaseConfig() {
  const missing = getMissingDatabaseConfig();
  if (missing.length > 0) {
    throw new Error(`Missing required experience-manager database environment variables: ${missing.join(", ")}`);
  }
}

export function publicConfig() {
  return {
    packageRoot: config.packageRoot,
    database: {
      host: config.database.host || null,
      port: config.database.port,
      database: config.database.database || null,
      user: config.database.user || null,
      passwordConfigured: Boolean(config.database.password),
      connectionLimit: config.database.connectionLimit,
      connectTimeout: config.database.connectTimeout,
    },
    tables: config.tables,
    qmd: {
      root: config.qmd.root,
      collection: config.qmd.collection,
      collectionDir: config.qmd.collectionDir,
      indexPath: config.qmd.indexPath,
      refreshOnWrite: config.qmd.refreshOnWrite,
    },
  };
}
