import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyPaymentSignature } from '../supabase/functions/_shared/payment-signature.ts';
const body = '{"event":"payment.captured"}';
const secret = 'test-signing-secret';
const hash = (message: string) => createHmac('sha256', secret).update(message).digest('hex');
test('payment webhooks verify the body HMAC rather than trusting a signature header', async () => {
  assert.equal(await verifyPaymentSignature({ provider: 'razorpay', body, secret, header: hash(body) }), true);
  assert.equal(await verifyPaymentSignature({ provider: 'razorpay', body: body + ' ', secret, header: hash(body) }), false);
  assert.equal(await verifyPaymentSignature({ provider: 'razorpay', body, secret, header: 'unverified-header' }), false);
});
test('Stripe signature validation rejects replayed or future timestamps', async () => {
  const t = 1700000000;
  const header = `t=${t},v1=${hash(`${t}.${body}`)}`;
  assert.equal(await verifyPaymentSignature({ provider: 'stripe', body, secret, header, nowSeconds: t }), true);
  assert.equal(await verifyPaymentSignature({ provider: 'stripe', body, secret, header, nowSeconds: t + 301 }), false);
  assert.equal(await verifyPaymentSignature({ provider: 'stripe', body, secret, header, nowSeconds: t - 301 }), false);
  assert.equal(await verifyPaymentSignature({ provider: 'stripe', body, secret: '', header, nowSeconds: t }), false);
});
