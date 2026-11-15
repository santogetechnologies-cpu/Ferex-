// Supabase Edge Function: send-whatsapp-lead
// Sends WhatsApp messages through the gateway saved in Settings (Meta, UltraMsg, Twilio or webhook).
// Credentials are read here from the database and never come from the browser, except an admin test of unsaved values.
//   action "lead":   anyone (the public enquiry form). Sends the saved welcome template to that lead's own number, once.
//   action "custom": staff only. Sends a message to a phone.
//   action "test":   staff only. Like custom, optionally with unsaved gateway values.
// Every real attempt is written to the lead's activity log, so the admin screen can show live delivery results.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const STAFF = ["central", "superadmin", "super_admin", "admin", "education_admin", "counselor", "staff"];
const CONFIG_KEY = "ferex_education_whatsapp_config";

const digits = (phone: string) => {
  let p = String(phone || "").trim().replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  else if (p.startsWith("00")) p = p.slice(2);
  else if (p.length === 10) p = "91" + p;
  return p.replace(/\D/g, "");
};

async function dispatch(cfg: any, to: string, text: string): Promise<{ ok: boolean; provider: string; error?: string; id?: string }> {
  const provider: string = cfg?.provider || "meta";
  const apiKey: string = cfg?.apiKey || Deno.env.get("WHATSAPP_API_KEY") || "";
  const phoneNumberId: string = cfg?.phoneNumberId || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
  const instanceId: string = cfg?.instanceId || phoneNumberId || Deno.env.get("WHATSAPP_INSTANCE_ID") || "";

  try {
    if (provider === "meta") {
      if (!apiKey || !phoneNumberId) return { ok: false, provider, error: "Meta needs an access token and a phone number ID." };
      const r = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text } }),
      });
      const d = await r.json().catch(() => ({}));
      return r.ok && !d.error ? { ok: true, provider, id: d.messages?.[0]?.id } : { ok: false, provider, error: d.error?.message || `Meta returned ${r.status}` };
    }
    if (provider === "ultramsg") {
      if (!apiKey || !instanceId) return { ok: false, provider, error: "UltraMsg needs a token and an instance ID." };
      const r = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: apiKey, to, body: text }).toString(),
      });
      const d = await r.json().catch(() => ({}));
      return r.ok && !d.error && !d.error_code ? { ok: true, provider, id: d.id ? String(d.id) : undefined } : { ok: false, provider, error: d.error || d.message || `UltraMsg returned ${r.status}` };
    }
    if (provider === "twilio") {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
      const auth = apiKey || Deno.env.get("TWILIO_AUTH_TOKEN") || "";
      const from = cfg?.senderNumber || Deno.env.get("TWILIO_WHATSAPP_FROM") || "";
      const account = phoneNumberId || sid;
      if (!account || !auth || !from) return { ok: false, provider, error: "Twilio needs an account SID, an auth token and a sender number." };
      const fromN = from.startsWith("whatsapp:") ? from : `whatsapp:+${from.replace(/\D/g, "")}`;
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(`${account}:${auth}`) },
        body: new URLSearchParams({ From: fromN, To: `whatsapp:+${to}`, Body: text }).toString(),
      });
      const d = await r.json().catch(() => ({}));
      return r.ok && d.sid ? { ok: true, provider, id: d.sid } : { ok: false, provider, error: d.message || `Twilio returned ${r.status}` };
    }
    if (provider === "webhook") {
      if (!cfg?.webhookUrl) return { ok: false, provider, error: "Add the webhook URL." };
      const r = await fetch(cfg.webhookUrl, {
        method: "POST", headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({ phone: to, recipient: to, message: text, timestamp: new Date().toISOString() }),
      });
      return r.ok ? { ok: true, provider } : { ok: false, provider, error: `Webhook returned ${r.status}` };
    }
    return { ok: false, provider, error: `Unknown provider "${provider}".` };
  } catch (e) {
    return { ok: false, provider, error: e instanceof Error ? e.message : "The gateway could not be reached." };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const action: string = body.action || (body.leadId ? "lead" : "custom");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Who is calling?
    let staffName = "";
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (token) {
      const { data: u } = await db.auth.getUser(token);
      if (u?.user) {
        const { data: row } = await db.from("users").select("role, full_name").eq("id", u.user.id).maybeSingle();
        if (row && STAFF.includes(String(row.role))) staffName = row.full_name || "Staff";
      }
    }

    const { data: stored } = await db.from("system_config").select("value").eq("key", CONFIG_KEY).maybeSingle();
    const saved: any = stored?.value ? (typeof stored.value === "string" ? JSON.parse(stored.value) : stored.value) : {};

    // ── Public: welcome message for a fresh enquiry ──
    if (action === "lead") {
      const { data: lead } = await db.from("education_leads").select("*").eq("id", body.leadId).maybeSingle();
      if (!lead) return json({ success: false, error: "Enquiry not found." }, 404);
      if (lead.whatsapp_sent) return json({ success: true, provider: saved.provider, already: true });
      const isFresh = Date.now() - new Date(lead.created_at).getTime() < 15 * 60 * 1000;
      if (!isFresh && !staffName) return json({ success: false, error: "This enquiry is too old for an automatic message." }, 403);
      if (saved.enabled === false) return json({ success: false, skipped: true, error: "Automatic WhatsApp greetings are switched off." });

      const text = String(saved.welcome_message_template || "Hello {student_name}! Thank you for your enquiry about {country}. Our counselor will contact you shortly.")
        .replaceAll("{student_name}", lead.name || "Student").replaceAll("{country}", lead.preferred_country || "Europe").replaceAll("{degree}", lead.degree_level || "")
        .replaceAll("{counselor_name}", lead.assigned_counselor_name || "our admissions counselor").replaceAll("{counselor_phone}", saved.senderNumber || "").replaceAll("{portal_url}", body.portalUrl || "");
      const res = await dispatch(saved, digits(lead.phone), text);
      const now = new Date().toISOString();
      if (res.ok) await db.from("education_leads").update({ whatsapp_sent: true, whatsapp_sent_at: now, updated_at: now }).eq("id", lead.id);
      await db.from("education_lead_activities").insert({
        id: crypto.randomUUID(), lead_id: lead.id, activity_type: "WhatsApp Message",
        title: res.ok ? "WhatsApp welcome sent" : "WhatsApp welcome failed",
        description: res.ok ? `Sent to ${lead.phone} via ${res.provider}.` : `Could not send to ${lead.phone} via ${res.provider}: ${res.error}`,
        performed_by: "WhatsApp automation", created_at: now,
      });
      return json({ success: res.ok, provider: res.provider, error: res.error });
    }

    // ── Staff only from here ──
    if (!staffName) return json({ success: false, error: "Sign in as staff to send WhatsApp messages." }, 403);
    if (!body.phone || !body.message) return json({ success: false, error: "A phone number and a message are required." }, 400);
    const cfg = action === "test" && body.config ? { ...saved, ...body.config } : saved;
    const res = await dispatch(cfg, digits(body.phone), String(body.message));
    if (body.leadId) {
      const now = new Date().toISOString();
      if (res.ok) await db.from("education_leads").update({ whatsapp_sent: true, whatsapp_sent_at: now, updated_at: now }).eq("id", body.leadId);
      await db.from("education_lead_activities").insert({
        id: crypto.randomUUID(), lead_id: body.leadId, activity_type: "WhatsApp Message",
        title: res.ok ? "WhatsApp message sent" : "WhatsApp message failed",
        description: res.ok ? `Sent to ${body.phone} via ${res.provider}.` : `Could not send via ${res.provider}: ${res.error}`,
        performed_by: staffName, created_at: now,
      });
    }
    return json({ success: res.ok, provider: res.provider, error: res.error, id: res.id });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
