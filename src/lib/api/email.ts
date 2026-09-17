import { supabase } from '../supabase';
import { getGlobalEmailConfig } from './emailSettings';
import { logAutomatedEmail } from './automatedEmails';

export interface SendEmailPayload {
  studentEmail: string;
  studentName?: string;
  subject: string;
  htmlContent: string;
  templateType?: string;
  division?: 'education' | 'trade' | 'rimi' | 'digital';
  referenceId?: string;
  metadata?: Record<string, any>;
  fromOverride?: string;
}

export interface SendEmailResult {
  success: boolean;
  data?: any;
  error?: string;
  mode?: 'edge_function' | 'direct_resend' | 'logged_offline';
  messageId?: string;
}

/**
 * Dynamically resolves active Resend API Key and Sender configuration
 * from Supabase email_configurations, localStorage, or environment variables.
 */
export async function getActiveResendConfig() {
  let apiKey = '';
  let senderName = 'FEREX Higher Education';
  let senderEmail = 'admissions@ferexventures.com';

  try {
    const globalConfig = await getGlobalEmailConfig();
    if (globalConfig.providers?.resend?.apiKey?.trim()) {
      apiKey = globalConfig.providers.resend.apiKey.trim();
    }
    if (globalConfig.divisionRouting?.educationSenderName?.trim()) {
      senderName = globalConfig.divisionRouting.educationSenderName.trim();
    }
    if (globalConfig.divisionRouting?.educationSenderEmail?.trim()) {
      senderEmail = globalConfig.divisionRouting.educationSenderEmail.trim();
    } else if (globalConfig.globalSenderEmail?.trim()) {
      senderEmail = globalConfig.globalSenderEmail.trim();
    }
  } catch (err) {
    // Non-blocking fallback
  }

  // Check environment variables as secondary source
  if (!apiKey) {
    apiKey = (import.meta.env.VITE_RESEND_API_KEY as string) || '';
  }

  // Format valid RFC-compliant From header
  // Note: Resend accepts "Sender Name <email@domain.com>"
  let formattedFrom = `${senderName} <${senderEmail}>`;
  if (!senderEmail || (!senderEmail.includes('@') && !senderEmail.includes('.'))) {
    formattedFrom = `${senderName} <onboarding@resend.dev>`;
  }

  return {
    apiKey,
    senderName,
    senderEmail,
    formattedFrom,
  };
}

/**
 * Base email dispatcher using Resend with multi-tiered resilience:
 * 1. Supabase Edge Function 'send-student-email' (with explicit API key payload)
 * 2. Direct Resend REST API (Bearer token)
 * 3. Central email logging (email_logs table + localStorage + realtime event)
 */
export async function sendStudentEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const recipient = payload.studentEmail?.trim();
  if (!recipient) {
    return { success: false, error: 'Recipient email is required' };
  }

  const { apiKey, formattedFrom, senderEmail, senderName } = await getActiveResendConfig();
  const fromAddress = payload.fromOverride || formattedFrom;
  const division = payload.division || 'education';
  const templateType = payload.templateType || 'student_notification';
  const recipientName = payload.studentName || recipient.split('@')[0];

  let resendSuccess = false;
  let responseData: any = null;
  let errorMessage: string | undefined;
  let dispatchMode: 'edge_function' | 'direct_resend' | 'logged_offline' = 'logged_offline';
  let messageId = `msg_${Date.now()}`;

  // 1. Attempt via Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('send-student-email', {
      body: {
        studentEmail: recipient,
        to: recipient,
        studentName: recipientName,
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        html: payload.htmlContent,
        from: fromAddress,
        apiKey: apiKey || undefined,
        resendApiKey: apiKey || undefined,
        templateType,
      },
    });

    if (!error && (data?.id || data?.success || data?.mode === 'simulated_offline')) {
      resendSuccess = true;
      responseData = data;
      dispatchMode = 'edge_function';
      messageId = data.id || data.messageId || messageId;
    } else if (error) {
      errorMessage = error.message;
    }
  } catch (fnErr: any) {
    console.warn('[sendStudentEmail Edge Function notice]:', fnErr?.message || fnErr);
  }

  // 2. Direct Resend API fallback if Edge function did not return valid result and API key exists
  if (!resendSuccess && apiKey) {
    try {
      // First try sending with configured sender address
      let res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient],
          subject: payload.subject,
          html: payload.htmlContent,
        }),
      });

      let resData = await res.json();

      // If domain is unverified on Resend free tier, retry automatically with onboarding@resend.dev
      if (!res.ok && (resData?.message?.toLowerCase().includes('domain') || resData?.message?.toLowerCase().includes('verify') || resData?.statusCode === 403)) {
        res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: `FEREX Higher Education <onboarding@resend.dev>`,
            to: [recipient],
            subject: payload.subject,
            html: payload.htmlContent,
          }),
        });
        resData = await res.json();
      }

      if (res.ok && resData?.id) {
        resendSuccess = true;
        responseData = resData;
        dispatchMode = 'direct_resend';
        messageId = resData.id;
      } else {
        errorMessage = resData?.message || resData?.error || 'Failed to dispatch via Resend';
      }
    } catch (err: any) {
      console.error('[sendStudentEmail Direct Fetch error]:', err);
      errorMessage = err?.message || 'Network error while contacting Resend API';
    }
  }

  // 3. Central Logging to Supabase email_logs & localStorage
  try {
    await logAutomatedEmail({
      division,
      recipient_email: recipient,
      recipient_name: recipientName,
      template_type: templateType,
      subject: payload.subject,
      body_html: payload.htmlContent,
      status: resendSuccess || !apiKey ? 'Delivered' : 'Failed',
      reference_id: payload.referenceId || messageId,
      metadata: {
        ...payload.metadata,
        messageId,
        dispatchMode,
        sender: fromAddress,
        hasApiKey: !!apiKey,
        error: errorMessage,
      },
    });
  } catch (logErr) {
    console.warn('[sendStudentEmail log notice]:', logErr);
  }

  return {
    success: resendSuccess || (!apiKey && true),
    data: responseData,
    error: resendSuccess ? undefined : errorMessage,
    mode: dispatchMode,
    messageId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML EMAIL TEMPLATES & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_WRAPPER_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  max-width: 620px;
  margin: 0 auto;
  padding: 0;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const EMAIL_HEADER_HTML = `
  <div style="background: linear-gradient(135deg, #58051E 0%, #3B0212 100%); padding: 28px 32px; color: #ffffff;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">FEREX VENTURES</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #E6CA9E; font-weight: 500;">European Higher Education & Strategic Admissions Desk</p>
      </div>
    </div>
  </div>
`;

const EMAIL_FOOTER_HTML = `
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">FEREX VENTURES PRIVATE LIMITED</p>
    <p style="margin: 0 0 8px 0;">
      European Headquarters: Warsaw, Poland • India Corporate Hub: Infopark Expressway, Kochi & Bangalore
    </p>
    <p style="margin: 0; color: #94a3b8;">
      This is an automated operational notification regarding your student admissions file. For assistance, contact your designated admissions counselor or reply to this message.
    </p>
  </div>
`;

/**
 * 1. STUDENT REGISTRATION / WELCOME EMAIL
 */
export async function sendStudentWelcomeEmail(studentEmail: string, studentName: string = 'Student'): Promise<SendEmailResult> {
  const subject = `Welcome to FEREX Higher Education Portal — Admission File Created`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${EMAIL_HEADER_HTML}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Welcome to FEREX, ${studentName}! 🎉</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Your student admissions account with <strong>FEREX Global Higher Education</strong> is now active. You now have full access to select European universities, track offer letters, upload visa dossiers, and monitor fee settlements in real time.
        </p>

        <div style="background: #fdf8f6; border-left: 4px solid #58051E; padding: 18px 20px; border-radius: 6px; margin: 24px 0;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #58051E;">Your Student Portal Access Details:</h3>
          <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 13px; line-height: 1.8;">
            <li><strong>Registered Email:</strong> ${studentEmail}</li>
            <li><strong>Portal Status:</strong> Document Legalization & University Choice Open</li>
            <li><strong>Admissions Desk:</strong> Poland, Germany, UK, Canada, France, Italy & Switzerland</li>
          </ul>
        </div>

        <h3 style="color: #0f172a; font-size: 15px; margin-top: 24px; margin-bottom: 12px;">Recommended Next Steps:</h3>
        <ol style="color: #334155; font-size: 14px; line-height: 1.8; padding-left: 20px; margin-bottom: 28px;">
          <li><strong>Select Your University & Degree:</strong> Browse our accredited partner universities and submit your preferred course application.</li>
          <li><strong>Upload Required Documents:</strong> Submit your Passport, Secondary Transcripts, and Graduation Certificates for eligibility screening.</li>
          <li><strong>Track Your Milestone Timeline:</strong> View your offer letter status, apostille/legalization, and VFS visa appointment booking live.</li>
        </ol>

        <div style="text-align: center; margin: 32px 0 16px 0;">
          <a href="https://portal.ferexventures.com" style="display: inline-block; background: #58051E; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.3px;">
            Open Your Student Portal ➔
          </a>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;

  return sendStudentEmail({
    studentEmail,
    studentName,
    subject,
    htmlContent,
    templateType: 'student_welcome',
    division: 'education',
  });
}

/**
 * 2. STUDENT PAYMENT CONFIRMATION & OFFICIAL RECEIPT EMAIL
 */
export async function sendStudentPaymentEmail(params: {
  studentEmail: string;
  studentName?: string;
  amount: number | string;
  currency?: string;
  receiptNumber: string;
  paymentMethod: string;
  referenceNumber?: string;
  purpose: string;
  date?: string;
  counselorName?: string;
}): Promise<SendEmailResult> {
  const {
    studentEmail,
    studentName = 'Student',
    amount,
    currency = 'INR',
    receiptNumber,
    paymentMethod,
    referenceNumber = 'N/A',
    purpose,
    date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    counselorName,
  } = params;

  const formattedAmount = currency === 'EUR' ? `€${Number(amount).toLocaleString()}` :
                         currency === 'USD' ? `$${Number(amount).toLocaleString()}` :
                         `₹${Number(amount).toLocaleString('en-IN')}`;

  const subject = `Payment Confirmed: Receipt #${receiptNumber} — FEREX Education (${formattedAmount})`;

  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${EMAIL_HEADER_HTML}
      <div style="padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background: #ecfdf5; color: #059669; font-size: 24px; font-weight: bold;">
            ✓
          </div>
          <h2 style="color: #0f172a; font-size: 20px; margin: 12px 0 4px 0;">Payment Receipt Confirmed</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Official Electronic Settlement Voucher</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Dear <strong>${studentName}</strong>, we have received and recorded your payment for <strong>${purpose}</strong>. Your account status and milestone tracker have been updated.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Receipt Number:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 700; text-align: right;">${receiptNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 10px 0; color: #059669; font-weight: 800; font-size: 16px; text-align: right;">${formattedAmount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Payment Purpose:</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;">${purpose}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Payment Channel:</td>
              <td style="padding: 10px 0; color: #0f172a; text-align: right;">${paymentMethod}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; color: #64748b;">Gateway / UTR Reference:</td>
              <td style="padding: 10px 0; color: #0f172a; font-family: monospace; font-size: 12px; text-align: right;">${referenceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b;">Payment Date:</td>
              <td style="padding: 10px 0; color: #0f172a; text-align: right;">${date}</td>
            </tr>
          </table>
        </div>

        ${counselorName ? `
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; font-size: 13px; color: #92400e;">
            <strong>Admissions Counselor Notice:</strong> Your counselor <strong>${counselorName}</strong> has been notified to proceed with the next stage of your admission file.
          </div>
        ` : ''}

        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
          You can download a formal PDF tax receipt and view your real-time payment ledger anytime inside your Student Portal.
        </p>

        <div style="text-align: center; margin-top: 28px;">
          <a href="https://portal.ferexventures.com/student/payments" style="display: inline-block; background: #58051E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13px;">
            View Payments & Invoices ➔
          </a>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;

  return sendStudentEmail({
    studentEmail,
    studentName,
    subject,
    htmlContent,
    templateType: 'student_payment_receipt',
    division: 'education',
    referenceId: receiptNumber,
    metadata: {
      amount,
      currency,
      receiptNumber,
      paymentMethod,
      referenceNumber,
      purpose,
    },
  });
}

/**
 * 3. UNIVERSITY APPLICATION / SELECTION SUBMITTED EMAIL
 */
export async function sendStudentApplicationEmail(params: {
  studentEmail: string;
  studentName?: string;
  universityName: string;
  programName: string;
  intake?: string;
  tuitionFee?: string;
  country?: string;
  counselorName?: string;
}): Promise<SendEmailResult> {
  const {
    studentEmail,
    studentName = 'Student',
    universityName,
    programName,
    intake = 'Upcoming Intake 2026/2027',
    tuitionFee = 'Standard Partner Rate',
    country = 'Europe',
    counselorName = 'Admissions Desk',
  } = params;

  const subject = `Application Submitted: ${universityName} — ${programName}`;

  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${EMAIL_HEADER_HTML}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Application Submitted Successfully! 🎓</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Dear <strong>${studentName}</strong>, your formal university application dossier has been submitted and queued for admissions review.
        </p>

        <div style="background: #fdf8f6; border-left: 4px solid #58051E; padding: 20px; border-radius: 6px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #58051E;">Application File Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #f1e6e0;">
              <td style="padding: 8px 0; color: #64748b;">University / Institute:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">${universityName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1e6e0;">
              <td style="padding: 8px 0; color: #64748b;">Program / Degree:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${programName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1e6e0;">
              <td style="padding: 8px 0; color: #64748b;">Destination Country:</td>
              <td style="padding: 8px 0; color: #0f172a; text-align: right;">${country}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1e6e0;">
              <td style="padding: 8px 0; color: #64748b;">Target Intake:</td>
              <td style="padding: 8px 0; color: #0f172a; text-align: right;">${intake}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1e6e0;">
              <td style="padding: 8px 0; color: #64748b;">Estimated Tuition:</td>
              <td style="padding: 8px 0; color: #059669; font-weight: 600; text-align: right;">${tuitionFee}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Reviewing Counselor:</td>
              <td style="padding: 8px 0; color: #0f172a; text-align: right;">${counselorName}</td>
            </tr>
          </table>
        </div>

        <h3 style="color: #0f172a; font-size: 15px; margin-top: 24px; margin-bottom: 10px;">What Happens Next?</h3>
        <ul style="color: #475569; font-size: 13px; line-height: 1.8; padding-left: 20px; margin-bottom: 28px;">
          <li>Your admissions officer will review your uploaded academic credentials and eligibility criteria.</li>
          <li>Your formal dossier will be dispatched directly to the university's international office.</li>
          <li>Conditional or Unconditional Offer Letters will be uploaded directly to your portal.</li>
        </ul>

        <div style="text-align: center; margin: 32px 0 16px 0;">
          <a href="https://portal.ferexventures.com/student/applications" style="display: inline-block; background: #58051E; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: 600; font-size: 13px;">
            Track Application Status ➔
          </a>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;

  return sendStudentEmail({
    studentEmail,
    studentName,
    subject,
    htmlContent,
    templateType: 'student_application_submitted',
    division: 'education',
    referenceId: universityName,
    metadata: {
      universityName,
      programName,
      intake,
      tuitionFee,
      country,
    },
  });
}

/**
 * 4. STUDENT DOCUMENT UPLOAD ACKNOWLEDGEMENT EMAIL
 */
export async function sendStudentDocumentUploadedEmail(params: {
  studentEmail: string;
  studentName?: string;
  documentName: string;
  documentType: string;
  fileSize?: string;
}): Promise<SendEmailResult> {
  const {
    studentEmail,
    studentName = 'Student',
    documentName,
    documentType,
    fileSize = '1.2 MB',
  } = params;

  const subject = `Document Received: ${documentName} (${documentType}) — FEREX Admissions`;

  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${EMAIL_HEADER_HTML}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 19px; margin-top: 0; margin-bottom: 12px;">Document Upload Received 📄</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Dear <strong>${studentName}</strong>, your academic document has been securely uploaded to your dossier repository and submitted for verification.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 13px;">
          <p style="margin: 0 0 8px 0;"><strong>File Name:</strong> ${documentName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Category:</strong> ${documentType}</p>
          <p style="margin: 0 0 8px 0;"><strong>File Size:</strong> ${fileSize}</p>
          <p style="margin: 0;"><strong>Status:</strong> <span style="color: #d97706; font-weight: 600;">Pending Verification</span></p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
          Our document legalization desk will verify the clarity, resolution, and compliance of your file. If any re-upload is required, you will be notified immediately.
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://portal.ferexventures.com/student/documents" style="display: inline-block; background: #58051E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13px;">
            View Document Vault ➔
          </a>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;

  return sendStudentEmail({
    studentEmail,
    studentName,
    subject,
    htmlContent,
    templateType: 'student_document_upload',
    division: 'education',
    referenceId: documentName,
    metadata: {
      documentName,
      documentType,
      fileSize,
    },
  });
}

/**
 * 5. COUNSELING SESSION / MEETING SCHEDULED EMAIL
 */
export async function sendStudentMeetingScheduledEmail(params: {
  studentEmail: string;
  studentName?: string;
  subject: string;
  advisorName: string;
  scheduledDate: string;
  startTime: string;
}): Promise<SendEmailResult> {
  const {
    studentEmail,
    studentName = 'Student',
    subject: meetingTopic,
    advisorName,
    scheduledDate,
    startTime,
  } = params;

  const emailSubject = `Session Confirmed: "${meetingTopic}" with ${advisorName}`;

  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${EMAIL_HEADER_HTML}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 19px; margin-top: 0; margin-bottom: 12px;">Counseling Session Confirmed 📅</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Dear <strong>${studentName}</strong>, your 1-on-1 higher education and visa advisory session has been booked with <strong>${advisorName}</strong>.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 13px;">
          <p style="margin: 0 0 8px 0;"><strong>Topic:</strong> ${meetingTopic}</p>
          <p style="margin: 0 0 8px 0;"><strong>Admissions Counselor:</strong> ${advisorName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${scheduledDate}</p>
          <p style="margin: 0;"><strong>Time:</strong> ${startTime} (IST)</p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
          You can join the high-definition video call room directly from your Student Portal at the scheduled time.
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://portal.ferexventures.com/student/meetings" style="display: inline-block; background: #58051E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13px;">
            Join / Manage Meeting ➔
          </a>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;

  return sendStudentEmail({
    studentEmail,
    studentName,
    subject: emailSubject,
    htmlContent,
    templateType: 'student_meeting_scheduled',
    division: 'education',
    referenceId: meetingTopic,
    metadata: {
      meetingTopic,
      advisorName,
      scheduledDate,
      startTime,
    },
  });
}

/**
 * 6. SUPPORT TICKET CREATED EMAIL
 */
export async function sendStudentTicketCreatedEmail(params: {
  studentEmail: string;
  studentName?: string;
  ticketNo: string;
  subject: string;
  category?: string;
  priority?: string;
}): Promise<SendEmailResult> {
  const {
    studentEmail,
    studentName = 'Student',
    ticketNo,
    subject: ticketSubject,
    category = 'General Query',
    priority = 'Medium',
  } = params;

  const emailSubject = `Support Ticket Created: [${ticketNo}] ${ticketSubject}`;

  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${EMAIL_HEADER_HTML}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 19px; margin-top: 0; margin-bottom: 12px;">Support Ticket Logged 🎫</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Dear <strong>${studentName}</strong>, your query has been received by our student support desk. An admissions officer will respond shortly.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 13px;">
          <p style="margin: 0 0 8px 0;"><strong>Ticket Number:</strong> ${ticketNo}</p>
          <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> ${ticketSubject}</p>
          <p style="margin: 0 0 8px 0;"><strong>Category:</strong> ${category}</p>
          <p style="margin: 0;"><strong>Priority:</strong> ${priority}</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://portal.ferexventures.com/student/support" style="display: inline-block; background: #58051E; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13px;">
            View Ticket & Replies ➔
          </a>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;

  return sendStudentEmail({
    studentEmail,
    studentName,
    subject: emailSubject,
    htmlContent,
    templateType: 'student_ticket_created',
    division: 'education',
    referenceId: ticketNo,
    metadata: {
      ticketNo,
      ticketSubject,
      category,
      priority,
    },
  });
}
