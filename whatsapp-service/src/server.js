// Webhook server. It exposes only the webhook and a health check: no endpoint sends messages or returns any secret,
// so nothing here can be called from a browser to use the WhatsApp token.
import express from 'express';
import { config, requireConfig } from './config.js';
import { openStore } from './store.js';
import { createMessenger } from './messages.js';
import { checkVerification, handleWebhookPayload, verifySignature } from './webhook.js';
import { log } from './logger.js';

export function createApp({ store, messenger = null } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/webhook', (req, res) => {
    const { ok, challenge } = checkVerification(req.query);
    if (!ok) return res.sendStatus(403);
    res.status(200).type('text/plain').send(challenge);
  });
  // The signature is computed over the exact bytes Meta sent, so the body must stay raw until it is verified.
  app.post('/webhook', express.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
    if (!verifySignature(req.body, req.get('x-hub-signature-256'))) { log.warn('webhook rejected: bad signature'); return res.sendStatus(401); }
    let payload;
    try { payload = JSON.parse(req.body.toString('utf8')); } catch { return res.sendStatus(400); }
    res.sendStatus(200); // answer first; Meta retries slow or failing deliveries
    await handleWebhookPayload(payload, { store, messenger }).catch(e => log.error('webhook processing failed', { error: e.message }));
  });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  requireConfig('appSecret', 'verifyToken');
  const store = openStore(config.dbPath);
  const messenger = config.token ? createMessenger({ store }) : null;
  createApp({ store, messenger }).listen(config.port, () => log.info('webhook server listening', { port: config.port }));
}
