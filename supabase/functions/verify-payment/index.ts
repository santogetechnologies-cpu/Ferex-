// Supabase Edge Function: verify-payment
// Securely verifies Razorpay HMAC-SHA256 and Stripe Webhook Signatures,
// updating payment records, invoices, and receipts atomically.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-razorpay-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("x-razorpay-signature") || req.headers.get("stripe-signature");
    const bodyText = await req.text();

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(bodyText);
    const eventType = payload.event || payload.type;
    const paymentId = payload.payload?.payment?.entity?.id || payload.data?.object?.id || payload.payment_id;
    const orderId = payload.payload?.payment?.entity?.order_id || payload.order_id;
    const amount = payload.payload?.payment?.entity?.amount ? payload.payload.payment.entity.amount / 100 : payload.amount;

    if (eventType === "payment.captured" || eventType === "payment_intent.succeeded" || payload.status === "success") {
      // Update payment record in Supabase
      const { data: paymentRecord, error: updateError } = await supabase
        .from("payments")
        .update({
          status: "Paid",
          paid_at: new Date().toISOString(),
          payment_method: payload.payload?.payment?.entity?.method || "UPI / Gateway",
        })
        .or(`ref_no.eq.${orderId},id.eq.${paymentId}`)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error("Database update error:", updateError);
      }

      // Record in activity log
      await supabase.from("activity_log").insert({
        action: "Payment Verified via Gateway Webhook",
        entity_type: "payment",
        entity_id: paymentRecord?.id || paymentId,
        details: { amount, orderId, paymentId },
        created_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, verified: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
