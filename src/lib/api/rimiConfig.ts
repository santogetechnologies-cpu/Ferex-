import { supabase } from '../supabase';

export interface RimiBranding {
  entity_name: string;
  portal_title: string;
  tagline: string;
  support_email: string;
  dispatch_hotline: string;
  whatsapp_order_desk: string;
  office_hub_address: string;
  operating_hours: string;
  gstin_code: string;
  base_currency: 'INR' | 'EUR' | 'USD';
  timezone: string;
}

export interface RimiColdChainThresholds {
  cold_room_max_temp: number; // e.g. -18.0
  reefer_vehicle_max_temp: number; // e.g. -15.0
  critical_alarm_temp: number; // e.g. -10.0
  temp_log_interval_mins: number; // e.g. 15
  expiry_warning_threshold_days: number; // e.g. 30
  mandatory_temp_sensor_check: boolean;
}

export interface RimiCustomerOrderPolicies {
  min_order_value: number; // e.g. 5000 (INR)
  standard_delivery_lead_hours: number; // e.g. 24
  allow_credit_terms: boolean;
  credit_terms_days: number; // e.g. 15
  order_cancellation_window_hours: number; // e.g. 4
  auto_generate_eway_bill: boolean;
  allow_customer_stock_reservation: boolean;
}

export interface RimiBroadcast {
  is_active: boolean;
  message: string;
  urgency: 'info' | 'warning' | 'urgent' | 'success';
  target_audience: 'all' | 'customers' | 'staff';
  link_url?: string;
  link_label?: string;
}

export interface RimiDistributionZone {
  id: string;
  zone_name: string;
  hub_city: string;
  covered_regions: string[];
  standard_delivery_days: string;
  min_delivery_charge: number;
  is_active: boolean;
}

export interface RimiCustomizationConfig {
  id: string;
  updated_at: string;
  branding: RimiBranding;
  cold_chain: RimiColdChainThresholds;
  customer_policies: RimiCustomerOrderPolicies;
  broadcast: RimiBroadcast;
  zones: RimiDistributionZone[];
}

export const DEFAULT_RIMI_CONFIG: RimiCustomizationConfig = {
  id: 'ferex-rimi-config-v1',
  updated_at: new Date().toISOString(),
  branding: {
    entity_name: 'Rimi Frozen Foods Pvt Ltd India',
    portal_title: 'Rimi Frozen Distribution Hub',
    tagline: 'Premier Temperature-Controlled Cold Chain & Wholesale Frozen Food Logistics',
    support_email: 'orders@rimifrozen.com',
    dispatch_hotline: '+91 80001 99887',
    whatsapp_order_desk: '+91 99880 33445',
    office_hub_address: 'Central Cold Chain Hub, APMC Yard, Navi Mumbai & Bangalore Hub',
    operating_hours: 'Mon – Sat: 06:00 AM – 10:00 PM IST (Cold Dispatch Active)',
    gstin_code: '27AAAAA0000A1Z5',
    base_currency: 'INR',
    timezone: 'Asia/Kolkata (IST)'
  },
  cold_chain: {
    cold_room_max_temp: -18.0,
    reefer_vehicle_max_temp: -15.0,
    critical_alarm_temp: -10.0,
    temp_log_interval_mins: 15,
    expiry_warning_threshold_days: 30,
    mandatory_temp_sensor_check: true
  },
  customer_policies: {
    min_order_value: 5000,
    standard_delivery_lead_hours: 24,
    allow_credit_terms: true,
    credit_terms_days: 15,
    order_cancellation_window_hours: 4,
    auto_generate_eway_bill: true,
    allow_customer_stock_reservation: true
  },
  broadcast: {
    is_active: true,
    message: '❄️ Sub-Zero Cold Chain Fleet Operating at 100% capacity. Fresh IQF seafood and frozen dairy stock arrived.',
    urgency: 'info',
    target_audience: 'all',
    link_url: '/rimi/customer-portal',
    link_label: 'Explore Catalog'
  },
  zones: [
    {
      id: 'zone-mum',
      zone_name: 'Western Gateway Hub',
      hub_city: 'Mumbai / Navi Mumbai',
      covered_regions: ['Mumbai City', 'Thane', 'Navi Mumbai', 'Pune Urban'],
      standard_delivery_days: 'Same Day / Next Morning',
      min_delivery_charge: 0,
      is_active: true
    },
    {
      id: 'zone-blr',
      zone_name: 'Southern Tech & Retail Hub',
      hub_city: 'Bangalore',
      covered_regions: ['Bangalore Urban', 'Mysore', 'Hosur Industrial Corridor'],
      standard_delivery_days: 'Next Day Morning',
      min_delivery_charge: 0,
      is_active: true
    },
    {
      id: 'zone-hyd',
      zone_name: 'Deccan Cold Corridor',
      hub_city: 'Hyderabad',
      covered_regions: ['Hyderabad Metro', 'Secunderabad', 'Cyberabad'],
      standard_delivery_days: '24 - 48 Hours',
      min_delivery_charge: 500,
      is_active: true
    }
  ]
};

const STORAGE_KEY = 'ferex_rimi_customization_config';

export const getRimiConfig = async (): Promise<RimiCustomizationConfig> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.branding) {
        return {
          ...DEFAULT_RIMI_CONFIG,
          ...parsed,
          branding: { ...DEFAULT_RIMI_CONFIG.branding, ...(parsed.branding || {}) },
          cold_chain: { ...DEFAULT_RIMI_CONFIG.cold_chain, ...(parsed.cold_chain || {}) },
          customer_policies: { ...DEFAULT_RIMI_CONFIG.customer_policies, ...(parsed.customer_policies || {}) },
          broadcast: { ...DEFAULT_RIMI_CONFIG.broadcast, ...(parsed.broadcast || {}) },
          zones: Array.isArray(parsed.zones) ? parsed.zones : DEFAULT_RIMI_CONFIG.zones
        };
      }
    }
  } catch (e) {
    console.warn('Could not read rimi config from storage:', e);
  }

  try {
    const { data } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 'ferex-rimi-config-v1')
      .maybeSingle();

    if (data && data.config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
      return data.config;
    }
  } catch (err) {}

  return DEFAULT_RIMI_CONFIG;
};

export const saveRimiConfig = async (config: RimiCustomizationConfig): Promise<RimiCustomizationConfig> => {
  const updated: RimiCustomizationConfig = {
    ...config,
    updated_at: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ferex_rimi_config_change', { detail: updated }));
  } catch (e) {
    console.error('Error saving rimi config:', e);
  }

  try {
    await supabase.from('system_config').upsert({
      id: updated.id || 'ferex-rimi-config-v1',
      config: updated,
      updated_at: updated.updated_at
    });
  } catch (err) {}

  return updated;
};

export const resetRimiConfig = async (): Promise<RimiCustomizationConfig> => {
  return await saveRimiConfig(DEFAULT_RIMI_CONFIG);
};
