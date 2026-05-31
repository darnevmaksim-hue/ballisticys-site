const SUPABASE_BACKEND = 'https://yzsdvewqdlcoshaokuzp.supabase.co';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response('Ballisticys Supabase Proxy', { status: 200 });
    }

    const targetUrl = SUPABASE_BACKEND + url.pathname + url.search;
    const headers = new Headers(request.headers);
    headers.set('Host', new URL(SUPABASE_BACKEND).host);

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
