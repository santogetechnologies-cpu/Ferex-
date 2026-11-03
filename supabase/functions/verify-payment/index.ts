import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { verifyPaymentSignature } from '../_shared/payment-signature.ts';

const headers = { 'Content-Type': 'application/json' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
serve(async req => {
  if (req.method !== 'POST') return response({ error: 'POST required' }, 405);
  try {
    const stripeSignature = req.headers.get('stripe-signature');
    const razorpaySignature = req.headers.get('x-razorpay-signature');
    if ((!stripeSignature && !razorpaySignature) || (stripeSignature && razorpaySignature)) return response({ error: 'One provider signature is required' }, 400);
    const provider = stripeSignature ? 'stripe' : 'razorpay';
    const secret = Deno.env.get(provider === 'stripe' ? 'STRIPE_WEBHOOK_SECRET' : 'RAZORPAY_WEBHOOK_SECRET');
    if (!secret) return response({ error: 'Webhook verification is not configured' }, 503);
    const body = await req.text();
    if (!await verifyPaymentSignature({ body, header: (stripeSignature || razorpaySignature)!, secret, provider })) return response({ error: 'Invalid webhook signature' }, 401);
    const payload = JSON.parse(body);
    if ((provider === 'stripe' && payload.type !== 'payment_intent.succeeded') || (provider === 'razorpay' && payload.event !== 'payment.captured')) return response({ received: true });
    const entity = provider === 'stripe' ? payload.data?.object : payload.payload?.payment?.entity;
    const internalId = entity?.metadata?.ferex_payment_id || entity?.notes?.ferex_payment_id;
    const reference = entity?.order_id || entity?.metadata?.ferex_payment_ref;
    if (!internalId && !reference) return response({ error: 'No Ferex payment reference' }, 400);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let query = supabase.from('payments').select('*');
    query = internalId ? query.eq('id', internalId) : query.eq('ref_no', reference);
    const { data: payment, error } = await query.maybeSingle();
    if (error) throw error;
    if (!payment) return response({ error: 'Payment not found' }, 404);
    const received = Number(entity.amount_received ?? entity.amount);
    if (received !== Math.round(Number(payment.amount) * 100) || String(entity.currency).toUpperCase() !== payment.currency) return response({ error: 'Payment amount or currency mismatch' }, 400);
    if (['Paid', 'Verified'].includes(payment.status)) return response({ verified: true });
    if (!['Pending', 'Pending Verification'].includes(payment.status)) return response({ error: 'Payment is not awaiting settlement' }, 409);
    const { data: settled, error: updateError } = await supabase.from('payments').update({ status: 'Paid', paid_at: new Date().toISOString() }).eq('id', payment.id).in('status', ['Pending', 'Pending Verification']).select('id');
    if (updateError) throw updateError;
    if (!settled?.length) return response({ error: 'Payment was changed concurrently' }, 409);
    return response({ verified: true });
  } catch (error) {
    console.error('Payment verification failed:', error);
    return response({ error: 'Payment verification failed' }, 500);
  }
});
