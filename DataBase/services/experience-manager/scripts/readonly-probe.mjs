import { closePools, getPool } from "../lib/db.mjs";
import { config, publicConfig } from "../lib/config.mjs";

function safeLimit(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || fallback), 10);
  return Math.max(1, Math.min(parsed, 10));
}

async function tableProbe(pool, table, limit) {
  const [countRows] = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
  const [sampleRows] = await pool.query(
    `SELECT id, title, updated_at FROM ${table} ORDER BY updated_at DESC LIMIT ${limit}`
  );
  return {
    table,
    count: Number(countRows?.[0]?.count || 0),
    sample: sampleRows,
  };
}

const limit = safeLimit(process.env.EXPERIENCE_READONLY_PROBE_LIMIT, 1);
let result;

try {
  const pool = await getPool();
  const [experiences, notes] = await Promise.all([
    tableProbe(pool, config.tables.experiences, limit),
    tableProbe(pool, config.tables.notes, limit),
  ]);
  result = {
    ok: true,
    limit,
    database: publicConfig().database,
    probes: [experiences, notes],
  };
} catch (error) {
  result = {
    ok: false,
    error: error?.message || String(error),
    code: error?.code || null,
    database: publicConfig().database,
  };
} finally {
  await closePools();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
