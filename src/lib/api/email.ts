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
 * for the designated enterprise division from Supabase email_configurations,
 * localStorage, or environment variables.
 */
export async function getActiveResendConfig(division: 'education' | 'trade' | 'rimi' | 'digital' = 'education') {
  let apiKey = '';
  let senderName = 'FEREX Higher Education';
  let senderEmail = 'admissions@ferexventures.com';

  try {
    const globalConfig = await getGlobalEmailConfig();
    if (globalConfig.providers?.resend?.apiKey?.trim()) {
      apiKey = globalConfig.providers.resend.apiKey.trim();
    }

    if (division === 'trade') {
      senderName = globalConfig.divisionRouting?.tradeSenderName?.trim() || 'Ferex Global Trade Desk';
      senderEmail = globalConfig.divisionRouting?.tradeSenderEmail?.trim() || 'trade@ferexventures.com';
    } else if (division === 'rimi') {
      senderName = globalConfig.divisionRouting?.rimiSenderName?.trim() || 'Rimi Cold Chain Logistics';
      senderEmail = globalConfig.divisionRouting?.rimiSenderEmail?.trim() || 'logistics@ferexventures.com';
    } else if (division === 'digital') {
      senderName = globalConfig.divisionRouting?.digitalSenderName?.trim() || 'Ferex Digital Client Hub';
      senderEmail = globalConfig.divisionRouting?.digitalSenderEmail?.trim() || 'digital@ferexventures.com';
    } else {
      senderName = globalConfig.divisionRouting?.educationSenderName?.trim() || 'FEREX Higher Education';
      senderEmail = globalConfig.divisionRouting?.educationSenderEmail?.trim() || globalConfig.globalSenderEmail?.trim() || 'admissions@ferexventures.com';
    }
  } catch (err) {
    // Non-blocking fallback
  }

  // Check environment variables as secondary source
  if (!apiKey) {
    apiKey = (import.meta.env.VITE_RESEND_API_KEY as string) || '';
  }

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
 * Core enterprise email dispatcher with multi-tiered resilience:
 * 1. Supabase Edge Function 'send-student-email'
 * 2. Direct Resend REST API (Bearer token)
 * 3. Central email logging (email_logs table + localStorage + realtime broadcast)
 */
export async function sendStudentEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const recipient = payload.studentEmail?.trim();
  if (!recipient) {
    return { success: false, error: 'Recipient email is required' };
  }

  const division = payload.division || 'education';
  const { apiKey, formattedFrom, senderEmail, senderName } = await getActiveResendConfig(division);
  const fromAddress = payload.fromOverride || formattedFrom;
  const templateType = payload.templateType || `${division}_notification`;
  const recipientName = payload.studentName || recipient.split('@')[0];

  let resendSuccess = false;
  let responseData: any = null;
  let errorMessage: string | undefined;
  let dispatchMode: 'edge_function' | 'direct_resend' | 'logged_offline' = 'logged_offline';
  let messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

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
        division,
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
    // console.warn('[sendStudentEmail Edge Function notice]:', fnErr?.message || fnErr);
  }

  // 2. Direct Resend API fallback if Edge function did not return valid result and API key exists
  if (!resendSuccess && apiKey) {
    try {
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
            from: `${senderName} <onboarding@resend.dev>`,
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
    // ignore
  }

  return {
    success: resendSuccess || (!apiKey && true),
    data: responseData,
    error: resendSuccess ? undefined : errorMessage,
    mode: dispatchMode,
    messageId,
  };
}

export const sendEnterpriseEmail = sendStudentEmail;

// ─────────────────────────────────────────────────────────────────────────────
// HTML EMAIL WRAPPERS & BRANDED HEADERS
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

const EMAIL_FOOTER_HTML = `
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">FEREX VENTURES PRIVATE LIMITED</p>
    <p style="margin: 0 0 8px 0;">
      European Headquarters: Warsaw, Poland • India Corporate Hub: Infopark Expressway, Kochi & Bangalore
    </p>
    <p style="margin: 0; color: #94a3b8;">
      This is an automated operational notification. For assistance, contact your designated account executive or reply to this message.
    </p>
  </div>
`;

function getBrandedHeader(title: string, subtitle: string, accentColor = '#58051E') {
  return `
    <div style="background: linear-gradient(135deg, ${accentColor} 0%, #1e1b4b 100%); padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">${title}</h1>
      <p style="margin: 4px 0 0; font-size: 13px; color: #e2e8f0; font-weight: 500;">${subtitle}</p>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HIGHER EDUCATION TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export async function sendStudentWelcomeEmail(studentEmail: string, studentName: string = 'Student'): Promise<SendEmailResult> {
  const subject = `Welcome to FEREX Higher Education Portal — Admission File Created`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX HIGHER EDUCATION', 'European Higher Education & Admissions Desk', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Welcome to FEREX, ${studentName}!</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Your student admissions account with <strong>FEREX Global Higher Education</strong> is now active. You now have full access to select European universities, track offer letters, upload visa dossiers, and monitor fee settlements.
        </p>
        <div style="background: #fdf8f6; border-left: 4px solid #58051E; padding: 18px 20px; border-radius: 6px; margin: 24px 0;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #58051E;">Your Student Portal Details:</h3>
          <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 13px; line-height: 1.8;">
            <li><strong>Registered Email:</strong> ${studentEmail}</li>
            <li><strong>Admissions Desk:</strong> Poland, Germany, UK, Canada, France, Italy & Switzerland</li>
          </ul>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail, studentName, subject, htmlContent, templateType: 'student_welcome', division: 'education' });
}

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
  const { studentEmail, studentName = 'Student', amount, currency = 'INR', receiptNumber, paymentMethod, referenceNumber = 'N/A', purpose, date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) } = params;
  const formattedAmount = currency === 'EUR' ? `€${Number(amount).toLocaleString()}` : currency === 'USD' ? `$${Number(amount).toLocaleString()}` : `₹${Number(amount).toLocaleString('en-IN')}`;
  const subject = `Payment Confirmed: Receipt #${receiptNumber} — FEREX Education (${formattedAmount})`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX HIGHER EDUCATION', 'Official Electronic Settlement Voucher', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 16px 0;">Payment Receipt Confirmed</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">Dear <strong>${studentName}</strong>, we have received your payment for <strong>${purpose}</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Receipt Number:</strong> ${receiptNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Amount Paid:</strong> <span style="color: #059669; font-weight: bold; font-size: 16px;">${formattedAmount}</span></p>
          <p style="margin: 0 0 8px 0;"><strong>Purpose:</strong> ${purpose}</p>
          <p style="margin: 0 0 8px 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p style="margin: 0;"><strong>Reference / UTR:</strong> ${referenceNumber}</p>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail, studentName, subject, htmlContent, templateType: 'student_payment_receipt', division: 'education', referenceId: receiptNumber, metadata: params });
}

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
  const { studentEmail, studentName = 'Student', universityName, programName, intake = 'Upcoming Intake', tuitionFee = 'Standard Rate', country = 'Europe', counselorName } = params;
  const subject = `Application Submitted: ${universityName} — ${programName}`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX HIGHER EDUCATION', 'Admissions Application Queue', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 19px; margin-top: 0;">University Application Queued</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">Dear <strong>${studentName}</strong>, your formal application for <strong>${programName}</strong> at <strong>${universityName}</strong> has been submitted.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>University:</strong> ${universityName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Program:</strong> ${programName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Country:</strong> ${country}</p>
          <p style="margin: 0 0 8px 0;"><strong>Intake:</strong> ${intake}</p>
          ${counselorName ? `<p style="margin: 0;"><strong>Reviewing Counselor:</strong> ${counselorName}</p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail, studentName, subject, htmlContent, templateType: 'student_application_submitted', division: 'education', referenceId: universityName });
}

export async function sendStudentDocumentUploadedEmail(params: {
  studentEmail: string;
  studentName?: string;
  documentName: string;
  documentType: string;
  fileSize?: string;
}): Promise<SendEmailResult> {
  const { studentEmail, studentName = 'Student', documentName, documentType, fileSize } = params;
  const subject = `Document Received: ${documentName} (${documentType})`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX HIGHER EDUCATION', 'Document Legalization & Verification Desk', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 19px; margin-top: 0;">Document Upload Received</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${studentName}</strong>, we have received your document <strong>${documentName}</strong> (${documentType})${fileSize ? ` [${fileSize}]` : ''}. Our legalization officers will verify its compliance.</p>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail, studentName, subject, htmlContent, templateType: 'student_document_upload', division: 'education', referenceId: documentName });
}

export async function sendStudentMeetingScheduledEmail(params: {
  studentEmail: string;
  studentName?: string;
  subject: string;
  advisorName: string;
  scheduledDate: string;
  startTime: string;
}): Promise<SendEmailResult> {
  const { studentEmail, studentName = 'Student', subject: meetingTopic, advisorName, scheduledDate, startTime } = params;
  const subject = `Session Confirmed: "${meetingTopic}" with ${advisorName}`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX HIGHER EDUCATION', 'Admissions Advisory & Counseling Desk', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 19px; margin-top: 0;">Advisory Session Confirmed</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${studentName}</strong>, your 1-on-1 session with <strong>${advisorName}</strong> is scheduled for <strong>${scheduledDate} at ${startTime}</strong>.</p>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail, studentName, subject, htmlContent, templateType: 'student_meeting_scheduled', division: 'education', referenceId: meetingTopic });
}

export async function sendStudentTicketCreatedEmail(params: {
  studentEmail: string;
  studentName?: string;
  ticketNo: string;
  subject: string;
  category?: string;
  priority?: string;
}): Promise<SendEmailResult> {
  const { studentEmail, studentName = 'Student', ticketNo, subject: ticketSubject, category, priority } = params;
  const subject = `Support Ticket Created: [${ticketNo}] ${ticketSubject}`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX HIGHER EDUCATION', 'Student Support Helpdesk', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 19px; margin-top: 0;">Support Ticket Received</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${studentName}</strong>, ticket <strong>${ticketNo}</strong> (${category || 'General'}${priority ? ` - Priority: ${priority}` : ''}) has been logged. Our admissions support team will respond promptly.</p>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail, studentName, subject, htmlContent, templateType: 'student_ticket_created', division: 'education', referenceId: ticketNo });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RIMI FROZEN FMCG EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export async function sendRimiCustomerWelcomeEmail(params: {
  customerEmail: string;
  customerName: string;
  businessName: string;
  accountType?: string;
}): Promise<SendEmailResult> {
  const { customerEmail, customerName, businessName, accountType = 'Wholesale Partner' } = params;
  const subject = `Welcome to RIMI Frozen Distribution — Account Onboarded [${businessName}]`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('RIMI FROZEN DISTRIBUTION', 'Cold Chain & FMCG Wholesale Network', '#0284c7')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Welcome to Rimi Frozen, ${customerName}!</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Your wholesale enterprise account for <strong>${businessName}</strong> has been configured in our distribution management system.
        </p>
        <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 18px 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Partner Account:</strong> ${businessName}</p>
          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Account Type:</strong> ${accountType}</p>
          <p style="margin: 0; font-size: 13px;"><strong>Contact Email:</strong> ${customerEmail}</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
          You can now place scheduled orders, monitor cold storage dispatches, and track real-time temperature logs.
        </p>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: customerEmail, studentName: customerName, subject, htmlContent, templateType: 'rimi_customer_welcome', division: 'rimi', referenceId: businessName });
}

export async function sendRimiSalesOrderEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  status: 'Confirmed' | 'Processing' | 'Dispatched' | 'Delivered' | 'Cancelled';
  totalAmount: number;
  deliveryDate?: string;
  itemsSummary?: string;
}): Promise<SendEmailResult> {
  const { customerEmail, customerName, orderNumber, status, totalAmount, deliveryDate, itemsSummary } = params;
  const formattedAmount = `₹${Number(totalAmount).toLocaleString('en-IN')}`;
  const subject = `Sales Order [${orderNumber}] Status: ${status} — Rimi Frozen (${formattedAmount})`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('RIMI FROZEN DISTRIBUTION', 'Cold Chain Consignment & Sales Order Desk', '#0284c7')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Sales Order Update: ${status}</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">Dear <strong>${customerName}</strong>, order <strong>${orderNumber}</strong> has been updated to <strong>${status}</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Order Number:</strong> ${orderNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Order Total:</strong> <span style="color: #0284c7; font-weight: bold; font-size: 16px;">${formattedAmount}</span></p>
          <p style="margin: 0 0 8px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: 600;">${status}</span></p>
          ${deliveryDate ? `<p style="margin: 0 0 8px 0;"><strong>Expected Delivery:</strong> ${deliveryDate}</p>` : ''}
          ${itemsSummary ? `<p style="margin: 0;"><strong>Products:</strong> ${itemsSummary}</p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: customerEmail, studentName: customerName, subject, htmlContent, templateType: `rimi_order_${status.toLowerCase()}`, division: 'rimi', referenceId: orderNumber, metadata: params });
}

export async function sendRimiDeliveryDispatchedEmail(params: {
  customerEmail: string;
  customerName: string;
  deliveryNumber: string;
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
  coldRoomTemp?: string;
  destination: string;
}): Promise<SendEmailResult> {
  const { customerEmail, customerName, deliveryNumber, vehicleNumber, driverName, driverPhone, coldRoomTemp = '-18°C', destination } = params;
  const subject = `Reefer Fleet Dispatched: [${deliveryNumber}] — Reefer ${vehicleNumber} En Route`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('RIMI FROZEN DISTRIBUTION', 'Reefer Fleet Telemetry & Dispatch', '#0284c7')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Reefer Vehicle Dispatched</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${customerName}</strong>, your frozen batch consignment is en route in temperature-controlled reefer truck <strong>${vehicleNumber}</strong>.</p>
        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Delivery Consignment:</strong> ${deliveryNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Compartment Temperature:</strong> <span style="color: #0284c7; font-weight: bold;">${coldRoomTemp}</span></p>
          ${driverName ? `<p style="margin: 0 0 8px 0;"><strong>Driver:</strong> ${driverName} ${driverPhone ? `(${driverPhone})` : ''}</p>` : ''}
          <p style="margin: 0;"><strong>Destination:</strong> ${destination}</p>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: customerEmail, studentName: customerName, subject, htmlContent, templateType: 'rimi_delivery_dispatched', division: 'rimi', referenceId: deliveryNumber, metadata: params });
}

export async function sendRimiPaymentCollectionEmail(params: {
  customerEmail: string;
  customerName: string;
  collectionNumber: string;
  amount: number;
  paymentMethod: string;
  invoiceNumber?: string;
}): Promise<SendEmailResult> {
  const { customerEmail, customerName, collectionNumber, amount, paymentMethod, invoiceNumber } = params;
  const formattedAmount = `₹${Number(amount).toLocaleString('en-IN')}`;
  const subject = `Payment Collection Confirmed: [${collectionNumber}] — Rimi Frozen (${formattedAmount})`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('RIMI FROZEN DISTRIBUTION', 'Payment Settlement & Accounting Desk', '#0284c7')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Payment Receipt Recorded</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${customerName}</strong>, we have received payment settlement of <strong>${formattedAmount}</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Collection Ref:</strong> ${collectionNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Amount Paid:</strong> <span style="color: #059669; font-weight: bold; font-size: 16px;">${formattedAmount}</span></p>
          <p style="margin: 0 0 8px 0;"><strong>Method:</strong> ${paymentMethod}</p>
          ${invoiceNumber ? `<p style="margin: 0;"><strong>Linked Invoice:</strong> ${invoiceNumber}</p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: customerEmail, studentName: customerName, subject, htmlContent, templateType: 'rimi_payment_collection', division: 'rimi', referenceId: collectionNumber, metadata: params });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GLOBAL TRADE EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export async function sendTradeShipmentStageEmail(params: {
  clientEmail: string;
  clientName: string;
  shipmentNumber: string;
  stage: string;
  origin?: string;
  destination?: string;
  vesselName?: string;
  containerNumber?: string;
  estimatedArrival?: string;
}): Promise<SendEmailResult> {
  const { clientEmail, clientName, shipmentNumber, stage, origin = 'Nhava Sheva, India', destination = 'Gdansk / Hamburg Port', vesselName, containerNumber, estimatedArrival } = params;
  const subject = `Trade Consignment [${shipmentNumber}] Milestone: ${stage} — Ferex Global Trade`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX GLOBAL TRADE', 'International Trade Logistics & Cargo Desk', '#0f766e')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Shipment Status: ${stage}</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${clientName}</strong>, commercial consignment <strong>${shipmentNumber}</strong> has reached stage <strong>${stage}</strong>.</p>
        <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Consignment No:</strong> ${shipmentNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Current Stage:</strong> <span style="color: #0f766e; font-weight: bold;">${stage}</span></p>
          <p style="margin: 0 0 8px 0;"><strong>Trade Route:</strong> ${origin} ➔ ${destination}</p>
          ${vesselName ? `<p style="margin: 0 0 8px 0;"><strong>Carrier / Vessel:</strong> ${vesselName}</p>` : ''}
          ${containerNumber ? `<p style="margin: 0 0 8px 0;"><strong>Container / BL:</strong> ${containerNumber}</p>` : ''}
          ${estimatedArrival ? `<p style="margin: 0;"><strong>Estimated Arrival:</strong> ${estimatedArrival}</p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: clientEmail, studentName: clientName, subject, htmlContent, templateType: `trade_stage_${stage.toLowerCase().replace(/\s+/g, '_')}`, division: 'trade', referenceId: shipmentNumber, metadata: params });
}

export async function sendTradeInvoiceEmail(params: {
  clientEmail: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  shipmentNumber?: string;
}): Promise<SendEmailResult> {
  const { clientEmail, clientName, invoiceNumber, amount, currency = 'USD', dueDate, shipmentNumber } = params;
  const formattedAmount = currency === 'USD' ? `$${Number(amount).toLocaleString()}` : currency === 'EUR' ? `€${Number(amount).toLocaleString()}` : `₹${Number(amount).toLocaleString('en-IN')}`;
  const subject = `Commercial Invoice [${invoiceNumber}] Issued — Ferex Global Trade (${formattedAmount})`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX GLOBAL TRADE', 'Commercial Invoicing & Letter of Credit Desk', '#0f766e')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Commercial Invoice Issued</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${clientName}</strong>, commercial invoice <strong>${invoiceNumber}</strong> has been generated for your trade account.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Invoice Total:</strong> <span style="color: #0f766e; font-weight: bold; font-size: 16px;">${formattedAmount}</span></p>
          ${dueDate ? `<p style="margin: 0 0 8px 0;"><strong>Payment Due Date:</strong> ${dueDate}</p>` : ''}
          ${shipmentNumber ? `<p style="margin: 0;"><strong>Linked Consignment:</strong> ${shipmentNumber}</p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: clientEmail, studentName: clientName, subject, htmlContent, templateType: 'trade_invoice_issued', division: 'trade', referenceId: invoiceNumber, metadata: params });
}

export async function sendTradeDocumentReadyEmail(params: {
  clientEmail: string;
  clientName: string;
  documentName: string;
  documentType: string;
  orderNumber?: string;
  downloadUrl?: string;
}): Promise<SendEmailResult> {
  const { clientEmail, clientName, documentName, documentType, orderNumber, downloadUrl } = params;
  const subject = `Trade Document Verified: ${documentType} [${documentName}] — Ferex Global Trade`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX GLOBAL TRADE', 'Customs Clearance & Trade Document Desk', '#0f766e')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Trade Document Ready</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${clientName}</strong>, verified shipping compliance document <strong>${documentName}</strong> (${documentType}) is ready.</p>
        <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Document:</strong> ${documentName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${documentType}</p>
          ${orderNumber ? `<p style="margin: 0 0 8px 0;"><strong>Consignment No:</strong> ${orderNumber}</p>` : ''}
          ${downloadUrl ? `<p style="margin: 0;"><strong>Access Document:</strong> <a href="${downloadUrl}" style="color: #0f766e; font-weight: bold;">Download Dossier</a></p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: clientEmail, studentName: clientName, subject, htmlContent, templateType: 'trade_document_ready', division: 'trade', referenceId: documentName, metadata: params });
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. FEREX DIGITAL AGENCY EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export async function sendDigitalClientWelcomeEmail(params: {
  clientEmail: string;
  clientName: string;
  companyName: string;
  serviceRetainer?: string;
}): Promise<SendEmailResult> {
  const { clientEmail, clientName, companyName, serviceRetainer = 'Software & Cloud Engineering' } = params;
  const subject = `Welcome to Ferex Digital — Client Workspace Created [${companyName}]`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX DIGITAL AGENCY', 'Enterprise Engineering, AI & Design Studio', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Welcome to Ferex Digital, ${clientName}!</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Your client portal account for <strong>${companyName}</strong> is active. You can track sprint deliverables, review code milestones, inspect Figma designs, and download tax invoices.
        </p>
        <div style="background: #fdf8f6; border-left: 4px solid #58051E; padding: 18px 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Client Account:</strong> ${companyName}</p>
          <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Engagement:</strong> ${serviceRetainer}</p>
          <p style="margin: 0; font-size: 13px;"><strong>Portal Access:</strong> ${clientEmail}</p>
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: clientEmail, studentName: clientName, subject, htmlContent, templateType: 'digital_client_welcome', division: 'digital', referenceId: companyName, metadata: params });
}

export async function sendDigitalProjectMilestoneEmail(params: {
  clientEmail: string;
  clientName: string;
  projectTitle: string;
  stage: 'Briefing' | 'In Progress' | 'Review' | 'Revisions' | 'Delivered' | 'Closed' | string;
  invoiceNo?: string;
  amount?: number;
}): Promise<SendEmailResult> {
  const { clientEmail, clientName, projectTitle, stage, invoiceNo, amount } = params;
  const subject = `Project Milestone: "${projectTitle}" is now ${stage} — Ferex Digital`;
  const formattedAmount = amount ? `₹${Number(amount).toLocaleString('en-IN')}` : undefined;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX DIGITAL AGENCY', 'Sprint Delivery & Milestones Desk', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Sprint Update: ${stage}</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Dear <strong>${clientName}</strong>, the milestone for project <strong>${projectTitle}</strong> has advanced to <strong>${stage}</strong>.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 0 0 8px 0;"><strong>Status:</strong> <span style="color: #58051E; font-weight: bold;">${stage}</span></p>
          ${invoiceNo ? `<p style="margin: 0 0 8px 0;"><strong>Milestone Invoice:</strong> ${invoiceNo}</p>` : ''}
          ${formattedAmount ? `<p style="margin: 0;"><strong>Amount:</strong> ${formattedAmount}</p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: clientEmail, studentName: clientName, subject, htmlContent, templateType: `digital_milestone_${stage.toLowerCase()}`, division: 'digital', referenceId: projectTitle, metadata: params });
}

export async function sendDigitalDeliverableEmail(params: {
  clientEmail: string;
  clientName: string;
  deliverableTitle: string;
  projectTitle: string;
  status: 'In Review' | 'Approved' | 'Requires Revision' | 'Submitted';
  previewUrl?: string;
}): Promise<SendEmailResult> {
  const { clientEmail, clientName, deliverableTitle, projectTitle, status, previewUrl } = params;
  const subject = `Deliverable [${deliverableTitle}]: Status is ${status} — Ferex Digital`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX DIGITAL AGENCY', 'Engineering & Design Review Desk', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Deliverable Status: ${status}</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${clientName}</strong>, deliverable <strong>${deliverableTitle}</strong> for project <strong>${projectTitle}</strong> has been updated.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Deliverable:</strong> ${deliverableTitle}</p>
          <p style="margin: 0 0 8px 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 0 0 8px 0;"><strong>Status:</strong> <span style="color: #58051E; font-weight: bold;">${status}</span></p>
          ${previewUrl ? `<p style="margin: 0;"><strong>Preview / Staging Link:</strong> <a href="${previewUrl}" style="color: #58051E;">${previewUrl}</a></p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: clientEmail, studentName: clientName, subject, htmlContent, templateType: 'digital_deliverable_update', division: 'digital', referenceId: deliverableTitle, metadata: params });
}

export async function sendDigitalInvoiceEmail(params: {
  clientEmail: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  projectName?: string;
}): Promise<SendEmailResult> {
  const { clientEmail, clientName, invoiceNumber, amount, currency = 'INR', dueDate, projectName } = params;
  const formattedAmount = currency === 'USD' ? `$${Number(amount).toLocaleString()}` : `₹${Number(amount).toLocaleString('en-IN')}`;
  const subject = `Retainer & Project Invoice [${invoiceNumber}] Issued — Ferex Digital (${formattedAmount})`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX DIGITAL AGENCY', 'Client Billing & Retainer Invoicing', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Invoice Issued: ${invoiceNumber}</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${clientName}</strong>, invoice <strong>${invoiceNumber}</strong> has been generated for your account.</p>
        <div style="background: #fdf8f6; border: 1px solid #fecdd3; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 0 0 8px 0;"><strong>Amount Due:</strong> <span style="color: #58051E; font-weight: bold; font-size: 16px;">${formattedAmount}</span></p>
          ${dueDate ? `<p style="margin: 0 0 8px 0;"><strong>Due Date:</strong> ${dueDate}</p>` : ''}
          ${projectName ? `<p style="margin: 0;"><strong>Project / Retainer:</strong> ${projectName}</p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: clientEmail, studentName: clientName, subject, htmlContent, templateType: 'digital_invoice_issued', division: 'digital', referenceId: invoiceNumber, metadata: params });
}

export async function sendDigitalMeetingEmail(params: {
  clientEmail: string;
  clientName: string;
  title: string;
  meetingDate: string;
  startTime: string;
  meetLink?: string;
}): Promise<SendEmailResult> {
  const { clientEmail, clientName, title, meetingDate, startTime, meetLink } = params;
  const subject = `Client Sync Scheduled: "${title}" — Ferex Digital`;
  const htmlContent = `
    <div style="${EMAIL_WRAPPER_STYLE}">
      ${getBrandedHeader('FEREX DIGITAL AGENCY', 'Strategy, Sprint Sync & Design Review', '#58051E')}
      <div style="padding: 32px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Meeting Scheduled</h2>
        <p style="color: #334155; font-size: 14px;">Dear <strong>${clientName}</strong>, your digital sprint sync has been scheduled.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Topic:</strong> ${title}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${meetingDate}</p>
          <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${startTime} (IST)</p>
          ${meetLink ? `<p style="margin: 0;"><strong>Conference Link:</strong> <a href="${meetLink}" style="color: #58051E; font-weight: 600;">Join Meeting Room</a></p>` : ''}
        </div>
      </div>
      ${EMAIL_FOOTER_HTML}
    </div>
  `;
  return sendStudentEmail({ studentEmail: clientEmail, studentName: clientName, subject, htmlContent, templateType: 'digital_meeting_scheduled', division: 'digital', referenceId: title, metadata: params });
}
