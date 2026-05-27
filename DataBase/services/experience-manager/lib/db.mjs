import { assertDatabaseConfig, config } from "./config.mjs";

const poolCache = new Map();
let mysqlPromise = null;

async function loadMysql() {
  if (!mysqlPromise) {
    mysqlPromise = import("mysql2/promise.js").catch((error) => {
      throw new Error(`Unable to load mysql2. Run npm install in services/experience-manager. Cause: ${error?.message || error}`);
    });
  }
  return await mysqlPromise;
}

export async function getPool() {
  assertDatabaseConfig();
  const key = `${config.database.host}:${config.database.port}/${config.database.database}`;
  if (!poolCache.has(key)) {
    const mysql = await loadMysql();
    poolCache.set(
      key,
      mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        charset: config.database.charset,
        waitForConnections: true,
        connectionLimit: config.database.connectionLimit,
        queueLimit: 0,
        connectTimeout: config.database.connectTimeout,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      })
    );
  }
  return poolCache.get(key);
}

export async function checkDatabaseHealth() {
  const startedAt = Date.now();
  try {
    const pool = await getPool();
    const [rows] = await pool.query("SELECT 1 AS ping");
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      rows,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error?.message || String(error),
      code: error?.code || null,
    };
  }
}

export async function closePools() {
  const pools = [...poolCache.values()];
  poolCache.clear();
  await Promise.allSettled(pools.map((pool) => pool.end()));
}
