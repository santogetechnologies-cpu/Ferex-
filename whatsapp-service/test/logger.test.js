import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact, mask } from '../src/logger.js';

test('Bearer tokens and access_token parameters are redacted', () => {
  assert.ok(!redact('Authorization: Bearer EAAGabc123XYZ').includes('EAAG'));
  assert.ok(!redact('https://x?access_token=EAAGabc&y=1').includes('EAAG'));
});
test('phone numbers are masked', () => { assert.equal(mask('919143382792'), '91••••••2792'); assert.equal(mask('123'), '123'); });
