import { supabase } from '../supabase';

// Razorpay Standard Web Checkout. Orders are created and confirmed by edge functions (razorpay-create-order and
// razorpay-verify); the key secret never reaches the browser. The public key id comes back with the order.
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: any) => void) => void } } }

const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<void> | null = null;
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; s.remove(); reject(new Error('Could not load the payment window. Check your connection and try again.')); };
    document.head.appendChild(s);
  });
  return loading;
}

async function call<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) message = j.error; } catch { /* keep the generic message */ }
    throw new Error(message || 'Payment service unavailable');
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export type OnlinePaymentResult = 'paid' | 'cancelled';

/** Opens Razorpay for one education fee. Resolves 'paid' once the server has verified the signature, 'cancelled' if the student closed the window. */
export async function payEducationFeeOnline(input: { paymentType: string; amount: number; description: string }): Promise<OnlinePaymentResult> {
  await loadCheckout();
  const order = await call<{ order_id: string; amount: number; currency: string; key_id: string; name: string; email: string; contact: string }>('razorpay-create-order', { payment_type: input.paymentType, amount: input.amount });
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('The payment window is not available');

  return new Promise<OnlinePaymentResult>((resolve, reject) => {
    let finished = false;
    const done = (fn: () => void) => { if (!finished) { finished = true; fn(); } };
    const release = (reason: string) => call('razorpay-verify', { order_id: order.order_id, cancel: true, reason }).catch(() => undefined);

    const rzp = new Razorpay({
      key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
      name: 'FEREX Education', description: input.description, theme: { color: '#6B0F36' },
      prefill: { name: order.name, email: order.email, contact: order.contact },
      retry: { enabled: true },
      // UPI always leads the list of ways to pay; cards and net banking stay available below it.
      config: { display: { blocks: { upi: { name: 'Pay with UPI', instruments: [{ method: 'upi' }] } }, sequence: ['block.upi'], preferences: { show_default_blocks: true } } },
      handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        call('razorpay-verify', { razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature })
          .then(() => done(() => resolve('paid')))
          .catch(e => done(() => reject(e)));
      },
      modal: { ondismiss: () => { void release('Closed by the student').then(() => done(() => resolve('cancelled'))); } },
    });
    rzp.on('payment.failed', (r: any) => {
      // The window stays open so the student can retry; the pending amount is only released if they close it.
      window.dispatchEvent(new CustomEvent('ferex_payment_failed', { detail: r?.error?.description || 'The payment failed' }));
    });
    rzp.open();
  });
}

/** Asks Razorpay what really happened to online payments that are not settled here (closed checkout, late UPI confirmation) and syncs the stored status. Returns true when anything changed. */
export async function reconcileOnlinePayments(orderIds: string[]): Promise<boolean> {
  const ids = [...new Set(orderIds.filter(id => /^order_\w+$/.test(id)))].slice(0, 25);
  if (!ids.length) return false;
  try {
    const r = await call<{ reconciled: { order_id: string; status: string }[] }>('razorpay-verify', { reconcile: true, order_ids: ids });
    return (r.reconciled || []).some(x => x.status === 'Paid');
  } catch { return false; }
}
