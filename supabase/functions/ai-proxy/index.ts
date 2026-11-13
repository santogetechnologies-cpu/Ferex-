// Server-side AI gateway. Provider API keys live ONLY in Edge Function secrets (OPENAI_API_KEY,
// OPENROUTER_API_KEY) and never reach the browser. The web app calls this function instead of the providers.
//   guests (anon key):  openrouter_chat with free models only
//   signed-in users:    also openai_chat, openai_speech, openai_realtime_secret
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 40;
const MAX_TOKENS = 2000;
const hits = new Map<string, number[]>();
function rateLimited(key: string, limit = 40, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

function passthrough(res: Response) {
  const headers = new Headers(cors);
  headers.set('Content-Type', res.headers.get('Content-Type') || 'application/json');
  return new Response(res.body, { status: res.status, headers });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413);
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return json({ error: 'Too many requests. Please slow down.' }, 429);

  // Is the caller a signed-in user (not just the public anon key)?
  let signedIn = false;
  try {
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data } = await caller.auth.getUser();
    signedIn = !!data?.user;
  } catch { /* treated as guest */ }

  const target = String(body.target || '');
  const payload = body.payload ?? {};
  const openaiKey = Deno.env.get('OPENAI_API_KEY') || '';
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY') || '';

  const clampChat = (p: any) => {
    const messages = Array.isArray(p.messages) ? p.messages.slice(-MAX_MESSAGES) : [];
    return { ...p, messages, max_tokens: Math.min(Number(p.max_tokens) || 1000, MAX_TOKENS) };
  };

  if (target === 'openrouter_chat') {
    if (!openrouterKey) return json({ error: 'not_configured', message: 'AI chat is not configured yet.' }, 503);
    const p = clampChat(payload);
    // Guests may only use free models.
    if (!signedIn && !String(p.model || '').endsWith(':free')) return json({ error: 'Sign in to use this model.' }, 403);
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openrouterKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://ferex.com', 'X-Title': 'Ferex Copilot' },
      body: JSON.stringify(p),
    });
    return passthrough(res);
  }

  if (!signedIn) return json({ error: 'Sign in to use this feature.' }, 401);

  if (target === 'openai_chat') {
    if (!openaiKey) return json({ error: 'not_configured', message: 'OpenAI is not configured yet.' }, 503);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(clampChat(payload)),
    });
    return passthrough(res);
  }

  if (target === 'openai_speech') {
    if (!openaiKey) return json({ error: 'not_configured', message: 'OpenAI is not configured yet.' }, 503);
    const p = { model: 'tts-1', voice: payload.voice || 'alloy', input: String(payload.input || '').slice(0, 4000), speed: Number(payload.speed) || 1.0 };
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(p),
    });
    return passthrough(res);
  }

  if (target === 'openai_realtime_secret') {
    if (!openaiKey) return json({ error: 'not_configured', message: 'OpenAI is not configured yet.' }, 503);
    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST', headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    return passthrough(res);
  }

  if (target === 'status') {
    return json({ openai: !!openaiKey, openrouter: !!openrouterKey });
  }

  return json({ error: 'Unknown target' }, 400);
});
