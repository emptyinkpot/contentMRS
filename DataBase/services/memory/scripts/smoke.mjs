import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceRoot = path.resolve(__dirname, "..");
const dataBaseRoot = path.resolve(serviceRoot, "..", "..");
const facadeScript = path.join(dataBaseRoot, "scripts", "database-memory.mjs");

const child = spawn(
  process.execPath,
  [
    facadeScript,
    "search",
    "--query",
    "Token Pool streamLifecycle",
    "--limit",
    "1",
  ],
  {
    cwd: dataBaseRoot,
    windowsHide: true,
  }
);

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

child.on("close", (code) => {
  if (code !== 0) {
    console.error(stderr || stdout);
    process.exit(code || 1);
  }

  if (!stdout.includes("Token Pool streamLifecycle")) {
    console.error("memory facade smoke did not return the expected recall target");
    console.error(stdout);
    process.exit(1);
  }

  console.log("database-memory-service smoke ok");
});
