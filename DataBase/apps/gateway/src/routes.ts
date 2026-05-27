import { Hono } from "hono";
import type { AppBindings, RouteDependencies } from "./types.js";
import { apiKeyMiddleware } from "./auth.js";
import { accessLogMiddleware, errorBody, HttpError, requestIdMiddleware } from "./http.js";
import { healthRoutes } from "./routes/health.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { searchRoutes } from "./routes/search.js";
import { evidenceRoutes } from "./routes/evidence.js";
import { styleRoutes } from "./routes/style.js";
import { contentRoutes } from "./routes/content.js";
import { creativeRoutes } from "./routes/creative.js";
import { semanticRoutes } from "./routes/semantic.js";
import { vocabularyRoutes } from "./routes/vocabulary.js";
import { storyMemoryRoutes } from "./routes/story-memory.js";
import { openlistRoutes } from "./routes/openlist.js";
import { myblogRoutes } from "./routes/myblog.js";
import { writeRoutes } from "./routes/writes.js";
import { registerResearchRoutes } from "./routes/research.js";

export function createRoutes(deps: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.use("*", requestIdMiddleware);
  app.use("*", accessLogMiddleware);

  app.route("/", healthRoutes(deps));

  app.use("/inventory/*", apiKeyMiddleware(deps.config));
  app.route("/", inventoryRoutes(deps));

  app.use("/content/*", apiKeyMiddleware(deps.config));
  app.route("/", contentRoutes(deps));

  app.use("/creative/*", apiKeyMiddleware(deps.config));
  app.route("/", creativeRoutes(deps));
  app.route("/", storyMemoryRoutes(deps));

  app.use("/semantic/*", apiKeyMiddleware(deps.config));
  app.route("/", semanticRoutes(deps));

  app.use("/vocabulary/*", apiKeyMiddleware(deps.config));
  app.route("/", vocabularyRoutes(deps));

  app.use("/search/*", apiKeyMiddleware(deps.config));
  app.route("/", searchRoutes(deps));

  app.use("/evidence/*", apiKeyMiddleware(deps.config));
  app.route("/", evidenceRoutes(deps));

  app.use("/research/*", apiKeyMiddleware(deps.config));
  app.route("/", registerResearchRoutes(app, deps));

  app.use("/style/*", apiKeyMiddleware(deps.config));
  app.route("/", styleRoutes(deps));

  app.use("/openlist/*", apiKeyMiddleware(deps.config));
  app.route("/", openlistRoutes(deps));

  app.use("/myblog/*", apiKeyMiddleware(deps.config));
  app.route("/", myblogRoutes(deps));

  app.use("/writes/*", apiKeyMiddleware(deps.config));
  app.route("/", writeRoutes(deps));

  app.notFound((c) =>
    c.json(errorBody(c, "not_found", "Route not found"), 404)
  );

  app.onError((error, c) => {
    const status = error instanceof HttpError ? error.status : 500;
    const code = error instanceof HttpError ? error.code : "internal_error";
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error(
      JSON.stringify({
        level: "error",
        event: "request_error",
        requestId: c.get("requestId"),
        status,
        code,
        message,
        stack: error instanceof Error ? error.stack : undefined
      })
    );

    return c.json(errorBody(c, code, message), status);
  });

  return app;
}
