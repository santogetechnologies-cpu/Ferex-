import type { SystemFeeConfig } from './api/feeConfig';
import type { Payment, JourneyStage } from './types';
import type { CountryFeePackage } from './api/feePackages';

export interface EducationFee {
  id: string;
  title: string;
  enabled: boolean;
  amount: number;
  currency: 'INR' | 'EUR' | 'USD' | 'GBP' | 'PLN';
  recipient: 'ferex' | 'direct_third_party';
  timing: 'before' | 'after';
  stage: number;
  description: string;
  countryAmounts?: Record<string, number>;
  tax_rate_percent?: number;
  is_direct_payment?: boolean;
  direct_recipient_institution?: string;
  /** Set when this fee comes from a student's assigned country package. */
  package_id?: string;
  /** Percentage discount applied to this student (0-100). */
  discount_percent?: number;
  /** Original amount before the student's discount. */
  original_amount?: number;
}

export interface StudentFeeAdjustment { custom_amount: number; discount_amount: number; discount_percent?: number; discount_reason?: string }

export const educationStages = ['Lead inquiry', 'Service agreement', 'Advanced registration', 'Document review', 'Country legalization', 'University application', 'Offer letter', 'University tuition', 'Visa application', 'Visa decision', 'Pre-departure', 'Enrollment'];
export const money = (value: number, currency = 'INR') => {
  if (currency === 'PLN') return `${new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} PLN`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
};
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

export function resolveEducationFee(
  fee: EducationFee,
  country?: string,
  overrides?: Record<string, StudentFeeAdjustment>
): EducationFee {
  const override = Object.entries(fee.countryAmounts || {}).find(([name]) => name.trim().toLowerCase() === country?.trim().toLowerCase());
  const base = fee.package_id ? fee.amount : override ? override[1] : fee.amount;
  const adj = overrides?.[fee.id];
  if (!adj) return { ...fee, amount: base };
  const pct = Number(adj.discount_percent) || 0;
  let amount = base;
  if (pct > 0) amount = Math.round(base * (100 - Math.min(100, pct))) / 100;
  else if (adj.custom_amount > 0 || adj.discount_amount > 0) amount = adj.custom_amount;
  if (amount === base) return { ...fee, amount: base };
  const saved = Math.round((base - amount) * 100) / 100;
  const label = pct > 0 ? `${pct}%` : money(saved, fee.currency);
  return {
    ...fee, amount, original_amount: base, discount_percent: pct > 0 ? pct : undefined,
    description: `${fee.description || fee.title} (Discount: ${label}${adj.discount_reason ? ` - ${adj.discount_reason}` : ''})`.trim(),
  };
}

/**
 * Fees for a student on a country package. The package replaces the standard Ferex-collected fees
 * (registration, agency, visa documents, custom) with the package registration fee (if enabled) and
 * its instalments. Fees paid directly to third parties (VFS, universities) are kept as they are.
 */
export function packageFees(pkg: CountryFeePackage, base: EducationFee[]): EducationFee[] {
  // Registration is the basic fee for every student: the standard one stays unless the plan overrides it.
  const reg = pkg.registration_fee;
  const overridesRegistration = !!reg?.enabled && reg.amount > 0;
  const standard = base.filter(f => f.id === 'registration' && !overridesRegistration);
  const direct = base.filter(f => f.recipient !== 'ferex');
  const out: EducationFee[] = [...standard];
  if (overridesRegistration) {
    out.push({ id: 'registration', title: 'Advanced Registration Fee', enabled: true, amount: reg!.amount, currency: pkg.currency, recipient: 'ferex', timing: 'before', stage: 3, description: `Registration fee for ${pkg.name}`, package_id: pkg.id });
  }
  for (const inst of pkg.installments) {
    out.push({ id: `pkg:${pkg.id}:${inst.id}`, title: inst.title, enabled: true, amount: inst.amount, currency: pkg.currency, recipient: 'ferex', timing: inst.timing, stage: Math.min(12, Math.max(1, inst.stage_trigger)), description: inst.due_description || `${pkg.name} installment`, package_id: pkg.id });
  }
  return [...out, ...direct.filter(f => f.id !== 'registration')];
}

/** The plan that bills this student, or null for standard fees. Mirrors the payment guard in the database. */
export function resolveStudentPackage(
  assignment: { flow_mode: 'auto' | 'normal' | 'package'; package_id?: string } | null | undefined,
  packages: CountryFeePackage[],
  country?: string
): CountryFeePackage | null {
  const mode = assignment?.flow_mode ?? 'auto';
  if (mode === 'normal') return null;
  if (mode === 'package') return packages.find(p => p.id === assignment?.package_id) ?? null;
  const wanted = (country || '').trim().toLowerCase();
  if (!wanted) return null;
  return packages.find(p => p.is_active !== false && p.country.trim().toLowerCase() === wanted) ?? null;
}
export interface StudentFeeProfile
 { pkg?: CountryFeePackage | null; overrides?: Record<string, StudentFeeAdjustment> }

// The signed-in student's package/discount profile, filled by the student layout so that
// stage gating and fee displays outside the billing console see the same fees.
let activeProfile: StudentFeeProfile | undefined;
export const setActiveStudentFeeProfile = (profile?: StudentFeeProfile) => { activeProfile = profile; };
export const getActiveStudentFeeProfile = () => activeProfile;

/** Enabled fees for a student after package selection, country amounts and discounts. */
export function studentFees(config: SystemFeeConfig, country?: string, profile?: StudentFeeProfile): EducationFee[] {
  const base = educationFees(config);
  const list = profile?.pkg ? packageFees(profile.pkg, base) : base;
  return list.filter(f => f.enabled).map(f => resolveEducationFee(f, country, profile?.overrides));
}

export function feeIsDue(fee: EducationFee, stages: JourneyStage[]): boolean {
  const required = fee.timing === 'after' ? fee.stage : fee.stage - 1;
  return required < 1 || stages.some(s => s.stage_number >= required && s.status === 'Completed') ||
    (fee.timing === 'before' && stages.some(s => s.stage_number >= fee.stage && s.status === 'In Progress'));
}

export function educationStageAccess(config: SystemFeeConfig, payments: Payment[], stage: number, country?: string, profile: StudentFeeProfile | undefined = activeProfile) {
  const required = studentFees(config, country, profile).filter(f => f.recipient === 'ferex' &&
    (f.timing === 'before' ? f.stage <= stage : f.stage < stage));
  const unpaid = required.filter(f => feeBalance(f, payments).remaining > 0);
  return { allowed: unpaid.length === 0, unpaid };
}

export function registrationSettled(config: SystemFeeConfig, payments: Payment[], country?: string, profile: StudentFeeProfile | undefined = activeProfile) {
  const fee = studentFees(config, country, profile).find(f => f.id === 'registration');
  return !fee || feeBalance(fee, payments).remaining === 0;
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
    if (!fee.id.trim() || !fee.title.trim() || !Number.isFinite(fee.amount) || fee.amount < 0 || !Number.isInteger(fee.stage) || fee.stage < 1 || fee.stage > 12 || !['INR', 'EUR', 'USD', 'GBP', 'PLN'].includes(fee.currency) || !['before', 'after'].includes(fee.timing) || !['ferex', 'direct_third_party'].includes(fee.recipient)) throw new Error('Each fee needs a name, a non-negative amount, currency, recipient and workflow stage.');
    if (Object.values(fee.countryAmounts || {}).some(n => !Number.isFinite(n) || n < 0)) throw new Error('Country fees must be zero or a positive amount.');
    if (fee.tax_rate_percent !== undefined && (!Number.isFinite(fee.tax_rate_percent) || fee.tax_rate_percent < 0 || fee.tax_rate_percent > 100)) throw new Error('Tax rate must be between zero and 100 percent.');
    if (/university|tuition/i.test(fee.title) && fee.recipient !== 'direct_third_party') throw new Error('University and tuition fees must be paid directly to the institution.');
  }
}
