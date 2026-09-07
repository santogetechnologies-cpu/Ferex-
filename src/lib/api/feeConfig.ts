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
};

export function getSystemFeeConfig(): SystemFeeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_FEE_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Error reading fee config:', e);
  }
  return DEFAULT_FEE_CONFIG;
}

export async function fetchSystemFeeConfigAsync(): Promise<SystemFeeConfig> {
  try {
    // Query Supabase system_config table directly
    const { data: sysRes } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'fee_config')
      .maybeSingle();

    if (sysRes?.value) {
      const merged = { ...DEFAULT_FEE_CONFIG, ...sysRes.value };
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

  // Upsert directly into Supabase system_config table
  try {
    supabase.from('system_config').upsert(payload, { onConflict: 'key' }).then();
  } catch (e) {}

  return config;
}
