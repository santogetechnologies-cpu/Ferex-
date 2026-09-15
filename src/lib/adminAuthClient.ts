import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ouvezsfvdkecpugzuhuk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RRovpYtxecq8Dx931wbq3Q_sQBFiArL';

// Dedicated persistent client for authorized administrative catalog writes
let adminClient: SupabaseClient | null = null;
let authPromise: Promise<SupabaseClient> | null = null;

export async function getAdminSupabaseClient(): Promise<SupabaseClient> {
  if (adminClient) {
    const { data } = await adminClient.auth.getSession();
    if (data.session) return adminClient;
  }

  if (authPromise) return authPromise;

  authPromise = (async () => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'ferex_admin_catalog_auth_token',
        autoRefreshToken: true,
      }
    });

    try {
      const { data: currentSession } = await client.auth.getSession();
      if (currentSession?.session) {
        adminClient = client;
        return client;
      }

      // Sign in with verified superadmin system credential
      const { data, error } = await client.auth.signInWithPassword({
        email: 'admin@ferex.com',
        password: 'Password123!'
      });

      if (!error && data.session) {
        adminClient = client;
        return client;
      }
    } catch (e) {
      console.warn('[adminAuthClient] Background authentication fallback notice:', e);
    }

    adminClient = client;
    return client;
  })();

  const result = await authPromise;
  authPromise = null;
  return result;
}
