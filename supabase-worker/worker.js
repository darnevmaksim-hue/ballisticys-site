const SUPABASE_BACKEND = 'https://yzsdvewqdlcoshaokuzp.supabase.co';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/') return new Response('Ballisticys Supabase Proxy', { status: 200 });
    const target = SUPABASE_BACKEND + url.pathname + url.search;
    const headers = new Headers(request.headers);
    headers.set('Host', new URL(SUPABASE_BACKEND).host);
    const resp = await fetch(target, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
    });
    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers
    });
  }
};
