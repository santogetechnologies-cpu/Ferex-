import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';

// The one picture shown on every university card that has no picture of its own.
// Saved in system_config so every device and the public site see the same image.
const KEY = 'university_fallback_image';
const EVENT = 'ferex_university_fallback_change';

let cached: string | null = null;
let inflight: Promise<string> | null = null;

export async function getUniversityFallbackImage(force = false): Promise<string> {
  if (cached !== null && !force) return cached;
  if (!inflight || force) {
    inflight = (async () => {
      const { data } = await supabase.from('system_config').select('value').eq('key', KEY).maybeSingle();
      const url = typeof (data?.value as any)?.url === 'string' ? (data!.value as any).url : '';
      cached = url;
      return url;
    })().catch(() => cached ?? '').finally(() => { inflight = null; });
  }
  return inflight;
}

export async function saveUniversityFallbackImage(url: string): Promise<void> {
  const client = (await getAdminSupabaseClient()) || supabase;
  const { error } = await client.from('system_config').upsert({ key: KEY, value: { url, updated_at: new Date().toISOString() } }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  cached = url;
  window.dispatchEvent(new Event(EVENT));
}

export const FALLBACK_EVENT = EVENT;
