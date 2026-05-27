import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { searchBrowser } from "./providers/browser.js";
import { searchDuckDuckGo } from "./providers/duckduckgo.js";
import { searchTavily, type WebEvidenceItem } from "./providers/tavily.js";

function loadDotEnv(): void {
  const path = join(dirname(fileURLToPath(import.meta.url)), "../.env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

function readEnv(name: string, fallback = ""): string {
  return String(process.env[name] || fallback).trim();
}

function readPort(): number {
  const parsed = Number(process.env.WEB_EVIDENCE_PORT || 19091);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 19091;
}

function readLimit(value: string | undefined, fallback: number): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), 20);
}

const tavilyApiKey = readEnv("TAVILY_API_KEY");
const provider = (() => {
  const requested = readEnv("WEB_EVIDENCE_PROVIDER", "").toLowerCase();
  if (requested === "browser" || requested === "duckduckgo" || requested === "tavily") return requested;
  return tavilyApiKey ? "tavily" : "duckduckgo";
})();
const tavilySearchDepth = readEnv("TAVILY_SEARCH_DEPTH", "basic");
const defaultMaxResults = readLimit(readEnv("TAVILY_MAX_RESULTS", "8"), 8);

const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "web-evidence-provider",
    provider,
    configured: provider === "tavily" ? Boolean(tavilyApiKey) : provider === "duckduckgo" || provider === "browser",
  });
});

app.get("/search", async (c) => {
  const q = String(c.req.query("q") || "").trim();
  if (!q) {
    return c.json({ error: "query_required" }, 400);
  }

  const limit = readLimit(c.req.query("limit"), defaultMaxResults);

  try {
    let items: WebEvidenceItem[] = [];
    let usedProvider = provider;
    if (provider === "tavily") {
      if (!tavilyApiKey) {
        return c.json({
          error: "tavily_api_key_missing",
          hint: "Set TAVILY_API_KEY or WEB_EVIDENCE_PROVIDER=duckduckgo",
          items: [],
        }, 503);
      }
      items = await searchTavily({
        apiKey: tavilyApiKey,
        query: q,
        limit,
        searchDepth: tavilySearchDepth,
      });
    } else if (provider === "duckduckgo") {
      items = await searchDuckDuckGo({ query: q, limit });
      usedProvider = "duckduckgo";
    } else if (provider === "browser") {
      items = await searchBrowser({ query: q, limit });
      usedProvider = "browser";
    } else {
      return c.json({ error: "unsupported_provider", provider }, 501);
    }

    return c.json({
      provider: usedProvider,
      query: q,
      limit,
      count: items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: "web_search_failed", message, items: [] }, 502);
  }
});

const host = readEnv("WEB_EVIDENCE_HOST", "127.0.0.1");
const port = readPort();

serve({ fetch: app.fetch, hostname: host, port }, (info) => {
  console.log(`web-evidence-provider listening on http://${info.address}:${info.port} (provider=${provider})`);
});
