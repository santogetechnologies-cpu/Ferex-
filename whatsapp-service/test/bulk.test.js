import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRecipients, runBulk } from '../src/bulk.js';
import { makeMessenger, okSend, graphError } from './helpers.js';

const csv = 'phone,var1,var2\n9143382792,Asha,4999\n+91 91433 82792,Dup,1\nabc,Bad,1\n+48 512 345 678,Piotr,2500\n';
const opts = { template: 'payment_reminder', language: 'en', sleep: async () => {} };

test('CSV: normalises, drops invalid and duplicate numbers, keeps variable order', () => {
  const { rows, rejected } = readRecipients(csv, '91');
  assert.deepEqual(rows.map(r => [r.phone, r.variables]), [['919143382792', ['Asha', '4999']], ['48512345678', ['Piotr', '2500']]]);
  assert.deepEqual(rejected.map(r => r.line), [3, 4]);
  assert.throws(() => readRecipients('number\n1\n'), /phone/);
});
test('sends each valid row and records them', async () => {
  const { messenger, store } = makeMessenger([okSend('w1'), okSend('w2')]);
  const res = await runBulk(readRecipients(csv, '91').rows, { messenger, store }, opts);
  assert.deepEqual(res.map(r => r.status), ['sent', 'sent']);
});
test('opted-out contacts are skipped', async () => {
  const { messenger, store, fetchImpl } = makeMessenger([okSend('w1')]);
  store.setOptIn('919143382792', false);
  const res = await runBulk(readRecipients(csv, '91').rows, { messenger, store }, opts);
  assert.deepEqual(res.map(r => r.status), ['skipped', 'sent']); assert.equal(fetchImpl.calls.length, 1);
});
test('the daily unique-recipient limit is enforced', async () => {
  const { messenger, store } = makeMessenger([okSend('w1'), okSend('w2')]);
  const res = await runBulk(readRecipients(csv, '91').rows, { messenger, store }, { ...opts, dailyUniqueLimit: 1 });
  assert.deepEqual(res.map(r => r.status), ['sent', 'skipped']); assert.match(res[1].detail, /daily limit/);
});
test('a problem that affects every row stops the run instead of failing each one', async () => {
  const { messenger, store, fetchImpl } = makeMessenger([graphError(404, 132001, 'Template name does not exist')]);
  const res = await runBulk(readRecipients(csv, '91').rows, { messenger, store }, opts);
  assert.deepEqual(res.map(r => r.status), ['failed', 'not_sent']); assert.equal(fetchImpl.calls.length, 1);
});
test('a failure for one number does not stop the others', async () => {
  const { messenger, store } = makeMessenger([graphError(400, 131026, 'Undeliverable'), okSend('w2')]);
  const res = await runBulk(readRecipients(csv, '91').rows, { messenger, store }, opts);
  assert.deepEqual(res.map(r => r.status), ['failed', 'sent']);
});
test('dry run sends nothing', async () => {
  const { store, fetchImpl } = makeMessenger([okSend()]);
  const res = await runBulk(readRecipients(csv, '91').rows, { messenger: null, store }, { ...opts, dryRun: true });
  assert.deepEqual(res.map(r => r.status), ['dry_run', 'dry_run']); assert.equal(fetchImpl.calls.length, 0);
});
test('pacing: never faster than the configured rate', async () => {
  const { messenger, store } = makeMessenger([okSend('a'), okSend('b')]); const waits = [];
  await runBulk(readRecipients(csv, '91').rows, { messenger, store }, { ...opts, ratePerSecond: 5, sleep: async ms => { waits.push(ms); } });
  assert.deepEqual(waits, [200, 200]);
});
