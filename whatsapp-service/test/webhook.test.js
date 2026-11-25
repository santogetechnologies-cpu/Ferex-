import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySignature, checkVerification, handleWebhookPayload } from '../src/webhook.js';
import { openStore } from '../src/store.js';

const sign = (raw, secret) => 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
const wrap = value => ({ object: 'whatsapp_business_account', entry: [{ id: 'waba', changes: [{ field: 'messages', value }] }] });
const text = (id, from, body) => ({ id, from, type: 'text', text: { body }, timestamp: '1' });

test('signature: valid passes, tampering and missing header fail', () => {
  const raw = Buffer.from('{"a":1}');
  assert.equal(verifySignature(raw, sign(raw, 'appsecret'), 'appsecret'), true);
  assert.equal(verifySignature(Buffer.from('{"a":2}'), sign(raw, 'appsecret'), 'appsecret'), false);
  assert.equal(verifySignature(raw, sign(raw, 'other'), 'appsecret'), false);
  assert.equal(verifySignature(raw, undefined, 'appsecret'), false);
  assert.equal(verifySignature(raw, sign(raw, ''), ''), false); // no secret configured: never accept
  assert.equal(verifySignature('{"a":1}', sign(raw, 'appsecret'), 'appsecret'), false); // must be the raw bytes
});
test('verification handshake', () => {
  assert.deepEqual(checkVerification({ 'hub.mode': 'subscribe', 'hub.verify_token': 'tok', 'hub.challenge': '12345' }, 'tok'), { ok: true, challenge: '12345' });
  assert.equal(checkVerification({ 'hub.mode': 'subscribe', 'hub.verify_token': 'bad', 'hub.challenge': '1' }, 'tok').ok, false);
  assert.equal(checkVerification({ 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '1' }, '').ok, false);
});
test('statuses only move forward and failures keep the error', async () => {
  const store = openStore(':memory:');
  store.recordOutbound({ waMessageId: 'w1', to: '91', type: 'template', template: 't' });
  const st = (status, extra = {}) => handleWebhookPayload(wrap({ statuses: [{ id: 'w1', status, recipient_id: '91', ...extra }] }), { store });
  await st('delivered'); await st('sent'); // late "sent" must not move it back
  assert.equal(store.getMessage('w1').status, 'delivered');
  await st('read'); assert.equal(store.getMessage('w1').status, 'read');
  await st('failed', { errors: [{ code: 131026, title: 'Undeliverable', error_data: { details: 'Not on WhatsApp' } }] });
  assert.equal(store.getMessage('w1').status, 'failed'); assert.equal(store.getMessage('w1').error_code, 131026);
});
test('a status that arrives before our own insert is not lost', async () => {
  const store = openStore(':memory:');
  await handleWebhookPayload(wrap({ statuses: [{ id: 'early', status: 'sent', recipient_id: '91' }] }), { store });
  store.recordOutbound({ waMessageId: 'early', to: '919', type: 'text', body: 'hi' });
  const m = store.getMessage('early'); assert.equal(m.status, 'sent'); assert.equal(m.to_number, '919');
});
test('inbound messages are stored once; duplicate deliveries are ignored', async () => {
  const store = openStore(':memory:');
  const payload = wrap({ messages: [text('m1', '919143382792', 'hello')] });
  assert.equal((await handleWebhookPayload(payload, { store })).inbound, 1);
  assert.equal((await handleWebhookPayload(payload, { store })).duplicates, 1);
  assert.equal(store.inboundCount(), 1);
});
test('STOP opts the contact out and START opts back in', async () => {
  const store = openStore(':memory:');
  await handleWebhookPayload(wrap({ messages: [text('m1', '91', 'STOP')] }), { store });
  assert.equal(store.isOptedOut('91'), true);
  await handleWebhookPayload(wrap({ messages: [text('m2', '91', 'start')] }), { store });
  assert.equal(store.isOptedOut('91'), false); assert.equal(store.isOptedIn('91'), true);
});
test('auto-reply is sent for text, but never to someone who opted out', async () => {
  const store = openStore(':memory:'); const sent = [];
  const messenger = { sendTextMessage: async (to, t) => { sent.push([to, t]); } };
  await handleWebhookPayload(wrap({ messages: [text('m1', '91', 'hi')] }), { store, messenger, autoReplyText: 'Thanks!' });
  await handleWebhookPayload(wrap({ messages: [text('m2', '92', 'STOP')] }), { store, messenger, autoReplyText: 'Thanks!' });
  assert.deepEqual(sent, [['91', 'Thanks!']]);
});
test('one malformed entry does not stop the rest and other objects are ignored', async () => {
  const store = openStore(':memory:');
  const r = await handleWebhookPayload(wrap({ messages: [null, text('ok', '91', 'hi')] }), { store });
  assert.equal(r.inbound, 1);
  assert.deepEqual(await handleWebhookPayload({ object: 'page' }, { store }), { statuses: 0, inbound: 0, duplicates: 0, optOuts: 0, optIns: 0 });
});
