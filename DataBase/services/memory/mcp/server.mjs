import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceRoot = path.resolve(__dirname, "..");
const dataBaseRoot = path.resolve(serviceRoot, "..", "..");
const facadeScript = path.join(dataBaseRoot, "scripts", "database-memory.mjs");

function asText(value) {
  return [{ type: "text", text: value }];
}

function runFacade(args, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [facadeScript, ...args], {
      cwd: dataBaseRoot,
      windowsHide: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({
        ok: false,
        timeout: true,
        stdout,
        stderr,
        error: `DataBase Memory Service facade timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr,
      });
    });
  });
}

async function runTool(args, timeoutMs) {
  const result = await runFacade(args, timeoutMs);
  return {
    content: asText(JSON.stringify(result, null, 2)),
  };
}

async function main() {
  const server = new McpServer({
    name: "database-memory-service",
    version: "1.0.0",
  });

  server.tool("memory_status", {}, async () => {
    return await runTool(["status"], 180000);
  });

  server.tool("memory_probe", {}, async () => {
    return await runTool(["probe"], 120000);
  });

  server.tool(
    "memory_search",
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(10).optional().default(5),
    },
    async ({ query, limit }) => {
      return await runTool(["search", "--query", query, "--limit", String(limit)], 120000);
    }
  );

  server.tool(
    "memory_recall",
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(10).optional().default(5),
    },
    async ({ query, limit }) => {
      return await runTool(["recall", "--query", query, "--limit", String(limit)], 180000);
    }
  );

  server.tool(
    "memory_refresh_dry_run",
    {
      limit: z.number().int().min(1).max(50).optional().default(5),
    },
    async ({ limit }) => {
      return await runTool(["refresh", "--limit", String(limit), "--dry-run"], 120000);
    }
  );

  server.tool(
    "record_experience_dry_run",
    {
      inputPath: z.string().min(1),
    },
    async ({ inputPath }) => {
      return await runTool(["record-experience", "--input", inputPath], 120000);
    }
  );

  server.tool(
    "record_note_dry_run",
    {
      inputPath: z.string().min(1),
    },
    async ({ inputPath }) => {
      return await runTool(["record-note", "--input", inputPath], 120000);
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[database-memory-service] fatal error:", error);
  process.exitCode = 1;
});
