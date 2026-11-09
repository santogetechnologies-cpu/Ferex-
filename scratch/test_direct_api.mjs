async function testDirectApi() {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_TvtcmQYBnXjb9R';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || 'NAZPT9NfBVhwGTH0ms3jXl4f';
  const auth = 'Basic ' + Buffer.from(`${key_id}:${key_secret}`).toString('base64');

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth
    },
    body: JSON.stringify({
      amount: 50000,
      currency: 'INR',
      receipt: `test_${Date.now()}`
    })
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', data);
}
testDirectApi();

