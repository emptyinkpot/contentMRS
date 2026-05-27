import type { Context, Next } from "hono";
import type { AppBindings } from "./types.js";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 404 | 408 | 429 | 500 | 503,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function errorBody(c: Context<AppBindings>, code: string, message: string) {
  return {
    ok: false,
    error: code,
    message,
    requestId: c.get("requestId")
  };
}

export function validatedResponse<T>(schema: ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpError(
        500,
        "contract_validation_failed",
        error.issues
          .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
          .join("; ")
      );
    }
    throw error;
  }
}

export async function requestIdMiddleware(c: Context<AppBindings>, next: Next) {
  const requestId = c.req.header("X-Request-Id") || crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);
  await next();
}

export async function accessLogMiddleware(c: Context<AppBindings>, next: Next) {
  const startedAt = Date.now();
  await next();
  const elapsedMs = Date.now() - startedAt;
  console.log(
    JSON.stringify({
      level: "info",
      event: "request",
      requestId: c.get("requestId"),
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      elapsedMs
    })
  );
}
