import { Hono } from "hono";
import { randomUUID } from "node:crypto";
export function createApp(client) {
    const app = new Hono();
    app.use("*", async (c, next) => {
        c.set("requestId", randomUUID());
        await next();
    });
    app.get("/health", async (c) => {
        const ping = await client.health();
        return c.json({
            ok: ping === "pong",
            service: "database-openlist-adapter",
            openlist: ping,
            requestId: c.get("requestId")
        });
    });
    app.get("/storages", async (c) => {
        const page = Number(c.req.query("page") || "1");
        const perPage = Number(c.req.query("per_page") || "200");
        const data = await client.listStorages(page, perPage);
        return c.json({ data, requestId: c.get("requestId") });
    });
    app.get("/storages/:id", async (c) => {
        const id = Number(c.req.param("id"));
        if (!Number.isInteger(id) || id <= 0) {
            return c.json({ error: "invalid_storage_id", requestId: c.get("requestId") }, 400);
        }
        const data = await client.getStorage(id);
        return c.json({ data, requestId: c.get("requestId") });
    });
    app.post("/fs/list", async (c) => {
        const input = await c.req.json();
        const data = await client.listFiles(input);
        return c.json({ data, requestId: c.get("requestId") });
    });
    app.post("/fs/get", async (c) => {
        const input = await c.req.json();
        const data = await client.getFile(input);
        return c.json({ data, requestId: c.get("requestId") });
    });
    app.onError((error, c) => {
        const message = error instanceof Error ? error.message : "Unknown error";
        return c.json({
            error: "openlist_adapter_error",
            message,
            requestId: c.get("requestId")
        }, 500);
    });
    return app;
}
