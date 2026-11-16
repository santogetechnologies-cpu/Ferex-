import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Creates a Razorpay order for one education fee the signed-in student owes. The database rules (fee amount, remaining
// balance, workflow stage, plan) are applied to the saved payment exactly as for any other payment.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const keyId = Deno.env.get('RAZORPAY_KEY_ID'), keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Online payments are not configured yet' }, 503);

    const auth = req.headers.get('Authorization') || '';
    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ error: 'Sign in to pay' }, 401);

    const body = await req.json().catch(() => ({}));
    const paymentType = String(body.payment_type || '');
    const amount = Number(body.amount);
    if (!/^education:[\w:.-]{1,80}$/.test(paymentType)) return json({ error: 'Choose a fee to pay' }, 400);
    if (!Number.isFinite(amount) || Math.round(amount * 100) < 100) return json({ error: 'The minimum online payment is ₹1.00' }, 400);
    const paise = Math.round(amount * 100);
    if (Math.abs(paise / 100 - amount) > 1e-9) return json({ error: 'Amount can have at most two decimals' }, 400);

    const { data: profile } = await caller.from('users').select('full_name,email,phone').eq('id', user.id).maybeSingle();
    const id = crypto.randomUUID();
    const receipt = `EDU-RZP-${id.slice(0, 8)}`;

    const rz = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: paise, currency: 'INR', receipt, notes: { ferex_payment_id: id, student_id: user.id, fee: paymentType } }),
    });
    const order = await rz.json().catch(() => ({}));
    if (rz.status === 401) return json({ error: 'Razorpay rejected the server credentials' }, 401);
    if (!rz.ok || !order.id) return json({ error: order?.error?.description || 'Razorpay could not create the order' }, 500);

    // Saved with the server's own access on the student's behalf (the student id is the verified caller), so the manual-UPI
    // switches do not apply; the database still checks the fee, remaining balance and workflow stage for this student.
    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await db.from('payments').insert({
      id, ref_no: receipt, student_id: user.id, student_name: profile?.full_name || '', title: 'Online payment', payment_type: paymentType,
      amount: paise / 100, currency: 'INR', payment_method: 'UPI', utr_number: order.id, status: 'Pending Verification', paid_at: null,
      description: `Online payment via Razorpay, order ${order.id}.`,
    });
    if (error) return json({ error: error.message }, 400);

    return json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId, payment_id: id, name: profile?.full_name || '', email: profile?.email || user.email || '', contact: profile?.phone || '' });
  } catch (e) {
    console.error('razorpay-create-order failed', e);
    return json({ error: 'Could not start the payment' }, 500);
  }
});
