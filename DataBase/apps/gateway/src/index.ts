import { serve } from "@hono/node-server";
import { OpenListClient } from "@emptyinkpot/database-openlist-adapter";
import COS from "cos-nodejs-sdk-v5";
import { loadLocalEnvFiles } from "./load-local-env.js";
import { loadConfig } from "./config.js";
import { createPool, createWritePool } from "./db.js";
import { createRoutes } from "./routes.js";

loadLocalEnvFiles();

const config = loadConfig();
const pool = createPool(config);
const writePool = createWritePool(config);
const openlistClient = config.openlist ? new OpenListClient(config.openlist) : null;
const cosClient = config.cos ? new COS({ SecretId: config.cos.secretId, SecretKey: config.cos.secretKey }) : null;
const app = createRoutes({ config, pool, writePool, openlistClient, cosClient });

const server = serve(
  {
    fetch: app.fetch,
    hostname: config.host,
    port: config.port
  },
  (info) => {
    console.log(`database-gateway listening on http://${info.address}:${info.port}`);
  }
);

async function shutdown(signal: string) {
  console.log(JSON.stringify({ level: "info", event: "shutdown", signal }));
  server.close();
  await pool.end();
  await writePool.end();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
