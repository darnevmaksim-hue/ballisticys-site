window.AUTH_CONFIG = {
  url: window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://vercel-sb-proxy.vercel.app',
  // Required: public anon key from Supabase project settings
  anonKey: 'sb_publishable_wOP6JSWHOQPxoaSNiMzg_A_sdlSo0jp'
  // OAuth отключён — только email/пароль
};
