/**
 * Razorpay Standard Web Checkout Client Library
 * Handles:
 * 1. Script injection / verification
 * 2. Order creation via POST /api/create-order
 * 3. Modal invocation with razorpay_order_id
 * 4. Signature verification via POST /api/verify-payment
 * 5. Dismissal and failure handling
 */

export interface RazorpayCheckoutOptions {
  /** Amount to charge. By default treated as standard units (e.g. 500 for ₹500), unless isPaise is true */
  amount: number;
  /** Whether the amount is already expressed in paise */
  isPaise?: boolean;
  /** Currency code (default: 'INR') */
  currency?: string;
  /** Unique receipt identifier */
  receipt?: string;
  /** Business / merchant name displayed in the checkout modal */
  name?: string;
  /** Purpose description displayed in modal */
  description?: string;
  /** Optional metadata notes */
  notes?: Record<string, string>;
  /** Customer prefill information */
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  /** Optional Razorpay Key ID override */
  keyId?: string;
  /** Hex color code for modal theme (default: '#58051E') */
  themeColor?: string;
  /** Callback on verified payment completion */
  onSuccess?: (result: {
    success: boolean;
    order_id: string;
    payment_id: string;
    message: string;
    raw: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    };
  }) => void | Promise<void>;
  /** Callback on payment failure or verification rejection */
  onError?: (error: { code?: string; description?: string; message?: string }) => void;
  /** Callback when user closes / dismisses checkout modal */
  onDismiss?: () => void;
}

/**
 * Ensures Razorpay Checkout script is loaded in document head
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      return resolve(true);
    }
    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay Standard Web Checkout
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const {
    amount,
    isPaise = false,
    currency = 'INR',
    receipt,
    name = 'FEREX HIGHER EDUCATION',
    description = 'Education Fee Settlement',
    notes,
    prefill,
    themeColor = '#58051E',
    onSuccess,
    onError,
    onDismiss,
  } = options;

  // Calculate amount in paise
  const amountInPaise = isPaise ? Math.round(amount) : Math.round(amount * 100);

  if (isNaN(amountInPaise) || amountInPaise < 100) {
    const errMsg = 'Amount must be at least 100 paise (₹1.00)';
    if (onError) onError({ message: errMsg });
    throw new Error(errMsg);
  }

  // Ensure Checkout script is available
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded || !(window as any).Razorpay) {
    const errMsg = 'Razorpay Checkout SDK failed to load. Please check your internet connection.';
    if (onError) onError({ message: errMsg });
    throw new Error(errMsg);
  }

  // Get Key ID from options or environment variable, falling back to authenticated credentials
  const configuredKey = options.keyId || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_RAZORPAY_KEY_ID : undefined);
  const keyId = (configuredKey && configuredKey !== 'rzp_test_default') ? configuredKey : 'rzp_test_TvtcmQYBnXjb9R';

  // Step 1: Create Order via backend API (with auto-fallback to education API if current origin returns 404)
  let orderData: { order_id: string; amount: number; currency: string; key_id?: string };
  try {
    const candidateEndpoints = [
      '/api/create-order',
      'https://education.ferexventures.com/api/create-order',
    ];

    let res: Response | null = null;
    let resText = '';

    for (let i = 0; i < candidateEndpoints.length; i++) {
      const endpoint = candidateEndpoints[i];
      try {
        const candidate = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: notes || {},
          }),
        });

        // If current host returned 404 and there's a fallback, try the next endpoint
        if (candidate.status === 404 && i < candidateEndpoints.length - 1) {
          continue;
        }

        res = candidate;
        resText = await candidate.text();
        break;
      } catch (networkErr: any) {
        if (i === candidateEndpoints.length - 1) {
          throw networkErr;
        }
      }
    }

    if (!res) {
      throw new Error('Payment server is currently unreachable. Please check your connection.');
    }

    let data: any;
    try {
      data = JSON.parse(resText);
    } catch {
      throw new Error(
        res.ok
          ? 'Invalid response from payment server'
          : `Payment server error (${res.status}): ${resText.slice(0, 120)}`
      );
    }

    if (!res.ok) {
      throw new Error(data.error || `Order creation failed with status ${res.status}`);
    }
    orderData = data;
  } catch (err: any) {
    const errMsg = err.message || 'Failed to initialize payment order on server.';
    if (onError) onError({ message: errMsg });
    throw new Error(errMsg);
  }

  // Step 2: Open Razorpay modal with order_id
  const rzpOptions = {
    key: orderData.key_id || keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    name,
    description,
    order_id: orderData.order_id,
    prefill: {
      name: prefill?.name || '',
      email: prefill?.email || '',
      contact: prefill?.contact?.trim() || '+919876543210',
    },
    notes: notes || {},
    theme: {
      color: themeColor,
    },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      // Step 3: Backend Verification
      try {
        const verifyCandidates = [
          '/api/verify-payment',
          'https://education.ferexventures.com/api/verify-payment',
        ];

        let verifyRes: Response | null = null;
        let verifyText = '';

        for (let j = 0; j < verifyCandidates.length; j++) {
          const vEndpoint = verifyCandidates[j];
          try {
            const vCand = await fetch(vEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (vCand.status === 404 && j < verifyCandidates.length - 1) {
              continue;
            }

            verifyRes = vCand;
            verifyText = await vCand.text();
            break;
          } catch (netErr: any) {
            if (j === verifyCandidates.length - 1) throw netErr;
          }
        }

        if (!verifyRes) {
          throw new Error('Verification service unreachable');
        }

        let verifyData: any;
        try {
          verifyData = JSON.parse(verifyText);
        } catch {
          throw new Error(`Signature verification returned error (${verifyRes.status})`);
        }

        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || 'Payment signature verification failed');
        }

        if (onSuccess) {
          await onSuccess({
            success: true,
            order_id: response.razorpay_order_id,
            payment_id: response.razorpay_payment_id,
            message: verifyData.message || 'Payment verified successfully',
            raw: response,
          });
        }
      } catch (err: any) {
        if (onError) {
          onError({
            message: err.message || 'Payment signature verification failed. Please contact support.',
          });
        }
      }
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) {
          onDismiss();
        }
      },
    },
  };

  const rzpInstance = new (window as any).Razorpay(rzpOptions);

  // Handle payment.failed event
  rzpInstance.on('payment.failed', (failureResponse: any) => {
    console.error('Razorpay payment failed:', failureResponse);
    if (onError) {
      onError(failureResponse?.error || { message: 'Transaction was declined by issuing bank or gateway.' });
    }
  });

  rzpInstance.open();
}

