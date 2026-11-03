import type { SystemFeeConfig } from './api/feeConfig';
import type { Payment, JourneyStage } from './types';

export interface EducationFee {
  id: string;
  title: string;
  enabled: boolean;
  amount: number;
  currency: 'INR' | 'EUR' | 'USD';
  recipient: 'ferex' | 'direct_third_party';
  timing: 'before' | 'after';
  stage: number;
  description: string;
  countryAmounts?: Record<string, number>;
  tax_rate_percent?: number;
}

export const educationStages = ['Lead inquiry', 'Service agreement', 'Advanced registration', 'Document review', 'Country legalization', 'University application', 'Offer letter', 'University tuition', 'Visa application', 'Visa decision', 'Pre-departure', 'Enrollment'];
export const money = (value: number, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
export const cents = (value: number) => Math.round(value * 100);
const numericFee = (value: unknown) => Number(String(value ?? '0').replace(/[^\d.]/g, '')) || 0;

export function educationFees(config: SystemFeeConfig): EducationFee[] {
  if (Array.isArray(config.education_fees)) return config.education_fees;
  const fee = (id: string, title: string, amount: number, enabled: boolean, stage: number, timing: 'before' | 'after' = 'before'): EducationFee => ({ id, title, amount, enabled, stage, timing, currency: 'INR', recipient: 'ferex', description: '' });
  return [
    { ...fee('registration', 'Advanced Registration Fee', config.advance_registration_fee_amount, config.advance_registration_fee_enabled, 3), currency: config.advance_registration_fee_currency, tax_rate_percent: config.gst_enabled_registration_fee ? config.invoice_settings.tax_rate_percent : 0 },
    { ...fee('agency', 'Separate Agency Fee', config.agency_fee_amount, config.separate_agency_fee_enabled, 10, 'after'), currency: (config.agency_fee_currency || 'INR') as EducationFee['currency'] },
    { ...fee('vfs', 'VFS / Visa Gov Fee', numericFee(config.default_vfs_fee), true, 9), recipient: 'direct_third_party' as const },
    { ...fee('visa-documents', 'Cost for Documents for Visa', config.visa_documents_fee_amount, config.visa_documents_fee_enabled, 7, 'after'), currency: config.visa_documents_fee_currency },
    // The legacy service charge represented the same agency charge, not an extra charge.
    ...config.custom_payments.map(c => ({ ...fee(c.id, c.title, c.amount, c.enabled, ({ before_reg: 3, after_agreement: 2, before_application: 6, after_offer: 7, before_visa: 9, after_visa: 10, pre_departure: 11, custom: 1 })[c.trigger_stage], c.trigger_stage.startsWith('after') ? 'after' : 'before'), currency: c.currency, recipient: c.recipient, description: c.description }))
  ];
}

export function resolveEducationFee(fee: EducationFee, country?: string): EducationFee {
  const override = Object.entries(fee.countryAmounts || {}).find(([name]) => name.trim().toLowerCase() === country?.trim().toLowerCase());
  return { ...fee, amount: override ? override[1] : fee.amount };
}

export function feeIsDue(fee: EducationFee, stages: JourneyStage[]): boolean {
  const required = fee.timing === 'after' ? fee.stage : fee.stage - 1;
  return required < 1 || stages.some(s => s.stage_number >= required && s.status === 'Completed') ||
    (fee.timing === 'before' && stages.some(s => s.stage_number >= fee.stage && s.status === 'In Progress'));
}

export function educationStageAccess(config: SystemFeeConfig, payments: Payment[], stage: number, country?: string) {
  const required = educationFees(config).filter(f => f.enabled && f.recipient === 'ferex' &&
    (f.timing === 'before' ? f.stage <= stage : f.stage < stage)).map(f => resolveEducationFee(f, country));
  const unpaid = required.filter(f => feeBalance(f, payments).remaining > 0);
  return { allowed: unpaid.length === 0, unpaid };
}

export function registrationSettled(config: SystemFeeConfig, payments: Payment[], country?: string) {
  const fee = educationFees(config).find(f => f.id === 'registration');
  return !fee?.enabled || feeBalance(resolveEducationFee(fee, country), payments).remaining === 0;
}

export function matchesEducationFee(payment: Payment, fee: EducationFee): boolean {
  if (payment.payment_type?.startsWith('education:')) return payment.payment_type === `education:${fee.id}`;
  const label = `${payment.title || ''} ${payment.payment_type || ''}`.toLowerCase();
  if (fee.id === 'registration') return /registration|advance|audit deposit/.test(label);
  if (fee.id === 'agency') return /agency|service charge/.test(label);
  if (fee.id === 'vfs') return /vfs|visa gov|consular/.test(label);
  if (fee.id === 'visa-documents') return /documents? for visa|visa documents/.test(label);
  return (payment.title || '').trim().toLowerCase() === fee.title.trim().toLowerCase();
}

export function feeBalance(fee: EducationFee, payments: Payment[]) {
  const matches = payments.filter(p => (p.currency || 'INR') === fee.currency && matchesEducationFee(p, fee));
  const paid = matches.filter(p => ['Paid', 'Verified', 'Partial'].includes(p.status)).reduce((sum, p) => sum + cents(p.status === 'Partial' ? Number(p.partial_amount || 0) : Number(p.amount)), 0) / 100;
  const pending = matches.filter(p => p.status === 'Pending Verification').reduce((sum, p) => sum + cents(Number(p.amount)), 0) / 100;
  return { paid, pending, remaining: Math.max(0, cents(fee.amount) - cents(paid)) / 100, payable: Math.max(0, cents(fee.amount) - cents(paid) - cents(pending)) / 100 };
}

export interface PaymentPart { method: 'Bank Transfer' | 'Cash' | 'UPI' | 'Cheque' | 'Card'; amount: number; reference: string; date: string }
export function validatePaymentParts(parts: PaymentPart[], expected: number) {
  if (!Number.isFinite(expected) || expected <= 0 || !parts.length) throw new Error('Enter a positive total and at least one payment entry.');
  if (parts.some(p => !Number.isFinite(p.amount) || p.amount <= 0 || !p.reference.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(p.date))) throw new Error('Every entry needs a positive amount, reference or cash receipt number, and date.');
  if (new Set(parts.map(p => `${p.method}:${p.reference.trim().toLowerCase()}`)).size !== parts.length) throw new Error('Each payment entry must have a unique reference.');
  if (parts.reduce((sum, p) => sum + cents(p.amount), 0) !== cents(expected)) throw new Error('Split entries must add up exactly to the payment total.');
  if ([expected, ...parts.map(p => p.amount)].some(n => Math.abs(n * 100 - cents(n)) > 0.00001)) throw new Error('Amounts may have at most two decimal places.');
  if (parts.some(p => !['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Card'].includes(p.method) || Number.isNaN(Date.parse(`${p.date}T12:00:00Z`)) || new Date(`${p.date}T12:00:00Z`).toISOString().slice(0, 10) !== p.date || Date.parse(`${p.date}T00:00:00Z`) > Date.now())) throw new Error('Use a valid payment method and received date, no later than today.');
}

export function validateEducationFees(fees: EducationFee[]) {
  if (new Set(fees.map(f => f.id)).size !== fees.length) throw new Error('Fee identifiers must be unique.');
  for (const fee of fees) {
    if (!fee.id.trim() || !fee.title.trim() || !Number.isFinite(fee.amount) || fee.amount < 0 || !Number.isInteger(fee.stage) || fee.stage < 1 || fee.stage > 12 || !['INR', 'EUR', 'USD'].includes(fee.currency) || !['before', 'after'].includes(fee.timing) || !['ferex', 'direct_third_party'].includes(fee.recipient)) throw new Error('Each fee needs a name, a non-negative amount, currency, recipient and workflow stage.');
    if (Object.values(fee.countryAmounts || {}).some(n => !Number.isFinite(n) || n < 0)) throw new Error('Country fees must be zero or a positive amount.');
    if (fee.tax_rate_percent !== undefined && (!Number.isFinite(fee.tax_rate_percent) || fee.tax_rate_percent < 0 || fee.tax_rate_percent > 100)) throw new Error('Tax rate must be between zero and 100 percent.');
    if (/university|tuition/i.test(fee.title) && fee.recipient !== 'direct_third_party') throw new Error('University and tuition fees must be paid directly to the institution.');
  }
}
