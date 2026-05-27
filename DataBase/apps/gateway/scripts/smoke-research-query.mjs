const baseUrl = String(process.env.DATABASE_GATEWAY_URL || 'http://127.0.0.1:18090').replace(/\/+$/, '');
const apiKey = String(process.env.DATABASE_GATEWAY_API_KEY || '').trim();

const body = {
  query: process.argv.slice(2).join(' ') || '新地主阶级 通道租',
  topicId: 'xin-dizhu-tongdao-zu',
  modes: ['corpus'],
  limit: 8,
  rounds: 4,
  planner: 'rules',
};

const headers = {
  accept: 'application/json',
  'content-type': 'application/json',
};
if (apiKey) headers['x-api-key'] = apiKey;

const response = await fetch(`${baseUrl}/research/query`, {
  method: 'POST',
  headers,
  body: JSON.stringify(body),
});

const payload = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(JSON.stringify({ ok: false, status: response.status, payload }, null, 2));
  process.exit(1);
}

const pack = payload.pack || {};
const counts = pack.counts || {};
console.log(JSON.stringify({
  ok: true,
  sessionId: payload.sessionId,
  plan: payload.plan,
  chunkCount: counts.chunks ?? pack.chunks?.length ?? 0,
  webSources: counts.webSources ?? 0,
  queryRounds: counts.queryRounds ?? 0,
}, null, 2));
