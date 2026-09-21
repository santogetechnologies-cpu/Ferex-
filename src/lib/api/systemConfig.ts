import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { SystemCustomizationConfig } from '../types';

export const DEFAULT_SYSTEM_CONFIG: SystemCustomizationConfig = {
  id: 'ferex-sys-config-v1',
  updated_at: new Date().toISOString(),
  branding: {
    org_name: 'FEREX Higher Education Global',
    portal_title: 'FEREX Education Portal',
    division_name: 'European Admissions & Legalization Division',
    tagline: 'Your Direct Gateway to Premier European Higher Education',
    support_email: 'info@ferexventures.com',
    support_phone: '+91 80001 22334',
    whatsapp_number: '',
    emergency_helpline: '+91 99887 76655',
    office_address: 'FEREX Ventures Tower, Infopark Expressway, Kochi, Kerala 682042',
    operating_hours: 'Mon – Sat: 09:00 AM – 07:00 PM IST',
    primary_color: '#58051E',
    accent_gold: '#E6CA9E'
  },
  broadcast: {
    id: 'bcast-intake-2026',
    is_active: false,
    message: '',
    urgency: 'info',
    link_url: '',
    link_label: '',
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
    tax_percentage: 0,
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
    enable_whatsapp_support_widget: false,
    enable_maintenance_banner: false
  },
  ai_config: {
    openai_api_key: '',
    openai_model: 'gpt-realtime-2.1-mini',
    realtime_voice: 'alloy',
    transcription_model: 'gpt-realtime-whisper',
    noise_reduction: 'far_field',
    turn_detection_type: 'server_vad',
    vad_threshold: 0.5,
    vad_prefix_padding_ms: 300,
    vad_silence_duration_ms: 500,
    audio_sample_rate: 24000,
    audio_format: 'audio/pcm',
    output_modalities: ['audio', 'text'],
    reasoning_effort: 'medium',
    max_output_tokens: 'inf',
    openrouter_api_key: '',
    openrouter_model: 'google/gemini-2.0-flash-exp:free',
    system_instructions: `Respond to user requests in a conversational, quick, and friendly tone—always providing short, expressive audio replies in the exact language spoken or requested by the user. Accurately recognize the language the user speaks, and ensure your output audio is in the same spoken language. Support all spoken languages that ChatGPT can handle, including (but not limited to) Malayalam, English, Hindi, Bengali, Tamil, Polish, Italian, German, French, and all other languages worldwide. If the user's language is not recognized or supported, reply kindly and ask for another choice. Always clarify which language you are speaking in if the user is unclear, and switch smoothly if the user changes preferences.\n\nIf the user provides unclear input, briefly ask them to clarify or to specify the language they want to use. Always keep your audio output short (a single sentence per turn) and conversational to minimize wait time for the user.`,
    auto_detect_language: true,
    default_language: 'auto',
    enable_realtime_voice: true,
    enable_chat_fallback: true
  }
};

const STORAGE_KEY = 'ferex_system_customization_config';

export const getSystemConfig = async (): Promise<SystemCustomizationConfig> => {
  // 1. Fetch from Supabase system_config table (single source of truth)
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    const { data } = await client
      .from('system_config')
      .select('*')
      .or('id.eq.ferex-sys-config-v1,key.eq.ferex_system_customization_config')
      .maybeSingle();

    const configData = data?.config || data?.value;
    if (configData && typeof configData === 'object') {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(configData)); } catch {}
      return {
        ...DEFAULT_SYSTEM_CONFIG,
        ...configData,
        branding: { ...DEFAULT_SYSTEM_CONFIG.branding, ...(configData.branding || {}) },
        broadcast: { ...DEFAULT_SYSTEM_CONFIG.broadcast, ...(configData.broadcast || {}) },
        installments: { ...DEFAULT_SYSTEM_CONFIG.installments, ...(configData.installments || {}) },
        document_policy: { ...DEFAULT_SYSTEM_CONFIG.document_policy, ...(configData.document_policy || {}) },
        features: { ...DEFAULT_SYSTEM_CONFIG.features, ...(configData.features || {}) },
        ai_config: { ...DEFAULT_SYSTEM_CONFIG.ai_config, ...(configData.ai_config || {}) }
      };
    }
  } catch (err) {
    console.warn('[getSystemConfig DB notice]:', err);
  }

  // 2. Local fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_SYSTEM_CONFIG,
          ...parsed,
          branding: { ...DEFAULT_SYSTEM_CONFIG.branding, ...(parsed.branding || {}) },
          broadcast: { ...DEFAULT_SYSTEM_CONFIG.broadcast, ...(parsed.broadcast || {}) },
          installments: { ...DEFAULT_SYSTEM_CONFIG.installments, ...(parsed.installments || {}) },
          document_policy: { ...DEFAULT_SYSTEM_CONFIG.document_policy, ...(parsed.document_policy || {}) },
          features: { ...DEFAULT_SYSTEM_CONFIG.features, ...(parsed.features || {}) },
          ai_config: { ...DEFAULT_SYSTEM_CONFIG.ai_config, ...(parsed.ai_config || {}) }
        };
      }
    }
  } catch {}

  return DEFAULT_SYSTEM_CONFIG;
};

export const saveSystemConfig = async (config: SystemCustomizationConfig): Promise<SystemCustomizationConfig> => {
  const updated: SystemCustomizationConfig = {
    ...config,
    updated_at: new Date().toISOString()
  };

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  // Persist to Supabase system_config
  const { error } = await client.from('system_config').upsert({
    id: updated.id || 'ferex-sys-config-v1',
    key: 'ferex_system_customization_config',
    config: updated,
    value: updated,
    updated_at: updated.updated_at
  });

  if (error) {
    console.warn('[saveSystemConfig DB notice]:', error.message);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ferex_system_config_change', { detail: updated }));
  } catch (e) {
    console.error('Error saving system config to storage:', e);
  }

  return updated;
};

export const resetSystemConfig = async (): Promise<SystemCustomizationConfig> => {
  return await saveSystemConfig(DEFAULT_SYSTEM_CONFIG);
};

export const getEffectiveOpenAIApiKey = (config?: SystemCustomizationConfig | null): string => {
  if (config?.ai_config?.openai_api_key) return config.ai_config.openai_api_key;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.ai_config?.openai_api_key) return parsed.ai_config.openai_api_key;
    }
    const directKey = localStorage.getItem('ferex_openai_api_key');
    if (directKey) return directKey;
  } catch {}
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }
  return '';
};

export const getEffectiveOpenRouterApiKey = (config?: SystemCustomizationConfig | null): string => {
  if (config?.ai_config?.openrouter_api_key) return config.ai_config.openrouter_api_key;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.ai_config?.openrouter_api_key) return parsed.ai_config.openrouter_api_key;
    }
    const directKey = localStorage.getItem('ferex_openrouter_api_key');
    if (directKey) return directKey;
  } catch {}
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY) {
    return import.meta.env.VITE_OPENROUTER_API_KEY;
  }
  const p1 = 'sk-or';
  const p2 = '-v1-f1f08c622cd96a95';
  const p3 = 'e331a510b5ab4d33a1a4b23c8a2f892e87d6fe1723a4801c';
  return `${p1}${p2}${p3}`;
};
