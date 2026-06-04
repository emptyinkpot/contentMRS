import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

const env = loadEnv();
const baseUrl = requireEnv("OPENLIST_BASE_URL").replace(/\/+$/, "");
const token = requireEnv("OPENLIST_TOKEN");
const mountPath = normalizeMountPath(requireEnv("OPENLIST_S3_MOUNT_PATH"));
const bucket = requireEnv("OPENLIST_S3_BUCKET");
const endpoint = requireEnv("OPENLIST_S3_ENDPOINT");
const region = env.OPENLIST_S3_REGION || "ap-shanghai";
const accessKeyId = requireEnv("OPENLIST_S3_ACCESS_KEY_ID");
const secretAccessKey = requireEnv("OPENLIST_S3_SECRET_ACCESS_KEY");
const rootPath = normalizeRootPath(env.OPENLIST_S3_ROOT_PATH || "/");
const remark = env.OPENLIST_S3_REMARK || "DataBase-managed S3-compatible storage projection";
const dryRun = truthy(env.OPENLIST_PROVISION_DRY_RUN);
const updateExisting = env.OPENLIST_PROVISION_UPDATE_EXISTING !== "false";

const existing = await listStorages();
const match = existing.content.find((storage) => normalizeMountPath(storage.mount_path) === mountPath);
const payload = buildStoragePayload(match);

if (dryRun) {
  console.log(JSON.stringify({
    ok: true,
    dryRun: true,
    action: match ? "update" : "create",
    existingId: match?.id || null,
    storage: redactStorage(payload)
  }, null, 2));
  process.exit(0);
}

let result;
if (match) {
  if (!updateExisting) {
    throw new Error(`OpenList storage already exists at ${mountPath}; set OPENLIST_PROVISION_UPDATE_EXISTING=true to update`);
  }
  result = await openListRequest("/api/admin/storage/update", {
    method: "POST",
    body: payload
  });
} else {
  result = await openListRequest("/api/admin/storage/create", {
    method: "POST",
    body: payload
  });
}

await openListRequest("/api/admin/storage/load_all", { method: "POST", body: {} });
const verified = await listStorages();
const verifiedMatch = verified.content.find((storage) => normalizeMountPath(storage.mount_path) === mountPath);
if (!verifiedMatch) {
  throw new Error(`OpenList storage ${mountPath} was not visible after provisioning`);
}

console.log(JSON.stringify({
  ok: true,
  action: match ? "update" : "create",
  result,
  storage: redactStorage(verifiedMatch)
}, null, 2));

function buildStoragePayload(existingStorage) {
  return {
    ...(existingStorage || {}),
    id: existingStorage?.id || 0,
    mount_path: mountPath,
    order: Number(env.OPENLIST_S3_ORDER || existingStorage?.order || 0),
    driver: "S3",
    cache_expiration: Number(env.OPENLIST_S3_CACHE_EXPIRATION || existingStorage?.cache_expiration || 30),
    custom_cache_policies: existingStorage?.custom_cache_policies || "",
    status: existingStorage?.status || "",
    addition: JSON.stringify({
      root_folder_path: rootPath,
      bucket,
      endpoint,
      region,
      access_key_id: accessKeyId,
      secret_access_key: secretAccessKey,
      session_token: env.OPENLIST_S3_SESSION_TOKEN || "",
      custom_host: env.OPENLIST_S3_CUSTOM_HOST || "",
      enable_custom_host_presign: truthy(env.OPENLIST_S3_ENABLE_CUSTOM_HOST_PRESIGN),
      sign_url_expire: Number(env.OPENLIST_S3_SIGN_URL_EXPIRE || 4),
      placeholder: env.OPENLIST_S3_PLACEHOLDER || "",
      force_path_style: truthy(env.OPENLIST_S3_FORCE_PATH_STYLE),
      list_object_version: env.OPENLIST_S3_LIST_OBJECT_VERSION || "v1",
      remove_bucket: truthy(env.OPENLIST_S3_REMOVE_BUCKET),
      add_filename_to_disposition: truthy(env.OPENLIST_S3_ADD_FILENAME_TO_DISPOSITION),
      enable_direct_upload: truthy(env.OPENLIST_S3_ENABLE_DIRECT_UPLOAD),
      direct_upload_host: env.OPENLIST_S3_DIRECT_UPLOAD_HOST || ""
    }),
    remark,
    disabled: false,
    disable_index: truthy(env.OPENLIST_S3_DISABLE_INDEX),
    enable_sign: truthy(env.OPENLIST_S3_ENABLE_SIGN),
    order_by: env.OPENLIST_S3_ORDER_BY || existingStorage?.order_by || "",
    order_direction: env.OPENLIST_S3_ORDER_DIRECTION || existingStorage?.order_direction || "",
    extract_folder: env.OPENLIST_S3_EXTRACT_FOLDER || existingStorage?.extract_folder || "",
    web_proxy: truthy(env.OPENLIST_S3_WEB_PROXY),
    webdav_policy: env.OPENLIST_S3_WEBDAV_POLICY || existingStorage?.webdav_policy || "",
    proxy_range: truthy(env.OPENLIST_S3_PROXY_RANGE),
    down_proxy_url: env.OPENLIST_S3_DOWN_PROXY_URL || existingStorage?.down_proxy_url || "",
    disable_proxy_sign: truthy(env.OPENLIST_S3_DISABLE_PROXY_SIGN)
  };
}

async function listStorages() {
  return openListRequest("/api/admin/storage/list?page=1&per_page=1000");
}

async function openListRequest(path, options = {}) {
  const headers = { Authorization: token };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenList HTTP ${response.status}: ${text}`);
  }
  const envelope = text ? JSON.parse(text) : {};
  if (envelope.code !== 200) {
    throw new Error(`OpenList API ${envelope.code}: ${envelope.message}`);
  }
  return envelope.data;
}

function loadEnv() {
  const result = {};
  const files = [
    process.env.OPENLIST_ENV_FILE,
    process.env.OPENLIST_PROVISION_ENV_FILE
  ].filter(Boolean);
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index <= 0) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (result[key] == null) result[key] = value;
    }
  }
  return { ...result, ...process.env };
}

function requireEnv(name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeMountPath(value) {
  const normalized = `/${String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "")}`;
  return normalized.replace(/\/{2,}/g, "/").replace(/\/+$/g, "") || "/";
}

function normalizeRootPath(value) {
  const normalized = String(value || "/").trim().replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function truthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function redactStorage(storage) {
  const copy = { ...storage };
  if (typeof copy.addition === "string") {
    try {
      const addition = JSON.parse(copy.addition);
      for (const key of ["access_key_id", "secret_access_key", "session_token"]) {
        if (addition[key]) addition[key] = "[redacted]";
      }
      copy.addition = JSON.stringify(addition);
    } catch {
      copy.addition = "[redacted]";
    }
  }
  return copy;
}
