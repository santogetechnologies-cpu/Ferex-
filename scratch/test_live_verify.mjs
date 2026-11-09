import crypto from 'node:crypto';

async function testLiveVerify() {
  const key_secret = 'NAZPT9NfBVhwGTH0ms3jXl4f';
  const order_id = 'order_Ty0crdKB4uvODd';
  const payment_id = 'pay_testLive123';
  const signature = crypto.createHmac('sha256', key_secret).update(`${order_id}|${payment_id}`).digest('hex');

  const res = await fetch('https://education.ferexventures.com/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: order_id,
      razorpay_payment_id: payment_id,
      razorpay_signature: signature
    })
  });

  console.log('Verify Status:', res.status);
  console.log('Verify Data:', await res.json());
}
testLiveVerify();

