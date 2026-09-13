import { supabase } from '../supabase';

export interface SystemFeeConfig {
  currency: string;
  default_agency_fee: string;
  default_vfs_fee: string;
  advance_registration_fee_inr: number;
  advance_registration_fee_eur: number;
  country_fees?: Record<string, {
    registration_fee_inr: number;
    registration_fee_eur: number;
    description: string;
  }>;
  installment_percentages: {
    installment_1: number;
    installment_2: number;
    installment_3: number;
  };
  global_active_intakes: string[];

  // Enhanced Settings
  currency_settings?: {
    default_currency: 'INR' | 'EUR' | 'USD';
    eur_to_inr_rate: number;
    usd_to_inr_rate: number;
    multi_currency_enabled: boolean;
  };
  payment_methods?: {
    stripe_enabled: boolean;
    upi_enabled: boolean;
    bank_transfer_enabled: boolean;
    cash_admin_only: boolean;
  };
  installment_timing?: {
    days_after_offer_for_stage_2: number;
    days_before_visa_for_stage_3: number;
    auto_reminders_enabled: boolean;
    reminder_frequency_days: number;
  };
  late_payment_settings?: {
    late_fee_amount: number;
    grace_period_days: number;
    auto_suspension_enabled: boolean;
  };
  refund_policy?: {
    stage_1_refundable_pct: number;
    stage_2_refundable_pct: number;
    stage_3_refundable_pct: number;
    processing_deduction_fee: number;
    refund_processing_days: number;
  };
  invoice_settings?: {
    company_gstin: string;
    company_pan: string;
    company_address: string;
    logo_url: string;
    invoice_prefix: string;
    receipt_prefix: string;
    tax_rate_percent: number;
    terms_conditions: string;
  };
}

const STORAGE_KEY = 'ferex_system_fee_config';

export const DEFAULT_FEE_CONFIG: SystemFeeConfig = {
  currency: '₹',
  default_agency_fee: '₹15,000',
  default_vfs_fee: '₹8,500',
  advance_registration_fee_inr: 15000,
  advance_registration_fee_eur: 150,
  country_fees: {
    'Poland': { registration_fee_inr: 15000, registration_fee_eur: 150, description: 'NAWA Legalization, University Shortlisting & Visa Advisory' },
    'Germany': { registration_fee_inr: 20000, registration_fee_eur: 200, description: 'Uni-Assist Processing, APS Assistance & Blocked Account Setup' },
    'UK': { registration_fee_inr: 25000, registration_fee_eur: 250, description: 'CAS Issuance, ATAS Guidance & UKVI Priority Visa Filing' },
    'USA': { registration_fee_inr: 30000, registration_fee_eur: 320, description: 'I-20 Processing, SEVIS Guidance & Mock Visa Interview' },
    'Canada': { registration_fee_inr: 25000, registration_fee_eur: 260, description: 'PAL Verification, LOA Processing & SDS File Prep' },
    'France': { registration_fee_inr: 18000, registration_fee_eur: 190, description: 'Campus France EEF Dossier & Long Stay Student Visa' },
    'Italy': { registration_fee_inr: 18000, registration_fee_eur: 190, description: 'Universitaly Pre-enrollment & CIMEA / DOV Assistance' },
    'Hungary': { registration_fee_inr: 15000, registration_fee_eur: 150, description: 'Stipendium Hungaricum / University Direct Admission' },
  },
  installment_percentages: {
    installment_1: 30,
    installment_2: 40,
    installment_3: 30,
  },
  global_active_intakes: ['October 2026', 'February 2027', 'September 2027'],

  currency_settings: {
    default_currency: 'INR',
    eur_to_inr_rate: 90,
    usd_to_inr_rate: 85,
    multi_currency_enabled: true,
  },
  payment_methods: {
    stripe_enabled: true,
    upi_enabled: true,
    bank_transfer_enabled: true,
    cash_admin_only: true,
  },
  installment_timing: {
    days_after_offer_for_stage_2: 7,
    days_before_visa_for_stage_3: 14,
    auto_reminders_enabled: true,
    reminder_frequency_days: 3,
  },
  late_payment_settings: {
    late_fee_amount: 2500,
    grace_period_days: 5,
    auto_suspension_enabled: false,
  },
  refund_policy: {
    stage_1_refundable_pct: 0,
    stage_2_refundable_pct: 50,
    stage_3_refundable_pct: 80,
    processing_deduction_fee: 5000,
    refund_processing_days: 14,
  },
  invoice_settings: {
    company_gstin: '32AABCF1234F1Z8',
    company_pan: 'AABCF1234F',
    company_address: 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042',
    logo_url: '/logo.png',
    invoice_prefix: 'FRX-INV',
    receipt_prefix: 'FRX-RCP',
    tax_rate_percent: 18,
    terms_conditions: 'Payments once processed are governed by the FEREX Overseas Admission Policy.',
  },
};

export function getSystemFeeConfig(): SystemFeeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FEE_CONFIG,
        ...parsed,
        currency_settings: { ...DEFAULT_FEE_CONFIG.currency_settings, ...(parsed.currency_settings || {}) },
        payment_methods: { ...DEFAULT_FEE_CONFIG.payment_methods, ...(parsed.payment_methods || {}) },
        installment_timing: { ...DEFAULT_FEE_CONFIG.installment_timing, ...(parsed.installment_timing || {}) },
        late_payment_settings: { ...DEFAULT_FEE_CONFIG.late_payment_settings, ...(parsed.late_payment_settings || {}) },
        refund_policy: { ...DEFAULT_FEE_CONFIG.refund_policy, ...(parsed.refund_policy || {}) },
        invoice_settings: { ...DEFAULT_FEE_CONFIG.invoice_settings, ...(parsed.invoice_settings || {}) },
      };
    }
  } catch (e) {
    console.error('Error reading fee config:', e);
  }
  return DEFAULT_FEE_CONFIG;
}

export async function fetchSystemFeeConfigAsync(): Promise<SystemFeeConfig> {
  try {
    const { data: sysRes } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'fee_config')
      .maybeSingle();

    if (sysRes?.value) {
      const merged: SystemFeeConfig = {
        ...DEFAULT_FEE_CONFIG,
        ...sysRes.value,
        currency_settings: { ...DEFAULT_FEE_CONFIG.currency_settings, ...(sysRes.value.currency_settings || {}) },
        payment_methods: { ...DEFAULT_FEE_CONFIG.payment_methods, ...(sysRes.value.payment_methods || {}) },
        installment_timing: { ...DEFAULT_FEE_CONFIG.installment_timing, ...(sysRes.value.installment_timing || {}) },
        late_payment_settings: { ...DEFAULT_FEE_CONFIG.late_payment_settings, ...(sysRes.value.late_payment_settings || {}) },
        refund_policy: { ...DEFAULT_FEE_CONFIG.refund_policy, ...(sysRes.value.refund_policy || {}) },
        invoice_settings: { ...DEFAULT_FEE_CONFIG.invoice_settings, ...(sysRes.value.invoice_settings || {}) },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event('ferex_fee_config_change'));
      return merged;
    }
  } catch (err) {
    console.warn('[fetchSystemFeeConfigAsync notice]:', err);
  }

  return getSystemFeeConfig();
}

export function saveSystemFeeConfig(config: SystemFeeConfig): SystemFeeConfig {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('ferex_fee_config_change'));
  } catch (e) {
    console.error('Error saving fee config local:', e);
  }

  const payload = {
    key: 'fee_config',
    value: config,
    updated_at: new Date().toISOString()
  };

  try {
    supabase.from('system_config').upsert(payload, { onConflict: 'key' }).then();
  } catch (e) {}

  return config;
}
