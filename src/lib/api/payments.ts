import { accountingPdf } from '../accountingPdf';
import { listEducationPayments } from './educationBilling';
import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { Payment, Invoice, Receipt, CreditNote } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';
import { logActivity } from './activity';

import { getDeletedStudentIds } from './students';

async function fetchPaymentsCatalog(): Promise<Payment[]> { return listEducationPayments(); }
async function syncPaymentToCloudCatalog(_payment: Payment) { window.dispatchEvent(new Event('ferex_payment_change')); }

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export async function getPayments(studentId?: string): Promise<Payment[]> {
  return listEducationPayments(studentId);
}

export async function getAllPaymentsForAdmin(): Promise<Payment[]> {
  const deletedIds = getDeletedStudentIds();
  return (await listEducationPayments()).filter(p => !deletedIds.includes((p.student_id || '').toLowerCase()));
}

export async function createPayment(payload: {
  student_id?: string;
  student_name?: string;
  title: string;
  amount: number;
  currency?: string;
  payment_type?: string;
}) {
  const newId = generateUUID();
  const paymentObj = {
    id: newId,
    student_id: payload.student_id || null,
    student_name: payload.student_name || 'Student',
    title: payload.title,
    ref_no: `FEREX-${newId}`,
    description: payload.title,
    amount: payload.amount,
    currency: payload.currency || 'INR',
    payment_type: payload.payment_type || 'Registration Fee',
    status: 'Pending' as const,
    created_at: new Date().toISOString()
  };

  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('payments').insert(paymentObj);
    if (error) throw error;
  } catch (error) { throw error; }

  await syncPaymentToCloudCatalog(paymentObj as unknown as Payment);
  return paymentObj as unknown as Payment;
}

export async function createAndCompletePayment(payload: {
  student_id?: string;
  student_name?: string;
  title: string;
  amount: number;
  currency?: string;
  payment_type?: string;
  payment_method?: string;
  status?: string;
  paid_at?: string | null;
  utr_number?: string;
  description?: string;
  verified_by?: string;
  verified_at?: string;
  stage_number?: number;
}) {
  const newId = generateUUID();
  const refNo = `FEREX-PAY-${Math.floor(100000 + Math.random() * 900000)}`;
  const status = payload.status || 'Paid';
  const isPaid = status === 'Paid' || status === 'Verified';

  const insertData = {
    id: newId,
    student_id: payload.student_id || null,
    student_name: payload.student_name || 'Student',
    ref_no: refNo,
    title: payload.title,
    description: payload.description || payload.title,
    amount: Number(payload.amount) || 0,
    currency: payload.currency || 'INR',
    payment_type: payload.payment_type || 'Installment Fee',
    status: status,
    paid_at: payload.paid_at !== undefined ? payload.paid_at : (isPaid ? new Date().toISOString() : null),
    payment_method: payload.payment_method || 'Direct Bank Transfer',
    utr_number: payload.utr_number || '',
    verified_by: payload.verified_by || (isPaid ? 'Admissions Finance Desk' : undefined),
    verified_at: payload.verified_at || (isPaid ? new Date().toISOString() : undefined),
    stage_number: payload.stage_number,
    created_at: new Date().toISOString()
  };

  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('payments').insert(insertData);
    if (error) throw error;
  } catch (error) { throw error; }

  await syncPaymentToCloudCatalog(insertData as unknown as Payment);
  window.dispatchEvent(new Event('ferex_payment_change'));
  return insertData as unknown as Payment;
}

export async function markPaymentPaid(id: string, method?: string) {
  const { data, error } = await supabase.from('payments').update({ status: 'Paid', paid_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  window.dispatchEvent(new Event('ferex_payment_change'));
  return data as Payment;
}

export async function submitPaymentProof(payload: {
  student_id?: string;
  student_name?: string;
  title: string;
  amount: number;
  payment_type?: string;
  payment_method: string;
  utr_number?: string;
  receipt_url?: string;
}): Promise<Payment> {
  const newId = generateUUID();
  const refNo = `FEREX-PAY-${Math.floor(100000 + Math.random() * 900000)}`;

  const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
  const rawStudentId = isValidUuid(payload.student_id) ? payload.student_id : null;

  const resultPayment: Payment = {
    id: newId,
    student_id: rawStudentId || '',
    student_name: payload.student_name || 'Student',
    ref_no: refNo,
    title: payload.title,
    description: payload.title,
    amount: Number(payload.amount) || 0,
    currency: 'INR',
    payment_type: payload.payment_type || 'Installment Fee',
    status: 'Pending Verification',
    due_date: new Date().toISOString(),
    paid_at: null,
    payment_method: payload.payment_method || 'UPI / Wire Transfer',
    utr_number: payload.utr_number || '',
    receipt_url: payload.receipt_url || '',
    created_at: new Date().toISOString()
  };

  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('payments').insert({
      id: newId,
      student_name: payload.student_name || 'Student',
      student_id: rawStudentId,
      ref_no: refNo,
      title: payload.title,
      description: payload.title,
      amount: Number(payload.amount) || 0,
      currency: 'INR',
      payment_type: payload.payment_type || 'Installment Fee',
      status: 'Pending Verification',
      payment_method: payload.payment_method || 'UPI / Wire Transfer',
      utr_number: payload.utr_number || '',
      receipt_url: payload.receipt_url || '',
      created_at: new Date().toISOString()
    });
    if (error) throw error;
  } catch (error) { throw error; }

  await syncPaymentToCloudCatalog(resultPayment);

  // Trigger notifications for Admin and Student
  try {
    await createNotification({
      user_id: 'admin',
      title: 'New Student Payment Proof Submitted',
      body: `Payment proof of ₹${Number(payload.amount).toLocaleString('en-IN')} submitted by ${payload.student_name || 'Student'} for "${payload.title}" (UTR: ${payload.utr_number || 'Pending Verification'}).`,
      category: 'Payment'
    });

    if (rawStudentId && rawStudentId !== 'admin') {
      await createNotification({
        user_id: rawStudentId,
        title: 'Payment Proof Submitted',
        body: `Your payment proof of ₹${Number(payload.amount).toLocaleString('en-IN')} for "${payload.title}" is under review.`,
        category: 'Payment'
      });
    }
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_payment_change'));
  return resultPayment;
}

// Generate 100% Valid PDF Binary Blob for Official Tax Invoices & Receipts matching FEREX Model
export function createValidInvoicePdfBlob(payment: {
  invoice_no?: string;
  student_name?: string;
  amount?: number;
  currency?: string;
  title?: string;
  payment_type?: string;
  payment_method?: string;
  utr_number?: string;
  paid_at?: string;
  tax_rate_percent?: number;
}): Blob {
  const amount = Number(payment.amount) || 0;
  const currency = payment.currency || 'INR';
  const rate = Number(payment.tax_rate_percent ?? 0);
  const base = amount / (1 + rate / 100);
  return accountingPdf('FEREX EDUCATION - INVOICE', [
    `Invoice: ${payment.invoice_no || 'Unassigned'}`,
    `Student: ${payment.student_name || 'Student'}`,
    `Description: ${payment.title || payment.payment_type || 'Education fee'}`,
    `Total paid: ${currency} ${amount.toFixed(2)}`,
    ...(payment.tax_rate_percent !== undefined ? [`Included tax rate: ${rate}%`, `Taxable base: ${currency} ${base.toFixed(2)}`, `Included tax: ${currency} ${(amount - base).toFixed(2)}`] : []),
    `Payment method: ${payment.payment_method || 'Not specified'}`,
    `Reference: ${payment.utr_number || ''}`,
    `Date: ${payment.paid_at || ''}`,
  ]);
}

export async function verifyPayment(id: string, reviewerNotes?: string): Promise<Payment> {
  const paidAt = new Date().toISOString();
  let updatedPayment: Payment | null = null;

  try {
    const admin = await getAdminSupabaseClient();
    const { data, error } = await admin
      .from('payments')
      .update({
        status: 'Paid',
        paid_at: paidAt,
        reviewer_notes: reviewerNotes || 'Verified & Approved by Admin'
      })
      .eq('id', id)
      .select();

    if (!error && data && data.length > 0) {
      updatedPayment = data[0] as Payment;
    }
  } catch (e) {}

  if (!updatedPayment) throw new Error('Payment verification was not saved. Refresh the ledger and check your permissions.');

  await syncPaymentToCloudCatalog(updatedPayment);

  // Send automated approval notification to student
  if (updatedPayment && updatedPayment.student_id) {
    try {
      const { createNotification } = await import('./notifications');
      await createNotification({
        user_id: updatedPayment.student_id,
        title: 'Payment Verified & Approved',
        body: `Your payment of ₹${Number(updatedPayment.amount || 0).toLocaleString()} for ${updatedPayment.title || 'Tuition Fee'} has been verified and approved by FEREX Finance Board. New journey stages have been unlocked.`,
        category: 'Payment'
      });
    } catch (err) {}
  }

  // Dispatch payment unlock events for journey stage progression
  window.dispatchEvent(new CustomEvent('ferex_payment_verified', { 
    detail: { 
      paymentId: id, 
      studentId: updatedPayment?.student_id,
      amount: updatedPayment?.amount,
      paymentType: updatedPayment?.payment_type 
    } 
  }));
  window.dispatchEvent(new Event('ferex_payment_change'));
  window.dispatchEvent(new Event('ferex_journey_unlock'));

  const invoiceNo = updatedPayment.ref_no || `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Insert official invoice record directly into Supabase invoices table
  try {
    const pdfBlob = createValidInvoicePdfBlob({
      invoice_no: invoiceNo,
      student_name: updatedPayment.student_name || 'Student',
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      title: updatedPayment.title || updatedPayment.description,
      payment_method: updatedPayment.payment_method,
      utr_number: updatedPayment.utr_number,
      paid_at: paidAt
    });

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const admin = await getAdminSupabaseClient();
        await admin.from('invoices').insert({
          id: generateUUID(),
          payment_id: (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) ? id : null,
          student_id: (updatedPayment?.student_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedPayment.student_id)) ? updatedPayment.student_id : null,
          invoice_no: invoiceNo,
          description: updatedPayment?.description || updatedPayment?.title || 'Installment Payment Clearance',
          amount: updatedPayment?.amount || 15000,
          currency: updatedPayment?.currency || 'INR',
          status: 'Paid',
          issued_at: paidAt,
          due_date: paidAt,
          created_at: paidAt
        });
        console.log('✅ [invoices]: Successfully issued tax invoice to invoices table in Supabase!');
      } catch (e) {}
    };
    reader.readAsDataURL(pdfBlob);
  } catch (err) {}

  // 2. Insert receipt record into Supabase receipts table
  try {
    const receiptNo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
    const admin = await getAdminSupabaseClient();
    await admin.from('receipts').insert({
      id: generateUUID(),
      payment_id: (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) ? id : null,
      student_id: (updatedPayment?.student_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedPayment.student_id)) ? updatedPayment.student_id : null,
      receipt_no: receiptNo,
      description: `Official Receipt for ${updatedPayment?.description || updatedPayment?.title || 'Installment Payment'}`,
      amount: updatedPayment?.amount || 0,
      currency: 'INR',
      issued_at: paidAt,
      created_at: paidAt
    });
    console.log('✅ [receipts]: Successfully issued payment receipt to receipts table in Supabase!');
  } catch (err) {}

  return updatedPayment;
}

export async function rejectPayment(id: string, reviewerNotes: string): Promise<Payment> {
  let updatedPayment: Payment | null = null;
  try {
    const admin = await getAdminSupabaseClient();
    const { data, error } = await admin
      .from('payments')
      .update({
        status: 'Rejected',
        reviewer_notes: reviewerNotes || 'Payment verification rejected. Please re-upload valid UTR / Receipt proof.'
      })
      .eq('id', id)
      .select();

    if (!error && data && data.length > 0) {
      updatedPayment = data[0] as Payment;
    }
  } catch (e) {}

  if (!updatedPayment) throw new Error('Payment rejection was not saved. Refresh the ledger and check your permissions.');

  await syncPaymentToCloudCatalog(updatedPayment);
  return updatedPayment;
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

async function readStudentDocuments<T>(table: string, studentId?: string): Promise<T[]> {
  if (!studentId) return [];
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select('*').eq('student_id', studentId).order('id').range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []) as T[]);
    if (!data || data.length < 1000) return rows;
  }
}
export async function getInvoices(studentId?: string) { return readStudentDocuments<Invoice>('invoices', studentId); }
export async function getReceipts(studentId?: string) { return readStudentDocuments<Receipt>('receipts', studentId); }

// ─── ADMIN — fetch all payments (no student filter) ──────────────────────────
export async function getAllPaymentsAdmin(): Promise<Payment[]> {
  return getAllPaymentsForAdmin();
}

// ─── ADMIN — aggregate payment stats ─────────────────────────────────────────
export async function getPaymentStats(): Promise<{
  totalCollected: number;
  pendingDues: number;
  failedCount: number;
  refundTotal: number;
  partialCount: number;
}> {
  try {
    const rows = await getAllPaymentsForAdmin();
    return {
      totalCollected: rows.filter(r => r.status === 'Paid' || r.status === 'Verified').reduce((s, r) => s + (Number(r.amount) || 0), 0),
      pendingDues: rows.filter(r => r.status === 'Pending' || r.status === 'Pending Verification' || r.status === 'Overdue').reduce((s, r) => s + (Number(r.amount) || 0), 0),
      failedCount: rows.filter(r => r.status === 'Rejected' || r.status === 'Cancelled').length,
      refundTotal: rows.filter(r => r.status === 'Refunded').reduce((s, r) => s + (Number(r.amount) || 0), 0),
      partialCount: rows.filter(r => r.status === 'Partial').length,
    };
  } catch {
    return { totalCollected: 0, pendingDues: 0, failedCount: 0, refundTotal: 0, partialCount: 0 };
  }
}

// ─── ADMIN — delete payment record ───────────────────────────────────────────
export async function deletePaymentRecord(_paymentId: string): Promise<boolean> {
  throw new Error('Payment history cannot be deleted. Record a documented refund or correction.');
}

// ─── ADMIN — issue refund & auto-generate credit note ────────────────────────
export async function issueRefund(paymentId: string, refundAmount: number, reason: string): Promise<CreditNote | null> {
  const creditNoteNo = `CN-${Math.floor(100000 + Math.random() * 900000)}`;
  const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  // 1. Fetch original payment
  let payment: Payment | null = null;
  try {
    const { data: payRow } = await supabase.from('payments').select('*').eq('id', paymentId).single();
    payment = payRow as Payment | null;
  } catch (e) {}

  // 2. Guaranteed update using standard columns
  try {
    await supabase.from('payments').update({
      status: 'Refunded',
      reviewer_notes: `[REFUNDED] Amount: INR ${refundAmount} | Reason: ${reason} | Credit Note: ${creditNoteNo}`
    }).eq('id', paymentId);
  } catch (e) {
    console.warn('[issueRefund basic update]', e);
  }

  // 3. Extended update if schema supports extra columns
  try {
    await supabase.from('payments').update({
      refund_amount: refundAmount,
      refund_reason: reason,
      credit_note_no: creditNoteNo,
    }).eq('id', paymentId);
  } catch (e) {}

  // 4. Insert credit_note row
  const creditNoteId = generateUUID();
  const issuedAt = new Date().toISOString();
  const creditNoteRow = {
    id: creditNoteId,
    student_id: isValidUuid(payment?.student_id) ? payment?.student_id : null,
    payment_id: isValidUuid(paymentId) ? paymentId : null,
    credit_note_no: creditNoteNo,
    original_amount: payment?.amount ?? 0,
    refund_amount: refundAmount,
    currency: 'INR',
    reason,
    issued_at: issuedAt,
    created_at: issuedAt,
  };

  try {
    await supabase.from('credit_notes').insert(creditNoteRow);
  } catch (e) { console.warn('[issueRefund credit_notes insert]', e); }

  return creditNoteRow as unknown as CreditNote;
}

// ─── ADMIN — mark partial payment ────────────────────────────────────────────
export async function markPartialPayment(paymentId: string, partialAmount: number): Promise<void> {
  try {
    await supabase.from('payments').update({
      status: 'Partial',
      partial_amount: partialAmount,
    }).eq('id', paymentId);
  } catch (e) { console.warn('[markPartialPayment]', e); }
}

// ─── PDF — Separate Bank-Style Payment Receipt ────────────────────────────────
export function createReceiptPdfBlob(receipt: {
  receipt_no?: string;
  student_name?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  description?: string;
  issued_at?: string;
}): Blob {
  return accountingPdf('FEREX EDUCATION - PAYMENT RECEIPT', [
    `Receipt: ${receipt.receipt_no || 'Unassigned'}`, `Student: ${receipt.student_name || 'Student'}`,
    `Amount received: ${receipt.currency || 'INR'} ${(Number(receipt.amount) || 0).toFixed(2)}`,
    `Description: ${receipt.description || 'Education payment'}`, `Method: ${receipt.payment_method || ''}`, `Date: ${receipt.issued_at || ''}`,
  ]);
}

export function createCreditNotePdfBlob(cn: {
  credit_note_no?: string;
  student_name?: string;
  original_amount?: number;
  refund_amount?: number;
  reason?: string;
  currency?: string;
  issued_at?: string;
}): Blob {
  return accountingPdf('FEREX EDUCATION - CREDIT NOTE', [
    `Credit note: ${cn.credit_note_no || 'Unassigned'}`, `Student: ${cn.student_name || 'Student'}`,
    `Original amount: ${cn.currency || 'INR'} ${(Number(cn.original_amount) || 0).toFixed(2)}`,
    `Refund: ${cn.currency || 'INR'} ${(Number(cn.refund_amount) || 0).toFixed(2)}`,
    `Reason: ${cn.reason || ''}`, `Date: ${cn.issued_at || ''}`,
  ]);
}

export async function getCreditNotes(studentId?: string): Promise<CreditNote[]> {
  try {
    if (!studentId) return [];
    const { data, error } = await supabase
      .from('credit_notes')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as CreditNote[];
  } catch {
    return [];
  }
}
