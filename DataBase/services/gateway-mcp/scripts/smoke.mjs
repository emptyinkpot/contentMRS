import { DataBaseGatewayClient } from "../../../apps/gateway/src/clients/database-gateway-client.js";

const baseUrl = process.env.DATABASE_GATEWAY_URL || "https://database.tengokukk.com";
const apiKey = process.env.DATABASE_GATEWAY_API_KEY || undefined;

const client = new DataBaseGatewayClient({ baseUrl, apiKey });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const status = await client.status();
assert(status.ok === true, "status did not return ok=true");

const tables = await client.inventoryTables();
assert(Array.isArray(tables.tables), "inventoryTables did not return tables array");

const works = await client.listWorks(1);
assert(Array.isArray(works.works), "listWorks did not return works array");

const vocabulary = await client.searchVocabulary("database-gateway", 1);
assert(Array.isArray(vocabulary.items), "searchVocabulary did not return items array");

console.log("database-gateway-mcp smoke ok");
