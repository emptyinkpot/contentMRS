const baseUrl = process.env.DATABASE_GATEWAY_URL || "http://127.0.0.1:18090";

const response = await fetch(`${baseUrl}/evidence/search?q=channel+rent&includeWeb=true&limit=3`);
const payload = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(JSON.stringify({ ok: false, status: response.status, payload }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  webSources: payload?.counts?.webSources ?? 0,
  chunks: payload?.counts?.chunks ?? 0,
  mode: payload?.mode,
  providers: payload?.queryRun?.provider,
}, null, 2));
