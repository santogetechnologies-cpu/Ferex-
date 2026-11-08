import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createOrder, verifyPayment } from '../server/razorpay.ts';

test('Razorpay Backend: createOrder validates minimum amount (100 paise)', async () => {
  // Amount < 100 paise must be rejected with 400
  const resLow = await createOrder({ amount: 99 });
  assert.equal(resLow.status, 400);
  assert.match(resLow.data.error, /at least 100 paise/i);

  const resZero = await createOrder({ amount: 0 });
  assert.equal(resZero.status, 400);

  const resNegative = await createOrder({ amount: -500 });
  assert.equal(resNegative.status, 400);

  const resNaN = await createOrder({ amount: NaN });
  assert.equal(resNaN.status, 400);
});

test('Razorpay Backend: createOrder successfully creates order via Razorpay API', async () => {
  const res = await createOrder({
    amount: 50000, // 500 INR in paise
    currency: 'INR',
    receipt: `test_rcpt_${Date.now()}`,
  });

  assert.equal(res.status, 200);
  assert.ok(res.data.order_id);
  assert.ok(res.data.order_id.startsWith('order_'));
  assert.equal(res.data.amount, 50000);
  assert.equal(res.data.currency, 'INR');
});

test('Razorpay Backend: verifyPayment validates required parameters', () => {
  // Missing all fields
  const res1 = verifyPayment({} as any);
  assert.equal(res1.status, 400);
  assert.match(res1.data.error, /missing/i);

  // Missing signature
  const res2 = verifyPayment({
    razorpay_order_id: 'order_123',
    razorpay_payment_id: 'pay_123',
  } as any);
  assert.equal(res2.status, 400);

  // Missing payment_id
  const res3 = verifyPayment({
    razorpay_order_id: 'order_123',
    razorpay_signature: 'sig_123',
  } as any);
  assert.equal(res3.status, 400);
});

test('Razorpay Backend: verifyPayment rejects invalid or tampered signatures', () => {
  const res = verifyPayment({
    razorpay_order_id: 'order_987654321',
    razorpay_payment_id: 'pay_123456789',
    razorpay_signature: 'tampered_or_invalid_signature_hex_value_here',
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.success, false);
  assert.match(res.data.error, /signature verification failed/i);
});

test('Razorpay Backend: verifyPayment accepts authentic HMAC-SHA256 signature', () => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  assert.ok(secret, 'RAZORPAY_KEY_SECRET should be defined in test environment');

  const order_id = 'order_valid_sample_456';
  const payment_id = 'pay_valid_sample_789';

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  const res = verifyPayment({
    razorpay_order_id: order_id,
    razorpay_payment_id: payment_id,
    razorpay_signature: expectedSignature,
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.order_id, order_id);
  assert.equal(res.data.payment_id, payment_id);
});

