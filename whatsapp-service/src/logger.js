// Tiny JSON-lines logger that redacts secrets and masks phone numbers, so logs are safe to share.
import { config } from './config.js';

const SECRETS = () => [config.token, config.appSecret, config.verifyToken].filter(s => s && s.length > 6);

/** Removes any known secret and any "Bearer xxx" text from a string. */
export function redact(text) {
  let out = String(text ?? '');
  for (const s of SECRETS()) out = out.split(s).join('[redacted]');
  return out.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]').replace(/access_token=[^&\s"]+/gi, 'access_token=[redacted]');
}

/** 919876543210 -> 91••••••3210 (enough to recognise a number, not enough to leak it). */
export const mask = n => { const d = String(n || '').replace(/\D/g, ''); return d.length > 6 ? `${d.slice(0, 2)}${'•'.repeat(d.length - 6)}${d.slice(-4)}` : d; };

const write = (level, msg, fields = {}) => {
  const line = redact(JSON.stringify({ t: new Date().toISOString(), level, msg, ...fields }));
  (level === 'error' ? console.error : console.log)(line);
};
export const log = {
  info: (m, f) => write('info', m, f),
  warn: (m, f) => write('warn', m, f),
  error: (m, f) => write('error', m, f),
};
