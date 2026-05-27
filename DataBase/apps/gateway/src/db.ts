import mysql from "mysql2/promise";
import type { GatewayConfig } from "./config.js";

export type QueryValue = string | number | boolean | null;

type MysqlConfig = GatewayConfig["mysql"];

function createMysqlPool(config: MysqlConfig) {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 20,
    enableKeepAlive: true,
    idleTimeout: 30000,
    maxIdle: 4
  });
}

export function createPool(config: GatewayConfig) {
  return createMysqlPool(config.mysql);
}

export function createWritePool(config: GatewayConfig) {
  return createMysqlPool(config.mysqlWrite || config.mysql);
}

export type DbPool = ReturnType<typeof createPool>;

export function isTransientMysqlConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const code = (error as Error & { code?: string }).code;
  if (
    code === "ECONNRESET" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    code === "PROTOCOL_PACKETS_OUT_OF_ORDER"
  ) {
    return true;
  }

  return error.message.includes("Malformed communication packet");
}

export async function query<T>(
  pool: DbPool,
  sql: string,
  params: QueryValue[] = []
): Promise<T> {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, params);
    return rows as T;
  } catch (error) {
    if (!isTransientMysqlConnectionError(error)) throw error;

    const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, params);
    return rows as T;
  }
}
