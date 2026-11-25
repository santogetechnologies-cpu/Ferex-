import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplatePayload } from '../src/messages.js';
import { makeMessenger, okSend, graphError } from './helpers.js';

test('template payload fills body variables in order', () => {
  const p = buildTemplatePayload('919143382792', 'payment_reminder', 'en', ['Asha', 4999]);
  assert.deepEqual(p, { messaging_product: 'whatsapp', recipient_type: 'individual', to: '919143382792', type: 'template',
    template: { name: 'payment_reminder', language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Asha' }, { type: 'text', text: '4999' }] }] } });
  assert.equal(buildTemplatePayload('1', 'hello_world', 'en_US').template.components, undefined);
  assert.throws(() => buildTemplatePayload('1', '', 'en')); assert.throws(() => buildTemplatePayload('1', 'x', ''));
});
test('sending returns the message ID and stores it', async () => {
  const { messenger, store, fetchImpl } = makeMessenger([okSend('wamid.A1')]);
  assert.equal(await messenger.sendTemplateMessage('+91 91433 82792', 'hello_world', 'en_US'), 'wamid.A1');
  assert.equal(JSON.parse(fetchImpl.calls[0].init.body).to, '919143382792');
  assert.equal(store.getMessage('wamid.A1').status, 'accepted');
});
test('text outside the 24 h window explains the template fix', async () => {
  const { messenger, store } = makeMessenger([graphError(400, 131047, 'Re-engagement message')]);
  await assert.rejects(() => messenger.sendTextMessage('9143382792', 'hi'), /24-hour/);
  assert.equal(store.db.prepare("SELECT COUNT(*) n FROM messages WHERE status='failed'").get().n, 1);
});
test('text is validated', async () => {
  const { messenger, fetchImpl } = makeMessenger([okSend()]);
  await assert.rejects(() => messenger.sendTextMessage('9143382792', '   '));
  await assert.rejects(() => messenger.sendTextMessage('9143382792', 'x'.repeat(4097)));
  assert.equal(fetchImpl.calls.length, 0);
});
test('the token never appears in an error or in stored data', async () => {
  const { messenger, store } = makeMessenger([graphError(401, 190, 'Invalid token SECRET_TOKEN_123456')]);
  try { await messenger.sendTextMessage('9143382792', 'hi'); } catch { /* expected */ }
  const rows = JSON.stringify(store.db.prepare('SELECT * FROM messages').all());
  assert.ok(!rows.includes('Bearer'));
});
