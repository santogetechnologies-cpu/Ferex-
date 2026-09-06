import { supabase } from '../supabase';
import { getGlobalEmailConfig } from './emailSettings';

export interface EmailLogEntry {
  id: string;
  division: 'education' | 'trade' | 'rimi' | 'digital';
  provider?: string;
  sender_email?: string;
  sender_name?: string;
  recipient_email: string;
  recipient_name: string;
  template_type: string;
  subject: string;
  body_html: string;
  status: 'Delivered' | 'Sent' | 'Failed';
  reference_id?: string;
  metadata?: Record<string, any>;
  sent_at: string;
}

const LOCAL_STORAGE_EMAIL_LOGS = 'ferex_automated_email_logs';

export function getLocalEmailLogs(): EmailLogEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EMAIL_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function logAutomatedEmail(entry: Omit<EmailLogEntry, 'id' | 'sent_at' | 'status'> & { status?: 'Delivered' | 'Sent' | 'Failed' }): Promise<EmailLogEntry> {
  let activeProvider = 'resend';
  let senderEmail = 'notifications@ferexventures.com';
  let senderName = 'Ferex Ventures Enterprise HQ';

  try {
    const config = await getGlobalEmailConfig();
    activeProvider = config.activeProvider;
    if (entry.division === 'education') {
      senderEmail = config.divisionRouting.educationSenderEmail;
      senderName = config.divisionRouting.educationSenderName;
    } else if (entry.division === 'trade') {
      senderEmail = config.divisionRouting.tradeSenderEmail;
      senderName = config.divisionRouting.tradeSenderName;
    } else if (entry.division === 'rimi') {
      senderEmail = config.divisionRouting.rimiSenderEmail;
      senderName = config.divisionRouting.rimiSenderName;
    } else if (entry.division === 'digital') {
      senderEmail = config.divisionRouting.digitalSenderEmail;
      senderName = config.divisionRouting.digitalSenderName;
    }
  } catch {
    // fallback defaults
  }

  const newLog: EmailLogEntry = {
    id: `EML-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    division: entry.division,
    provider: activeProvider,
    sender_email: senderEmail,
    sender_name: senderName,
    recipient_email: entry.recipient_email,
    recipient_name: entry.recipient_name,
    template_type: entry.template_type,
    subject: entry.subject,
    body_html: entry.body_html,
    status: entry.status || 'Delivered',
    reference_id: entry.reference_id,
    metadata: {
      ...entry.metadata,
      activeProvider,
      senderEmail,
      senderName,
    },
    sent_at: new Date().toISOString(),
  };

  // 1. Save to local storage
  const existing = getLocalEmailLogs();
  existing.unshift(newLog);
  localStorage.setItem(LOCAL_STORAGE_EMAIL_LOGS, JSON.stringify(existing.slice(0, 200)));

  // 2. Save to Supabase notifications / email_logs table if available
  try {
    await supabase.from('notifications').insert({
      user_id: null,
      title: `📧 Automated Email: ${newLog.subject}`,
      message: `Sent to ${newLog.recipient_email} (${newLog.template_type})`,
      type: 'email_dispatch',
      is_read: true,
      created_at: newLog.sent_at,
    });
  } catch {
    // Non-blocking
  }

  // 3. Dispatch system event
  window.dispatchEvent(new CustomEvent('ferex_automated_email_sent', { detail: newLog }));

  return newLog;
}

// ─── Automated Dispatchers by Division ───────────────────────────────────────

export async function sendEducationProcessEmail(params: {
  studentEmail: string;
  studentName: string;
  stepName: string;
  stepStatus: 'Completed' | 'In Progress' | 'Approved';
  notes?: string;
}) {
  return logAutomatedEmail({
    division: 'education',
    recipient_email: params.studentEmail,
    recipient_name: params.studentName,
    template_type: 'education_process_step',
    subject: `🎓 Journey Update: Step "${params.stepName}" ${params.stepStatus} — Ferex Education`,
    body_html: `
      <h2>Dear ${params.studentName},</h2>
      <p>Your university & visa journey milestone has advanced:</p>
      <div style="background:#f8fafc;padding:16px;border-left:4px solid #6A1B2E;margin:16px 0;">
        <strong>Milestone:</strong> ${params.stepName}<br/>
        <strong>Status:</strong> ${params.stepStatus}<br/>
        ${params.notes ? `<strong>Notes:</strong> ${params.notes}<br/>` : ''}
      </div>
      <p>Log in to your Student Portal anytime to view real-time updates and download invoices.</p>
    `,
  });
}

export async function sendTradeStageEmail(params: {
  clientEmail: string;
  clientName: string;
  shipmentNo: string;
  stage: 'Order Confirmed' | 'Document Ready' | 'Invoice Generated' | 'Payment Received' | 'Payment Reminder' | 'Shipped' | 'Customs Cleared' | 'Delivered';
  trackingNo?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  amount?: number;
  documentTitle?: string;
}) {
  return logAutomatedEmail({
    division: 'trade',
    recipient_email: params.clientEmail,
    recipient_name: params.clientName,
    template_type: `trade_${params.stage.toLowerCase().replace(/\s+/g, '_')}`,
    subject: `🚢 Trade Shipment Update [${params.shipmentNo}]: ${params.stage} — Ferex Global Trade`,
    body_html: `
      <h2>Dear ${params.clientName},</h2>
      <p>This is an automated dispatch notice for commercial consignment <strong>${params.shipmentNo}</strong>.</p>
      <div style="background:#0f172a;color:#f8fafc;padding:18px;border-radius:8px;margin:16px 0;font-family:sans-serif;">
        <p><strong>Stage Status:</strong> <span style="color:#38bdf8;">${params.stage}</span></p>
        ${params.trackingNo ? `<p><strong>Container / BL Tracking:</strong> ${params.trackingNo}</p>` : ''}
        ${params.carrier ? `<p><strong>Vessel / Carrier:</strong> ${params.carrier}</p>` : ''}
        ${params.origin && params.destination ? `<p><strong>Route:</strong> ${params.origin} ➔ ${params.destination}</p>` : ''}
        ${params.amount ? `<p><strong>Amount:</strong> ₹${Number(params.amount).toLocaleString('en-IN')}</p>` : ''}
        ${params.documentTitle ? `<p><strong>Document Attached:</strong> ${params.documentTitle}</p>` : ''}
      </div>
      <p>All shipping documents, commercial invoices, and inspection certificates are SWIFT-compliant.</p>
    `,
    reference_id: params.shipmentNo,
  });
}

export async function sendRimiColdChainEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNo: string;
  event: 'Order Confirmed' | 'Dispatched' | 'Delivered' | 'Invoice Ready';
  reeferTemp?: string;
  vehicleNo?: string;
  amount?: number;
}) {
  return logAutomatedEmail({
    division: 'rimi',
    recipient_email: params.customerEmail,
    recipient_name: params.customerName,
    template_type: `rimi_${params.event.toLowerCase().replace(/\s+/g, '_')}`,
    subject: `❄️ Rimi Cold Chain Notice [${params.orderNo}]: ${params.event}`,
    body_html: `
      <h2>Dear ${params.customerName},</h2>
      <p>Consignment notification for frozen foods batch <strong>${params.orderNo}</strong>.</p>
      <div style="background:#0f172a;color:#fff;padding:16px;border-radius:8px;">
        <p><strong>Event:</strong> ${params.event}</p>
        ${params.reeferTemp ? `<p><strong>Reefer Compartment Telemetry:</strong> ${params.reeferTemp}</p>` : ''}
        ${params.vehicleNo ? `<p><strong>Dispatched Vehicle:</strong> ${params.vehicleNo}</p>` : ''}
        ${params.amount ? `<p><strong>Invoice Total:</strong> ₹${Number(params.amount).toLocaleString('en-IN')}</p>` : ''}
      </div>
    `,
    reference_id: params.orderNo,
  });
}

export async function sendDigitalProjectMilestoneEmail(params: {
  clientEmail: string;
  clientName: string;
  projectTitle: string;
  stage: 'Briefing' | 'In Progress' | 'Review' | 'Revisions' | 'Delivered' | 'Closed';
  invoiceNo?: string;
  amount?: number;
}) {
  return logAutomatedEmail({
    division: 'digital',
    recipient_email: params.clientEmail,
    recipient_name: params.clientName,
    template_type: `digital_milestone_${params.stage.toLowerCase()}`,
    subject: `💻 Project Deliverable Update: "${params.projectTitle}" is ${params.stage} — Ferex Digital`,
    body_html: `
      <h2>Dear ${params.clientName},</h2>
      <p>Deliverable update for your active engineering & design project <strong>${params.projectTitle}</strong>.</p>
      <div style="background:#f1f5f9;padding:16px;border-left:4px solid #6A1B2E;margin:16px 0;">
        <p><strong>Current Lifecycle Stage:</strong> ${params.stage}</p>
        ${params.invoiceNo ? `<p><strong>Linked Tax Invoice:</strong> ${params.invoiceNo}</p>` : ''}
        ${params.amount ? `<p><strong>Milestone Fee:</strong> ₹${Number(params.amount).toLocaleString('en-IN')}</p>` : ''}
      </div>
    `,
  });
}
