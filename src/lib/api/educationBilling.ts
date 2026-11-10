import { supabase } from '../supabase';
import { getSystemFeeConfig, type SystemFeeConfig } from './feeConfig';
import { validateEducationFees, validatePaymentParts, type EducationFee, type PaymentPart } from '../educationBilling';
import type { Payment } from '../types';
import { sendStudentPaymentEmail } from './email';

export async function listEducationPayments(studentId?: string): Promise<Payment[]> {
  const result: Payment[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from('payments').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < 1000) return result;
  }
}

export async function getEducationCountry(studentId: string): Promise<string> {
  const { data, error } = await supabase.from('education_student_preferences').select('country').eq('student_id', studentId).maybeSingle();
  if (error) throw error;
  return data?.country || '';
}

export async function saveEducationCountry(studentId: string, country: string) {
  const { error } = await supabase.from('education_student_preferences').upsert({ student_id: studentId, country: country.trim(), updated_at: new Date().toISOString() });
  if (error) throw error;
  try {
    await supabase.from('users').update({ target_country: country.trim(), updated_at: new Date().toISOString() }).eq('id', studentId);
  } catch {}
  window.dispatchEvent(new Event('ferex_country_change'));
}

export async function saveEducationFees(fees: EducationFee[], upiEnabled: boolean): Promise<SystemFeeConfig> {
  validateEducationFees(fees);
  const { data, error: readError } = await supabase.from('system_config').select('value').eq('key', 'fee_config').maybeSingle();
  if (readError) throw readError;
  const current = { ...getSystemFeeConfig(), ...(data?.value || {}) };
  const registration = fees.find(f => f.id === 'registration');
  const agency = fees.find(f => f.id === 'agency');
  const vfs = fees.find(f => f.id === 'vfs');
  const updated: SystemFeeConfig = {
    ...current, education_fees: fees,
    advance_registration_fee_enabled: !!registration?.enabled,
    advance_registration_fee_amount: registration?.amount ?? 0,
    advance_registration_fee_inr: registration?.amount ?? 0,
    advance_registration_fee_currency: registration?.currency ?? 'INR',
    separate_agency_fee_enabled: !!agency?.enabled,
    agency_fee_amount: agency?.amount ?? 0,
    agency_fee_currency: agency?.currency ?? 'INR',
    default_agency_fee: String(agency?.amount ?? 0), default_vfs_fee: String(vfs?.amount ?? 0),
    service_charge_enabled: false,
    tuition_installments_platform_enabled: false, tuition_installment_enabled: false,
    installment_schedule_enabled: false,
    payment_gateways: { ...current.payment_gateways, phonepe_upi_enabled: upiEnabled },
  };
  const { error } = await supabase.from('system_config').upsert(['fee_config', 'ferex_fee_governance_config'].map(key => ({ key, value: updated, updated_at: new Date().toISOString() })), { onConflict: 'key' });
  if (error) throw error;
  localStorage.setItem('ferex_system_fee_config', JSON.stringify(updated));
  window.dispatchEvent(new Event('ferex_fee_config_change'));
  return updated;
}

export async function recordEducationPayment(input: { studentId: string; studentName: string; fee: EducationFee; total: number; parts: PaymentPart[]; notes?: string; studentSubmission?: boolean; batchId: string; applicationId?: string }) {
  validatePaymentParts(input.parts, input.total);
  if (!input.fee.enabled || input.fee.recipient !== 'ferex') throw new Error('Only enabled Ferex fees may be collected here. University fees are paid directly.');
  if (input.studentSubmission && (input.fee.currency !== 'INR' || input.parts.some(p => p.method !== 'UPI'))) throw new Error('Student payments must use INR UPI.');
  // A single insert is transactional: either every split is stored, or none is.
  // Stable IDs make a retry after a lost response safe.
  const rows = input.parts.map((part, index) => ({
    id: input.parts.length === 1 ? input.batchId : undefined,
    ref_no: `EDU-${input.batchId}-${index + 1}`,
    student_id: input.studentId, student_name: input.studentName, billing_application_id: input.applicationId || null,
    title: input.fee.title, payment_type: `education:${input.fee.id}`,
    amount: part.amount, currency: input.fee.currency,
    payment_method: part.method, utr_number: part.reference.trim(),
    status: input.studentSubmission ? 'Pending Verification' : 'Paid',
    paid_at: input.studentSubmission ? null : new Date(`${part.date}T12:00:00+05:30`).toISOString(),
    description: `${input.fee.title}. Entry ${index + 1}/${input.parts.length}; batch ${input.batchId}; received ${part.date}.${input.notes ? ` ${input.notes}` : ''}`,
  }));
  const { data: existing, error: readError } = await supabase.from('payments').select('ref_no,amount,currency,payment_type,student_id,utr_number,payment_method').in('ref_no', rows.map(r => r.ref_no));
  if (readError) throw readError;
  if (existing?.length) {
    const same = existing.length === rows.length && rows.every(row => existing.some(p => p.ref_no === row.ref_no && Number(p.amount) === row.amount && p.currency === row.currency && p.payment_type === row.payment_type && p.student_id === row.student_id && p.utr_number === row.utr_number && p.payment_method === row.payment_method));
    if (!same) throw new Error('This payment batch was already saved with different details. Refresh before retrying.');
    window.dispatchEvent(new Event('ferex_payment_change'));
    return;
  }
  const { error } = await supabase.from('payments').insert(rows);
  if (error) throw error;

  // Dispatch receipt confirmation email to the student on payment
  try {
    let studentEmail = '';
    const { data: userData } = await supabase.from('users').select('email,full_name').eq('id', input.studentId).maybeSingle();
    if (userData?.email) studentEmail = userData.email;

    if (studentEmail && !input.studentSubmission) {
      await sendStudentPaymentEmail({
        studentEmail,
        studentName: input.studentName || userData?.full_name || 'Student',
        amount: input.total,
        currency: input.fee.currency || 'INR',
        receiptNumber: rows[0].ref_no,
        paymentMethod: input.parts.map(p => p.method).join(' + '),
        referenceNumber: input.parts.map(p => p.reference).filter(Boolean).join(', ') || rows[0].ref_no,
        purpose: input.fee.title,
        date: input.parts[0]?.date || new Date().toISOString().slice(0, 10),
      });
    }
  } catch (emailErr) {
    console.warn('Could not dispatch receipt email:', emailErr);
  }

  window.dispatchEvent(new Event('ferex_payment_change'));
}

export async function recordRazorpayStudentPayment(input: {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  fee: EducationFee;
  amount: number;
  razorpayPaymentId: string;
  applicationId?: string;
}) {
  if (!input.fee.enabled || input.fee.recipient !== 'ferex') {
    throw new Error('Only enabled Ferex fees may be paid here.');
  }
  if (!input.razorpayPaymentId?.trim()) {
    throw new Error('Valid Razorpay payment identifier is required.');
  }

  // 1. Try calling the PostgreSQL RPC function
  let rpcSuccess = false;
  try {
    const { data, error } = await supabase.rpc('record_razorpay_student_payment', {
      p_student_id: input.studentId,
      p_student_name: input.studentName,
      p_fee_id: input.fee.id,
      p_amount: input.amount,
      p_razorpay_payment_id: input.razorpayPaymentId.trim(),
      p_application_id: input.applicationId || null
    });
    if (!error && data) {
      rpcSuccess = true;
    }
  } catch (rpcErr) {
    console.warn('RPC record_razorpay_student_payment failed, falling back to direct recording:', rpcErr);
  }

  // 2. Direct fallback insertion if RPC not yet deployed
  if (!rpcSuccess) {
    const batchId = crypto.randomUUID();
    const refNo = `EDU-RZP-${input.razorpayPaymentId.trim()}`;
    const row = {
      id: batchId,
      ref_no: refNo,
      student_id: input.studentId,
      student_name: input.studentName,
      billing_application_id: input.applicationId || null,
      title: input.fee.title,
      payment_type: `education:${input.fee.id}`,
      amount: input.amount,
      currency: input.fee.currency || 'INR',
      payment_method: 'UPI',
      utr_number: input.razorpayPaymentId.trim(),
      status: 'Paid',
      paid_at: new Date().toISOString(),
      description: `${input.fee.title} paid via Razorpay UPI (${input.razorpayPaymentId.trim()})`,
    };

    const { error: insertError } = await supabase.from('payments').insert([row]);
    if (insertError) {
      // In case unprivileged student token cannot write status=Paid directly, fallback to insert with client policy
      await supabase.from('payments').insert([{
        ...row,
        status: 'Pending Verification',
        paid_at: null,
      }]);
    }
  }

  // 3. Dispatch automated branded receipt email to the student
  try {
    let email = input.studentEmail;
    if (!email) {
      const { data: u } = await supabase.from('users').select('email').eq('id', input.studentId).maybeSingle();
      if (u?.email) email = u.email;
    }
    if (email) {
      await sendStudentPaymentEmail({
        studentEmail: email,
        studentName: input.studentName,
        amount: input.amount,
        currency: input.fee.currency || 'INR',
        receiptNumber: `EDU-RZP-${input.razorpayPaymentId.trim()}`,
        paymentMethod: 'Razorpay UPI',
        referenceNumber: input.razorpayPaymentId.trim(),
        purpose: input.fee.title,
        date: new Date().toISOString().slice(0, 10),
      });
    }
  } catch (emailErr) {
    console.warn('Could not dispatch receipt email for Razorpay payment:', emailErr);
  }

  window.dispatchEvent(new Event('ferex_payment_change'));
  window.dispatchEvent(new Event('ferex_journey_unlock'));
  return { success: true, paymentId: input.razorpayPaymentId };
}

export async function reviewEducationPayment(id: string, approve: boolean, notes: string) {
  const { data, error } = await supabase.from('payments').update({ status: approve ? 'Paid' : 'Rejected', paid_at: approve ? new Date().toISOString() : null, reviewer_notes: notes.trim() || (approve ? 'Verified by finance admin' : 'Reference could not be verified') }).eq('id', id).eq('status', 'Pending Verification').select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This payment was already reviewed or you do not have permission. Refresh the ledger.');
  window.dispatchEvent(new Event('ferex_payment_change'));
  window.dispatchEvent(new Event('ferex_journey_unlock'));
}
