import type { DatabaseClient, DefaultApi } from '@emptyinkpot/database-gateway-generated-client';

function getGatewayBaseUrl(): string {
  const value = process.env.DATABASE_GATEWAY_URL?.trim();
  if (!value) {
    throw new Error('DATABASE_GATEWAY_URL is required for DataBase Gateway access');
  }
  return value.replace(/\/$/, '');
}

export function createDataBaseGatewayClient(): DefaultApi {
  return createContentDatabaseClient().raw;
}

export function createContentDatabaseClient(): DatabaseClient {
  const { createDatabaseClient } = require('@emptyinkpot/database-gateway-generated-client') as typeof import('@emptyinkpot/database-gateway-generated-client');
  return createDatabaseClient({
    baseUrl: getGatewayBaseUrl(),
    apiKey: process.env.DATABASE_GATEWAY_API_KEY,
    actor: 'contentbase',
  });
}
