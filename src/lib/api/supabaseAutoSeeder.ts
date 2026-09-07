import { supabase } from '../supabase';
import { getSystemFeeConfig, DEFAULT_FEE_CONFIG } from './feeConfig';

export async function autoSeedAllDataToSupabase() {
  try {
    // Only attempt seed if an authenticated user session is active
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;

    const feeConfig = getSystemFeeConfig() || DEFAULT_FEE_CONFIG;
    await supabase.from('system_config').upsert({
      key: 'fee_config',
      value: feeConfig,
      updated_at: new Date().toISOString()
    });
  } catch (err: any) {
    // Silent fail - offline or RLS protected
  }
}
