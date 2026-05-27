import { existsSync } from "node:fs";
import { checkDatabaseHealth, closePools } from "../lib/db.mjs";
import { getMissingDatabaseConfig, publicConfig } from "../lib/config.mjs";

const timeoutMs = Number.parseInt(process.env.EXPERIENCE_HEALTHCHECK_TIMEOUT_MS || "20000", 10);

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: false,
          timeout: true,
          error: `${label} timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs);
    }),
  ]);
}

const missing = getMissingDatabaseConfig();
const cfg = publicConfig();
const db = missing.length === 0 ? await withTimeout(checkDatabaseHealth(), "database health check") : {
  ok: false,
  skipped: true,
  error: `Missing required database env: ${missing.join(", ")}`,
};

const result = {
  ok: missing.length === 0 && db.ok,
  missingEnv: missing,
  database: db,
  qmd: {
    rootExists: existsSync(cfg.qmd.root),
    collectionDirExists: existsSync(cfg.qmd.collectionDir),
    indexPath: cfg.qmd.indexPath,
    refreshOnWrite: cfg.qmd.refreshOnWrite,
  },
  timeoutMs,
  config: cfg,
};

console.log(JSON.stringify(result, null, 2));
await closePools();
process.exit(result.ok ? 0 : 1);
