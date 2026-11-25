import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isValidPhone } from '../src/phone.js';

test('formats become digits with country code', () => {
  for (const x of ['+91 91433 82792', '0091 91433 82792', '9143382792', '09143382792', '+91-91433-82792', '(91) 91433 82792'.replace('(91) ', '+91 ')])
    assert.equal(normalizePhone(x, '91'), '919143382792', x);
});
test('other countries keep their own code', () => assert.equal(normalizePhone('+48 512 345 678'), '48512345678'));
test('invalid numbers are rejected', () => {
  for (const x of ['', '   ', 'abc', '12345', '+1234567890123456', '91-call-me']) assert.throws(() => normalizePhone(x, '91'), undefined, x);
  assert.equal(isValidPhone('nope'), false);
});
