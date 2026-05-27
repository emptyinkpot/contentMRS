import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { DataBaseGatewayClient } from "../../../apps/gateway/src/clients/database-gateway-client.js";

const baseUrl = process.env.DATABASE_GATEWAY_URL || "https://database.tengokukk.com";
const apiKey = process.env.DATABASE_GATEWAY_API_KEY || undefined;
const defaultActor = process.env.DATABASE_GATEWAY_MCP_ACTOR || "database-gateway-mcp";

const client = new DataBaseGatewayClient({ baseUrl, apiKey });

function asJsonContent(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function envelope(input, action) {
  return {
    requestId: input.requestId || `${action}-${randomUUID()}`,
    actor: input.actor || defaultActor,
    payload: input.payload,
  };
}

function idempotencyKey(input, action) {
  const key = String(input.idempotencyKey || "").trim();
  if (!key) {
    throw new Error(`${action} requires a stable idempotencyKey from the caller`);
  }
  return key;
}

async function writeTool(action, input, call) {
  const body = envelope(input, action);
  const result = await call(body, idempotencyKey(input, action));
  return asJsonContent(result);
}

async function main() {
  const server = new McpServer({
    name: "database-gateway-mcp",
    version: "0.1.0",
  });

  server.tool("database_gateway_status", {}, async () => asJsonContent(await client.status()));

  server.tool("database_gateway_health", {}, async () => asJsonContent(await client.health()));

  server.tool("database_inventory_tables", {}, async () => asJsonContent(await client.inventoryTables()));

  server.tool(
    "database_list_works",
    {
      limit: z.number().int().min(1).max(200).optional().default(50),
    },
    async ({ limit }) => asJsonContent(await client.listWorks(limit))
  );

  server.tool(
    "database_list_chapters",
    {
      workId: z.union([z.string().min(1), z.number().int().positive()]),
      limit: z.number().int().min(1).max(500).optional().default(200),
    },
    async ({ workId, limit }) => asJsonContent(await client.listChapters(workId, limit))
  );

  server.tool(
    "database_search_vocabulary",
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
    },
    async ({ query, limit }) => asJsonContent(await client.searchVocabulary(query, limit))
  );

  server.tool(
    "database_get_creative_style_contract",
    {
      protocol: z.string().min(1).optional().default("immersive_historical_synthetic_narrative"),
    },
    async ({ protocol }) => asJsonContent(await client.creativeStyleContract(protocol))
  );

  server.tool(
    "database_search",
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional().default(10),
    },
    async ({ query, limit }) => asJsonContent(await client.search(query, limit))
  );

  server.tool(
    "database_create_work",
    {
      actor: z.string().min(1).optional(),
      requestId: z.string().min(1).optional(),
      idempotencyKey: z.string().min(1),
      payload: z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        alternativeTitles: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        style: z.string().optional(),
        targetChapters: z.number().int().min(0).optional(),
        currentChapters: z.number().int().min(0).optional(),
        status: z.string().optional(),
        platform: z.string().optional(),
      }),
    },
    async (input) => writeTool("create_work", input, (body, key) => client.createWork(body, key))
  );

  server.tool(
    "database_append_chapter",
    {
      actor: z.string().min(1).optional(),
      requestId: z.string().min(1).optional(),
      idempotencyKey: z.string().min(1),
      payload: z.object({
        workId: z.union([z.string().min(1), z.number().int().positive()]),
        volumeNumber: z.number().int().min(1).optional(),
        chapterNumber: z.number().int().min(1),
        title: z.string().optional(),
        content: z.string().optional(),
        plotSummary: z.string().optional(),
        wordCount: z.number().int().min(0).optional(),
        status: z.string().optional(),
        auditStatus: z.string().optional(),
        auditIssues: z.array(z.unknown()).optional(),
      }),
    },
    async (input) => writeTool("append_chapter", input, (body, key) => client.appendChapter(body, key))
  );

  server.tool(
    "database_upsert_vocabulary_item",
    {
      actor: z.string().min(1).optional(),
      requestId: z.string().min(1).optional(),
      idempotencyKey: z.string().min(1),
      payload: z.object({
        content: z.string().min(1),
        type: z.string().optional(),
        category: z.string().optional(),
        note: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async (input) =>
      writeTool("upsert_vocabulary_item", input, (body, key) => client.upsertVocabularyItem(body, key))
  );

  server.tool(
    "database_record_note",
    {
      actor: z.string().min(1).optional(),
      requestId: z.string().min(1).optional(),
      idempotencyKey: z.string().min(1),
      payload: z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async (input) => writeTool("record_note", input, (body, key) => client.recordNote(body, key))
  );

  server.tool(
    "database_record_experience",
    {
      actor: z.string().min(1).optional(),
      requestId: z.string().min(1).optional(),
      idempotencyKey: z.string().min(1),
      payload: z.object({
        type: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        userQuery: z.string().optional(),
        solution: z.string().optional(),
        experienceApplied: z.array(z.unknown()).optional(),
        experienceGained: z.array(z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
        difficulty: z.number().int().min(1).optional(),
        xpGained: z.number().int().min(0).optional(),
        summary: z.string().optional(),
        rootCause: z.string().optional(),
        verification: z.string().optional(),
        sourceText: z.string().optional(),
        cloudText: z.string().optional(),
      }),
    },
    async (input) => writeTool("record_experience", input, (body, key) => client.recordExperience(body, key))
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[database-gateway-mcp] fatal error:", error);
  process.exitCode = 1;
});
