import { supabase } from '../supabase';

export interface DigitalAgencyBranding {
  agency_name: string;
  portal_title: string;
  tagline: string;
  support_email: string;
  support_phone: string;
  whatsapp_number: string;
  office_address: string;
  operating_hours: string;
  default_currency: 'INR' | 'EUR' | 'USD';
  timezone: string;
  primary_color: string;
}

export interface DigitalClientPortalPolicies {
  allow_self_service_payments: boolean;
  allow_client_change_requests: boolean;
  allow_instant_asset_downloads: boolean;
  require_milestone_signoff: boolean;
  guaranteed_sla_response_hours: number;
  client_review_window_days: number;
}

export interface DigitalDeliveryRules {
  default_sprint_weeks: number;
  require_qa_signoff_before_delivery: boolean;
  enable_automated_task_digests: boolean;
  strict_repository_branch_protection: boolean;
}

export interface DigitalBroadcast {
  is_active: boolean;
  message: string;
  urgency: 'info' | 'warning' | 'urgent' | 'success';
  target_audience: 'all' | 'clients' | 'staff';
  link_url?: string;
  link_label?: string;
}

export interface DigitalServicePackage {
  id: string;
  title: string;
  category: string;
  description: string;
  starting_price: string;
  estimated_timeline: string;
  deliverables: string[];
  is_active: boolean;
}

export interface DigitalCustomizationConfig {
  id: string;
  updated_at: string;
  branding: DigitalAgencyBranding;
  client_policies: DigitalClientPortalPolicies;
  delivery_rules: DigitalDeliveryRules;
  broadcast: DigitalBroadcast;
  services: DigitalServicePackage[];
}

export const DEFAULT_DIGITAL_CONFIG: DigitalCustomizationConfig = {
  id: 'ferex-digital-config-v1',
  updated_at: new Date().toISOString(),
  branding: {
    agency_name: 'FEREX Digital Pvt. Ltd.',
    portal_title: 'FEREX Digital Enterprise Console',
    tagline: 'Enterprise Web, Cloud, AI & Full-Stack Digital Product Engineering',
    support_email: 'digital@ferex.com',
    support_phone: '+91 80001 55667',
    whatsapp_number: '+91 99880 11223',
    office_address: 'Tech Park Hub, Koramangala, Bangalore, India & Warsaw Tech Desk, Poland',
    operating_hours: 'Mon – Fri: 09:30 AM – 06:30 PM IST / CET',
    default_currency: 'INR',
    timezone: 'Asia/Kolkata (IST)',
    primary_color: '#6A1B2E'
  },
  client_policies: {
    allow_self_service_payments: true,
    allow_client_change_requests: true,
    allow_instant_asset_downloads: true,
    require_milestone_signoff: true,
    guaranteed_sla_response_hours: 24,
    client_review_window_days: 7
  },
  delivery_rules: {
    default_sprint_weeks: 2,
    require_qa_signoff_before_delivery: true,
    enable_automated_task_digests: true,
    strict_repository_branch_protection: true
  },
  broadcast: {
    is_active: true,
    message: '🚀 FEREX Digital Cloud & Web Engineering Q3 Sprints are now active. All client deliverables are tracked with 99.9% uptime SLA.',
    urgency: 'info',
    target_audience: 'all',
    link_url: '/digital/projects',
    link_label: 'View Active Sprints'
  },
  services: [
    {
      id: 'srv-web',
      title: 'Full-Stack Web & SaaS Architecture',
      category: 'Engineering',
      description: 'Next.js, React, Node.js, and high-performance serverless cloud application development with automated CI/CD pipelines.',
      starting_price: '₹1,50,000 / $2,000',
      estimated_timeline: '4 - 8 Weeks',
      deliverables: ['Production React/Next.js Web App', 'REST & GraphQL API Engine', 'Automated CI/CD Deployment', 'Cloud Infrastructure Setup'],
      is_active: true
    },
    {
      id: 'srv-mobile',
      title: 'Cross-Platform Mobile Apps (iOS & Android)',
      category: 'Mobile',
      description: 'Native-feel Flutter and React Native mobile applications with offline sync, biometric security, and push notifications.',
      starting_price: '₹2,00,000 / $2,500',
      estimated_timeline: '6 - 10 Weeks',
      deliverables: ['iOS App Store Bundle', 'Google Play Store APK/AAB', 'Push Notification Service', 'App Analytics Dashboard'],
      is_active: true
    },
    {
      id: 'srv-uiux',
      title: 'Enterprise UI/UX Design & Design Systems',
      category: 'Design',
      description: 'Figma interactive prototypes, wireframes, user journeys, accessibility audits, and cohesive component design tokens.',
      starting_price: '₹80,000 / $1,000',
      estimated_timeline: '2 - 4 Weeks',
      deliverables: ['Complete Figma Design System', 'Interactive Clickable Prototype', 'Component Style Guide', 'Developer Handoff Tokens'],
      is_active: true
    },
    {
      id: 'srv-seo',
      title: 'Technical SEO, Performance & Growth Strategy',
      category: 'Marketing',
      description: 'Core Web Vitals optimization, schema markup, technical crawl audit, backlink strategy, and keyword rank tracking.',
      starting_price: '₹45,000 / $600',
      estimated_timeline: 'Ongoing Monthly',
      deliverables: ['Weekly Keyword Rank Audits', 'Speed & Lighthouse 95+ Fixes', 'Structured Data Schema', 'Conversion Rate Audit'],
      is_active: true
    }
  ]
};

const STORAGE_KEY = 'ferex_digital_customization_config';

export const getDigitalConfig = async (): Promise<DigitalCustomizationConfig> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.branding) {
        return {
          ...DEFAULT_DIGITAL_CONFIG,
          ...parsed,
          branding: { ...DEFAULT_DIGITAL_CONFIG.branding, ...(parsed.branding || {}) },
          client_policies: { ...DEFAULT_DIGITAL_CONFIG.client_policies, ...(parsed.client_policies || {}) },
          delivery_rules: { ...DEFAULT_DIGITAL_CONFIG.delivery_rules, ...(parsed.delivery_rules || {}) },
          broadcast: { ...DEFAULT_DIGITAL_CONFIG.broadcast, ...(parsed.broadcast || {}) },
          services: Array.isArray(parsed.services) ? parsed.services : DEFAULT_DIGITAL_CONFIG.services
        };
      }
    }
  } catch (e) {
    console.warn('Could not read digital config from storage:', e);
  }

  // Fallback to Supabase if configured
  try {
    const { data } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 'ferex-digital-config-v1')
      .maybeSingle();

    if (data && data.config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
      return data.config;
    }
  } catch (err) {}

  return DEFAULT_DIGITAL_CONFIG;
};

export const saveDigitalConfig = async (config: DigitalCustomizationConfig): Promise<DigitalCustomizationConfig> => {
  const updated: DigitalCustomizationConfig = {
    ...config,
    updated_at: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ferex_digital_config_change', { detail: updated }));
  } catch (e) {
    console.error('Error saving digital config:', e);
  }

  try {
    await supabase.from('system_config').upsert({
      id: updated.id || 'ferex-digital-config-v1',
      config: updated,
      updated_at: updated.updated_at
    });
  } catch (err) {}

  return updated;
};

export const resetDigitalConfig = async (): Promise<DigitalCustomizationConfig> => {
  return await saveDigitalConfig(DEFAULT_DIGITAL_CONFIG);
};
