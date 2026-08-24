// Supabase Edge Function: payment-reminders
// Deploy: supabase functions deploy payment-reminders
// Schedule via Supabase Dashboard -> Edge Functions -> Schedules (e.g. daily at 9 AM IST)
//
// Required secrets (supabase secrets set KEY=value):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date().toISOString();

  try {
    // 1. Find overdue / pending payments not yet reminded
    const { data: overduePayments, error } = await supabase
      .from('payments')
      .select('id, student_id, student_name, title, description, amount, currency, due_date, payment_type')
      .in('status', ['Pending', 'Pending Verification', 'Overdue'])
      .lt('due_date', now)
      .is('reminder_sent_at', null)
      .limit(50);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const payments = overduePayments ?? [];
    const results: { student_id: string; email: string; status: string }[] = [];

    for (const payment of payments) {
      if (!payment.student_id) continue;

      // 2. Get student email
      const { data: userData } = await supabase.auth.admin.getUserById(payment.student_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const amountFmt = `INR ${Number(payment.amount).toLocaleString('en-IN')}`;
      const dueDate = new Date(payment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const title = payment.title || payment.description || payment.payment_type || 'Installment Fee';

      // 3. Send reminder (using fetch to your email provider — swap with Resend/SendGrid as needed)
      const emailBody = [
        `Dear ${payment.student_name || 'Student'},`,
        '',
        'This is an automated reminder from FEREX European Higher Education Admissions.',
        '',
        'You have an outstanding payment:',
        `  Payment:  ${title}`,
        `  Amount:   ${amountFmt}`,
        `  Due Date: ${dueDate}`,
        '  Status:   Pending / Overdue',
        '',
        'Please log in to your FEREX Student Portal to complete this payment:',
        '  https://ferex.edu/student/payments',
        '',
        'If you have already paid, please upload your UTR / transaction reference for verification.',
        '',
        'Regards,',
        'FEREX Finance & Admissions Team',
      ].join('\n');

      // Supabase does not have a built-in email send API from Edge Functions directly.
      // Integrate your provider here. Example with Resend:
      //
      // const resendRes = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ from: 'noreply@ferex.edu', to: email, subject: `[FEREX] Payment Reminder: ${title}`, text: emailBody }),
      // });
      //
      // For now we log the email content and mark as sent:
      console.log(`[payment-reminders] Would send to ${email}:\n${emailBody}`);
      const sendStatus = 'logged'; // change to 'sent' after wiring real email provider

      // 4. Mark reminder_sent_at to prevent duplicate sends
      await supabase
        .from('payments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', payment.id);

      results.push({ student_id: payment.student_id, email, status: sendStatus });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), { status: 500 });
  }
});
