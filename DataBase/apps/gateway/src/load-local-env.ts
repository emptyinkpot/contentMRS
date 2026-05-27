import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function loadFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

export function loadLocalEnvFiles(): void {
  const gatewayRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  loadFile(join(gatewayRoot, ".env.example"));
  loadFile("C:\\Users\\ASUS-KL\\.codex-secrets\\mysql\\database_service_users.env");
  loadFile("C:\\Users\\ASUS-KL\\.codex-secrets\\database-gateway\\database_gateway.env");
  loadFile(join(gatewayRoot, ".env"));

  if (!process.env.MYSQL_PASSWORD && process.env.DATABASE_READONLY_PASSWORD) {
    process.env.MYSQL_PASSWORD = process.env.DATABASE_READONLY_PASSWORD;
  }
  if (!process.env.MYSQL_USER && process.env.DATABASE_READONLY_USER) {
    process.env.MYSQL_USER = process.env.DATABASE_READONLY_USER;
  }
  if (!process.env.DATABASE_EVIDENCE_WEB_SEARCH_URL) {
    process.env.DATABASE_EVIDENCE_WEB_SEARCH_URL = "http://127.0.0.1:19091/search";
  }
}
