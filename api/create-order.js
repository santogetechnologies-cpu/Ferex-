export default async function handler(req, res) {
  const isWebStandard = typeof res === 'undefined' || typeof res?.status !== 'function';

  function sendJson(statusCode, data, extraHeaders = {}) {
    if (isWebStandard) {
      return new Response(JSON.stringify(data), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          ...extraHeaders,
        },
      });
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      for (const [k, v] of Object.entries(extraHeaders)) {
        res.setHeader(k, v);
      }
      return res.status(statusCode).json(data);
    }
  }

  const method = req?.method || 'GET';

  if (method === 'OPTIONS') {
    if (isWebStandard) {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
  }

  if (method !== 'POST') {
    return sendJson(405, { error: 'Method Not Allowed. Use POST.' }, { Allow: 'POST' });
  }

  try {
    let body;
    if (isWebStandard) {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    } else {
      body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return sendJson(400, { error: 'Invalid JSON request body' });
        }
      }
    }

    const { amount, currency = 'INR', receipt, notes } = body || {};

    const numericAmount = Number(amount);
    if (typeof amount === 'undefined' || isNaN(numericAmount) || numericAmount < 100) {
      return sendJson(400, { error: 'Amount must be at least 100 paise' });
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
      return sendJson(response.status, { error: errMsg });
    }

    return sendJson(200, {
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id,
    });
  } catch (err) {
    console.error('Unhandled error in /api/create-order:', err);
    return sendJson(500, { error: err?.message || 'Internal Server Error' });
  }
}
