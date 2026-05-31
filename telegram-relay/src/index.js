export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405 });
    }
    const url = new URL(request.url);
    const token = url.pathname.replace('/bot', '').replace('/sendMessage', '');
    if (!token) {
      return new Response('Missing bot token in path', { status: 400 });
    }
    const body = await request.text();
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const result = await resp.text();
    return new Response(result, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
