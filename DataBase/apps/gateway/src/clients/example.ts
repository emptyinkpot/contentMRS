import { DataBaseGatewayClient } from "./database-gateway-client.js";

const client = new DataBaseGatewayClient({
  baseUrl: process.env.DATABASE_GATEWAY_URL,
  apiKey: process.env.DATABASE_GATEWAY_API_KEY
});

const status = await client.status();
console.log(JSON.stringify(status, null, 2));
