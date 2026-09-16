import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(eventName));
  }
}

// ─── Digital Clients (Internal Divisions & External Clients) ────────────────
export interface DigitalClientRecord {
  id: string;
  company_name: string;
  name?: string;
  contact_person: string;
  email: string;
  phone?: string;
  industry?: string;
  city?: string;
  client_type: 'Internal' | 'External';
  status: string;
  total_revenue?: number;
  estimated_budget?: number;
  created_at: string;
  updated_at: string;
}


export type DigitalProjectStage = 'Briefing' | 'In Progress' | 'Review' | 'Revisions' | 'Delivered' | 'Closed';

export interface DigitalDeliverable {
  id: string;
  title: string;
  type: 'Figma' | 'Google Drive' | 'PDF / Document' | 'Canva / Asset' | 'GitHub / Code' | 'Video Reel' | 'Live URL';
  url: string;
  added_at: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  notes?: string;
}

export interface DigitalProjectRecord {
  id: string;
  client_id: string | null;
  client_name: string;
  client_type: 'Internal' | 'External';
  title: string;
  scope?: string;
  description?: string;
  service_category: string;
  status: DigitalProjectStage;
  stage_history: Array<{
    stage: DigitalProjectStage;
    timestamp: string;
    confirmed_by: string;
    notes?: string;
  }>;
  start_date: string;
  deadline: string;
  assigned_staff_name: string;
  assigned_staff_email?: string;
  lead_developer?: string;
  budget: number;
  progress: number;
  payment_terms: 'Advance Payment' | 'Milestone-Based' | 'Full Payment';
  payment_status: 'Paid' | 'Pending' | 'Overdue' | 'Partially Paid';
  advance_amount: number;
  advance_paid: number;
  balance_amount: number;
  balance_paid: number;
  deliverables: DigitalDeliverable[];
  created_at: string;
  updated_at: string;
  client?: any;
}

export async function getDigitalClients(): Promise<DigitalClientRecord[]> {
  try {
    const { data, error } = await supabase
      .from('digital_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_digital_clients', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_digital_clients');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }

    // Default Seed with both Internal & External clients
    const initialClients: DigitalClientRecord[] = [
      {
        id: 'clt-int-01',
        company_name: 'Ferex Education Consultancy',
        contact_person: 'Director of Admissions',
        email: 'edu.campaigns@ferex.com',
        phone: '+91 22 4001 5500',
        industry: 'Education & Admissions',
        city: 'Mumbai',
        client_type: 'Internal',
        status: 'Active',
        total_revenue: 1250000,
        created_at: '2026-08-01T10:00:00.000Z',
        updated_at: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'clt-int-02',
        company_name: 'Ferex Global Trade & Maritime',
        contact_person: 'Elena Rostova',
        email: 'trade.marketing@ferex.com',
        phone: '+48 58 660 4100',
        industry: 'Global Commodities & Logistics',
        city: 'Gdansk / Mumbai',
        client_type: 'Internal',
        status: 'Active',
        total_revenue: 850000,
        created_at: '2026-08-05T12:00:00.000Z',
        updated_at: '2026-08-05T12:00:00.000Z',
      },
      {
        id: 'clt-int-03',
        company_name: 'Rimi Frozen Foods Cold Chain',
        contact_person: 'Rajesh Varma',
        email: 'marketing@rimi.ferex.com',
        phone: '+91 22 8900 1122',
        industry: 'FMCG & Cold Chain Logistics',
        city: 'Navi Mumbai',
        client_type: 'Internal',
        status: 'Active',
        total_revenue: 950000,
        created_at: '2026-08-10T09:30:00.000Z',
        updated_at: '2026-08-10T09:30:00.000Z',
      },
      {
        id: 'clt-ext-01',
        company_name: 'Nexus Retail & FinTech Group',
        contact_person: 'Siddharth Mehra',
        email: 'siddharth@nexusfin.io',
        phone: '+91 98200 44551',
        industry: 'Fintech & Payments',
        city: 'Bangalore',
        client_type: 'External',
        status: 'Active',
        total_revenue: 1850000,
        created_at: '2026-08-15T14:00:00.000Z',
        updated_at: '2026-08-15T14:00:00.000Z',
      },
      {
        id: 'clt-ext-02',
        company_name: 'Apex Health AI Diagnostics',
        contact_person: 'Dr. Ananya Sen',
        email: 'ananya@apexhealth.ai',
        phone: '+91 98111 88990',
        industry: 'Healthcare & Artificial Intelligence',
        city: 'Hyderabad',
        client_type: 'External',
        status: 'Active',
        total_revenue: 1400000,
        created_at: '2026-08-20T11:15:00.000Z',
        updated_at: '2026-08-20T11:15:00.000Z',
      },
      {
        id: 'clt-ext-03',
        company_name: 'Paramount Real Estate & Towers',
        contact_person: 'Vikramaditya Singhania',
        email: 'vikram@paramounttowers.in',
        phone: '+91 99300 22119',
        industry: 'Luxury Real Estate',
        city: 'Mumbai',
        client_type: 'External',
        status: 'Active',
        total_revenue: 2200000,
        created_at: '2026-08-22T16:00:00.000Z',
        updated_at: '2026-08-22T16:00:00.000Z',
      }
    ];

    try { localStorage.setItem('ferex_digital_clients', JSON.stringify(initialClients)); } catch {}
    return initialClients;
  } catch {
    const local = localStorage.getItem('ferex_digital_clients');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createDigitalClient(client: {
  company_name?: string;
  name?: string;
  contact_person: string;
  email: string;
  phone?: string;
  industry?: string;
  city?: string;
  client_type?: 'Internal' | 'External' | string;
  status?: string;
}) {
  const isInternal = client.client_type === 'Internal' || (client.company_name || client.name || '').toLowerCase().includes('ferex') || (client.company_name || client.name || '').toLowerCase().includes('rimi');
  const payload: DigitalClientRecord = {
    id: generateUUID(),
    company_name: client.company_name || client.name || 'Enterprise Client',
    contact_person: client.contact_person || 'Client Contact',
    email: client.email,
    phone: client.phone || '',
    industry: client.industry || 'Marketing & Branding',
    city: client.city || 'Mumbai',
    client_type: (client.client_type as any) || (isInternal ? 'Internal' : 'External'),
    status: client.status || 'Active',
    total_revenue: 0.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getDigitalClients();
  const updated = [payload, ...current.filter(c => c.id !== payload.id)];
  try { localStorage.setItem('ferex_digital_clients', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_clients').insert(payload); } catch {}
  triggerLocalSync('ferex_digital_clients_change');
  return payload;
}

export async function updateDigitalClient(id: string, updates: any) {
  const current = await getDigitalClients();
  const updated = current.map((c: any) => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c);
  try { localStorage.setItem('ferex_digital_clients', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_clients').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_clients_change');
  return updated.find((c: any) => c.id === id) || { id, ...updates };
}

export async function deleteDigitalClient(id: string) {
  const current = await getDigitalClients();
  const updated = current.filter((c: any) => c.id !== id);
  try { localStorage.setItem('ferex_digital_clients', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_clients').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_clients_change');
  return true;
}

// ─── Digital Leads ──────────────────────────────────────────────────────────
export async function getDigitalLeads() {
  const clients = await getDigitalClients();
  return clients.filter((c: any) => c.status === 'Lead');
}

export async function createDigitalLead(lead: {
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  industry?: string;
  estimated_budget?: number;
  client_type?: 'Internal' | 'External';
}) {
  return createDigitalClient({
    ...lead,
    status: 'Lead',
    client_type: lead.client_type || 'External'
  });
}

// ─── Digital Projects (6-Stage Tracker & Deliverables) ───────────────────────
export async function getDigitalProjects(category?: string): Promise<DigitalProjectRecord[]> {
  let localProjects: DigitalProjectRecord[] = [];
  const local = localStorage.getItem('ferex_digital_projects');
  if (local !== null) {
    try { localProjects = JSON.parse(local); } catch {}
  }

  try {
    let query = supabase.from('digital_projects').select('*, client:digital_clients(*)').order('created_at', { ascending: false });
    if (category && category !== 'All') {
      query = query.eq('service_category', category);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const item of localProjects) {
        if (!merged.some((m: any) => m.id === item.id || m.title === item.title)) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_digital_projects', JSON.stringify(merged)); } catch {}
      if (category && category !== 'All') return merged.filter((p: any) => p.service_category === category);
      return merged;
    }

    if (localProjects.length > 0) {
      if (category && category !== 'All') return localProjects.filter((p: any) => p.service_category === category);
      return localProjects;
    }

    // Seed default projects with 6-stage lifecycle
    const initialProjects: DigitalProjectRecord[] = [
      {
        id: 'prj-001',
        client_id: 'clt-int-01',
        client_name: 'Ferex Education Consultancy',
        client_type: 'Internal',
        title: 'Fall 2027 Global Admissions Digital Campaign & Lead Gen Funnel',
        scope: 'Multi-channel digital marketing, Instagram/Meta reels ad creatives, Google Search landing pages, and lead tracking automation for European university admissions.',
        description: 'Drive 5,000+ qualified student inquiries for Poland, Germany, and UK study visas.',
        service_category: 'Digital Marketing & Advertising',
        status: 'In Progress',
        stage_history: [
          { stage: 'Briefing', timestamp: '2026-08-10 10:00', confirmed_by: 'Kavita Iyer', notes: 'Marketing brief aligned with Admissions Desk' },
          { stage: 'In Progress', timestamp: '2026-08-16 14:30', confirmed_by: 'Kavita Iyer', notes: 'Ad creatives in active production' }
        ],
        start_date: '2026-08-10',
        deadline: '2026-10-15',
        assigned_staff_name: 'Kavita Iyer',
        assigned_staff_email: 'kavita.iyer@ferex.com',
        lead_developer: 'Kavita Iyer',
        budget: 650000,
        progress: 45,
        payment_terms: 'Advance Payment',
        payment_status: 'Partially Paid',
        advance_amount: 195000,
        advance_paid: 195000,
        balance_amount: 455000,
        balance_paid: 0,
        deliverables: [
          {
            id: 'dlv-1',
            title: 'Figma UI Wireframes: Admissions Landing Page 2027',
            type: 'Figma',
            url: 'https://www.figma.com/design/ferex-edu-landing-2027',
            added_at: '2026-08-18',
            status: 'Approved',
            notes: 'Approved by Education Director.'
          },
          {
            id: 'dlv-2',
            title: 'Meta & Google Ad Creatives (15 Video Story Reels)',
            type: 'Google Drive',
            url: 'https://drive.google.com/drive/folders/ferex-ad-creatives',
            added_at: '2026-08-25',
            status: 'Submitted',
            notes: 'Ready for campaign launch review.'
          }
        ],
        created_at: '2026-08-10T10:00:00.000Z',
        updated_at: '2026-08-25T12:00:00.000Z',
      },
      {
        id: 'prj-002',
        client_id: 'clt-int-03',
        client_name: 'Rimi Frozen Foods Cold Chain',
        client_type: 'Internal',
        title: 'B2B Distributor Brand Refresh & Packaging Identity',
        scope: 'Packaging design for blast-frozen seafood & ready-to-cook export range, FMCG distributor catalog, and promotional brand collateral.',
        description: 'Complete packaging re-skin compliant with FSSAI and European export standards.',
        service_category: 'Branding & Packaging',
        status: 'Review',
        stage_history: [
          { stage: 'Briefing', timestamp: '2026-08-12 11:00', confirmed_by: 'Rohan Verma', notes: 'Briefing completed with Rimi logistics lead' },
          { stage: 'In Progress', timestamp: '2026-08-20 15:00', confirmed_by: 'Rohan Verma', notes: 'Packaging mockups completed' },
          { stage: 'Review', timestamp: '2026-09-02 09:30', confirmed_by: 'Rohan Verma', notes: 'Submitted for management review' }
        ],
        start_date: '2026-08-12',
        deadline: '2026-09-28',
        assigned_staff_name: 'Rohan Verma',
        assigned_staff_email: 'rohan.verma@ferex.com',
        lead_developer: 'Rohan Verma',
        budget: 480000,
        progress: 75,
        payment_terms: 'Milestone-Based',
        payment_status: 'Partially Paid',
        advance_amount: 160000,
        advance_paid: 160000,
        balance_amount: 320000,
        balance_paid: 160000,
        deliverables: [
          {
            id: 'dlv-3',
            title: 'Print-Ready Packaging Die-Cuts (CMYK Vectors)',
            type: 'PDF / Document',
            url: 'https://drive.google.com/drive/folders/rimi-packaging-diecuts',
            added_at: '2026-08-28',
            status: 'Approved'
          }
        ],
        created_at: '2026-08-12T11:00:00.000Z',
        updated_at: '2026-09-02T09:30:00.000Z',
      },
      {
        id: 'prj-003',
        client_id: 'clt-ext-01',
        client_name: 'Nexus Retail & FinTech Group',
        client_type: 'External',
        title: 'Omnichannel Merchant Acquiring Portal & Brand Identity',
        scope: 'Design & front-end UX design system for multi-currency payment checkout, developer docs UI, and brand identity guidelines.',
        description: 'Comprehensive design system and marketing site for enterprise merchant onboarding.',
        service_category: 'Web & App Branding',
        status: 'In Progress',
        stage_history: [
          { stage: 'Briefing', timestamp: '2026-08-15 14:00', confirmed_by: 'Priya Nair', notes: 'Client kickoff meeting held' },
          { stage: 'In Progress', timestamp: '2026-08-22 16:00', confirmed_by: 'Priya Nair', notes: 'Design sprint active' }
        ],
        start_date: '2026-08-15',
        deadline: '2026-11-01',
        assigned_staff_name: 'Priya Nair',
        assigned_staff_email: 'priya.nair@ferex.com',
        lead_developer: 'Priya Nair',
        budget: 1250000,
        progress: 35,
        payment_terms: 'Milestone-Based',
        payment_status: 'Partially Paid',
        advance_amount: 375000,
        advance_paid: 375000,
        balance_amount: 875000,
        balance_paid: 0,
        deliverables: [
          {
            id: 'dlv-4',
            title: 'Design System Tokens & Brand Guidebook',
            type: 'Figma',
            url: 'https://figma.com/design/nexus-fintech-system',
            added_at: '2026-08-26',
            status: 'Submitted'
          }
        ],
        created_at: '2026-08-15T14:00:00.000Z',
        updated_at: '2026-08-26T10:00:00.000Z',
      },
      {
        id: 'prj-004',
        client_id: 'clt-ext-02',
        client_name: 'Apex Health AI Diagnostics',
        client_type: 'External',
        title: 'Global Healthcare AI Product Launch & PR Campaign',
        scope: 'Digital PR rollout, medical journal media kit, interactive WebGL diagnostic showcase, and LinkedIn thought leadership marketing.',
        description: 'Product launch across US, EU, and APAC medical conferences.',
        service_category: 'Digital PR & Advertising',
        status: 'Delivered',
        stage_history: [
          { stage: 'Briefing', timestamp: '2026-07-20 10:00', confirmed_by: 'Sneha Sen', notes: 'Launch brief received' },
          { stage: 'In Progress', timestamp: '2026-08-01 12:00', confirmed_by: 'Sneha Sen', notes: 'Campaign assets built' },
          { stage: 'Review', timestamp: '2026-08-20 15:00', confirmed_by: 'Sneha Sen', notes: 'Client review complete' },
          { stage: 'Delivered', timestamp: '2026-09-05 16:30', confirmed_by: 'Sneha Sen', notes: 'Full asset kit delivered' }
        ],
        start_date: '2026-07-20',
        deadline: '2026-09-10',
        assigned_staff_name: 'Sneha Sen',
        assigned_staff_email: 'sneha.sen@ferex.com',
        lead_developer: 'Sneha Sen',
        budget: 950000,
        progress: 100,
        payment_terms: 'Full Payment',
        payment_status: 'Paid',
        advance_amount: 950000,
        advance_paid: 950000,
        balance_amount: 0,
        balance_paid: 0,
        deliverables: [
          {
            id: 'dlv-5',
            title: 'Medical Conference PR Kit & Video Reel (4K)',
            type: 'Google Drive',
            url: 'https://drive.google.com/drive/folders/apex-health-pr',
            added_at: '2026-08-22',
            status: 'Approved'
          },
          {
            id: 'dlv-6',
            title: 'Live Campaign Production Showcase',
            type: 'Live URL',
            url: 'https://apexhealth.ai/launch',
            added_at: '2026-09-05',
            status: 'Approved'
          }
        ],
        created_at: '2026-07-20T10:00:00.000Z',
        updated_at: '2026-09-05T16:30:00.000Z',
      }
    ];

    try { localStorage.setItem('ferex_digital_projects', JSON.stringify(initialProjects)); } catch {}
    return initialProjects;
  } catch {
    return localProjects;
  }
}

export async function createDigitalProject(project: {
  client_id?: string;
  client_name?: string;
  client_type?: 'Internal' | 'External';
  title: string;
  scope?: string;
  description?: string;
  service_category?: string;
  budget?: number;
  progress?: number;
  start_date?: string;
  deadline?: string;
  assigned_staff_name?: string;
  assigned_staff_email?: string;
  lead_developer?: string;
  payment_terms?: 'Advance Payment' | 'Milestone-Based' | 'Full Payment';
  status?: DigitalProjectStage;
  deliverables?: DigitalDeliverable[];
}): Promise<DigitalProjectRecord> {
  const clients = await getDigitalClients();
  let clientObj = clients.find((c: any) => c.id === project.client_id || c.company_name === project.client_name);
  let clientId = project.client_id || clientObj?.id;

  if (!clientId && project.client_name) {
    const isInternal = project.client_type === 'Internal' || project.client_name.toLowerCase().includes('ferex');
    const created = await createDigitalClient({
      company_name: project.client_name,
      contact_person: 'Client Contact',
      email: `contact@${project.client_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      client_type: isInternal ? 'Internal' : 'External'
    });
    clientId = created.id;
    clientObj = created;
  }

  const clientType: 'Internal' | 'External' = project.client_type || clientObj?.client_type || 'External';
  const totalBudget = Number(project.budget) || 0;
  const paymentTerms = project.payment_terms || 'Advance Payment';
  const advanceAmount = paymentTerms === 'Full Payment' ? totalBudget : Math.round(totalBudget * 0.3);
  const balanceAmount = totalBudget - advanceAmount;
  const currentStage: DigitalProjectStage = project.status || 'Briefing';
  const assignedStaff = project.assigned_staff_name || project.lead_developer || 'Kavita Iyer';

  const payload: DigitalProjectRecord = {
    id: generateUUID(),
    client_id: clientId || null,
    client: clientObj || { company_name: project.client_name || 'Enterprise Client', client_type: clientType },
    client_name: project.client_name || clientObj?.company_name || 'Enterprise Client',
    client_type: clientType,
    title: project.title,
    scope: project.scope || project.description || 'Marketing, advertising & branding scope.',
    description: project.description || project.scope || '',
    service_category: project.service_category || 'Marketing & Advertising',
    status: currentStage,
    stage_history: [
      {
        stage: currentStage,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        confirmed_by: assignedStaff,
        notes: `Project initiated at stage: ${currentStage}`
      }
    ],
    start_date: project.start_date || new Date().toISOString().split('T')[0],
    deadline: project.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    assigned_staff_name: assignedStaff,
    assigned_staff_email: project.assigned_staff_email || `${assignedStaff.toLowerCase().replace(/[^a-z]/g, '')}@ferex.com`,
    lead_developer: assignedStaff,
    budget: totalBudget,
    progress: Number(project.progress) || 10,
    payment_terms: paymentTerms,
    payment_status: 'Pending',
    advance_amount: advanceAmount,
    advance_paid: 0,
    balance_amount: balanceAmount,
    balance_paid: 0,
    deliverables: project.deliverables || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getDigitalProjects();
  const updated = [payload, ...current.filter((p: any) => p.id !== payload.id)];
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try {
    const { client, deliverables, stage_history, ...dbPayload } = payload as any;
    await supabase.from('digital_projects').insert(dbPayload);
  } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return payload;
}

export async function advanceDigitalProjectStage(
  projectId: string,
  newStage: DigitalProjectStage,
  confirmedBy: string = 'Digital Lead',
  notes?: string
): Promise<DigitalProjectRecord | null> {
  const current = await getDigitalProjects();
  let updatedProj: DigitalProjectRecord | null = null;

  const stageProgressMap: Record<DigitalProjectStage, number> = {
    'Briefing': 15,
    'In Progress': 45,
    'Review': 75,
    'Revisions': 85,
    'Delivered': 95,
    'Closed': 100
  };

  const updated = current.map(p => {
    if (p.id === projectId) {
      const history = p.stage_history || [];
      const newEntry = {
        stage: newStage,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        confirmed_by: confirmedBy,
        notes: notes || `Advanced to stage: ${newStage}`
      };

      updatedProj = {
        ...p,
        status: newStage,
        progress: stageProgressMap[newStage] || p.progress,
        stage_history: [...history, newEntry],
        updated_at: new Date().toISOString()
      };
      return updatedProj;
    }
    return p;
  });

  if (!updatedProj) return null;

  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('digital_projects').update({
      status: newStage,
      progress: (updatedProj as any).progress,
      updated_at: new Date().toISOString()
    }).eq('id', projectId);
  } catch {}

  triggerLocalSync('ferex_digital_projects_change');
  return updatedProj;
}

export async function addDigitalDeliverable(
  projectId: string,
  deliverable: {
    title: string;
    type: 'Figma' | 'Google Drive' | 'PDF / Document' | 'Canva / Asset' | 'GitHub / Code' | 'Video Reel' | 'Live URL';
    url: string;
    status?: 'Draft' | 'Submitted' | 'Approved';
    notes?: string;
  }
): Promise<DigitalDeliverable> {
  const current = await getDigitalProjects();
  const newDeliv: DigitalDeliverable = {
    id: `dlv-${Date.now().toString().slice(-5)}`,
    title: deliverable.title,
    type: deliverable.type || 'Link',
    url: deliverable.url,
    added_at: new Date().toISOString().split('T')[0],
    status: deliverable.status || 'Submitted',
    notes: deliverable.notes || ''
  };

  const updated = current.map(p => {
    if (p.id === projectId) {
      return {
        ...p,
        deliverables: [...(p.deliverables || []), newDeliv],
        updated_at: new Date().toISOString()
      };
    }
    return p;
  });

  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return newDeliv;
}

export async function deleteDigitalDeliverable(projectId: string, deliverableId: string): Promise<boolean> {
  const current = await getDigitalProjects();
  const updated = current.map(p => {
    if (p.id === projectId) {
      return {
        ...p,
        deliverables: (p.deliverables || []).filter(d => d.id !== deliverableId),
        updated_at: new Date().toISOString()
      };
    }
    return p;
  });
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return true;
}

export async function updateDigitalProject(id: string, updates: any) {
  const current = await getDigitalProjects();
  const updated = current.map((p: any) => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p);
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try {
    const { client, deliverables, stage_history, ...dbUpdates } = updates;
    await supabase.from('digital_projects').update({ ...dbUpdates, updated_at: new Date().toISOString() }).eq('id', id);
  } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return updated.find((p: any) => p.id === id) || { id, ...updates };
}

export async function deleteDigitalProject(id: string) {
  const current = await getDigitalProjects();
  const updated = current.filter((p: any) => p.id !== id);
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_projects').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return true;
}


// ─── Digital Tasks ──────────────────────────────────────────────────────────
export async function getDigitalTasks(projectId?: string) {
  let localTasks: any[] = [];
  const local = localStorage.getItem('ferex_digital_tasks');
  if (local !== null) {
    try { localTasks = JSON.parse(local); } catch {}
  }

  try {
    let query = supabase.from('digital_tasks').select('*, project:digital_projects(*)').order('created_at', { ascending: false });
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data];
      for (const item of localTasks) {
        if (!merged.some((m: any) => m.id === item.id || m.title === item.title)) {
          merged.push(item);
        }
      }
      try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(merged)); } catch {}
      if (projectId) return merged.filter((t: any) => t.project_id === projectId);
      return merged;
    }
    if (projectId) return localTasks.filter((t: any) => t.project_id === projectId);
    return localTasks;
  } catch {
    if (projectId) return localTasks.filter((t: any) => t.project_id === projectId);
    return localTasks;
  }
}

export async function createDigitalTask(task: {
  project_id?: string;
  project_title?: string;
  title: string;
  priority?: string;
  status?: string;
  due_date?: string;
  assigned_to_name?: string;
}) {
  const projects = await getDigitalProjects();
  const projectObj = projects.find((p: any) => p.id === task.project_id);

  const payload = {
    id: generateUUID(),
    project_id: task.project_id || null,
    project: projectObj || { title: task.project_title || 'Sprint Project' },
    title: task.title,
    priority: task.priority || 'Medium',
    status: task.status || 'To Do',
    due_date: task.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assigned_to_name: task.assigned_to_name || 'Engineering Team',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = await getDigitalTasks();
  const updated = [payload, ...current.filter((t: any) => t.id !== payload.id)];
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try {
    const { project, ...dbPayload } = payload as any;
    await supabase.from('digital_tasks').insert(dbPayload);
  } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return payload;
}

export async function updateDigitalTask(id: string, updates: any) {
  const current = await getDigitalTasks();
  const updated = current.map((t: any) => t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t);
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try {
    const { project, ...dbUpdates } = updates;
    await supabase.from('digital_tasks').update({ ...dbUpdates, updated_at: new Date().toISOString() }).eq('id', id);
  } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return updated.find((t: any) => t.id === id) || { id, ...updates };
}

export async function updateDigitalTaskStatus(id: string, status: string) {
  return updateDigitalTask(id, { status });
}

export async function deleteDigitalTask(id: string) {
  const current = await getDigitalTasks();
  const updated = current.filter((t: any) => t.id !== id);
  try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_tasks').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_tasks_change');
  return true;
}

// ─── Digital Sprints ────────────────────────────────────────────────────────
export async function getDigitalSprints() {
  const saved = localStorage.getItem('ferex_digital_sprints');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalSprint(sprint: {
  name: string;
  project_id?: string;
  start_date: string;
  end_date: string;
  status?: string;
}) {
  const current = await getDigitalSprints();
  const created = {
    id: `SPR-${Date.now().toString().slice(-4)}`,
    ...sprint,
    status: sprint.status || 'Active',
    completed_points: 0,
    total_points: 40,
    created_at: new Date().toISOString(),
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_sprints', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_sprints_change');
  return created;
}

export async function updateDigitalSprint(id: string, updates: any) {
  const current = await getDigitalSprints();
  const updated = current.map((s: any) => s.id === id ? { ...s, ...updates } : s);
  localStorage.setItem('ferex_digital_sprints', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_sprints_change');
  return updated.find((s: any) => s.id === id) || { id, ...updates };
}

// ─── Digital Invoices ───────────────────────────────────────────────────────
export async function getDigitalInvoices(clientId?: string) {
  try {
    let query = supabase.from('digital_invoices').select('*, client:digital_clients(*), project:digital_projects(*)').order('created_at', { ascending: false });
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    const { data, error } = await query;
    if (!error && data) {
      try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(data)); } catch {}
      if (clientId) return data.filter((i: any) => i.client_id === clientId);
      return data;
    }

    const local = localStorage.getItem('ferex_digital_invoices');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (clientId) return parsed.filter((i: any) => i.client_id === clientId);
        return parsed;
      } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_digital_invoices');
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (clientId) return parsed.filter((i: any) => i.client_id === clientId);
        return parsed;
      } catch {}
    }
    return [];
  }
}

export async function createDigitalInvoice(invoice: {
  client_id?: string;
  client_name?: string;
  project_id?: string;
  invoice_no?: string;
  amount: number;
  tax_amount?: number;
  due_date?: string;
  status?: string;
  notes?: string;
}) {
  const clients = await getDigitalClients();
  let clientObj = clients.find((c: any) => c.id === invoice.client_id || c.company_name === invoice.client_name);
  let clientId = invoice.client_id || clientObj?.id;

  const invNo = invoice.invoice_no || `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`;
  const amt = Number(invoice.amount) || 0;
  const taxAmt = invoice.tax_amount !== undefined ? Number(invoice.tax_amount) : Math.round(amt * 0.18);

  const payload = {
    id: generateUUID(),
    client_id: clientId || null,
    client: clientObj || { company_name: invoice.client_name || 'Enterprise Client' },
    project_id: invoice.project_id || null,
    invoice_no: invNo,
    amount: amt,
    tax_amount: taxAmt,
    currency: 'INR',
    status: invoice.status || 'Sent',
    due_date: invoice.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    issued_at: new Date().toISOString(),
    paid_at: invoice.status === 'Paid' ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };

  const current = await getDigitalInvoices();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try {
    const { client, project, ...dbPayload } = payload as any;
    await supabase.from('digital_invoices').insert(dbPayload);
  } catch {}
  triggerLocalSync('ferex_digital_invoices_change');
  return payload;
}

export async function updateDigitalInvoice(id: string, updates: any) {
  const current = await getDigitalInvoices();
  const updated = current.map((i: any) => i.id === id ? { ...i, ...updates } : i);
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try {
    const { client, project, ...dbUpdates } = updates;
    await supabase.from('digital_invoices').update(dbUpdates).eq('id', id);
  } catch {}
  triggerLocalSync('ferex_digital_invoices_change');
  return updated.find((i: any) => i.id === id) || { id, ...updates };
}

export async function updateDigitalInvoiceStatus(id: string, status: string) {
  return updateDigitalInvoice(id, { status, paid_at: status === 'Paid' ? new Date().toISOString() : null });
}

export async function deleteDigitalInvoice(id: string) {
  const current = await getDigitalInvoices();
  const updated = current.filter((i: any) => i.id !== id);
  try { localStorage.setItem('ferex_digital_invoices', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_invoices').delete().eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_invoices_change');
  return true;
}

// ─── Digital Expenses ───────────────────────────────────────────────────────
export async function getDigitalExpenses() {
  const saved = localStorage.getItem('ferex_digital_expenses');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalExpense(expense: {
  title: string;
  category: string;
  amount: number;
  project_id?: string;
  vendor?: string;
  date?: string;
}) {
  const current = await getDigitalExpenses();
  const created = {
    id: `EXP-DIG-${Date.now().toString().slice(-4)}`,
    ...expense,
    amount: Number(expense.amount) || 0,
    date: expense.date || new Date().toISOString().split('T')[0],
    status: 'Approved',
    created_at: new Date().toISOString(),
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_expenses', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_expenses_change');
  return created;
}

export async function deleteDigitalExpense(id: string) {
  const current = await getDigitalExpenses();
  const updated = current.filter((e: any) => e.id !== id);
  localStorage.setItem('ferex_digital_expenses', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_expenses_change');
  return true;
}

// ─── Digital Employees ──────────────────────────────────────────────────────
export async function getDigitalEmployees() {
  const saved = localStorage.getItem('ferex_digital_employees');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalEmployee(emp: {
  name: string;
  role: string;
  department: string;
  email: string;
  rating?: number;
  kpiScore?: number;
  feedback?: string;
  projects?: number;
  tasks?: number;
}) {
  const current = await getDigitalEmployees();
  const created = {
    id: `EMP-${Math.floor(10 + Math.random() * 90)}`,
    status: 'Active',
    projectsCount: emp.projects || 0,
    ...emp,
    rating: emp.rating ?? 5.0,
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_employees', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_employees_change');
  return created;
}

export async function updateDigitalEmployee(id: string, updates: any) {
  const current = await getDigitalEmployees();
  const updated = current.map((e: any) => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem('ferex_digital_employees', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_employees_change');
  return updated.find((e: any) => e.id === id) || { id, ...updates };
}

export async function deleteDigitalEmployee(id: string) {
  const current = await getDigitalEmployees();
  const updated = current.filter((e: any) => e.id !== id);
  localStorage.setItem('ferex_digital_employees', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_employees_change');
  return true;
}

// ─── Digital Attendance & HR ────────────────────────────────────────────────
export async function getDigitalAttendance() {
  const saved = localStorage.getItem('ferex_digital_attendance');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function recordDigitalAttendance(record: any) {
  const current = await getDigitalAttendance();
  const created = {
    id: `ATT-${Date.now().toString().slice(-4)}`,
    ...record,
    date: record.date || new Date().toISOString().split('T')[0]
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_attendance', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_attendance_change');
  return created;
}

// ─── Digital Meetings ───────────────────────────────────────────────────────
export async function getDigitalMeetings() {
  const saved = localStorage.getItem('ferex_digital_meetings');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalMeeting(mtg: {
  title: string;
  client: string;
  time: string;
  link?: string;
}) {
  const current = await getDigitalMeetings();
  const created = {
    id: `MTG-${Math.floor(10 + Math.random() * 90)}`,
    title: mtg.title,
    client: mtg.client,
    time: mtg.time,
    link: mtg.link || 'https://meet.google.com',
    status: 'Scheduled'
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_meetings', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_meetings_change');
  return created;
}

export async function deleteDigitalMeeting(id: string) {
  const current = await getDigitalMeetings();
  const updated = current.filter((m: any) => m.id !== id);
  localStorage.setItem('ferex_digital_meetings', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_meetings_change');
  return true;
}

// ─── Digital Messages ───────────────────────────────────────────────────────
export async function getDigitalMessages(conversationId: string = '1') {
  try {
    const { data, error } = await supabase
      .from('trade_messages')
      .select('*')
      .eq('conversation_id', `digital_${conversationId}`)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function sendDigitalMessage(msg: {
  conversation_id: string;
  contact_name: string;
  contact_role: string;
  sender_name: string;
  message: string;
  is_self?: boolean;
}) {
  const payload = {
    id: generateUUID(),
    conversation_id: `digital_${msg.conversation_id}`,
    contact_name: msg.contact_name,
    contact_role: msg.contact_role,
    sender_name: msg.sender_name,
    message: msg.message,
    is_self: msg.is_self ?? true,
    created_at: new Date().toISOString(),
  };

  try {
    const { data } = await supabase.from('trade_messages').insert(payload).select();
    if (data && data.length > 0) return data[0];
  } catch {}
  return payload;
}

// ─── Digital Dashboard Stats ────────────────────────────────────────────────
export async function getDigitalDashboardStats() {
  try {
    const [clients, projects, tasks, invoices] = await Promise.all([
      getDigitalClients(),
      getDigitalProjects(),
      getDigitalTasks(),
      getDigitalInvoices(),
    ]);

    const activeClients = clients.filter((c: any) => c.status === 'Active');
    const activeProjects = projects.filter((p: any) => p.status === 'In Progress');
    const totalPipeline = projects.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0);
    const totalCollected = invoices.filter((i: any) => i.status === 'Paid').reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
    const pendingTasks = tasks.filter((t: any) => t.status !== 'Done');

    const formatInr = (amt: number) => {
      if (!amt || amt === 0) return '₹0';
      if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
      if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} Lakhs`;
      return `₹${amt.toLocaleString('en-IN')}`;
    };

    return {
      activeClientsCount: activeClients.length,
      activeProjectsCount: activeProjects.length,
      totalProjectsCount: projects.length,
      totalPipelineValueStr: formatInr(totalPipeline),
      totalCollectedStr: formatInr(totalCollected),
      pendingTasksCount: pendingTasks.length,
    };
  } catch {
    return {
      activeClientsCount: 0,
      activeProjectsCount: 0,
      totalProjectsCount: 0,
      totalPipelineValueStr: '₹0',
      totalCollectedStr: '₹0',
      pendingTasksCount: 0,
    };
  }
}

// ─── Digital Client Credential Provisioning & Mapping ───────────────────────
export interface ProvisionedClientCredential {
  email: string;
  tempPassword: string;
  role: string;
  fullName: string;
  companyName: string;
  clientId: string;
  requirePasswordReset: boolean;
  provisionedAt: string;
}

export async function provisionDigitalClientLogin(client: {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  contact_person?: string;
}): Promise<ProvisionedClientCredential> {
  const cleanEmail = client.email.trim().toLowerCase();
  const tempPassword = `DigPass#${Math.floor(1000 + Math.random() * 9000)}`;
  const companyName = client.company_name || client.name || 'Digital Client Account';
  const fullName = client.contact_person || client.name || 'Client Representative';

  const credentialPayload: ProvisionedClientCredential = {
    email: cleanEmail,
    tempPassword,
    role: 'digital_client',
    fullName,
    companyName,
    clientId: client.id,
    requirePasswordReset: true,
    provisionedAt: new Date().toISOString(),
  };

  localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify({
    email: cleanEmail,
    password: tempPassword,
    role: 'digital_client',
    full_name: fullName,
    company_name: companyName,
    client_id: client.id,
    require_password_reset: true,
  }));
  localStorage.setItem(`ferex_digital_client_cred_${client.id}`, JSON.stringify(credentialPayload));

  try {
    await supabase.from('users').upsert({
      email: cleanEmail,
      role: 'digital_client',
      full_name: fullName,
      phone: '',
      department: `Digital:${companyName}`,
      created_at: new Date().toISOString(),
    }, { onConflict: 'email' });
  } catch {}

  triggerLocalSync('ferex_digital_clients_change');
  return credentialPayload;
}

export function getDigitalClientCredentials(clientId: string): ProvisionedClientCredential | null {
  const saved = localStorage.getItem(`ferex_digital_client_cred_${clientId}`);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// ─── Multi-Project Consolidated Invoicing ──────────────────────────────────
export interface MultiProjectInvoiceItem {
  projectId?: string;
  projectTitle: string;
  description: string;
  amount: number;
}

export async function createDigitalMultiProjectInvoice(payload: {
  client_id: string;
  client_name?: string;
  invoice_no?: string;
  due_date?: string;
  items: MultiProjectInvoiceItem[];
  notes?: string;
}) {
  const totalAmount = payload.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const taxAmount = Math.round(totalAmount * 0.18);
  const invNo = payload.invoice_no || `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`;

  const invoiceRecord = {
    id: generateUUID(),
    client_id: payload.client_id,
    project_id: payload.items[0]?.projectId || null,
    invoice_no: invNo,
    amount: totalAmount,
    tax_amount: taxAmount,
    currency: 'INR',
    status: 'Sent',
    due_date: payload.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    issued_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    items: payload.items,
    notes: payload.notes || `Consolidated invoice spanning ${payload.items.length} client projects.`
  };

  try {
    const { data, error } = await supabase.from('digital_invoices').insert({
      id: invoiceRecord.id,
      client_id: invoiceRecord.client_id,
      project_id: invoiceRecord.project_id,
      invoice_no: invoiceRecord.invoice_no,
      amount: invoiceRecord.amount,
      tax_amount: invoiceRecord.tax_amount,
      currency: invoiceRecord.currency,
      status: invoiceRecord.status,
      due_date: invoiceRecord.due_date,
      issued_at: invoiceRecord.issued_at,
      created_at: invoiceRecord.created_at,
    }).select();
    
    const multiSaved = localStorage.getItem('ferex_digital_multi_invoices') || '{}';
    try {
      const map = JSON.parse(multiSaved);
      map[invoiceRecord.id] = payload.items;
      localStorage.setItem('ferex_digital_multi_invoices', JSON.stringify(map));
    } catch {}

    triggerLocalSync('ferex_digital_invoices_change');
    if (!error && data && data.length > 0) return { ...data[0], items: payload.items };
  } catch {}

  triggerLocalSync('ferex_digital_invoices_change');
  return invoiceRecord;
}

export function getDigitalInvoiceItems(invoiceId: string): MultiProjectInvoiceItem[] {
  try {
    const multiSaved = localStorage.getItem('ferex_digital_multi_invoices');
    if (multiSaved) {
      const map = JSON.parse(multiSaved);
      if (map[invoiceId]) return map[invoiceId];
    }
  } catch {}
  return [];
}

// ─── Digital Agency Assets & Software License Inventory ────────────────────
export interface DigitalAsset {
  id: string;
  name: string;
  type: 'Cloud Infrastructure' | 'SaaS License' | 'Domain & DNS' | 'SSL & Security' | 'API Gateway' | 'Design & Dev Tools';
  provider: string;
  cost_per_month_inr: number;
  renewal_date: string;
  status: 'Active' | 'Expiring Soon' | 'Auto-Renewed' | 'Suspended';
  assigned_to_project?: string;
  assigned_team_lead?: string;
  license_seats?: number;
}

export async function getDigitalAssets(): Promise<DigitalAsset[]> {
  const saved = localStorage.getItem('ferex_digital_assets');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export async function createDigitalAsset(asset: Partial<DigitalAsset>): Promise<DigitalAsset> {
  const current = await getDigitalAssets();
  const created: DigitalAsset = {
    id: `AST-DIG-${Math.floor(10 + Math.random() * 90)}`,
    name: asset.name || 'Cloud Asset / License',
    type: asset.type || 'SaaS License',
    provider: asset.provider || 'SaaS Provider',
    cost_per_month_inr: Number(asset.cost_per_month_inr) || 0,
    renewal_date: asset.renewal_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: asset.status || 'Active',
    assigned_to_project: asset.assigned_to_project || 'Internal Core',
    assigned_team_lead: asset.assigned_team_lead || 'Engineering Lead',
    license_seats: asset.license_seats ? Number(asset.license_seats) : 1
  };
  const updated = [created, ...current];
  localStorage.setItem('ferex_digital_assets', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_assets_change');
  return created;
}

export async function updateDigitalAsset(id: string, updates: Partial<DigitalAsset>) {
  const current = await getDigitalAssets();
  const updated = current.map(a => a.id === id ? { ...a, ...updates } : a);
  localStorage.setItem('ferex_digital_assets', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_assets_change');
  return true;
}

export async function deleteDigitalAsset(id: string) {
  const current = await getDigitalAssets();
  const updated = current.filter(a => a.id !== id);
  localStorage.setItem('ferex_digital_assets', JSON.stringify(updated));
  triggerLocalSync('ferex_digital_assets_change');
  return true;
}

export async function getDigitalAssetCostSummary() {
  const assets = await getDigitalAssets();
  const totalMonthlyInr = assets.reduce((sum, a) => sum + (Number(a.cost_per_month_inr) || 0), 0);
  const expiringSoonCount = assets.filter(a => a.status === 'Expiring Soon').length;
  const activeCount = assets.filter(a => a.status === 'Active').length;
  return {
    totalMonthlyInr,
    expiringSoonCount,
    activeCount,
    totalAssetsCount: assets.length
  };
}

// ─── Digital Notifications ───────────────────────────────────────────────────
export async function getDigitalNotifications() {
  try {
    const { data, error } = await supabase
      .from('digital_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      try { localStorage.setItem('ferex_digital_notifications', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_digital_notifications');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  } catch {
    const local = localStorage.getItem('ferex_digital_notifications');
    if (local !== null) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }
}

export async function createDigitalNotification(notif: {
  title: string;
  message?: string;
  description?: string;
  type?: string;
  category?: string;
  link?: string;
}) {
  const payload = {
    id: generateUUID(),
    title: notif.title,
    message: notif.message || notif.description || '',
    type: notif.type || notif.category || 'info',
    link: notif.link || '',
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const current = await getDigitalNotifications();
  const updated = [payload, ...current];
  try { localStorage.setItem('ferex_digital_notifications', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_notifications').insert(payload); } catch {}
  triggerLocalSync('ferex_digital_notifications_change');
  return payload;
}

export async function markDigitalNotificationRead(id: string) {
  const current = await getDigitalNotifications();
  const updated = current.map((n: any) => n.id === id ? { ...n, is_read: true } : n);
  try { localStorage.setItem('ferex_digital_notifications', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_notifications').update({ is_read: true }).eq('id', id); } catch {}
  triggerLocalSync('ferex_digital_notifications_change');
  return true;
}
