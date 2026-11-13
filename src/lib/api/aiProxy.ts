import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';

export type AiTarget = 'openrouter_chat' | 'openai_chat' | 'openai_speech' | 'openai_realtime_secret' | 'status';

/**
 * Calls the server-side AI gateway (supabase/functions/ai-proxy). Provider API keys exist only as server
 * secrets; the browser never sees them. Returns the provider's raw Response (streaming works as before).
 */
export async function aiProxyFetch(target: AiTarget, payload: unknown = {}): Promise<Response> {
  const url = `${supabaseUrl}/functions/v1/ai-proxy`;
  const anonKey = supabaseAnonKey;
  let token = anonKey;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) token = data.session.access_token;
  } catch { /* guests use the public key */ }
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ target, payload }),
  });
}
