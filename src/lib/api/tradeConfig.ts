import { supabase } from '../supabase';

export interface TradeBranding {
  entity_name: string;
  portal_title: string;
  tagline: string;
  iec_code: string;
  corporate_reg_code: string;
  support_email: string;
  shipping_hotline: string;
  whatsapp_trade_desk: string;
  port_headquarters: string;
  operating_hours: string;
  default_currency: 'USD' | 'EUR' | 'INR';
  timezone: string;
}

export interface TradeIncotermPolicy {
  default_incoterm: 'FOB' | 'CIF' | 'DDP' | 'CFR' | 'EXW';
  allowed_incoterms: string[];
  lc_advising_bank_standard: string;
  customs_clearance_sla_days: number;
  mandatory_digital_bl_stamp: boolean;
  mandatory_container_seal_check: boolean;
}

export interface TradeClientPortalPolicies {
  allow_instant_cert_downloads: boolean;
  allow_client_shipping_instructions: boolean;
  enable_live_cargo_milestones: boolean;
  lc_draft_review_window_days: number;
  allow_online_demurrage_clearance: boolean;
}

export interface TradeBroadcast {
  is_active: boolean;
  message: string;
  urgency: 'info' | 'warning' | 'urgent' | 'success';
  target_audience: 'all' | 'clients' | 'staff';
  link_url?: string;
  link_label?: string;
}

export interface TradeFreightCorridor {
  id: string;
  corridor_name: string;
  port_of_loading: string;
  port_of_discharge: string;
  transit_time_days: string;
  carrier_line: string;
  is_active: boolean;
}

export interface TradeCustomizationConfig {
  id: string;
  updated_at: string;
  branding: TradeBranding;
  trade_policies: TradeIncotermPolicy;
  client_policies: TradeClientPortalPolicies;
  broadcast: TradeBroadcast;
  corridors: TradeFreightCorridor[];
}

export const DEFAULT_TRADE_CONFIG: TradeCustomizationConfig = {
  id: 'ferex-trade-config-v1',
  updated_at: new Date().toISOString(),
  branding: {
    entity_name: 'FEREX Global Trade & Maritime Commodities Corp',
    portal_title: 'FEREX Global Trade Terminal',
    tagline: 'Cross-Border Ocean Freight Logistics, Letter of Credit & Bulk Commodity Clearance',
    iec_code: '0308091244',
    corporate_reg_code: 'REG-EU-99201-IN',
    support_email: 'trade@ferex.com',
    shipping_hotline: '+91 80001 77889',
    whatsapp_trade_desk: '+91 99880 44556',
    port_headquarters: 'JNPT Port Terminal, Navi Mumbai, India & Port of Gdańsk Logistics Desk, Poland',
    operating_hours: '24/7 Global Maritime & Port Terminal Dispatch Active',
    default_currency: 'USD',
    timezone: 'UTC / IST (UTC+5:30)'
  },
  trade_policies: {
    default_incoterm: 'CIF',
    allowed_incoterms: ['CIF', 'FOB', 'CFR', 'DDP', 'EXW', 'FCA'],
    lc_advising_bank_standard: 'Standard Chartered / BNP Paribas / State Bank of India',
    customs_clearance_sla_days: 3,
    mandatory_digital_bl_stamp: true,
    mandatory_container_seal_check: true
  },
  client_policies: {
    allow_instant_cert_downloads: true,
    allow_client_shipping_instructions: true,
    enable_live_cargo_milestones: true,
    lc_draft_review_window_days: 5,
    allow_online_demurrage_clearance: true
  },
  broadcast: {
    is_active: true,
    message: '⚓ Ocean Vessel Schedules Operating on standard European & Middle Eastern trade corridors. Zero port congestion reported.',
    urgency: 'info',
    target_audience: 'all',
    link_url: '/trade/shipments',
    link_label: 'Track Cargo'
  },
  corridors: [
    {
      id: 'cor-in-eu',
      corridor_name: 'India – Northern Europe Gateway',
      port_of_loading: 'JNPT / Nhava Sheva (INNSA)',
      port_of_discharge: 'Port of Rotterdam / Hamburg (NLRTM / DEHAM)',
      transit_time_days: '22 - 26 Days',
      carrier_line: 'Maersk / MSC Line',
      is_active: true
    },
    {
      id: 'cor-in-pol',
      corridor_name: 'India – Baltic Poland Corridor',
      port_of_loading: 'Mundra Port (INMUN)',
      port_of_discharge: 'Port of Gdańsk (PLGDN)',
      transit_time_days: '28 - 32 Days',
      carrier_line: 'Hapag-Lloyd / CMA CGM',
      is_active: true
    },
    {
      id: 'cor-in-me',
      corridor_name: 'India – Middle East Express',
      port_of_loading: 'Cochin Port (INCOK)',
      port_of_discharge: 'Jebel Ali, Dubai (AEJEA)',
      transit_time_days: '4 - 6 Days',
      carrier_line: 'Feeder / One Line',
      is_active: true
    }
  ]
};

const STORAGE_KEY = 'ferex_trade_customization_config';

export const getTradeConfig = async (): Promise<TradeCustomizationConfig> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.branding) {
        return {
          ...DEFAULT_TRADE_CONFIG,
          ...parsed,
          branding: { ...DEFAULT_TRADE_CONFIG.branding, ...(parsed.branding || {}) },
          trade_policies: { ...DEFAULT_TRADE_CONFIG.trade_policies, ...(parsed.trade_policies || {}) },
          client_policies: { ...DEFAULT_TRADE_CONFIG.client_policies, ...(parsed.client_policies || {}) },
          broadcast: { ...DEFAULT_TRADE_CONFIG.broadcast, ...(parsed.broadcast || {}) },
          corridors: Array.isArray(parsed.corridors) ? parsed.corridors : DEFAULT_TRADE_CONFIG.corridors
        };
      }
    }
  } catch (e) {
    console.warn('Could not read trade config from storage:', e);
  }

  try {
    const { data } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 'ferex-trade-config-v1')
      .maybeSingle();

    if (data && data.config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
      return data.config;
    }
  } catch (err) {}

  return DEFAULT_TRADE_CONFIG;
};

export const saveTradeConfig = async (config: TradeCustomizationConfig): Promise<TradeCustomizationConfig> => {
  const updated: TradeCustomizationConfig = {
    ...config,
    updated_at: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ferex_trade_config_change', { detail: updated }));
  } catch (e) {
    console.error('Error saving trade config:', e);
  }

  try {
    await supabase.from('system_config').upsert({
      id: updated.id || 'ferex-trade-config-v1',
      config: updated,
      updated_at: updated.updated_at
    });
  } catch (err) {}

  return updated;
};

export const resetTradeConfig = async (): Promise<TradeCustomizationConfig> => {
  return await saveTradeConfig(DEFAULT_TRADE_CONFIG);
};
