import { Hono } from "hono";
import type { AppBindings, RouteDependencies } from "../types.js";
import { HttpError } from "../http.js";
import { getTopicEntry, listTopicEntries, loadTopicCorpus, type TopicCorpusEntry } from "../lib/topic-corpus.js";

function readCsv(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readPositiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

function resolveModes(input: unknown, topic?: TopicCorpusEntry): string[] {
  const modes = readCsv(input);
  if (modes.length > 0) return modes;
  if (topic?.suggestIncludeWeb) return ["corpus", "web"];
  return ["corpus"];
}

function filterSourceIds(sourceIds: string[], forbidden: string[]): string[] {
  if (!forbidden.length) return sourceIds;
  const blocked = new Set(forbidden);
  return sourceIds.filter((id) => !blocked.has(id));
}

export function registerResearchRoutes(app: Hono<AppBindings>, _deps: RouteDependencies) {
  const router = new Hono<AppBindings>();

  router.get("/research/topics", (c) => {
    const corpus = loadTopicCorpus();
    const topics = listTopicEntries().map(({ id, entry }) => ({
      id,
      label: entry.label || id,
      defaultSourceIds: entry.defaultSourceIds || [],
      forbiddenSourceIds: entry.forbiddenSourceIds || [],
      defaultStyleSourceIds: entry.defaultStyleSourceIds || [],
      defaultStyleProfileId: entry.defaultStyleProfileId || null,
      defaultRounds: entry.defaultRounds ?? 6,
      defaultLimit: entry.defaultLimit ?? 16,
      suggestIncludeWeb: Boolean(entry.suggestIncludeWeb),
      allowedLexiconTags: entry.allowedLexiconTags || [],
      forbiddenLexiconTags: entry.forbiddenLexiconTags || [],
      narrativePerspectiveMode: entry.narrativePerspectiveMode || null,
      pressureTransitions: entry.pressureTransitions || [],
    }));
    return c.json({
      version: corpus.version || "topic-corpus.v1",
      count: topics.length,
      topics,
      requestId: c.get("requestId"),
    });
  });

  router.post("/research/query", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "invalid_json_body", "Request body must be a JSON object");
    }

    const record = body as Record<string, unknown>;
    const query = String(record.query || "").trim();
    if (!query) {
      throw new HttpError(400, "query_required", "query is required");
    }

    const corpus = loadTopicCorpus();
    const topicId = String(record.topicId || "").trim();
    const topic = topicId ? getTopicEntry(topicId) : undefined;

    const modes = resolveModes(record.modes, topic);
    const includeWeb = modes.includes("web");
    const includeRagflow = modes.includes("ragflow");

    const explicitSourceIds = readCsv(record.sourceIds);
    const topicSourceIds = Array.isArray(topic?.defaultSourceIds) ? topic.defaultSourceIds : [];
    const sourceIds = filterSourceIds(
      explicitSourceIds.length ? explicitSourceIds : topicSourceIds,
      Array.isArray(topic?.forbiddenSourceIds) ? topic.forbiddenSourceIds : [],
    );

    const limit = readPositiveInt(record.limit, topic?.defaultLimit || 16, 50);
    const rounds = readPositiveInt(record.rounds, topic?.defaultRounds || 6, 12);
    const topicText = String(record.topic || topic?.label || "").trim();
    const semanticTags = readCsv(record.semanticTags);
    const target = String(record.target || "").trim();
    const planner = String(record.planner || "rules").trim() || "rules";

    const params = new URLSearchParams({ q: query, limit: String(limit), rounds: String(rounds) });
    if (topicText) params.set("topic", topicText);
    if (target) params.set("target", target);
    if (semanticTags.length) params.set("semanticTags", semanticTags.join(","));
    if (sourceIds.length) params.set("sourceIds", sourceIds.join(","));
    if (includeWeb) params.set("includeWeb", "true");
    if (includeRagflow) params.set("includeRagflow", "true");

    const headers = new Headers({ accept: "application/json" });
    const apiKey = c.req.header("x-api-key") || c.req.header("authorization");
    if (apiKey) headers.set("x-api-key", apiKey.replace(/^Bearer\s+/i, "").trim());

    const internalRequest = new Request(`http://database-gateway-internal/evidence/search?${params.toString()}`, {
      method: "GET",
      headers,
    });
    const evidenceResponse = await app.fetch(internalRequest);
    const pack = await evidenceResponse.json().catch(() => ({}));

    if (!evidenceResponse.ok) {
      const message = typeof (pack as { message?: string })?.message === "string"
        ? String((pack as { message?: string }).message)
        : "Evidence search failed";
      const status = evidenceResponse.status === 503 ? 503 : evidenceResponse.status === 400 ? 400 : 500;
      throw new HttpError(status, "evidence_search_failed", message);
    }

    const sessionId = `research_${c.get("requestId")}`;

    return c.json({
      version: "research-query.v1",
      sessionId,
      query,
      topicId: topicId || null,
      plan: {
        planner,
        modes,
        subQueryRounds: rounds,
        includeWeb,
        includeRagflow,
        sourceIds,
        forbiddenSourceIds: Array.isArray(topic?.forbiddenSourceIds) ? topic.forbiddenSourceIds : [],
        pressureTransitions: Array.isArray(topic?.pressureTransitions) ? topic.pressureTransitions : [],
        webProvider: includeWeb ? "DATABASE_EVIDENCE_WEB_SEARCH_URL" : null,
      },
      pack,
      requestId: c.get("requestId"),
    });
  });

  return router;
}
