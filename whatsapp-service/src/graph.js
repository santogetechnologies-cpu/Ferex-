// Minimal Graph API client: one POST helper with timeout, exponential backoff and error parsing.
// `fetch` and `sleep` are injectable so tests never touch the network.
import { config } from './config.js';
import { parseGraphError, WhatsAppError } from './errors.js';
import { log } from './logger.js';

const realSleep = ms => new Promise(r => setTimeout(r, ms));

export function createGraphClient({
  token = config.token,
  version = config.graphVersion,
  fetchImpl = globalThis.fetch,
  sleep = realSleep,
  maxAttempts = 5,
  baseDelayMs = 500,
  timeoutMs = 15000,
} = {}) {
  const base = `https://graph.facebook.com/${version}`;

  /** POST JSON to a Graph path. Retries 429 / 5xx / network errors with exponential backoff and jitter. */
  async function post(path, body) {
    if (!token) throw new WhatsAppError({ message: 'WA_TOKEN is not set.', kind: 'invalid_token', hint: 'Set WA_TOKEN in the environment.' });
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetchImpl(`${base}/${path}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, // token only ever goes in this header
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && !json.error) return json;
        lastError = parseGraphError(res.status, json);
      } catch (err) {
        if (err instanceof WhatsAppError) throw err;
        // Network failure or timeout: temporary by nature.
        lastError = new WhatsAppError({ message: `Network error: ${err.name === 'TimeoutError' ? 'request timed out' : err.message}`, kind: 'network', retryable: true });
      }
      if (!lastError.retryable || attempt === maxAttempts) throw lastError;
      const delay = Math.round(baseDelayMs * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5)); // 0.5s, 1s, 2s, 4s (+/-25%)
      log.warn('temporary WhatsApp error, retrying', { attempt, delayMs: delay, error: lastError.toLogString() });
      await sleep(delay);
    }
    throw lastError;
  }

  return { post };
}
