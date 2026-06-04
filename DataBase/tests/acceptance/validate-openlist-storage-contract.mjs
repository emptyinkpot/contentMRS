const remoteMode = String(process.env.DATABASE_OPENLIST_REMOTE_SSH || "").trim();
const remoteContainer = String(process.env.DATABASE_OPENLIST_REMOTE_CONTAINER || "contentmrs-docker-database-gateway-1").trim();
const baseUrl = String(
  process.env.DATABASE_GATEWAY_URL ||
  (remoteMode ? "http://127.0.0.1:18090" : "http://127.0.0.1:18090")
).replace(/\/+$/, "");
const apiKey = String(process.env.DATABASE_GATEWAY_API_KEY || "").trim();
const headerName = String(process.env.DATABASE_GATEWAY_HEADER || "X-DataBase-Api-Key").trim();
const expectedMounts = splitList(process.env.OPENLIST_EXPECT_MOUNTS || "/quark,/cos-myblog-media");
const expectedCosDirs = splitList(process.env.OPENLIST_EXPECT_COS_DIRS || "_verify,archive,books,obsidian,ragflow-migration,visuals");

function splitList(value) {
  return String(value || "")
    .split(/[,\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function headers(extra = {}) {
  return apiKey ? { [headerName]: apiKey, ...extra } : extra;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(path, options = {}) {
  if (remoteMode) {
    return requestJsonOverSsh(path, options);
  }
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body, text };
}

async function requestJsonOverSsh(path, options = {}) {
  const payload = {
    url: `${baseUrl}${path}`,
    method: options.method || "GET",
    headers: {
      ...headers(),
      ...(options.headers || {})
    },
    body: options.body || null
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const ssh = await import("node:child_process");
  const shell = [
    "set -eu",
    `export PAYLOAD='${encoded}'`,
    "node - <<'NODE'",
    "const payload = JSON.parse(Buffer.from(process.env.PAYLOAD, 'base64').toString('utf8'));",
    "const gatewayKey = String(process.env.DATABASE_GATEWAY_API_KEY || '').trim();",
    "const gatewayHeader = String(process.env.DATABASE_GATEWAY_HEADER || 'X-DataBase-Api-Key').trim() || 'X-DataBase-Api-Key';",
    "if (gatewayKey && !payload.headers.Authorization && !payload.headers.authorization && !payload.headers[gatewayHeader]) payload.headers[gatewayHeader] = gatewayKey;",
    "const response = await fetch(payload.url, { method: payload.method, headers: payload.headers, body: payload.body });",
    "const text = await response.text();",
    "console.log(JSON.stringify({ status: response.status, ok: response.ok, text }));",
    "NODE"
  ].join("\n");
  const command = `sudo -n docker exec -i ${remoteContainer} sh`;
  const output = ssh.execFileSync("ssh", [remoteMode, command], {
    input: shell,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8
  });
  const result = JSON.parse(output);
  let body = null;
  try {
    body = result.text ? JSON.parse(result.text) : null;
  } catch {
    body = result.text;
  }
  return {
    response: {
      ok: Boolean(result.ok),
      status: Number(result.status)
    },
    body,
    text: result.text
  };
}

async function postJson(path, payload) {
  return requestJson(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function readListEntries(body) {
  const data = body?.data || body;
  const candidates = [
    data?.content,
    data?.files,
    data?.items,
    data?.entries,
    body?.content,
    body?.files,
    body?.items
  ];
  return candidates.find(Array.isArray) || [];
}

function readMountPath(item) {
  return String(item?.mount_path || item?.mountPath || item?.path || "").trim();
}

function assertSecretRedaction(payload) {
  const serialized = JSON.stringify(payload);
  const rawFieldPatterns = [
    /"cookie"\s*:\s*"(?!\[redacted\])/i,
    /"access_key_id"\s*:\s*"(?!\[redacted\])/i,
    /"secret_access_key"\s*:\s*"(?!\[redacted\])/i,
    /"accessKeyId"\s*:\s*"(?!\[redacted\])/,
    /"secretAccessKey"\s*:\s*"(?!\[redacted\])/
  ];
  for (const pattern of rawFieldPatterns) {
    assert(!pattern.test(serialized), `OpenList payload leaked a raw secret field matching ${pattern}`);
  }
  assert(!/AKID[A-Za-z0-9]{10,}/.test(serialized), "OpenList payload leaked a Tencent SecretId-looking value");
  assert(!/sk-[A-Za-z0-9_-]{16,}/.test(serialized), "OpenList payload leaked an API-key-looking value");
}

const health = await requestJson("/openlist/health");
assert(health.response.ok, `/openlist/health failed: ${health.response.status}`);
assert(health.body?.ok === true, "/openlist/health did not return ok=true");

const storages = await requestJson("/openlist/storages");
assert(storages.response.ok, `/openlist/storages failed: ${storages.response.status}`);
assert(Array.isArray(storages.body?.storages), "/openlist/storages missing storages array");
assertSecretRedaction(storages.body);

const mountsResponse = await requestJson("/openlist/mounts?limit=100");
assert(mountsResponse.response.ok, `/openlist/mounts failed: ${mountsResponse.response.status}`);
assertSecretRedaction(mountsResponse.body);

const storageMounts = storages.body.storages.map(readMountPath).filter(Boolean);
const mountRows = Array.isArray(mountsResponse.body?.mounts) ? mountsResponse.body.mounts : [];
const gatewayMounts = mountRows.map(readMountPath).filter(Boolean);
const allMounts = Array.from(new Set([...storageMounts, ...gatewayMounts]));

for (const mount of expectedMounts) {
  assert(allMounts.includes(mount), `OpenList is missing expected mount ${mount}`);
}

const cosList = await postJson("/openlist/fs/list", {
  path: "/cos-myblog-media",
  page: 1,
  per_page: 200,
  refresh: false
});
assert(cosList.response.ok, `/openlist/fs/list /cos-myblog-media failed: ${cosList.response.status}`);
const cosEntries = readListEntries(cosList.body);
const cosNames = cosEntries.map((item) => String(item?.name || item?.filename || item?.path || "").replace(/^\/+/, ""));
for (const dir of expectedCosDirs) {
  assert(cosNames.includes(dir), `/cos-myblog-media is missing expected directory ${dir}`);
}

const quarkList = await postJson("/openlist/fs/list", {
  path: "/quark",
  page: 1,
  per_page: 20,
  refresh: false
});
assert(quarkList.response.ok, `/openlist/fs/list /quark failed: ${quarkList.response.status}`);

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  mounts: allMounts,
  cosDirs: cosNames,
  quarkEntryCount: readListEntries(quarkList.body).length,
  redaction: "verified"
}, null, 2));
