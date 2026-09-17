import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { studentEmail, to, subject, htmlContent, html, from, studentName, templateType, apiKey, resendApiKey: bodyKey } = await req.json();
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || apiKey || bodyKey;

    const recipient = studentEmail || to;

    if (!recipient) {
      return new Response(JSON.stringify({ error: 'Missing recipient email in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailSubject = subject || 'Notification from FEREX European Higher Education';
    const emailHtml = htmlContent || html || `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background: #58051E; padding: 18px 24px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">FEREX GLOBAL ADMISSIONS</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #E6CA9E;">European Higher Education Admissions Desk</p>
        </div>
        <div style="font-size: 14px; color: #1e293b; line-height: 1.6;">
          <p>Dear <strong>${studentName || 'Student'}</strong>,</p>
          <p>We have an important update regarding your European higher education admission file.</p>
          <div style="background: #f8fafc; border-left: 4px solid #58051E; padding: 14px 18px; margin: 16px 0; font-size: 13px; color: #334155;">
            Please log in to your FEREX Student Portal to view your active application status and documents.
          </div>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 14px;">
          FEREX European Admissions Division • Warsaw, Poland & Bangalore, India
        </p>
      </div>
    `;

    // If Resend API key is not configured in current environment, simulate safely
    if (!resendApiKey) {
      console.log(`[send-student-email Simulated Dispatch] To: ${recipient}, Subject: ${emailSubject}`);
      return new Response(JSON.stringify({ success: true, mode: 'simulated_offline', to: recipient }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: from || 'FEREX Global Admissions <admissions@ferex.org>',
        to: [recipient],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Unknown server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
