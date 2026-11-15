import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

// Confirms a Razorpay payment: HMAC-SHA256(order_id|payment_id, key secret) must match, and Razorpay itself must report the
// same order, amount and a captured payment. Only then is the student's payment marked Paid. Also lets the student cancel a checkout.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const keyId = Deno.env.get('RAZORPAY_KEY_ID'), keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Online payments are not configured yet' }, 503);
    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ error: 'Sign in to continue' }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.razorpay_order_id || body.order_id || '');
    if (!/^order_\w+$/.test(orderId)) return json({ error: 'Missing order' }, 400);
    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: payment, error: findError } = await db.from('payments').select('*').eq('utr_number', orderId).eq('student_id', user.id).maybeSingle();
    if (findError) throw findError;
    if (!payment) return json({ error: 'Payment not found' }, 404);

    // The student closed the checkout or the payment failed: release the amount so it can be paid again.
    if (body.cancel) {
      if (payment.status === 'Pending Verification') {
        await db.from('payments').update({ status: 'Rejected', reviewer_notes: `Checkout not completed${body.reason ? `: ${String(body.reason).slice(0, 160)}` : ''}` }).eq('id', payment.id).eq('status', 'Pending Verification');
      }
      return json({ cancelled: true });
    }

    const paymentId = String(body.razorpay_payment_id || ''), signature = String(body.razorpay_signature || '');
    if (!paymentId || !signature) return json({ error: 'Missing payment details' }, 400);
    if (!same(await hmac(keySecret, `${orderId}|${paymentId}`), signature)) return json({ error: 'Payment signature did not match. Nothing was marked as paid.' }, 400);
    if (payment.status === 'Paid') return json({ verified: true, already: true });
    const retriable = payment.status === 'Pending Verification' || (payment.status === 'Rejected' && String(payment.reviewer_notes || '').startsWith('Checkout not completed'));
    if (!retriable) return json({ error: 'This payment can no longer be settled online' }, 409);

    const basic = { Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`) };
    let rz = await (await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, { headers: basic })).json();
    if (rz.order_id !== orderId || Number(rz.amount) !== Math.round(Number(payment.amount) * 100) || String(rz.currency).toUpperCase() !== 'INR') return json({ error: 'Payment details did not match the order' }, 400);
    if (rz.status === 'authorized') {
      rz = await (await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, { method: 'POST', headers: { ...basic, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: rz.amount, currency: 'INR' }) })).json();
    }
    if (rz.status !== 'captured') return json({ error: 'The payment has not been completed' }, 400);

    const { data: settled, error: updateError } = await db.from('payments').update({
      status: 'Paid', paid_at: new Date().toISOString(), transaction_id: paymentId, reviewer_notes: 'Verified automatically by Razorpay',
      description: `Paid online via Razorpay (${rz.method || 'checkout'}), payment ${paymentId}, order ${orderId}.`,
    }).eq('id', payment.id).in('status', ['Pending Verification', 'Rejected']).select('id');
    if (updateError) throw updateError;
    if (!settled?.length) return json({ error: 'Payment was changed while verifying' }, 409);
    return json({ verified: true });
  } catch (e) {
    console.error('razorpay-verify failed', e);
    return json({ error: 'Could not verify the payment' }, 500);
  }
});
