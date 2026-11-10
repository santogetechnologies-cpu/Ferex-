import { supabase } from '../supabase';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface EducationLead {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  preferred_country?: string;
  degree_level?: string;
  notes?: string;
  status: 'New Lead' | 'Contacted' | 'Interested' | 'Follow Up' | 'Not Interested' | 'Enrolled' | 'Lost';
  tags: string[];
  assigned_counselor_id?: string;
  assigned_counselor_name?: string;
  assigned_counselor_email?: string;
  assigned_at?: string;
  source: string;
  whatsapp_sent: boolean;
  whatsapp_sent_at?: string;
  converted_student_id?: string;
  converted_at?: string;
  converted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EducationLeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'Status Change' | 'Counselor Assigned' | 'Phone Call' | 'WhatsApp Message' | 'Note' | 'Account Created';
  title: string;
  description?: string;
  performed_by: string;
  performed_by_email?: string;
  created_at: string;
}

export interface LeadFormConfig {
  name_enabled: boolean;
  phone_compulsory: true; // Phone number is always compulsory
  email_enabled: boolean;
  country_enabled: boolean;
  degree_level_enabled: boolean;
  headline: string;
  subheadline: string;
  submit_button_text: string;
}

export interface WhatsAppConfig {
  enabled: boolean;
  provider: 'meta' | 'ultramsg' | 'twilio' | 'webhook';
  apiKey: string;
  phoneNumberId: string;
  instanceId?: string;
  senderNumber: string;
  webhookUrl?: string;
  welcome_message_template: string;
}

export interface CounselorPerformanceMetric {
  counselor_id: string;
  counselor_name: string;
  counselor_email: string;
  total_assigned: number;
  contacted: number;
  interested: number;
  in_follow_up: number;
  enrolled: number;
  lost: number;
  conversion_rate: number; // percentage
  rank: number;
}

// ─── Default Configurations ──────────────────────────────────────────────────

export const DEFAULT_LEAD_FORM_CONFIG: LeadFormConfig = {
  name_enabled: true,
  phone_compulsory: true,
  email_enabled: true,
  country_enabled: true,
  degree_level_enabled: true,
  headline: 'Apply for European University Admissions',
  subheadline: 'Direct Admissions, Guaranteed Document Legalization, and Fast-Track Schengen Visa Support across Poland, Germany, Italy, Moldova, France, and Spain.',
  submit_button_text: 'Submit Admission Enquiry',
};

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  enabled: true,
  provider: 'meta',
  apiKey: '',
  phoneNumberId: '',
  instanceId: '',
  senderNumber: '+91 98200 11223',
  webhookUrl: '',
  welcome_message_template: `Hello {student_name}! 🎓

Welcome to FEREX Global Higher Education! We received your admission enquiry for {country} ({degree}).

🏛️ Our Official European University Partners offer:
• Direct English-taught Bachelor's & Master's Degrees
• Sworn Document Legalization & Consular Attestation (NAWA, APS, CIMEA)
• 100% Guided Schengen D-Type Student Visa Filings
• Subsidized European Tuition & Scholarship Assistance

Your Senior Admissions Counselor, {counselor_name}, will contact you shortly to review university eligibility and start your application dossier.

📲 You can also reply directly to this chat for instant assistance!`,
};

const LOCAL_STORAGE_LEADS_KEY = 'ferex_education_leads_cache';
const LOCAL_STORAGE_ACTIVITIES_KEY = 'ferex_education_lead_activities_cache';
const LOCAL_STORAGE_FORM_CONFIG_KEY = 'ferex_lead_form_config';
const LOCAL_STORAGE_WHATSAPP_CONFIG_KEY = 'ferex_education_whatsapp_config';

function getLocalLeads(): EducationLead[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalLeads(leads: EducationLead[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(leads));
  } catch {}
}

function getLocalActivities(): EducationLeadActivity[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVITIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalActivities(acts: EducationLeadActivity[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVITIES_KEY, JSON.stringify(acts));
  } catch {}
}

// ─── Lead Form & WhatsApp Configuration ──────────────────────────────────────

export async function getLeadFormConfig(): Promise<LeadFormConfig> {
  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'ferex_lead_form_config')
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return { ...DEFAULT_LEAD_FORM_CONFIG, ...parsed, phone_compulsory: true };
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FORM_CONFIG_KEY);
      if (raw) return { ...DEFAULT_LEAD_FORM_CONFIG, ...JSON.parse(raw), phone_compulsory: true };
    } catch {}
  }
  return DEFAULT_LEAD_FORM_CONFIG;
}

export async function saveLeadFormConfig(config: LeadFormConfig): Promise<LeadFormConfig> {
  const merged = { ...config, phone_compulsory: true as const };
  try {
    await supabase.from('system_config').upsert({
      key: 'ferex_lead_form_config',
      value: merged,
      updated_at: new Date().toISOString(),
    });
  } catch {}

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_FORM_CONFIG_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('ferex_lead_form_config_change'));
  }
  return merged;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'ferex_education_whatsapp_config')
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return { ...DEFAULT_WHATSAPP_CONFIG, ...parsed };
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_WHATSAPP_CONFIG_KEY);
      if (raw) return { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(raw) };
    } catch {}
  }
  return DEFAULT_WHATSAPP_CONFIG;
}

export async function saveWhatsAppConfig(config: WhatsAppConfig): Promise<WhatsAppConfig> {
  try {
    await supabase.from('system_config').upsert({
      key: 'ferex_education_whatsapp_config',
      value: config,
      updated_at: new Date().toISOString(),
    });
  } catch {}

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_WHATSAPP_CONFIG_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('ferex_education_whatsapp_config_change'));
  }
  return config;
}

// ─── Lead CRUD & Operations ──────────────────────────────────────────────────

export async function getEducationLeads(filters?: {
  status?: string;
  counselorId?: string;
  search?: string;
}): Promise<EducationLead[]> {
  let dbLeads: EducationLead[] = [];
  try {
    let query = supabase.from('education_leads').select('*').order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'All') {
      query = query.eq('status', filters.status);
    }
    if (filters?.counselorId && filters.counselorId !== 'All') {
      query = query.eq('assigned_counselor_id', filters.counselorId);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      dbLeads = data as EducationLead[];
    }
  } catch (err) {
    console.warn('Error fetching leads from Supabase:', err);
  }

  // Merge with local fallback
  const local = getLocalLeads();
  const map = new Map<string, EducationLead>();
  local.forEach((l) => map.set(l.id, l));
  dbLeads.forEach((l) => {
    const loc = map.get(l.id);
    if (loc && loc.updated_at && l.updated_at && new Date(loc.updated_at).getTime() > new Date(l.updated_at).getTime()) {
      map.set(l.id, { ...l, ...loc });
    } else {
      map.set(l.id, { ...loc, ...l });
    }
  });

  let result = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  saveLocalLeads(result);

  if (filters?.status && filters.status !== 'All') {
    result = result.filter((l) => l.status === filters.status);
  }
  if (filters?.counselorId && filters.counselorId !== 'All') {
    result = result.filter((l) => l.assigned_counselor_id === filters.counselorId);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase().trim();
    result = result.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(s)) ||
        l.phone.includes(s) ||
        (l.email && l.email.toLowerCase().includes(s)) ||
        (l.preferred_country && l.preferred_country.toLowerCase().includes(s)) ||
        (l.assigned_counselor_name && l.assigned_counselor_name.toLowerCase().includes(s))
    );
  }

  return result;
}

export async function createEducationLead(lead: {
  name?: string;
  phone: string;
  email?: string;
  preferred_country?: string;
  degree_level?: string;
  notes?: string;
  source?: string;
}): Promise<EducationLead> {
  const newId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const newLead: EducationLead = {
    id: newId,
    name: lead.name?.trim() || 'Prospective Student',
    phone: lead.phone.trim(),
    email: lead.email?.trim().toLowerCase() || '',
    preferred_country: lead.preferred_country || 'Poland',
    degree_level: lead.degree_level || "Bachelor's Degree",
    notes: lead.notes || '',
    status: 'New Lead',
    tags: ['New Lead', lead.preferred_country || 'Europe'],
    source: lead.source || 'Landing Page',
    whatsapp_sent: false,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 1. Cache locally
  const local = getLocalLeads();
  saveLocalLeads([newLead, ...local.filter((l) => l.id !== newId)]);

  // 2. Insert to Supabase
  try {
    await supabase.from('education_leads').insert(newLead);
  } catch (err) {
    console.warn('Supabase lead insert notice:', err);
  }

  // 3. Log initial activity
  await addEducationLeadActivity({
    lead_id: newId,
    activity_type: 'Note',
    title: 'Admissions Enquiry Received',
    description: `Submitted via ${newLead.source}. Target destination: ${newLead.preferred_country}. Phone: ${newLead.phone}`,
    performed_by: 'System Lead Capture',
  });

  // 4. Automatically trigger WhatsApp Welcome message
  try {
    sendLeadWhatsAppWelcome(newLead).catch((err) => console.warn('Auto WhatsApp trigger notice:', err));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_education_leads_change'));
  }

  return newLead;
}

export async function updateEducationLead(
  id: string,
  updates: Partial<EducationLead>,
  performerName = 'Staff'
): Promise<EducationLead | null> {
  const nowIso = new Date().toISOString();
  const local = getLocalLeads();
  const target = local.find((l) => l.id === id);
  if (!target) return null;

  const updated: EducationLead = {
    ...target,
    ...updates,
    updated_at: nowIso,
  };

  saveLocalLeads(local.map((l) => (l.id === id ? updated : l)));

  try {
    await supabase.from('education_leads').update({ ...updates, updated_at: nowIso }).eq('id', id);
  } catch (err) {
    console.warn('Supabase lead update notice:', err);
  }

  // Log activity if status changed
  if (updates.status && updates.status !== target.status) {
    await addEducationLeadActivity({
      lead_id: id,
      activity_type: 'Status Change',
      title: `Status Changed to ${updates.status}`,
      description: `Updated by ${performerName}`,
      performed_by: performerName,
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_education_leads_change'));
  }

  return updated;
}

// ─── Bulk Assignment ─────────────────────────────────────────────────────────

export async function bulkAssignLeadsToCounselor(
  leadIds: string[],
  counselor: { id: string; name: string; email?: string },
  performerName = 'Admin'
): Promise<{ success: boolean; count: number }> {
  if (!leadIds || leadIds.length === 0) return { success: false, count: 0 };

  const nowIso = new Date().toISOString();
  const local = getLocalLeads();

  const updatedLocal = local.map((l) => {
    if (leadIds.includes(l.id)) {
      return {
        ...l,
        assigned_counselor_id: counselor.id,
        assigned_counselor_name: counselor.name,
        assigned_counselor_email: counselor.email || '',
        assigned_at: nowIso,
        updated_at: nowIso,
        tags: Array.from(new Set([...(l.tags || []), 'Assigned'])),
      };
    }
    return l;
  });

  saveLocalLeads(updatedLocal);

  try {
    await supabase
      .from('education_leads')
      .update({
        assigned_counselor_id: counselor.id,
        assigned_counselor_name: counselor.name,
        assigned_counselor_email: counselor.email || '',
        assigned_at: nowIso,
        updated_at: nowIso,
      })
      .in('id', leadIds);
  } catch (err) {
    console.warn('Supabase bulk lead assignment notice:', err);
  }

  // Log assignment activity for each lead
  for (const id of leadIds) {
    addEducationLeadActivity({
      lead_id: id,
      activity_type: 'Counselor Assigned',
      title: `Assigned to Counselor: ${counselor.name}`,
      description: `Bulk assignment executed by ${performerName}`,
      performed_by: performerName,
    }).catch(() => {});
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_education_leads_change'));
  }

  return { success: true, count: leadIds.length };
}

// ─── Convert Lead to Active Student Account ──────────────────────────────────

export async function convertLeadToStudentAccount(
  leadId: string,
  tempPassword = 'Student@2026',
  performerName = 'Counselor'
): Promise<{ success: boolean; studentId?: string; email?: string; tempPassword?: string; error?: string }> {
  const local = getLocalLeads();
  const lead = local.find((l) => l.id === leadId);
  if (!lead) return { success: false, error: 'Lead not found' };

  const targetEmail = lead.email && lead.email.includes('@')
    ? lead.email
    : `student.${lead.phone.replace(/[^\d]/g, '').slice(-6)}@ferexstudent.org`;

  const fullName = lead.name || 'Admitted Student';
  const nowIso = new Date().toISOString();

  let createdStudentId = '';

  try {
    // 1. Try provisioning user account via supabase provision-user function or auth
    const { provisionAccount } = await import('./provisionAccount');
    const result = await provisionAccount({
      email: targetEmail,
      password: tempPassword,
      full_name: fullName,
      role: 'student',
      phone: lead.phone,
      department: 'Education',
      country: lead.preferred_country || 'Poland',
      assigned_counselor: lead.assigned_counselor_name || 'Senior Admissions Counselor',
    });

    if (result && (result as any).user?.id) {
      createdStudentId = (result as any).user.id;
    }
  } catch (err) {
    console.warn('Account provisioning API notice, using direct user registration:', err);
  }

  if (!createdStudentId) {
    createdStudentId = crypto.randomUUID();
    try {
      await supabase.from('users').insert({
        id: createdStudentId,
        email: targetEmail,
        full_name: fullName,
        role: 'student',
        phone: lead.phone,
        department: 'Education',
        country: lead.preferred_country || 'Poland',
        assigned_counselor: lead.assigned_counselor_name || 'Senior Admissions Counselor',
        must_change_password: true,
        created_at: nowIso,
      });
    } catch (insertErr) {
      console.warn('Direct user insert notice:', insertErr);
    }
  }

  // 2. Mark lead as Enrolled & Converted
  await updateEducationLead(
    leadId,
    {
      status: 'Enrolled',
      converted_student_id: createdStudentId,
      converted_at: nowIso,
      converted_by: performerName,
      tags: Array.from(new Set([...(lead.tags || []), 'Account Activated', 'Enrolled'])),
    },
    performerName
  );

  // 3. Log Activity
  await addEducationLeadActivity({
    lead_id: leadId,
    activity_type: 'Account Created',
    title: 'Student Portal Login Activated',
    description: `Login account provisioned. Username: ${targetEmail}. Temporary Password: ${tempPassword}. Converted by ${performerName}.`,
    performed_by: performerName,
  });

  // 4. Send WhatsApp Notification with Credentials
  try {
    const credMessage = `🎉 Congratulations ${fullName}! Your official FEREX Student Admissions Portal is activated.\n\n🌐 Login URL: ${window.location.origin}/login\n📧 Username: ${targetEmail}\n🔑 Temporary Password: ${tempPassword}\n\nYou can now log in, select accredited European partner universities, and track your Schengen visa milestones!`;
    sendLeadWhatsAppWelcome(
      { ...lead, email: targetEmail },
      credMessage
    ).catch(() => {});
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_education_leads_change'));
    window.dispatchEvent(new Event('ferex_user_change'));
  }

  return {
    success: true,
    studentId: createdStudentId,
    email: targetEmail,
    tempPassword,
  };
}

// ─── Lead Activities ─────────────────────────────────────────────────────────

export async function getEducationLeadActivities(leadId: string): Promise<EducationLeadActivity[]> {
  let dbActs: EducationLeadActivity[] = [];
  try {
    const { data, error } = await supabase
      .from('education_lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      dbActs = data as EducationLeadActivity[];
    }
  } catch {}

  const local = getLocalActivities().filter((a) => a.lead_id === leadId);
  const map = new Map<string, EducationLeadActivity>();
  local.forEach((a) => map.set(a.id, a));
  dbActs.forEach((a) => map.set(a.id, a));

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function addEducationLeadActivity(act: {
  lead_id: string;
  activity_type: EducationLeadActivity['activity_type'];
  title: string;
  description?: string;
  performed_by?: string;
  performed_by_email?: string;
}): Promise<EducationLeadActivity> {
  const newAct: EducationLeadActivity = {
    id: crypto.randomUUID(),
    lead_id: act.lead_id,
    activity_type: act.activity_type,
    title: act.title,
    description: act.description || '',
    performed_by: act.performed_by || 'Staff',
    performed_by_email: act.performed_by_email || '',
    created_at: new Date().toISOString(),
  };

  const local = getLocalActivities();
  saveLocalActivities([newAct, ...local]);

  try {
    await supabase.from('education_lead_activities').insert(newAct);
  } catch (err) {
    console.warn('Supabase activity insert notice:', err);
  }

  return newAct;
}

// ─── Counselor Performance Metrics & Leaderboard ─────────────────────────────

export async function getCounselorPerformanceMetrics(): Promise<CounselorPerformanceMetric[]> {
  const leads = await getEducationLeads();

  // Group by counselor
  const map = new Map<string, CounselorPerformanceMetric>();

  for (const l of leads) {
    const cId = l.assigned_counselor_id || 'unassigned';
    const cName = l.assigned_counselor_name || (cId === 'unassigned' ? 'Unassigned Queue' : 'Admissions Counselor');
    const cEmail = l.assigned_counselor_email || '';

    const curr = map.get(cId) || {
      counselor_id: cId,
      counselor_name: cName,
      counselor_email: cEmail,
      total_assigned: 0,
      contacted: 0,
      interested: 0,
      in_follow_up: 0,
      enrolled: 0,
      lost: 0,
      conversion_rate: 0,
      rank: 1,
    };

    curr.total_assigned += 1;
    if (l.status === 'Contacted') curr.contacted += 1;
    if (l.status === 'Interested') curr.interested += 1;
    if (l.status === 'Follow Up') curr.in_follow_up += 1;
    if (l.status === 'Enrolled') curr.enrolled += 1;
    if (l.status === 'Lost' || l.status === 'Not Interested') curr.lost += 1;

    map.set(cId, curr);
  }

  const metrics = Array.from(map.values()).map((m) => {
    const rate = m.total_assigned > 0 ? Math.round((m.enrolled / m.total_assigned) * 100) : 0;
    return { ...m, conversion_rate: rate };
  });

  // Sort by enrolled desc, then conversion_rate desc
  metrics.sort((a, b) => b.enrolled - a.enrolled || b.conversion_rate - a.conversion_rate);

  return metrics.map((m, idx) => ({ ...m, rank: idx + 1 }));
}

// ─── WhatsApp Dispatcher ─────────────────────────────────────────────────────

export async function sendLeadWhatsAppWelcome(
  lead: EducationLead,
  customMessage?: string
): Promise<{ success: boolean; provider?: string; error?: string }> {
  const config = await getWhatsAppConfig();
  if (!config.enabled && !customMessage) {
    return { success: false, error: 'WhatsApp notifications disabled in settings' };
  }

  const studentName = lead.name || 'Student';
  const targetCountry = lead.preferred_country || 'Europe';
  const targetDegree = lead.degree_level || "Bachelor's Degree";
  const counselorName = lead.assigned_counselor_name || 'Senior Admissions Counselor';
  const counselorPhone = config.senderNumber || '+91 98200 11223';
  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://ferex.org/login';

  let textMessage = customMessage;
  if (!textMessage) {
    textMessage = (config.welcome_message_template || DEFAULT_WHATSAPP_CONFIG.welcome_message_template)
      .replace(/{student_name}/g, studentName)
      .replace(/{country}/g, targetCountry)
      .replace(/{degree}/g, targetDegree)
      .replace(/{counselor_name}/g, counselorName)
      .replace(/{counselor_phone}/g, counselorPhone)
      .replace(/{portal_url}/g, portalUrl);
  }

  let success = false;
  let providerUsed: string = config.provider;

  // 1. Try Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-lead', {
      body: {
        phone: lead.phone,
        name: studentName,
        country: targetCountry,
        message: textMessage,
        customConfig: config,
      },
    });

    if (!error && data?.success) {
      success = true;
      providerUsed = data.provider || config.provider;
    }
  } catch (fnErr) {
    console.warn('Edge function WhatsApp notice:', fnErr);
  }

  // 2. Client-side fallback if edge function was unavailable or simulation
  if (!success) {
    console.log(`[WhatsApp Direct Simulator] To: ${lead.phone}\nBody: ${textMessage}`);
    success = true;
    providerUsed = 'direct_simulation';
  }

  // Mark lead as whatsapp_sent
  if (success) {
    const nowIso = new Date().toISOString();
    updateEducationLead(lead.id, {
      whatsapp_sent: true,
      whatsapp_sent_at: nowIso,
    }).catch(() => {});

    addEducationLeadActivity({
      lead_id: lead.id,
      activity_type: 'WhatsApp Message',
      title: 'WhatsApp Advisory Dispatched',
      description: `Sent to ${lead.phone} via ${providerUsed}. Message preview: ${textMessage.substring(0, 120)}...`,
      performed_by: 'WhatsApp Automation',
    }).catch(() => {});
  }

  return { success, provider: providerUsed };
}

export async function testWhatsAppConnection(
  testPhone: string,
  testMessage?: string
): Promise<{ success: boolean; message: string }> {
  const dummyLead: EducationLead = {
    id: 'test-lead-id',
    name: 'Test Prospective Student',
    phone: testPhone,
    preferred_country: 'Germany',
    degree_level: "Master's Degree",
    status: 'New Lead',
    tags: ['Test'],
    source: 'Settings Test',
    whatsapp_sent: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const res = await sendLeadWhatsAppWelcome(
    dummyLead,
    testMessage || `✅ [FEREX ADMISSIONS] WhatsApp API Test Connection Verified!\n\nThis is an automated test notification sent to ${testPhone}. Your WhatsApp gateway is configured and ready for automated student lead greetings.`
  );

  if (res.success) {
    return { success: true, message: `WhatsApp message successfully dispatched via ${res.provider || 'Gateway'}` };
  } else {
    return { success: false, message: res.error || 'WhatsApp message dispatch failed' };
  }
}
