window.AUTH_CONFIG = {
  // Required: https://<project-ref>.supabase.co
  url: '',
  // Required: public anon key from Supabase project settings
  anonKey: '',
  // Optional: if true, any authenticated user can access admin panel
  allowAnySignedIn: false,
  // Optional: explicit admin allowlist (emails in lowercase)
  adminEmails: [
    // 'you@example.com'
  ],
  // Optional: oauth providers to show in UI
  oauthProviders: ['google', 'discord', 'vk']
};
