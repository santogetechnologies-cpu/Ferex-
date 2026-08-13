import { supabase } from '../supabase';

export interface SystemFeeConfig {
  currency: string;
  default_agency_fee: string;
  default_vfs_fee: string;
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
  default_agency_fee: '',
  default_vfs_fee: '',
  installment_percentages: {
    installment_1: 30,
    installment_2: 40,
    installment_3: 30,
  },
  global_active_intakes: [],
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
    const { data } = await supabase.from('system_config').select('value').eq('key', 'fee_config').maybeSingle();
    if (data?.value) {
      const merged = { ...DEFAULT_FEE_CONFIG, ...data.value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event('ferex_fee_config_change'));
      return merged;
    }
  } catch (err) {}
  return getSystemFeeConfig();
}

export function saveSystemFeeConfig(config: SystemFeeConfig): SystemFeeConfig {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('ferex_fee_config_change'));
  } catch (e) {
    console.error('Error saving fee config:', e);
  }

  // Persist directly to Supabase system_config table
  try {
    supabase.from('system_config').upsert({
      key: 'fee_config',
      value: config,
      updated_at: new Date().toISOString()
    }).then();
  } catch (e) {}

  return config;
}
