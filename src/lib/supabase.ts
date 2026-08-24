import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://eimexyahdrbloccyrfap.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_gf595ABqrnwT6_Et33-B8g_X5mlLnOK';

declare global {
  interface Window {
    __ferex_supabase_client__?: SupabaseClient;
  }
}

export const supabase: SupabaseClient =
  window.__ferex_supabase_client__ ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: (...args) =>
        fetch(...args).catch((err) => {
          console.warn('[Network Notice]: Internet DNS or Supabase endpoint unresolvable:', err.message);
          return new Response(JSON.stringify({ error: 'Network unresolvable', message: err.message }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }),
    },
  });

if (import.meta.env.DEV) {
  window.__ferex_supabase_client__ = supabase;
}
