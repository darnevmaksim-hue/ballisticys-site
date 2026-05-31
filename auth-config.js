window.AUTH_CONFIG = {
  url: window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://ballisticys-supabase-proxy.darnevmaksim.workers.dev',
  // Required: public anon key from Supabase project settings
  anonKey: 'sb_publishable_wOP6JSWHOQPxoaSNiMzg_A_sdlSo0jp'
  // OAuth отключён — только email/пароль
};
