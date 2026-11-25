import { openStore } from '../src/store.js';
import { createGraphClient } from '../src/graph.js';
import { createMessenger } from '../src/messages.js';

/** A fake fetch that replays the given responses in order and records every call. */
export function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const r = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  };
  fn.calls = calls;
  return fn;
}
export const okSend = (id = 'wamid.TEST') => ({ status: 200, body: { messaging_product: 'whatsapp', messages: [{ id }] } });
export const graphError = (status, code, message = 'x') => ({ status, body: { error: { message, type: 'OAuthException', code, fbtrace_id: 'trace' } } });

export function makeMessenger(responses, { token = 'SECRET_TOKEN_123456' } = {}) {
  const fetchImpl = fakeFetch(responses);
  const store = openStore(':memory:');
  const graph = createGraphClient({ token, fetchImpl, sleep: async () => {}, baseDelayMs: 1 });
  return { messenger: createMessenger({ graph, store, phoneNumberId: '1387273184478526' }), store, fetchImpl };
}
