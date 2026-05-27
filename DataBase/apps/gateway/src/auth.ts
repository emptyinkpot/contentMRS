import type { Context, Next } from "hono";
import type { GatewayConfig } from "./config.js";
import type { AppBindings } from "./types.js";
import { errorBody } from "./http.js";

export function apiKeyMiddleware(config: GatewayConfig) {
  return async (c: Context<AppBindings>, next: Next) => {
    if (!config.authRequired) {
      await next();
      return;
    }

    if (!config.apiKey) {
      return c.json(
        errorBody(c, "auth_misconfigured", "DATABASE_GATEWAY_AUTH_REQUIRED is true but DATABASE_GATEWAY_API_KEY is not configured"),
        500
      );
    }

    const supplied = c.req.header("X-DataBase-Api-Key");
    if (supplied !== config.apiKey) {
      return c.json(
        errorBody(c, "unauthorized", "Missing or invalid X-DataBase-Api-Key"),
        401
      );
    }

    await next();
  };
}
