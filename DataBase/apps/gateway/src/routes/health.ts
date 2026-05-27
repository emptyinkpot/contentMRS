import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { CreativeStyleContractSchema } from "@emptyinkpot/database-creative-contracts";
import { ContentWorkSchema } from "@emptyinkpot/database-content-contracts";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { clampLimit, fetchJsonStatus } from "../utils.js";
import { checkRagflowReadiness } from "../ragflow-readiness.js";

const serviceVersion = "0.1.0";
const schemaVersion = "2026-05-13.schema-first-p0";
const require = createRequire(import.meta.url);
const mysql2Package = require("mysql2/package.json") as { version: string };

export function healthRoutes({ config, pool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/", (c) =>
    c.json({
      service: "database-gateway",
      version: serviceVersion,
      docs: "/docs/api",
      openapi: "/openapi.yaml",
      requestId: c.get("requestId")
    })
  );

  app.get("/openapi.yaml", async (c) => {
    const content = await readFile("openapi.yaml", "utf8");
    return c.text(content, 200, {
      "Content-Type": "application/yaml; charset=utf-8"
    });
  });

  app.get("/docs/api", async (c) => {
    const content = await readFile("API.md", "utf8");
    return c.text(content, 200, {
      "Content-Type": "text/markdown; charset=utf-8"
    });
  });

  app.get("/status", (c) =>
    c.json({
      ok: true,
      service: "database-gateway",
      version: serviceVersion,
      mode: "read-write-facade",
      bind: {
        host: config.host,
        port: config.port
      },
      auth: {
        dataRoutes: config.authRequired ? "api-key" : "none",
        header: "X-DataBase-Api-Key",
        required: config.authRequired
      },
      downstream: {
        mysql: {
          database: config.mysql.database,
          user: config.mysql.user
        },
        nocodbHealthUrl: config.nocodbHealthUrl,
        openlistHealthConfigured: Boolean(config.openlistHealthUrl)
      },
      contracts: {
        schemaVersion,
        openapi: "gateway/openapi.yaml",
        operations: "docs/gateway/database-gateway-operations.md"
      },
      requestId: c.get("requestId")
    })
  );

  app.get("/health", async (c) => {
    const checks: Record<string, string> = {};
    const optionalDownstreams: Record<string, string> = {};

    try {
      await query(pool, "SELECT 1 AS ok");
      checks.mysql = "ok";
    } catch {
      checks.mysql = "error";
    }

    optionalDownstreams.nocodb = await fetchJsonStatus(config.nocodbHealthUrl);
    optionalDownstreams.openlist = config.openlistHealthUrl
      ? await fetchJsonStatus(config.openlistHealthUrl)
      : "unknown";
    optionalDownstreams.ragflow = (await checkRagflowReadiness({
      config: config.evidenceRagflow,
      requireRetrievalChunks: false,
      timeoutMs: 3000,
    })).status;

    const ok = checks.mysql === "ok";

    return c.json(
      {
        ok,
        service: "database-gateway",
        checks,
        optionalDownstreams,
        requestId: c.get("requestId")
      },
      ok ? 200 : 503
    );
  });

  app.get("/health/runtime", async (c) => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      name: string;
      version: string;
    };

    return c.json({
      ok: true,
      gateway: "ok",
      service: packageJson.name,
      version: packageJson.version,
      schemaVersion,
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      },
      dependencies: {
        mysql2: mysql2Package.version
      },
      contracts: {
        contentSchema: "ok",
        creativeSchema: "ok",
        openapi: "gateway/openapi.yaml"
      },
      requestId: c.get("requestId")
    });
  });

  app.get("/health/ragflow", async (c) => {
    const retrieval = ["1", "true", "yes", "on"].includes(String(c.req.query("retrieval") || "").toLowerCase());
    const report = await checkRagflowReadiness({
      config: config.evidenceRagflow,
      query: c.req.query("q") || "新地主阶级 通道租",
      limit: clampLimit(c.req.query("limit") || null, 10, 50),
      timeoutMs: 5000,
      requireRetrievalChunks: retrieval,
    });

    return c.json(
      {
        ...report,
        retrievalChecked: retrieval,
        requestId: c.get("requestId"),
      },
      report.ok ? 200 : 503
    );
  });

  app.get("/health/dependencies", async (c) => {
    const startedAt = Date.now();
    let mysql: "ok" | "error" = "ok";
    let mysqlLatencyMs: number | null = null;
    let schemaParseOk = true;
    const optionalDownstreams: Record<string, string> = {};

    try {
      await query(pool, "SELECT 1 AS ok");
      mysqlLatencyMs = Date.now() - startedAt;
    } catch {
      mysql = "error";
    }

    try {
      ContentWorkSchema.parse({
        id: "health-check",
        kind: "manuscript",
        title: "health-check",
        status: "draft",
        metadata: {},
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      });
      CreativeStyleContractSchema.parse({
        protocol: {
          id: "health-check",
          name: "health-check",
          domain: "health",
          perspectiveRule: "",
          toneRule: "",
          executionRule: "",
          payload: {}
        },
        modules: [],
        editingSteps: [],
        qualityRules: [],
        sourceMaterials: [],
        techniques: [],
        authorTechniques: [],
        lexicon: {
          preferred: [],
          banned: []
        }
      });
    } catch {
      schemaParseOk = false;
    }

    const ok = mysql === "ok" && schemaParseOk;
    optionalDownstreams.nocodb = await fetchJsonStatus(config.nocodbHealthUrl);
    optionalDownstreams.openlist = config.openlistHealthUrl
      ? await fetchJsonStatus(config.openlistHealthUrl)
      : "unknown";
    optionalDownstreams.ragflow = (await checkRagflowReadiness({
      config: config.evidenceRagflow,
      requireRetrievalChunks: false,
      timeoutMs: 3000,
    })).status;

    return c.json(
      {
        ok,
        mysql,
        mysqlLatencyMs,
        schemaParseOk,
        optionalDownstreams,
        schemaVersion,
        requestId: c.get("requestId")
      },
      ok ? 200 : 503
    );
  });

  return app;
}
