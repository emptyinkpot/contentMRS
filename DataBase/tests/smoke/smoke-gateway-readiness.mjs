const baseUrl = String(process.env.DATABASE_GATEWAY_URL || "http://127.0.0.1:18090").replace(/\/+$/, "");
const apiKey = String(process.env.DATABASE_GATEWAY_API_KEY || "").trim();
const apiHeader = "X-DataBase-Api-Key";

function headers(extra = {}) {
  return apiKey ? { [apiHeader]: apiKey, ...extra } : extra;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getJson(path, options = {}) {
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
  return { response, body };
}

const health = await getJson("/health");
assert(health.response.ok, `/health failed: ${health.response.status}`);
assert(health.body?.ok === true, "/health did not return ok=true");
assert(health.body?.checks?.mysql === "ok", "/health mysql check is not ok");

const status = await getJson("/status");
assert(status.response.ok, `/status failed: ${status.response.status}`);
const authRequired = Boolean(status.body?.auth?.required);
if (authRequired) {
  assert(apiKey, "/status reports auth.required=true but DATABASE_GATEWAY_API_KEY is not set");
}

const evidence = await getJson("/evidence/search?q=test&includeWeb=false&includeRagflow=false&limit=2");
assert(evidence.response.ok, `/evidence/search failed: ${evidence.response.status}`);
assert(evidence.body && typeof evidence.body === "object", "/evidence/search did not return a JSON object");

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  authRequired,
  mysql: health.body.checks.mysql,
  optionalDownstreams: health.body.optionalDownstreams || {},
  evidenceMode: evidence.body.mode || null,
  evidenceChunks: evidence.body.counts?.chunks ?? evidence.body.chunks?.length ?? null
}, null, 2));
