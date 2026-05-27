import { serve } from "@hono/node-server";
import { loadConfig } from "../config.js";
import { createApp } from "./app.js";
import { OpenListClient } from "../sdk/OpenListClient.js";
const config = loadConfig();
const client = new OpenListClient(config.openlist);
const app = createApp(client);
const server = serve({
    fetch: app.fetch,
    hostname: config.host,
    port: config.port
}, (info) => {
    console.log(`database-openlist-adapter listening on http://${info.address}:${info.port}`);
});
function shutdown(signal) {
    console.log(JSON.stringify({ level: "info", event: "shutdown", signal }));
    server.close();
    process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
