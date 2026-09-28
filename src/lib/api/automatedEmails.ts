import { supabase } from '../supabase';
import { getGlobalEmailConfig } from './emailSettings';
import {
  sendStudentEmail,
  sendStudentWelcomeEmail,
  sendStudentPaymentEmail,
  sendStudentApplicationEmail,
  sendStudentDocumentUploadedEmail,
  sendStudentMeetingScheduledEmail,
  sendStudentTicketCreatedEmail,
  sendRimiCustomerWelcomeEmail,
  sendRimiSalesOrderEmail,
  sendRimiDeliveryDispatchedEmail,
  sendRimiPaymentCollectionEmail,
  sendTradeShipmentStageEmail,
  sendTradeInvoiceEmail,
  sendDigitalClientWelcomeEmail,
  sendDigitalProjectMilestoneEmail,
  sendDigitalDeliverableEmail,
  sendDigitalInvoiceEmail,
  sendDigitalMeetingEmail,
} from './email';

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
      senderEmail = config.divisionRouting.educationSenderEmail || senderEmail;
      senderName = config.divisionRouting.educationSenderName || senderName;
    } else if (entry.division === 'trade') {
      senderEmail = config.divisionRouting.tradeSenderEmail || 'trade@ferexventures.com';
      senderName = config.divisionRouting.tradeSenderName || 'Ferex Global Trade Desk';
    } else if (entry.division === 'rimi') {
      senderEmail = config.divisionRouting.rimiSenderEmail || 'logistics@ferexventures.com';
      senderName = config.divisionRouting.rimiSenderName || 'Rimi Cold Chain Logistics';
    } else if (entry.division === 'digital') {
      senderEmail = config.divisionRouting.digitalSenderEmail || 'digital@ferexventures.com';
      senderName = config.divisionRouting.digitalSenderName || 'Ferex Digital Client Hub';
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
  localStorage.setItem(LOCAL_STORAGE_EMAIL_LOGS, JSON.stringify(existing.slice(0, 300)));

  // 2. Save to Supabase email_logs table if available
  try {
    await supabase.from('email_logs').insert([
      {
        id: newLog.id,
        division: newLog.division,
        provider: newLog.provider,
        sender_email: newLog.sender_email,
        sender_name: newLog.sender_name,
        recipient_email: newLog.recipient_email,
        recipient_name: newLog.recipient_name,
        template_type: newLog.template_type,
        subject: newLog.subject,
        body_html: newLog.body_html,
        status: newLog.status,
        reference_id: newLog.reference_id,
        metadata: newLog.metadata,
        sent_at: newLog.sent_at,
      }
    ]);
  } catch {
    // Non-blocking
  }

  // 3. Dispatch system event for real-time admin view updates
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
  return sendStudentEmail({
    studentEmail: params.studentEmail,
    studentName: params.studentName,
    subject: `Journey Update: Step "${params.stepName}" ${params.stepStatus} — Ferex Education`,
    htmlContent: `
      <h2>Dear ${params.studentName},</h2>
      <p>Your university & visa journey milestone has advanced:</p>
      <div style="background:#f8fafc;padding:16px;border-left:4px solid #58051E;margin:16px 0;">
        <strong>Milestone:</strong> ${params.stepName}<br/>
        <strong>Status:</strong> ${params.stepStatus}<br/>
        ${params.notes ? `<strong>Notes:</strong> ${params.notes}<br/>` : ''}
      </div>
      <p>Log in to your Student Portal anytime to view real-time updates and download invoices.</p>
    `,
    division: 'education',
    templateType: 'education_process_step',
    referenceId: params.stepName,
  });
}

export async function sendTradeStageEmail(params: {
  clientEmail: string;
  clientName: string;
  shipmentNo: string;
  stage: 'Order Confirmed' | 'Document Ready' | 'Invoice Generated' | 'Payment Received' | 'Payment Reminder' | 'Shipped' | 'Customs Cleared' | 'Delivered' | string;
  trackingNo?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  amount?: number;
  documentTitle?: string;
}) {
  return sendTradeShipmentStageEmail({
    clientEmail: params.clientEmail,
    clientName: params.clientName,
    shipmentNumber: params.shipmentNo,
    stage: params.stage,
    origin: params.origin,
    destination: params.destination,
    vesselName: params.carrier,
    containerNumber: params.trackingNo,
  });
}

export async function sendRimiColdChainEmail(params: {
  customerEmail: string;
  customerName: string;
  orderNo: string;
  event: 'Order Confirmed' | 'Dispatched' | 'Delivered' | 'Invoice Ready' | 'Batch Received' | string;
  reeferTemp?: string;
  vehicleNo?: string;
  amount?: number;
}) {
  return sendRimiSalesOrderEmail({
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    orderNumber: params.orderNo,
    status: (params.event === 'Delivered' ? 'Delivered' : params.event === 'Dispatched' ? 'Dispatched' : 'Confirmed') as any,
    totalAmount: params.amount || 0,
    itemsSummary: params.reeferTemp ? `Compartment Temp: ${params.reeferTemp}` : undefined,
  });
}

// Re-export all email functions for convenient imports
export {
  sendStudentWelcomeEmail,
  sendStudentPaymentEmail,
  sendStudentApplicationEmail,
  sendStudentDocumentUploadedEmail,
  sendStudentMeetingScheduledEmail,
  sendStudentTicketCreatedEmail,
  sendRimiCustomerWelcomeEmail,
  sendRimiSalesOrderEmail,
  sendRimiDeliveryDispatchedEmail,
  sendRimiPaymentCollectionEmail,
  sendTradeShipmentStageEmail,
  sendTradeInvoiceEmail,
  sendDigitalClientWelcomeEmail,
  sendDigitalProjectMilestoneEmail,
  sendDigitalDeliverableEmail,
  sendDigitalInvoiceEmail,
  sendDigitalMeetingEmail,
};
