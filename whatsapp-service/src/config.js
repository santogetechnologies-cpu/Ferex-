// Central configuration. Everything comes from environment variables (loaded from .env in development).
// Secrets are only ever read here and handed to the modules that need them; they are never logged.
import 'dotenv/config';

const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Number(v) : d);

export const config = {
  token: process.env.WA_TOKEN || '',
  phoneNumberId: process.env.WA_PHONE_NUMBER_ID || '1387273184478526',
  wabaId: process.env.WA_WABA_ID || '4083659841942268',
  appSecret: process.env.WA_APP_SECRET || '',
  verifyToken: process.env.WA_VERIFY_TOKEN || '',
  graphVersion: process.env.WA_GRAPH_VERSION || 'v21.0',
  port: num(process.env.PORT, 3000),
  defaultCountryCode: (process.env.WA_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, ''),
  // Hard cap of 10/s so a typo can never hammer the API.
  ratePerSecond: Math.min(10, Math.max(1, num(process.env.WA_RATE_PER_SECOND, 5))),
  dailyUniqueLimit: num(process.env.WA_DAILY_UNIQUE_LIMIT, 250),
  autoReplyText: process.env.WA_AUTO_REPLY_TEXT || '',
  dbPath: process.env.DB_PATH || './data/whatsapp.sqlite',
};

/** Throws a readable error naming the variables that are missing (never their values). */
export function requireConfig(...keys) {
  const names = { token: 'WA_TOKEN', appSecret: 'WA_APP_SECRET', verifyToken: 'WA_VERIFY_TOKEN', phoneNumberId: 'WA_PHONE_NUMBER_ID' };
  const missing = keys.filter(k => !config[k]).map(k => names[k] || k);
  if (missing.length) throw new Error(`Missing environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
}
