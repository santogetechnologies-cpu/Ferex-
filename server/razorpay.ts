import Razorpay from 'razorpay';
import crypto from 'node:crypto';

// Ensure .env is loaded if running in bare Node (e.g. tests or server scripts)
try {
  if (process.loadEnvFile && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
    process.loadEnvFile('.env');
  }
} catch {
  // Ignored if .env already loaded or in production container
}

export interface CreateOrderParams {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentParams {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export interface ServiceResponse<T = any> {
  status: number;
  data: T;
}

/**
 * Returns a configured Razorpay instance using environment credentials.
 */
export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials are not configured in environment variables');
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Step 1: Create Order
 * Endpoint logic for POST /api/create-order
 * Minimum amount: 100 paise
 */
export async function createOrder(params: CreateOrderParams): Promise<ServiceResponse> {
  const { amount, currency = 'INR', receipt, notes } = params || {};

  // Validation: amount must be a number and >= 100 paise
  const numericAmount = Number(amount);
  if (typeof amount === 'undefined' || isNaN(numericAmount) || numericAmount < 100) {
    return {
      status: 400,
      data: {
        error: 'Amount must be at least 100 paise',
      },
    };
  }

  try {
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: Math.round(numericAmount),
      currency: (currency || 'INR').toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });

    return {
      status: 200,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);

    // Auth failures (401)
    if (error?.statusCode === 401 || (error?.error?.code === 'BAD_REQUEST_ERROR' && error?.message?.toLowerCase().includes('auth'))) {
      return {
        status: 401,
        data: {
          error: 'Razorpay authentication failed: Invalid Key ID or Key Secret',
        },
      };
    }

    // Generic Razorpay API errors (500)
    return {
      status: 500,
      data: {
        error: error?.error?.description || error?.message || 'Failed to create Razorpay order',
      },
    };
  }
}

/**
 * Step 3: Verify Payment Signature
 * Endpoint logic for POST /api/verify-payment
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export function verifyPayment(params: VerifyPaymentParams): ServiceResponse {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params || {};

  // Validation: Missing fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return {
      status: 400,
      data: {
        error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
      },
    };
  }

  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) {
    return {
      status: 500,
      data: {
        error: 'Razorpay secret key not configured on server',
      },
    };
  }

  // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
  const expectedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  // Constant-time comparison
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const actualBuf = Buffer.from(razorpay_signature, 'utf8');

  const isValid =
    expectedBuf.length === actualBuf.length &&
    crypto.timingSafeEqual(expectedBuf, actualBuf);

  if (!isValid) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Signature verification failed: payment signature does not match',
      },
    };
  }

  return {
    status: 200,
    data: {
      success: true,
      message: 'Payment verified successfully',
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    },
  };
}
