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

    // Clean legacy test clients and seed official FEREX internal subsidiaries
    try {
      await supabase
        .from('digital_clients')
        .delete()
        .or('company_name.ilike.%C Tech%,company_name.ilike.%Santoge Digital%');

      const officialSubsidiaries = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          company_name: 'FEREX Global Education',
          contact_person: 'Admissions Director',
          email: 'education@ferex.com',
          phone: '+91 98190 11001',
          industry: 'Global Education & Admissions',
          status: 'Active',
          total_revenue: 0,
          client_type: 'Internal',
          updated_at: new Date().toISOString()
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          company_name: 'FEREX Global Trade',
          contact_person: 'Trade Logistics Lead',
          email: 'trade@ferex.com',
          phone: '+91 98190 11002',
          industry: 'International Trade & Commodities',
          status: 'Active',
          total_revenue: 0,
          client_type: 'Internal',
          updated_at: new Date().toISOString()
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          company_name: 'Rimi Frozen Foods Distribution',
          contact_person: 'Operations Director',
          email: 'rimi@ferex.com',
          phone: '+91 98190 11003',
          industry: 'Cold Chain Logistics & Distribution',
          status: 'Active',
          total_revenue: 0,
          client_type: 'Internal',
          updated_at: new Date().toISOString()
        },
        {
          id: '00000000-0000-0000-0000-000000000004',
          company_name: 'FEREX Corporate / Central HQ',
          contact_person: 'Executive Super Admin',
          email: 'admin@ferex.com',
          phone: '+91 98190 11000',
          industry: 'Corporate Holding & Strategy',
          status: 'Active',
          total_revenue: 0,
          client_type: 'Internal',
          updated_at: new Date().toISOString()
        }
      ];

      await supabase.from('digital_clients').upsert(officialSubsidiaries);
    } catch {}
  } catch (err: any) {
    // Silent fail - offline or RLS protected
  }
}
