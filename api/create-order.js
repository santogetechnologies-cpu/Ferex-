export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON request body' });
      }
    }

    const { amount, currency = 'INR', receipt, notes } = body || {};

    const numericAmount = Number(amount);
    if (typeof amount === 'undefined' || isNaN(numericAmount) || numericAmount < 100) {
      return res.status(400).json({ error: 'Amount must be at least 100 paise' });
    }

    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TvtcmQYBnXjb9R';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'NAZPT9NfBVhwGTH0ms3jXl4f';

    const authHeader = 'Basic ' + Buffer.from(`${key_id}:${key_secret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(numericAmount),
        currency: (currency || 'INR').toUpperCase(),
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.description || data?.error?.message || 'Failed to create Razorpay order';
      return res.status(response.status).json({ error: errMsg });
    }

    return res.status(200).json({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id,
    });
  } catch (err) {
    console.error('Unhandled error in /api/create-order:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
