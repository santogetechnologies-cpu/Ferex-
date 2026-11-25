// Webhook receiver logic (no Express here, so it is easy to test).
//   GET  /webhook : Meta's one-time verification handshake.
//   POST /webhook : delivery statuses and inbound messages, authenticated by the X-Hub-Signature-256 HMAC.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { log, mask } from './logger.js';

/** Meta sends "sha256=<hex>" computed over the RAW request body with the app secret. */
export function verifySignature(rawBody, header, appSecret = config.appSecret) {
  if (!appSecret || !header || !Buffer.isBuffer(rawBody)) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(header));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The verification handshake. Returns { ok, challenge } - answer with the challenge text when ok, else 403. */
export function checkVerification(query, verifyToken = config.verifyToken) {
  const ok = query['hub.mode'] === 'subscribe' && Boolean(verifyToken) && query['hub.verify_token'] === verifyToken;
  return { ok, challenge: ok ? String(query['hub.challenge'] ?? '') : '' };
}

const OPT_OUT = /^\s*(stop|unsubscribe|cancel|end|quit|opt[ -]?out)\s*[.!]*\s*$/i;
const OPT_IN = /^\s*(start|subscribe|yes|opt[ -]?in)\s*[.!]*\s*$/i;

const inboundBody = m => m.text?.body || m.button?.text || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || m.reaction?.emoji || m.caption || null;
const mediaId = m => m.image?.id || m.document?.id || m.audio?.id || m.video?.id || m.sticker?.id || null;

/**
 * Processes one webhook payload. Never throws for a single bad entry: Meta retries the whole delivery on a non-200,
 * so one malformed message must not block the rest.
 */
export async function handleWebhookPayload(payload, { store, messenger = null, autoReplyText = config.autoReplyText } = {}) {
  const summary = { statuses: 0, inbound: 0, duplicates: 0, optOuts: 0, optIns: 0 };
  if (payload?.object !== 'whatsapp_business_account') return summary;
  for (const entry of payload.entry || []) for (const change of entry.changes || []) {
    const value = change.value || {};
    for (const st of value.statuses || []) {
      try {
        const err = st.errors?.[0];
        const applied = store.applyStatus(st.id, st.status, { code: err?.code ?? null, message: err ? (err.error_data?.details || err.message || err.title || null) : null });
        if (applied) { summary.statuses++; log.info('status', { id: st.id, status: st.status, to: mask(st.recipient_id), code: err?.code }); }
      } catch (e) { log.error('status handling failed', { id: st.id, error: e.message }); }
    }
    for (const m of value.messages || []) {
      try {
        const body = inboundBody(m);
        const fresh = store.recordInbound({ waMessageId: m.id, from: m.from, type: m.type, body, mediaId: mediaId(m), raw: m });
        if (!fresh) { summary.duplicates++; continue; }
        summary.inbound++;
        log.info('inbound', { from: mask(m.from), type: m.type, id: m.id });
        if (m.type === 'text' || m.type === 'button') {
          if (OPT_OUT.test(body || '')) { store.setOptIn(m.from, false); summary.optOuts++; continue; }
          if (OPT_IN.test(body || '')) { store.setOptIn(m.from, true); summary.optIns++; }
        }
        // The customer just wrote, so the 24-hour window is open and free text is allowed.
        if (autoReplyText && messenger && m.type === 'text' && !store.isOptedOut(m.from)) {
          await messenger.sendTextMessage(m.from, autoReplyText).catch(e => log.warn('auto-reply failed', { to: mask(m.from), error: e.message }));
        }
      } catch (e) { log.error('inbound handling failed', { id: m?.id, error: e.message }); }
    }
  }
  return summary;
}
