import crypto from 'node:crypto';

async function testVerify() {
  const mod = await import('../api/verify-payment.ts');
  const key_secret = 'NAZPT9NfBVhwGTH0ms3jXl4f';
  const order_id = 'order_test123';
  const payment_id = 'pay_test123';
  const validSignature = crypto.createHmac('sha256', key_secret).update(`${order_id}|${payment_id}`).digest('hex');

  const req = {
    method: 'POST',
    body: {
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      razorpay_signature: validSignature
    }
  };
  const res = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    data: null,
    json(d) { this.data = d; console.log('Verify Response:', this.statusCode, d); },
    end() { console.log('Ended'); }
  };
  await mod.default(req, res);
}
testVerify();

