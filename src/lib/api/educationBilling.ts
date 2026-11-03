import { supabase } from '../supabase';
import { getSystemFeeConfig, type SystemFeeConfig } from './feeConfig';
import { validateEducationFees, validatePaymentParts, type EducationFee, type PaymentPart } from '../educationBilling';
import type { Payment } from '../types';

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
  window.dispatchEvent(new Event('ferex_payment_change'));
}

export async function reviewEducationPayment(id: string, approve: boolean, notes: string) {
  const { data, error } = await supabase.from('payments').update({ status: approve ? 'Paid' : 'Rejected', paid_at: approve ? new Date().toISOString() : null, reviewer_notes: notes.trim() || (approve ? 'Verified by finance admin' : 'Reference could not be verified') }).eq('id', id).eq('status', 'Pending Verification').select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This payment was already reviewed or you do not have permission. Refresh the ledger.');
  window.dispatchEvent(new Event('ferex_payment_change'));
  window.dispatchEvent(new Event('ferex_journey_unlock'));
}
