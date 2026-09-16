import { supabase } from '../supabase';

const DIRECT_RESEND_KEY = (import.meta.env.VITE_RESEND_API_KEY as string) || '';

export interface SendEmailPayload {
  studentEmail: string;
  subject: string;
  htmlContent: string;
}

export interface SendEmailResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Sends a transactional or notification email to a student using Resend.
 * Attempts execution via Supabase Edge Function 'send-student-email' first,
 * with a resilient direct fallback if running in client-side preview mode.
 */
export async function sendStudentEmail({
  studentEmail,
  subject,
  htmlContent,
}: SendEmailPayload): Promise<SendEmailResult> {
  if (!studentEmail) {
    return { success: false, error: 'Recipient email is required' };
  }

  // 1. Try Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('send-student-email', {
      body: {
        studentEmail,
        subject,
        htmlContent,
      },
    });

    if (!error && data) {
      return { success: true, data };
    }
  } catch (fnErr: any) {
    console.warn('[sendStudentEmail Edge Function notice]:', fnErr?.message || fnErr);
  }

  // 2. Direct Resend API fallback for development/browser preview environments
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DIRECT_RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'Ferex Ventures <noreply@ferexventures.com>',
        to: [studentEmail],
        subject,
        html: htmlContent,
      }),
    });

    const resData = await res.json();
    if (res.ok) {
      return { success: true, data: resData };
    } else {
      return { success: false, error: resData.message || resData.error || 'Failed to send email' };
    }
  } catch (err: any) {
    console.error('[sendStudentEmail error]:', err);
    return { success: false, error: err?.message || 'Network error while sending email' };
  }
}

/**
 * Helper to send Welcome email to student
 */
export async function sendStudentWelcomeEmail(studentEmail: string, studentName: string = 'Student'): Promise<SendEmailResult> {
  return sendStudentEmail({
    studentEmail,
    subject: 'Welcome to Ferex Ventures Education Portal',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="border-bottom: 2px solid #58051E; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="color: #58051E; font-size: 24px; margin: 0;">FEREX VENTURES</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Global Higher Education & Strategic Advisory</p>
        </div>
        <h2 style="color: #0f172a; font-size: 18px;">Welcome, ${studentName}!</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Your student admissions and visa facilitation portal account with <strong>Ferex Ventures</strong> is now active.
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #58051E; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 600;">Your Dedicated Portal Access:</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Track your university offer letters, document legalization, and visa filing milestones in real time.</p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          Ferex Ventures Tower, Infopark Expressway, Kochi, Kerala 682042<br />
          If you have any questions, reach out to your designated academic counselor.
        </p>
      </div>
    `,
  });
}
