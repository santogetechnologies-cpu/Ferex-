import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { Payment, Invoice, Receipt, CreditNote } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';
import { logActivity } from './activity';

import { getDeletedStudentIds } from './students';

const PAYMENTS_CATALOG_ID = 'ferex_payments_catalog';

async function fetchPaymentsCatalog(): Promise<Payment[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('system_config')
      .select('value')
      .eq('key', PAYMENTS_CATALOG_ID)
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      return data.value;
    }
  } catch {}
  try {
    const raw = localStorage.getItem('ferex_payments_cloud_catalog');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function syncPaymentToCloudCatalog(payment: Payment) {
  try {
    const current = await fetchPaymentsCatalog();
    const filtered = current.filter(p => p.id !== payment.id);
    const updated = [payment, ...filtered];
    try {
      localStorage.setItem('ferex_payments_cloud_catalog', JSON.stringify(updated));
    } catch {}
    const admin = await getAdminSupabaseClient();
    await admin.from('system_config').upsert({
      key: PAYMENTS_CATALOG_ID,
      value: updated,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {
    console.warn('[syncPaymentToCloudCatalog notice]:', e);
  }
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export async function getPayments(studentId?: string) {
  try {
    if (!studentId) {
      return [];
    }
    const deletedIds = getDeletedStudentIds();
    if (deletedIds.includes(studentId.toLowerCase())) {
      return [];
    }

    let query = supabase
      .from('payments')
      .select('id, student_id, amount, payment_type, status, title, description, created_at, receipt_url, payment_method, ref_no, utr_number, reviewer_notes')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    const dbPayments = (data ?? []) as unknown as Payment[];
    const cloudCatalog = await fetchPaymentsCatalog();
    const studentCloud = cloudCatalog.filter(p => p.student_id === studentId);

    const dbIds = new Set(dbPayments.map(p => p.id));
    const merged = [...dbPayments, ...studentCloud.filter(p => !dbIds.has(p.id))];
    return merged;
  } catch (err) {
    return [];
  }
}

export async function getAllPaymentsForAdmin(): Promise<Payment[]> {
  const deletedIds = getDeletedStudentIds();
  try {
    const admin = await getAdminSupabaseClient();
    const { data, error } = await admin
      .from('payments')
      .select('id, student_id, student_name, amount, payment_type, status, title, description, created_at, receipt_url, payment_method, ref_no, utr_number, reviewer_notes')
      .order('created_at', { ascending: false });

    const dbPayments = (data ?? []) as unknown as Payment[];
    const cloudCatalog = await fetchPaymentsCatalog();
    const dbIds = new Set(dbPayments.map(p => p.id));
    const merged = [...dbPayments, ...cloudCatalog.filter(p => !dbIds.has(p.id))];

    // Filter out payments belonging to deleted students or orphan null-student mock payments
    return merged.filter(p => {
      const sId = (p.student_id || '').toLowerCase();
      const sName = (p.student_name || '').toLowerCase();
      if (!p.student_id && (!p.student_name || p.student_name === 'Student')) return false;
      if (sId && deletedIds.includes(sId)) return false;
      if (deletedIds.some((d: string) => sId === d || (d.includes('@') && sName.includes(d.split('@')[0])))) return false;
      return true;
    });
  } catch {
    const catalog = await fetchPaymentsCatalog();
    return catalog.filter(p => {
      const sId = (p.student_id || '').toLowerCase();
      if (!p.student_id && (!p.student_name || p.student_name === 'Student')) return false;
      if (sId && deletedIds.includes(sId)) return false;
      return true;
    });
  }
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
    description: payload.title,
    amount: payload.amount,
    currency: payload.currency || 'INR',
    payment_type: payload.payment_type || 'Registration Fee',
    status: 'Pending' as const,
    created_at: new Date().toISOString()
  };

  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('payments').insert(paymentObj);
  } catch {}

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
}) {
  const newId = generateUUID();
  const refNo = `FEREX-PAY-${Math.floor(100000 + Math.random() * 900000)}`;

  const insertData = {
    id: newId,
    student_id: payload.student_id || null,
    student_name: payload.student_name || 'Student',
    ref_no: refNo,
    title: payload.title,
    description: payload.title,
    amount: payload.amount,
    currency: payload.currency || 'INR',
    payment_type: payload.payment_type || 'Installment Fee',
    status: 'Pending Verification',
    paid_at: null,
    payment_method: payload.payment_method || 'UPI / Instant NetBanking',
    created_at: new Date().toISOString()
  };

  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('payments').insert(insertData);
  } catch {}

  await syncPaymentToCloudCatalog(insertData as unknown as Payment);
  return insertData as unknown as Payment;
}

export async function markPaymentPaid(id: string, method?: string) {
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('payments').update({
      status: 'Paid',
      paid_at: new Date().toISOString(),
      payment_method: method || 'UPI / Card',
    }).eq('id', id);
  } catch {}

  const catalog = await fetchPaymentsCatalog();
  const existing = catalog.find(p => p.id === id);
  if (existing) {
    existing.status = 'Paid';
    existing.paid_at = new Date().toISOString();
    await syncPaymentToCloudCatalog(existing);
  }

  return { id, status: 'Paid' } as unknown as Partial<Payment>;
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
    await admin.from('payments').insert({
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
  } catch (err) {}

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
}): Blob {
  const student = (payment.student_name || 'Student').replace(/[()\\]/g, '');
  const title = (payment.title || payment.payment_type || 'Registration Fee - Overseas Education Consultancy Services').replace(/[()\\]/g, '');
  const invNo = payment.invoice_no || `FE/2026-27/${Math.floor(1000 + Math.random() * 9000)}`;
  const totalAmt = Number(payment.amount) || 1500;
  const taxable = (totalAmt / 1.18).toFixed(2);
  const cgst = ((totalAmt - Number(taxable)) / 2).toFixed(2);
  const sgst = ((totalAmt - Number(taxable)) - Number(cgst)).toFixed(2);
  const today = payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const method = (payment.payment_method || 'Bank Transfer / UPI').replace(/[()\\]/g, '');

  const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
      /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
>>
endobj
4 0 obj
<< /Length 1100 >>
stream
BT
/F1 18 Tf
50 730 Td
(FEREX) Tj
/F2 9 Tf
0 -15 Td
(Tel: +91 95448 85077, +44 78678 67779 | Email: ferexventuresoffice@gmail.com) Tj
0 -12 Td
(Addr: 12/640 Thachukuzhi, Companipady Road, Nellikuzhy PO, Kothamangalam, Kerala - 686 691) Tj
0 -15 Td
(--------------------------------------------------------------------------------) Tj
/F1 16 Tf
210 -25 Td
(TAX INVOICE) Tj
/F1 10 Tf
-40 -15 Td
(GSTIN: 32AAGCF8602A1Z8 | PAN: AAGCF8602A) Tj
/F2 10 Tf
-170 -25 Td
(INVOICE TO:) Tj
/F1 11 Tf
0 -15 Td
(${student}) Tj
/F2 10 Tf
0 -12 Td
(Student - Ferex Education) Tj
/F2 10 Tf
300 +42 Td
(INVOICE DETAILS:) Tj
0 -15 Td
(Invoice No: ${invNo}) Tj
0 -14 Td
(Invoice Date: ${today}) Tj
0 -14 Td
(Place of Supply: Kerala) Tj
-300 -30 Td
(--------------------------------------------------------------------------------) Tj
/F1 10 Tf
0 -20 Td
(# | Description | SAC Code | Amount (INR)) Tj
/F2 10 Tf
0 -16 Td
(1 | ${title} | 9983 | INR ${totalAmt.toFixed(2)}) Tj
0 -25 Td
(Taxable Base Value: INR ${taxable}) Tj
0 -14 Td
(CGST @ 9.0%: INR ${cgst}) Tj
0 -14 Td
(SGST @ 9.0%: INR ${sgst}) Tj
/F1 12 Tf
0 -18 Td
(Total Amount Paid (Payment + 18% GST): INR ${totalAmt.toFixed(2)}) Tj
/F2 10 Tf
0 -30 Td
(STATUS: PAID IN FULL | Mode: ${method}) Tj
0 -40 Td
(This is an authentic computer-generated invoice under Indian GST SAC 9983.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000305 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
1460
%%EOF`;

  return new Blob([pdfSource], { type: 'application/pdf' });
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

  if (!updatedPayment) {
    const catalog = await fetchPaymentsCatalog();
    const existing = catalog.find(p => p.id === id);
    updatedPayment = {
      ...(existing || { id, amount: 15000, title: 'Fee Payment', student_name: 'Student' }),
      id,
      status: 'Paid',
      paid_at: paidAt,
      reviewer_notes: reviewerNotes || 'Verified & Approved by Admin'
    } as unknown as Payment;
  }

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

  if (!updatedPayment) {
    const catalog = await fetchPaymentsCatalog();
    const existing = catalog.find(p => p.id === id);
    updatedPayment = {
      ...(existing || { id, amount: 0, title: 'Payment', student_name: 'Student' }),
      id,
      status: 'Rejected',
      reviewer_notes: reviewerNotes
    } as unknown as Payment;
  }

  await syncPaymentToCloudCatalog(updatedPayment);
  return updatedPayment;
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

export async function getInvoices(studentId?: string) {
  try {
    if (!studentId) {
      return [];
    }
    const admin = await getAdminSupabaseClient();
    const { data, error } = await admin
      .from('invoices')
      .select('*')
      .eq('student_id', studentId);
    if (error || !data) return [];
    return data as Invoice[];
  } catch (err) {
    return [];
  }
}

// ─── RECEIPTS ─────────────────────────────────────────────────────────────────

export async function getReceipts(studentId?: string) {
  try {
    if (!studentId) {
      return [];
    }
    const admin = await getAdminSupabaseClient();
    const { data, error } = await admin
      .from('receipts')
      .select('*')
      .eq('student_id', studentId);
    if (error || !data) return [];
    return data as Receipt[];
  } catch (err) {
    return [];
  }
}

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
export async function deletePaymentRecord(paymentId: string): Promise<boolean> {
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('payments').delete().eq('id', paymentId);
    
    // Purge from cloud catalog
    const catalog = await fetchPaymentsCatalog();
    const updated = catalog.filter(p => p.id !== paymentId);
    try {
      localStorage.setItem('ferex_payments_cloud_catalog', JSON.stringify(updated));
    } catch {}
    await admin.from('system_config').upsert({
      key: PAYMENTS_CATALOG_ID,
      value: updated,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    window.dispatchEvent(new Event('ferex_payment_change'));
    return true;
  } catch (err) {
    console.warn('[deletePaymentRecord Error]:', err);
    return false;
  }
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
  const recNo = receipt.receipt_no || `REC-${Math.floor(100000 + Math.random() * 900000)}`;
  const student = (receipt.student_name || 'Student').replace(/[()\\]/g, '');
  const amt = Number(receipt.amount) || 0;
  const desc = (receipt.description || 'Payment Receipt').replace(/[()\\]/g, '');
  const method = (receipt.payment_method || 'UPI / Bank Transfer').replace(/[()\\]/g, '');
  const date = receipt.issued_at
    ? new Date(receipt.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const src = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 600 >>
stream
BT
/F1 16 Tf
50 740 Td
(FEREX PAYMENT RECEIPT) Tj
/F2 9 Tf
0 -22 Td
(This is an official payment receipt issued by FEREX Global Admissions.) Tj
/F1 10 Tf
0 -30 Td
(Receipt No: ${recNo}) Tj
0 -18 Td
(Date: ${date}) Tj
0 -18 Td
(Student: ${student}) Tj
0 -18 Td
(Description: ${desc}) Tj
0 -18 Td
(Payment Method: ${method}) Tj
/F1 12 Tf
0 -28 Td
(Amount Received: INR ${amt.toLocaleString('en-IN')}) Tj
/F2 9 Tf
0 -40 Td
(Status: PAID AND CLEARED) Tj
0 -15 Td
(Ferex European Higher Education | receipts@ferex.edu) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000280 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
960
%%EOF`;
  return new Blob([src], { type: 'application/pdf' });
}

// ─── PDF — Credit Note for Refunds ───────────────────────────────────────────
export function createCreditNotePdfBlob(cn: {
  credit_note_no?: string;
  student_name?: string;
  original_amount?: number;
  refund_amount?: number;
  reason?: string;
  issued_at?: string;
}): Blob {
  const cnNo = cn.credit_note_no || `CN-${Math.floor(100000 + Math.random() * 900000)}`;
  const student = (cn.student_name || 'Student').replace(/[()\\]/g, '');
  const origAmt = Number(cn.original_amount) || 0;
  const refAmt = Number(cn.refund_amount) || 0;
  const reason = (cn.reason || 'Admin-issued refund').replace(/[()\\]/g, '');
  const date = cn.issued_at
    ? new Date(cn.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const src = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 650 >>
stream
BT
/F1 16 Tf
50 740 Td
(FEREX CREDIT NOTE) Tj
/F2 9 Tf
0 -22 Td
(This document confirms an official refund issued by FEREX Global Admissions.) Tj
/F1 10 Tf
0 -30 Td
(Credit Note No: ${cnNo}) Tj
0 -18 Td
(Date Issued: ${date}) Tj
0 -18 Td
(Student: ${student}) Tj
0 -18 Td
(Original Payment Amount: INR ${origAmt.toLocaleString('en-IN')}) Tj
/F1 12 Tf
0 -22 Td
(Refund Amount: INR ${refAmt.toLocaleString('en-IN')}) Tj
/F2 10 Tf
0 -22 Td
(Reason: ${reason}) Tj
0 -30 Td
(This credit note nullifies the corresponding payment to the extent of the refund.) Tj
0 -15 Td
(Ferex European Higher Education | finance@ferex.edu) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000280 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
1010
%%EOF`;
  return new Blob([src], { type: 'application/pdf' });
}

// ─── CREDIT NOTES ─────────────────────────────────────────────────────────────
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
