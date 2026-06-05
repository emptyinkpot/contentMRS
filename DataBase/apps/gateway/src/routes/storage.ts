import { Hono } from "hono";
import type { AppBindings, RouteDependencies } from "../types.js";
import { HttpError } from "../http.js";

function generateKey(prefix: string, filename: string): string {
  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
  return `${prefix}${ts}-${safe}`;
}

function buildUrl(deps: RouteDependencies, key: string): string {
  const cos = deps.config.cos!;
  if (cos.cdnDomain) {
    return `https://${cos.cdnDomain}/${key}`;
  }
  return `https://${cos.bucket}.cos.${cos.region}.myqcloud.com/${key}`;
}

function putObject(deps: RouteDependencies, key: string, body: Buffer, contentType: string): Promise<void> {
  const cos = deps.config.cos!;
  return new Promise((resolve, reject) => {
    deps.cosClient!.putObject({
      Bucket: cos.bucket,
      Region: cos.region,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    }, (err) => (err ? reject(err) : resolve()));
  });
}

export function storageRoutes(deps: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.post("/storage/upload", async (c) => {
    if (!deps.cosClient || !deps.config.cos) {
      throw new HttpError(503, "cos_not_configured", "COS storage is not configured");
    }
    const form = await c.req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      throw new HttpError(400, "missing_file", "multipart field 'file' is required");
    }
    const prefix = String(form.get("prefix") || "uploads/").replace(/\/*$/, "/");
    const filename = String(form.get("filename") || file.name || "unnamed");
    const key = generateKey(prefix, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    await putObject(deps, key, buf, contentType);
    const url = buildUrl(deps, key);
    return c.json({ ok: true, url, key, size: buf.length, contentType, requestId: c.get("requestId") });
  });

  app.post("/storage/upload/obsidian-image", async (c) => {
    if (!deps.cosClient || !deps.config.cos) {
      throw new HttpError(503, "cos_not_configured", "COS storage is not configured");
    }
    const form = await c.req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      throw new HttpError(400, "missing_file", "multipart field 'file' is required");
    }
    const key = generateKey("obsidian/", file.name || "image.png");
    const buf = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "image/png";
    await putObject(deps, key, buf, contentType);
    const url = buildUrl(deps, key);
    return c.json({ ok: true, url, markdownEmbed: `![](${url})`, key, size: buf.length, requestId: c.get("requestId") });
  });

  return app;
}
