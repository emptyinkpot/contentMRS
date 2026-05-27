import { strict as assert } from "node:assert";
import { MortisDataBaseAdapter } from "./mortis-adapter.js";
import { MyBlogDataBaseAdapter } from "./myblog-adapter.js";

function createMockFetch() {
  return async (input) => {
    const url = typeof input === "string" ? input : input.url;

    if (url.includes("/status")) {
      return new Response(
        JSON.stringify({
          ok: true,
          service: "database-gateway",
          version: "0.1.0",
          mode: "read-only",
          bind: { host: "127.0.0.1", port: 18090 },
          auth: { dataRoutes: "api-key", header: "X-DataBase-Api-Key" },
          downstream: {
            mysql: { database: "demo", user: "database_readonly" },
            nocodbHealthUrl: "http://127.0.0.1:18088/api/v1/health",
            openlistHealthConfigured: false
          },
          contracts: {
            openapi: "apps/gateway/openapi.yaml",
            operations: "docs/gateway/database-gateway-operations.md"
          },
          requestId: "req-status"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/inventory/tables")) {
      return new Response(JSON.stringify({ database: "demo", count: 1, tables: [], requestId: "req-inventory" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.includes("/vocabulary/search")) {
      return new Response(JSON.stringify({ query: "词条", count: 0, items: [], requestId: "req-vocab" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.includes("/content/works")) {
      return new Response(JSON.stringify({ count: 0, works: [], requestId: "req-works" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.includes("/search?q=")) {
      return new Response(JSON.stringify({ query: "runtime", count: 1, results: [], requestId: "req-search" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.includes("/health")) {
      return new Response(JSON.stringify({ ok: true, service: "database-gateway", checks: { mysql: "ok", nocodb: "ok", openlist: "unknown" }, requestId: "req-health" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "not_found", message: "not found", requestId: "req-404" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  };
}

async function main() {
  const fetchImpl = createMockFetch();
  const mortis = new MortisDataBaseAdapter({ fetchImpl, apiKey: "mock-key" });
  const myblog = new MyBlogDataBaseAdapter({ fetchImpl, apiKey: "mock-key" });

  const status = await mortis.getRuntimeStatus();
  assert.equal(status.mode, "read-only");

  const inventory = await mortis.getInventoryTables();
  assert.equal(inventory.database, "demo");

  const search = await mortis.search("runtime", 10);
  assert.equal(search.query, "runtime");

  const works = await myblog.listWorks(5);
  assert.equal(works.count, 0);

  const vocab = await myblog.searchVocabulary("词条", 20);
  assert.equal(vocab.query, "词条");

  const health = await mortis.health();
  assert.equal(health.ok, true);

  console.log("gateway-client-adapters verify ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
