const baseUrl = String(process.env.DATABASE_GATEWAY_URL || "http://127.0.0.1:18090").replace(/\/+$/, "");
const apiKey = process.env.DATABASE_GATEWAY_API_KEY;
const headerName = process.env.DATABASE_GATEWAY_HEADER || "X-DataBase-Api-Key";
const expectedMount = process.env.DATABASE_OPENLIST_EXPECT_MOUNT || process.env.OPENLIST_EXPECT_MOUNT || "";

function headers() {
  return apiKey ? { [headerName]: apiKey } : {};
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: headers() });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

const health = await getJson("/openlist/health");
assert(health.response.ok, `/openlist/health failed: ${health.response.status}`);
assert(health.body?.ok === true, "/openlist/health did not return ok=true");

const storages = await getJson("/openlist/storages");
assert(storages.response.ok, `/openlist/storages failed: ${storages.response.status}`);
assert(Array.isArray(storages.body?.storages), "/openlist/storages missing storages array");
assert(Number(storages.body?.count || 0) >= 1, "/openlist/storages returned no storage mounts");

const mounts = storages.body.storages.map((item) => String(item.mount_path || item.mountPath || ""));
if (expectedMount) {
  assert(mounts.includes(expectedMount), `/openlist/storages missing expected mount ${expectedMount}`);
}

const serialized = JSON.stringify(storages.body);
assert(!/"cookie":"(?!\[redacted\])/.test(serialized), "/openlist/storages leaked raw cookie");
assert(!/"secret_access_key":"(?!\[redacted\])/.test(serialized), "/openlist/storages leaked raw secret_access_key");
assert(!/"access_key_id":"(?!\[redacted\])/.test(serialized), "/openlist/storages leaked raw access_key_id");

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  storageCount: storages.body.count,
  mounts,
  expectedMount: expectedMount || null
}, null, 2));
