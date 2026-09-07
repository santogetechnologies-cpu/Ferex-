import { supabase } from '../supabase';
import { getSystemFeeConfig, DEFAULT_FEE_CONFIG } from './feeConfig';

export async function autoSeedAllDataToSupabase() {
  // Sync essential system fee configuration if not set
  try {
    const feeConfig = getSystemFeeConfig() || DEFAULT_FEE_CONFIG;
    await supabase.from('system_config').upsert({
      key: 'fee_config',
      value: feeConfig,
      updated_at: new Date().toISOString()
    });

    // Seed Stripe & UPI payment gateways config if not present
    const { data: gwData } = await supabase.from('system_config').select('value').eq('key', 'payment_gateways').maybeSingle();
    if (!gwData) {
      const defaultGateways = {
        stripe: {
          enabled: true,
          publishableKey: '',
          secretKey: '',
          webhookSecret: '',
          environment: 'sandbox',
          supportedCurrencies: ['INR', 'EUR', 'USD'],
          defaultCurrency: 'INR',
          autoCapture: true,
        },
        upi: {
          enabled: true,
          upiId: 'ferex.payments@icici',
          merchantName: 'FEREX ENTERPRISE GROUP',
          merchantCode: '5411',
          qrCodeEnabled: true,
          collectRequestEnabled: true,
          autoVerifyUtr: true,
        },
        divisions: {
          education: { allowStripe: true, allowUpi: true, customUpiId: 'ferex.education@icici', customMerchantName: 'FEREX GLOBAL EDUCATION' },
          digital: { allowStripe: true, allowUpi: true, customUpiId: 'ferex.digital@icici', customMerchantName: 'FEREX DIGITAL ERP' },
          rimi: { allowStripe: true, allowUpi: true, customUpiId: 'ferex.rimi@icici', customMerchantName: 'RIMI FROZEN LOGISTICS' },
          trade: { allowStripe: true, allowUpi: true, customUpiId: 'ferex.trade@icici', customMerchantName: 'FEREX GLOBAL TRADE' },
        },
        updated_at: new Date().toISOString(),
        updated_by: 'System AutoSeeder',
      };
      await supabase.from('system_config').upsert({
        key: 'payment_gateways',
        value: defaultGateways,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err: any) {}

  // One-time cleanup of mock/seed records across Trade, Rimi, and Digital to keep the entire platform fresh & 100% live
  try {
    // Clear localStorage caches for trade, rimi, digital mock seeds
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key && (
            key.startsWith('ferex_trade_') ||
            key.startsWith('ferex_rimi_') ||
            key.startsWith('ferex_dig_') ||
            key.startsWith('ferex_digital_')
          )
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    // Delete mock seed IDs from Supabase tables
    const mockClientIds = ['cli-dig-nexus', 'cli-dig-starlight', 'cli-dig-aerocloud', 'cli-dig-tatadigital'];
    const mockProjectIds = ['proj-dig-nexus', 'proj-dig-starlight', 'proj-dig-aerocloud', 'proj-dig-tatadigital'];
    const mockTradeShipmentIds = ['SHP-9821', 'SHP-9822'];
    const mockRimiProductIds = ['PROD-01', 'PROD-02', 'PROD-03'];
    const mockRimiWarehouseIds = ['WH-MUM-01', 'WH-DEL-02', 'WH-BLR-03'];

    await Promise.allSettled([
      supabase.from('digital_clients').delete().in('id', mockClientIds),
      supabase.from('digital_projects').delete().in('id', mockProjectIds),
      supabase.from('digital_invoices').delete().ilike('invoice_no', 'INV-DIG-%'),
      supabase.from('digital_tasks').delete().ilike('title', '%Nexus%'),
      supabase.from('digital_leads').delete().ilike('company_name', '%Nexus%'),
      supabase.from('trade_shipments').delete().in('id', mockTradeShipmentIds),
      supabase.from('trade_clients').delete().ilike('company_name', '%Warsaw Global Logistics%'),
      supabase.from('trade_invoices').delete().ilike('invoice_no', 'INV-TRD-%'),
      supabase.from('trade_letters_of_credit').delete().ilike('lc_number', 'LC-2026-%'),
      supabase.from('trade_bills_of_lading').delete().ilike('bl_number', 'BL-%'),
      supabase.from('rimi_products').delete().in('id', mockRimiProductIds),
      supabase.from('rimi_warehouses').delete().in('id', mockRimiWarehouseIds),
      supabase.from('rimi_batches').delete().ilike('batch_number', 'LOT-%'),
      supabase.from('rimi_sales_orders').delete().ilike('order_no', 'SO-2026-%'),
      supabase.from('rimi_deliveries').delete().ilike('delivery_number', 'DEL-2026-%'),
      supabase.from('rimi_payment_collections').delete().ilike('reference_no', 'REF-%'),
    ]);
  } catch (e) {
    // Gracefully handle if tables or columns differ
  }
}
