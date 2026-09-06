import { supabase } from '../supabase';
import type { SystemCustomizationConfig } from '../types';

export const DEFAULT_SYSTEM_CONFIG: SystemCustomizationConfig = {
  id: 'ferex-sys-config-v1',
  updated_at: new Date().toISOString(),
  branding: {
    org_name: 'FEREX Higher Education Global',
    portal_title: 'FEREX Education Portal',
    division_name: 'European Admissions & Legalization Division',
    tagline: 'Your Direct Gateway to Premier European Higher Education',
    support_email: 'admissions@ferexeducation.com',
    support_phone: '+91 80001 22334',
    whatsapp_number: '+48 571 890 123',
    emergency_helpline: '+91 99887 76655',
    office_address: 'Plac Bankowy 2, Warsaw, Poland & Central Desk, Bangalore, India',
    operating_hours: 'Mon – Sat: 09:00 AM – 07:00 PM CET / IST',
    primary_color: '#6A1B2E',
    accent_gold: '#E6CA9E'
  },
  broadcast: {
    id: 'bcast-intake-2026',
    is_active: true,
    message: '🎓 Fall 2026 European Intake Applications Open! Early Legalization (NAWA / APS / CIMEA) deadline is approaching fast.',
    urgency: 'info',
    link_url: '/student/select-university',
    link_label: 'Explore Programs',
    target_audience: 'all',
    expires_at: '2026-10-31'
  },
  installments: {
    stage_1_name: 'Stage 1 — Registration & Academic Legalization Audit',
    stage_1_amount: 15000,
    stage_1_currency: 'INR',
    stage_1_due_label: 'Required to initiate university qualification audit & translations',
    stage_2_name: 'Stage 2 — University Tuition Deposit',
    stage_2_amount_type: 'custom_tuition',
    stage_2_fixed_amount: 2500,
    stage_2_due_label: 'Transferred directly to university IBAN for Final Acceptance letter',
    stage_3_name: 'Stage 3 — Post-Visa & Departure Clearance Fee',
    stage_3_amount: 25000,
    stage_3_currency: 'INR',
    stage_3_due_label: 'Payable upon stamping of Schengen Type-D student visa',
    tax_percentage: 18,
    refund_policy_days: 14
  },
  document_policy: {
    min_passport_validity_months: 18,
    max_file_size_mb: 15,
    allowed_file_types: ['PDF', 'JPG', 'PNG', 'DOCX'],
    require_moi_letter: true,
    require_apostille_for_europe: true,
    auto_notify_counselor_on_upload: true
  },
  visa_mock: {
    mock_sessions_included: 2,
    booking_lead_time_days: 2,
    emergency_visa_helpline: '+48 571 890 999',
    embassy_biometric_guidance_url: 'https://visa.vfsglobal.com'
  },
  features: {
    enable_landing_calculator: true,
    enable_direct_course_application: true,
    enable_student_meeting_self_booking: true,
    enable_whatsapp_support_widget: true,
    enable_maintenance_banner: false
  }
};

const STORAGE_KEY = 'ferex_system_customization_config';

export const getSystemConfig = async (): Promise<SystemCustomizationConfig> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.branding) {
        return {
          ...DEFAULT_SYSTEM_CONFIG,
          ...parsed,
          branding: { ...DEFAULT_SYSTEM_CONFIG.branding, ...(parsed.branding || {}) },
          broadcast: { ...DEFAULT_SYSTEM_CONFIG.broadcast, ...(parsed.broadcast || {}) },
          installments: { ...DEFAULT_SYSTEM_CONFIG.installments, ...(parsed.installments || {}) },
          document_policy: { ...DEFAULT_SYSTEM_CONFIG.document_policy, ...(parsed.document_policy || {}) },
          visa_mock: { ...DEFAULT_SYSTEM_CONFIG.visa_mock, ...(parsed.visa_mock || {}) },
          features: { ...DEFAULT_SYSTEM_CONFIG.features, ...(parsed.features || {}) }
        };
      }
    }
  } catch (e) {
    console.warn('Could not read system config from localStorage:', e);
  }

  // Try Supabase system_config table if present
  try {
    const { data } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 'ferex-sys-config-v1')
      .maybeSingle();

    if (data && data.config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
      return data.config;
    }
  } catch (err) {}

  return DEFAULT_SYSTEM_CONFIG;
};

export const saveSystemConfig = async (config: SystemCustomizationConfig): Promise<SystemCustomizationConfig> => {
  const updated: SystemCustomizationConfig = {
    ...config,
    updated_at: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ferex_system_config_change', { detail: updated }));
  } catch (e) {
    console.error('Error saving system config to storage:', e);
  }

  // Persist to Supabase if available
  try {
    await supabase.from('system_config').upsert({
      id: updated.id || 'ferex-sys-config-v1',
      config: updated,
      updated_at: updated.updated_at
    });
  } catch (err) {}

  return updated;
};

export const resetSystemConfig = async (): Promise<SystemCustomizationConfig> => {
  return await saveSystemConfig(DEFAULT_SYSTEM_CONFIG);
};
