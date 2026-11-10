// Supabase Edge Function: send-whatsapp-lead
// Dispatches automated welcome messages and European universities advisory to prospective student leads

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
      return new Response(JSON.stringify({ error: "Phone number is compulsory" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean phone number (digits only, ensure country code, strip trunk zero)
    let cleanPhone = String(phone).replace(/[^\d+]/g, "");
    cleanPhone = cleanPhone.replace(/^(\+\d{1,4})0(\d+)/, "$1$2");
    if (!cleanPhone.startsWith("+") && cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone; // Default India if 10 digits
    }
    const recipientDigits = cleanPhone.replace("+", "");

    // Resolve WhatsApp API configuration
    let config = customConfig;
    if (!config) {
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
          config = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        }
      } catch (err) {
        console.warn("Could not load WhatsApp config from DB:", err);
      }
    }

    const provider = config?.provider || "meta";
    const apiKey = config?.apiKey || Deno.env.get("WHATSAPP_API_KEY");
    const phoneNumberId = config?.phoneNumberId || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const instanceId = config?.instanceId;

    const studentName = name || "Student";
    const targetCountry = country || "Europe";
    const textMessage = message || `Hello ${studentName}! 🎓 Welcome to FEREX Global Higher Education. We received your admission enquiry for ${targetCountry}.\n\nOur Senior Admissions Counselor will connect with you shortly with verified universities, tuition fee structures, and Schengen visa checklists.\n\nReply 'YES' to receive our European Partner Universities catalog!`;

    // 1. Meta WhatsApp Cloud API
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
          to: recipientDigits,
          type: "text",
          text: { preview_url: true, body: textMessage },
        }),
      });
      const metaData = await metaRes.json();
      const isOk = metaRes.ok && !metaData.error;
      return new Response(JSON.stringify({
        success: isOk,
        provider: "meta",
        data: metaData,
        error: isOk ? undefined : (metaData.error?.message || "Meta WhatsApp delivery rejected"),
      }), {
        status: metaRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. UltraMsg API
    if (provider === "ultramsg" && instanceId && apiKey) {
      const ultraRes = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: apiKey,
          to: recipientDigits,
          body: textMessage,
        }),
      });
      const ultraData = await ultraRes.json();
      const isUltraOk = ultraRes.ok && !ultraData.error;
      return new Response(JSON.stringify({
        success: isUltraOk,
        provider: "ultramsg",
        data: ultraData,
        error: isUltraOk ? undefined : (ultraData.error || "UltraMsg delivery rejected"),
      }), {
        status: ultraRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Generic Webhook
    if (provider === "webhook" && config?.webhookUrl) {
      const hookRes = await fetch(config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          recipient: recipientDigits,
          studentName,
          country: targetCountry,
          message: textMessage,
          timestamp: new Date().toISOString(),
        }),
      });
      return new Response(JSON.stringify({ success: true, provider: "webhook" }), {
        status: hookRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: Simulation / Logger mode for development and test leads
    console.log(`[WhatsApp Automated Notification] To: ${recipientDigits} (${studentName})\nMessage: ${textMessage}`);
    return new Response(
      JSON.stringify({
        success: true,
        provider: "simulation",
        status: "logged_ready",
        recipient: recipientDigits,
        preview: textMessage.substring(0, 100) + "...",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("WhatsApp dispatch error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

