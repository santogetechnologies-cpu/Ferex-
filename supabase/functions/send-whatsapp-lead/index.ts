// Supabase Edge Function: send-whatsapp-lead
// Real WhatsApp API dispatcher — Meta Cloud API, UltraMsg, Twilio, and Webhook
// Config is loaded from system_config DB table or passed as customConfig from client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phone, name, country, message, customConfig } = body;

    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: "Phone number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean phone number — strip all non-digits except leading +
    let cleanPhone = String(phone).trim();
    // Remove spaces, dashes, parens
    cleanPhone = cleanPhone.replace(/[\s\-\(\)]/g, "");
    // If no country code, prepend 91 for India (default)
    if (cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith("91")) {
      cleanPhone = "91" + cleanPhone;
    } else if (cleanPhone.startsWith("0")) {
      cleanPhone = "91" + cleanPhone.substring(1);
    }
    // Remove any remaining non-digits
    cleanPhone = cleanPhone.replace(/[^\d]/g, "");

    // Load WhatsApp config — prefer customConfig passed from client (already loaded from DB+localStorage),
    // then fall back to loading directly from DB, then env vars
    let config = customConfig;

    if (!config || (!config.apiKey && !config.instanceId)) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "ferex_education_whatsapp_config")
          .maybeSingle();
        if (data?.value) {
          const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          config = parsed;
        }
      } catch (err) {
        console.warn("Could not load WhatsApp config from DB:", err);
      }
    }

    // Env var fallback for credentials
    const provider: string = config?.provider || "meta";
    const apiKey: string = config?.apiKey || Deno.env.get("WHATSAPP_API_KEY") || "";
    const phoneNumberId: string = config?.phoneNumberId || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
    const instanceId: string = config?.instanceId || Deno.env.get("WHATSAPP_INSTANCE_ID") || "";
    const twilioSid: string = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
    const twilioAuth: string = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    const twilioFrom: string = config?.senderNumber || Deno.env.get("TWILIO_WHATSAPP_FROM") || "";

    const studentName = name || "Student";
    const targetCountry = country || "Europe";
    const textMessage = message || `Hello ${studentName}! 🎓 Welcome to FEREX Global Higher Education. We received your admission enquiry for ${targetCountry}.\n\nOur Senior Admissions Counselor will connect with you shortly with verified universities, tuition fee structures, and Schengen visa checklists.\n\nReply 'YES' to receive our European Partner Universities catalog!`;

    console.log(`[WhatsApp] Provider: ${provider}, To: ${cleanPhone}, HasKey: ${Boolean(apiKey)}`);

    // ── 1. Meta WhatsApp Cloud API ───────────────────────────────────────────
    if (provider === "meta" && apiKey && phoneNumberId) {
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone,
          type: "text",
          text: { preview_url: false, body: textMessage },
        }),
      });

      const metaData = await metaRes.json();
      const isOk = metaRes.ok && !metaData.error;

      return new Response(JSON.stringify({
        success: isOk,
        provider: "meta",
        data: isOk ? { message_id: metaData.messages?.[0]?.id } : undefined,
        error: isOk ? undefined : (metaData.error?.message || `Meta API error ${metaRes.status}`),
      }), {
        status: isOk ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. UltraMsg API ──────────────────────────────────────────────────────
    if (provider === "ultramsg" && instanceId && apiKey) {
      const params = new URLSearchParams({
        token: apiKey,
        to: cleanPhone,
        body: textMessage,
      });

      const ultraRes = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      let ultraData: any = {};
      try { ultraData = await ultraRes.json(); } catch {}

      const isUltraOk = ultraRes.ok && !ultraData.error && !ultraData.error_code;

      return new Response(JSON.stringify({
        success: isUltraOk,
        provider: "ultramsg",
        data: isUltraOk ? ultraData : undefined,
        error: isUltraOk ? undefined : (ultraData.error || ultraData.message || `UltraMsg error ${ultraRes.status}`),
      }), {
        status: isUltraOk ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Twilio WhatsApp ───────────────────────────────────────────────────
    if (provider === "twilio" && twilioSid && twilioAuth) {
      const fromNumber = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:+${twilioFrom.replace(/[^\d]/g, "")}`;
      const toNumber = `whatsapp:+${cleanPhone}`;

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: toNumber,
            Body: textMessage,
          }).toString(),
        }
      );

      let twilioData: any = {};
      try { twilioData = await twilioRes.json(); } catch {}

      const isTwilioOk = twilioRes.ok && twilioData.sid;

      return new Response(JSON.stringify({
        success: isTwilioOk,
        provider: "twilio",
        data: isTwilioOk ? { message_sid: twilioData.sid } : undefined,
        error: isTwilioOk ? undefined : (twilioData.message || `Twilio error ${twilioRes.status}`),
      }), {
        status: isTwilioOk ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Generic Webhook ───────────────────────────────────────────────────
    if (provider === "webhook" && config?.webhookUrl) {
      const hookRes = await fetch(config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          phone: cleanPhone,
          recipient: cleanPhone,
          name: studentName,
          country: targetCountry,
          message: textMessage,
          timestamp: new Date().toISOString(),
        }),
      });

      const isHookOk = hookRes.ok;
      let hookData: any = {};
      try { hookData = await hookRes.json(); } catch {}

      return new Response(JSON.stringify({
        success: isHookOk,
        provider: "webhook",
        data: hookData,
        error: isHookOk ? undefined : `Webhook returned ${hookRes.status}`,
      }), {
        status: isHookOk ? 200 : hookRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. No credentials configured — log and report ────────────────────────
    console.log(`[WhatsApp Not Configured] Provider: ${provider}, To: ${cleanPhone}`);
    console.log(`[WhatsApp Message Preview]: ${textMessage.substring(0, 200)}`);

    return new Response(
      JSON.stringify({
        success: false,
        provider: provider,
        error: `WhatsApp credentials not configured. Please go to Education Admin → Settings → WhatsApp API & Automation and enter your ${provider.toUpperCase()} API credentials.`,
        debug: {
          provider,
          hasMeta: Boolean(apiKey && phoneNumberId && provider === "meta"),
          hasUltraMsg: Boolean(instanceId && apiKey && provider === "ultramsg"),
          hasTwilio: Boolean(twilioSid && twilioAuth && provider === "twilio"),
          hasWebhook: Boolean(config?.webhookUrl && provider === "webhook"),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("WhatsApp dispatch error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
