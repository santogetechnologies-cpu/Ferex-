import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGraphClient } from '../src/graph.js';
import { WhatsAppError } from '../src/errors.js';
import { fakeFetch, okSend, graphError } from './helpers.js';

const make = (responses, extra = {}) => { const fetchImpl = fakeFetch(responses); return { fetchImpl, graph: createGraphClient({ token: 'SECRET_TOKEN_123456', fetchImpl, sleep: async () => {}, baseDelayMs: 1, ...extra }) }; };

test('token goes only in the Authorization header, to the v21.0 Graph URL', async () => {
  const { graph, fetchImpl } = make([okSend()]);
  await graph.post('1387273184478526/messages', { a: 1 });
  const { url, init } = fetchImpl.calls[0];
  assert.equal(url, 'https://graph.facebook.com/v21.0/1387273184478526/messages');
  assert.equal(init.headers.Authorization, 'Bearer SECRET_TOKEN_123456');
  assert.ok(!url.includes('SECRET') && !init.body.includes('SECRET'));
});
test('rate limits and server errors are retried, then succeed', async () => {
  const { graph, fetchImpl } = make([graphError(429, 130429), graphError(503, 2), okSend('wamid.OK')]);
  const res = await graph.post('p', {});
  assert.equal(res.messages[0].id, 'wamid.OK'); assert.equal(fetchImpl.calls.length, 3);
});
test('network errors are retried', async () => {
  const { graph, fetchImpl } = make([new Error('socket hang up'), okSend()]);
  await graph.post('p', {}); assert.equal(fetchImpl.calls.length, 2);
});
test('permanent errors are not retried and explain themselves', async () => {
  const { graph, fetchImpl } = make([graphError(401, 190, 'Invalid OAuth access token')]);
  await assert.rejects(() => graph.post('p', {}), e => e instanceof WhatsAppError && e.kind === 'invalid_token' && /WA_TOKEN/.test(e.hint));
  assert.equal(fetchImpl.calls.length, 1);
});
test('gives up after the maximum attempts', async () => {
  const { graph, fetchImpl } = make([graphError(500, 1)], { maxAttempts: 3 });
  await assert.rejects(() => graph.post('p', {}), e => e.retryable); assert.equal(fetchImpl.calls.length, 3);
});
test('a missing token fails before any network call', async () => {
  const fetchImpl = fakeFetch([okSend()]);
  await assert.rejects(() => createGraphClient({ token: '', fetchImpl }).post('p', {}), e => e.kind === 'invalid_token');
  assert.equal(fetchImpl.calls.length, 0);
});
