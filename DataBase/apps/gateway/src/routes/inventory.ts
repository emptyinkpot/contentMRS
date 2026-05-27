import { Hono } from "hono";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { visibilityForTable } from "../sensitive.js";

interface TableInventoryRow {
  table_name: string;
  table_rows: number | null;
  data_length: number | null;
  update_time: Date | string | null;
}

export function inventoryRoutes({ config, pool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/inventory/tables", async (c) => {
    const rows = await query<TableInventoryRow[]>(
      pool,
      `
      SELECT
        TABLE_NAME AS table_name,
        TABLE_ROWS AS table_rows,
        DATA_LENGTH AS data_length,
        UPDATE_TIME AS update_time
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME ASC
      `,
      [config.mysql.database]
    );

    return c.json({
      database: config.mysql.database,
      count: rows.length,
      tables: rows.map((row) => ({
        name: row.table_name,
        visibility: visibilityForTable(row.table_name),
        approximateRows: row.table_rows,
        dataBytes: row.data_length,
        updatedAt: row.update_time
      })),
      requestId: c.get("requestId")
    });
  });

  return app;
}
