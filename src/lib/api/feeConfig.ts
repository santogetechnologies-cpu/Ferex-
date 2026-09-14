import { supabase } from '../supabase';

export interface AgencyMilestone {
  id: string;
  name: string;
  amount: number;
  due_trigger: string; // e.g., 'Application Processing', 'Offer Letter', 'Visa Processing', 'Pre-departure'
  recipient?: string;
  description?: string;
}

export interface SystemFeeConfig {
  // A1: Advanced Registration Fee configuration
  advance_registration_fee_enabled: boolean;
  advance_registration_fee_amount: number;
  advance_registration_fee_currency: 'INR' | 'EUR' | 'USD';

  // B1: Installment Payment & Verification Schedule
  installment_schedule_enabled: boolean;
  installment_percentages: {
    installment_1: number;
    installment_2: number;
    installment_3: number;
  };

  // A3 & A4: Agency Fee Separation
  separate_agency_fee_enabled: boolean; // default false
  agency_fee_model: 'agency_fee_only' | 'milestones' | 'milestone_plus_fee';
  agency_fee_amount: number;
  agency_fee_currency: string;
  agency_milestones: AgencyMilestone[];

  // Supported payment channels (PhonePe UPI, Bank Wire, Edu Admin Cash)
  payment_gateways: {
    phonepe_upi_enabled: boolean;
    phonepe_merchant_id?: string;
    bank_transfer_enabled: boolean;
    cash_admin_enabled: boolean;
  };

  // A1 & L: Basic Invoice & Tax Settings (18% GST)
  invoice_settings: {
    company_gstin: string;
    company_pan: string;
    company_address: string;
    invoice_prefix: string;
    receipt_prefix: string;
    tax_rate_percent: number; // 18%
    terms_conditions: string;
  };

  // Legacy fallback compatibility
  currency?: string;
  default_agency_fee?: string;
  default_vfs_fee?: string;
  advance_registration_fee_inr?: number;
  advance_registration_fee_eur?: number;
  global_active_intakes?: string[];
  country_fees?: Record<string, any>;
}

const STORAGE_KEY = 'ferex_system_fee_config';

export const DEFAULT_FEE_CONFIG: SystemFeeConfig = {
  advance_registration_fee_enabled: true,
  advance_registration_fee_amount: 15000,
  advance_registration_fee_currency: 'INR',

  installment_schedule_enabled: true,
  installment_percentages: {
    installment_1: 30,
    installment_2: 40,
    installment_3: 30,
  },

  separate_agency_fee_enabled: false, // Default is OFF per A3
  agency_fee_model: 'agency_fee_only',
  agency_fee_amount: 25000,
  agency_fee_currency: 'INR',
  agency_milestones: [
    { id: 'm-1', name: 'Application Processing & Eligibility Review', amount: 5000, due_trigger: 'On Application Lodgement', description: 'Document screening & university dossier review' },
    { id: 'm-2', name: 'Offer Letter Issuance & Placement', amount: 8000, due_trigger: 'On Unconditional Offer Release', description: 'Institutional placement & admission validation' },
    { id: 'm-3', name: 'VFS Visa File Preparation & Advisory', amount: 8000, due_trigger: 'On Visa Slot Booking', description: 'SOP crafting, bank statement validation, mock interview' },
    { id: 'm-4', name: 'Pre-Departure Briefing & Airport Transfer', amount: 4000, due_trigger: 'On Visa Result Confirmed', description: 'Foreign exchange, student accommodation & arrival pickup' },
  ],

  payment_gateways: {
    phonepe_upi_enabled: true,
    phonepe_merchant_id: 'FEREXPHONEPEUPI',
    bank_transfer_enabled: true,
    cash_admin_enabled: true,
  },

  invoice_settings: {
    company_gstin: '32AABCF1234F1Z8',
    company_pan: 'AABCF1234F',
    company_address: 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042',
    invoice_prefix: 'FRX-INV',
    receipt_prefix: 'FRX-RCP',
    tax_rate_percent: 18,
    terms_conditions: 'All consulting and application services are billed under Indian GST SAC 9983. Governed by FEREX Admission Terms.',
  },

  // Fallbacks
  currency: '₹',
  default_agency_fee: '₹25,000',
  default_vfs_fee: '₹15,000',
  advance_registration_fee_inr: 15000,
  advance_registration_fee_eur: 150,
  global_active_intakes: ['October 2026', 'February 2027', 'September 2027'],
};

export function getSystemFeeConfig(): SystemFeeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FEE_CONFIG,
        ...parsed,
        installment_percentages: { ...DEFAULT_FEE_CONFIG.installment_percentages, ...(parsed.installment_percentages || {}) },
        payment_gateways: { ...DEFAULT_FEE_CONFIG.payment_gateways, ...(parsed.payment_gateways || {}) },
        invoice_settings: { ...DEFAULT_FEE_CONFIG.invoice_settings, ...(parsed.invoice_settings || {}) },
        agency_milestones: Array.isArray(parsed.agency_milestones) && parsed.agency_milestones.length > 0 ? parsed.agency_milestones : DEFAULT_FEE_CONFIG.agency_milestones,
      };
    }
  } catch (e) {
    console.error('Error reading fee config:', e);
  }
  return DEFAULT_FEE_CONFIG;
}

export function saveSystemFeeConfig(config: Partial<SystemFeeConfig>): SystemFeeConfig {
  const current = getSystemFeeConfig();
  const updated: SystemFeeConfig = {
    ...current,
    ...config,
    advance_registration_fee_inr: config.advance_registration_fee_amount !== undefined ? config.advance_registration_fee_amount : current.advance_registration_fee_amount,
    installment_percentages: {
      ...current.installment_percentages,
      ...(config.installment_percentages || {})
    },
    payment_gateways: {
      ...current.payment_gateways,
      ...(config.payment_gateways || {})
    },
    invoice_settings: {
      ...current.invoice_settings,
      ...(config.invoice_settings || {})
    },
    agency_milestones: config.agency_milestones || current.agency_milestones,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('ferex_fee_config_change'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Error saving fee config to storage:', e);
  }

  // Attempt background sync to Supabase system_config
  try {
    supabase.from('system_config').upsert({
      key: 'fee_config',
      value: updated,
      updated_at: new Date().toISOString()
    }).catch(() => {});
  } catch {}

  return updated;
}
