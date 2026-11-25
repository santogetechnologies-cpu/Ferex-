import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.WA_APP_SECRET = 'test-app-secret'; process.env.WA_VERIFY_TOKEN = 'test-verify-token';
const { createApp } = await import('../src/server.js');
const { openStore } = await import('../src/store.js');

let server, base; const store = openStore(':memory:');
before(async () => { server = createApp({ store }).listen(0); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => { server.close(); });

const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { messages: [{ id: 'm1', from: '919143382792', type: 'text', text: { body: 'hi' } }] } }] }] });
const sig = b => 'sha256=' + createHmac('sha256', 'test-app-secret').update(b).digest('hex');

test('health check and Meta verification handshake', async () => {
  assert.equal((await fetch(`${base}/health`)).status, 200);
  const ok = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=777`);
  assert.equal(ok.status, 200); assert.equal(await ok.text(), '777');
  assert.equal((await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=777`)).status, 403);
});
test('unsigned or wrongly signed webhooks are rejected and store nothing', async () => {
  assert.equal((await fetch(`${base}/webhook`, { method: 'POST', body })).status, 401);
  assert.equal((await fetch(`${base}/webhook`, { method: 'POST', body, headers: { 'x-hub-signature-256': 'sha256=00' } })).status, 401);
  assert.equal(store.inboundCount(), 0);
});
test('a correctly signed webhook is accepted and stored', async () => {
  const res = await fetch(`${base}/webhook`, { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig(body) } });
  assert.equal(res.status, 200);
  await new Promise(r => setTimeout(r, 50));
  assert.equal(store.inboundCount(), 1);
});
test('the server has no endpoint that sends messages or exposes secrets', async () => {
  for (const p of ['/send', '/config', '/token', '/env']) assert.equal((await fetch(`${base}${p}`)).status, 404);
});
