import type { DbPool } from "./db.js";
import type { GatewayConfig } from "./config.js";
import type { OpenListClient } from "@emptyinkpot/database-openlist-adapter";

export interface AppBindings {
  Variables: {
    requestId: string;
  };
}

export interface RouteDependencies {
  config: GatewayConfig;
  pool: DbPool;
  writePool: DbPool;
  openlistClient: OpenListClient | null;
}
