import crypto from 'node:crypto';

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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendJson(400, {
        error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
      });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'NAZPT9NfBVhwGTH0ms3jXl4f';

    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(razorpay_signature, 'utf8');

    const isValid =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isValid) {
      return sendJson(400, {
        success: false,
        error: 'Signature verification failed: payment signature does not match',
      });
    }

    return sendJson(200, {
      success: true,
      message: 'Payment verified successfully',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
  } catch (err) {
    console.error('Unhandled error in /api/verify-payment:', err);
    return sendJson(500, { error: err?.message || 'Internal Server Error' });
  }
}
