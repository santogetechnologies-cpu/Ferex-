import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { getDivisionStaff, getDivisionStaffSync, type DivisionStaffMember } from './staff';

export const getDigitalStaffMembers = () => getDivisionStaff('digital');
export const getDigitalStaffMembersSync = () => getDivisionStaffSync('digital');

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
  client_type: string; // From masters (configurable, not hardcoded)
  status: string;
  total_revenue?: number;
  estimated_budget?: number;
  notes?: string;
  tags?: string[];
  // Audit
  is_deleted?: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}


export type DigitalProjectStage = 'Briefing' | 'In Progress' | 'Review' | 'Revisions' | 'Delivered' | 'Closed' | string;

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
  const officialInternalSubsidiaries: DigitalClientRecord[] = [
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
      created_at: '2026-09-01T00:00:00.000Z',
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
      created_at: '2026-09-01T00:00:00.000Z',
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
      created_at: '2026-09-01T00:00:00.000Z',
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
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: new Date().toISOString()
    }
  ];

  try {
    const { data, error } = await supabase
      .from('digital_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // Filter out deleted and legacy outdated mock names
      const filtered = data.filter((c: any) => 
        !c.is_deleted && 
        !c.company_name?.toLowerCase().includes('c tech') && 
        !c.company_name?.toLowerCase().includes('santoge digital')
      );

      // Ensure all 4 official internal subsidiaries exist in list
      const clientMap = new Map<string, DigitalClientRecord>();
      for (const sub of officialInternalSubsidiaries) {
        clientMap.set(sub.company_name, sub);
      }
      for (const item of filtered) {
        clientMap.set(item.company_name, item);
      }

      const merged = Array.from(clientMap.values());
      try { localStorage.setItem('ferex_digital_clients', JSON.stringify(merged)); } catch {}
      return merged;
    }

    return officialInternalSubsidiaries;
  } catch {
    return officialInternalSubsidiaries;
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
  client_type?: string;
  status?: string;
  notes?: string;
  tags?: string[];
  created_by?: string;
}) {
  const payload: DigitalClientRecord = {
    id: generateUUID(),
    company_name: client.company_name || client.name || '',
    contact_person: client.contact_person || '',
    email: client.email,
    phone: client.phone || '',
    industry: client.industry || '',
    city: client.city || '',
    client_type: client.client_type || 'External',
    status: client.status || 'Active',
    total_revenue: 0,
    notes: client.notes || '',
    tags: client.tags || [],
    is_deleted: false,
    created_by: client.created_by || '',
    updated_by: client.created_by || '',
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

export async function deleteDigitalClient(id: string, deleted_by?: string) {
  const current = await getDigitalClients();
  const updated = current.map((c: any) => c.id === id ? { ...c, is_deleted: true, updated_by: deleted_by || 'Admin', updated_at: new Date().toISOString() } : c);
  try { localStorage.setItem('ferex_digital_clients', JSON.stringify(updated)); } catch {}
  try { await supabase.from('digital_clients').update({ is_deleted: true }).eq('id', id); } catch {}
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
  return createDigitalClient({ ...lead, status: 'Lead', client_type: lead.client_type || 'External' });
}


export async function getDigitalProjects(filters?: {
  category?: string;
  status?: string;
  staffId?: string;
  staffName?: string;
  staffEmail?: string;
  clientId?: string;
  search?: string;
}): Promise<DigitalProjectRecord[]> {
  let projects: DigitalProjectRecord[] = [];

  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('digital_projects')
      .select('*, client:digital_clients(*)')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      projects = data.filter((p: any) => !p.is_deleted);
      try { localStorage.setItem('ferex_digital_projects', JSON.stringify(projects)); } catch {}
    }
  } catch {}

  if (projects.length === 0) {
    const local = localStorage.getItem('ferex_digital_projects');
    if (local) { try { projects = JSON.parse(local); } catch {} }
    projects = projects.filter((p: any) => !p.is_deleted);
  }

  // Apply filters
  if (filters?.category && filters.category !== 'All') {
    projects = projects.filter((p: any) => p.service_category === filters.category);
  }
  if (filters?.status && filters.status !== 'All') {
    projects = projects.filter((p: any) => p.status === filters.status);
  }
  if (filters?.clientId) {
    projects = projects.filter((p: any) => p.client_id === filters.clientId);
  }
  if (filters?.staffId || filters?.staffName || filters?.staffEmail) {
    projects = projects.filter((p: any) => {
      return (
        (filters.staffId && p.assigned_staff_id === filters.staffId) ||
        (filters.staffName && p.assigned_staff_name === filters.staffName) ||
        (filters.staffEmail && p.assigned_staff_email === filters.staffEmail)
      );
    });
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    projects = projects.filter((p: any) =>
      p.title?.toLowerCase().includes(q) ||
      p.client_name?.toLowerCase().includes(q) ||
      p.assigned_staff_name?.toLowerCase().includes(q)
    );
  }

  return projects;
}

export async function createDigitalProject(project: {
  client_id: string; // REQUIRED — always starts from a client
  client_name?: string;
  client_type?: string;
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
  assigned_staff_id?: string;
  lead_developer?: string;
  payment_terms?: string;
  status?: DigitalProjectStage;
  deliverables?: DigitalDeliverable[];
  created_by?: string;
}): Promise<DigitalProjectRecord> {
  const clients = await getDigitalClients();
  const clientObj = clients.find((c: any) => c.id === project.client_id);

  const totalBudget = Number(project.budget) || 0;
  const paymentTerms = project.payment_terms || 'Advance Payment';
  const advanceAmount = paymentTerms === 'Full Payment' ? totalBudget : Math.round(totalBudget * 0.3);
  const balanceAmount = totalBudget - advanceAmount;
  const currentStage: DigitalProjectStage = project.status || 'Briefing';
  const assignedStaff = project.assigned_staff_name || '';

  const payload: DigitalProjectRecord = {
    id: generateUUID(),
    client_id: project.client_id,
    client: clientObj || null,
    client_name: project.client_name || clientObj?.company_name || '',
    client_type: (project.client_type || clientObj?.client_type || 'External') as any,
    title: project.title,
    scope: project.scope || '',
    description: project.description || '',
    service_category: project.service_category || '',
    status: currentStage,
    stage_history: [
      {
        stage: currentStage,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        confirmed_by: assignedStaff || project.created_by || 'Admin',
        notes: `Project created`,
      }
    ],
    start_date: project.start_date || new Date().toISOString().split('T')[0],
    deadline: project.deadline || '',
    assigned_staff_name: assignedStaff,
    assigned_staff_email: project.assigned_staff_email || '',
    lead_developer: assignedStaff,
    budget: totalBudget,
    progress: Number(project.progress) || 0,
    payment_terms: paymentTerms as any,
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

export async function assignDigitalProject(
  projectId: string,
  staffId: string,
  staffName: string,
  staffEmail: string,
  assignedBy: string
): Promise<boolean> {
  const current = await getDigitalProjects();
  const updated = current.map((p: any) => {
    if (p.id === projectId) {
      return {
        ...p,
        assigned_staff_id: staffId,
        assigned_staff_name: staffName,
        assigned_staff_email: staffEmail,
        updated_at: new Date().toISOString(),
      };
    }
    return p;
  });
  try { localStorage.setItem('ferex_digital_projects', JSON.stringify(updated)); } catch {}
  try {
    await supabase.from('digital_projects').update({
      assigned_staff_name: staffName,
      assigned_staff_email: staffEmail,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId);
  } catch {}
  triggerLocalSync('ferex_digital_projects_change');
  return true;
}

export async function reassignDigitalProject(projectId: string, leadName: string, staffEmail?: string, staffId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('digital_projects')
      .update({
        lead_developer: leadName,
        assigned_staff_name: leadName,
        assigned_staff_email: staffEmail || `${leadName.toLowerCase().replace(/\s+/g, '.')}@ferex.com`,
        assigned_staff_id: staffId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) {
      console.warn('[DigitalAPI] Could not update supabase digital_projects:', error);
    }
    triggerLocalSync('ferex_digital_projects_change');
    return true;
  } catch (err) {
    console.error('[DigitalAPI] Error reassigning digital project:', err);
    throw err;
  }
}

export async function updateDigitalProjectStage(projectId: string, newStage: DigitalProjectStage | string): Promise<boolean> {
  try {
    await advanceDigitalProjectStage(projectId, newStage, 'Super Admin');
    return true;
  } catch {
    return false;
  }
}

export async function advanceDigitalProjectStage(
  projectId: string,
  newStage: DigitalProjectStage | string,
  confirmedBy: string = 'Digital Lead',
  notes?: string
): Promise<DigitalProjectRecord | null> {
  const current = await getDigitalProjects();
  let updatedProj: DigitalProjectRecord | null = null;

  const stageProgressMap: Record<string, number> = {
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
export interface DigitalTaskRecord {
  id: string;
  project_id?: string;
  project?: { title?: string };
  project_title?: string;
  title: string;
  priority?: string;
  status?: string;
  due_date?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

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
    if (localTasks.length > 0) {
      if (projectId) return localTasks.filter((t: any) => t.project_id === projectId);
      return localTasks;
    }

    const initialTasks = [
      {
        id: 'tsk-001',
        project_id: 'prj-001',
        project: { title: 'Fall 2027 Global Admissions Digital Campaign & Lead Gen Funnel' },
        title: 'Produce 15 European Admissions Meta Reel Ad Creatives',
        priority: 'High',
        status: 'In Progress',
        due_date: '2026-09-25',
        assigned_to_name: 'Digital Project Manager',
        assigned_to_email: 'pm@ferex.com',
        notes: 'High CTR motion graphic reels targeting undergraduate study visa applicants.',
        created_at: '2026-08-20T10:00:00.000Z',
        updated_at: '2026-08-20T10:00:00.000Z',
      },
      {
        id: 'tsk-002',
        project_id: 'prj-002',
        project: { title: 'B2B Distributor Brand Refresh & Packaging Identity' },
        title: 'Export Compliant Die-Cut Packaging Templates for Cold Chain',
        priority: 'Medium',
        status: 'To Do',
        due_date: '2026-09-30',
        assigned_to_name: 'Digital Agency Lead',
        assigned_to_email: 'digital@ferex.com',
        notes: 'CMYK export vector files for Rimi seafood packaging run.',
        created_at: '2026-08-22T11:00:00.000Z',
        updated_at: '2026-08-22T11:00:00.000Z',
      },
      {
        id: 'tsk-003',
        project_id: 'prj-003',
        project: { title: 'Omnichannel Merchant Acquiring Portal & Brand Identity' },
        title: 'Merchant Onboarding Flow Wireframes & Design Tokens',
        priority: 'Critical',
        status: 'In Progress',
        due_date: '2026-10-05',
        assigned_to_name: 'Digital Project Manager',
        assigned_to_email: 'pm@ferex.com',
        notes: 'Multi-currency payment checkout UI components in Figma.',
        created_at: '2026-08-25T14:00:00.000Z',
        updated_at: '2026-08-25T14:00:00.000Z',
      }
    ];

    try { localStorage.setItem('ferex_digital_tasks', JSON.stringify(initialTasks)); } catch {}
    if (projectId) return initialTasks.filter((t: any) => t.project_id === projectId);
    return initialTasks;
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
  assigned_to_email?: string;
  notes?: string;
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
    assigned_to_name: task.assigned_to_name || 'Digital Project Manager',
    assigned_to_email: task.assigned_to_email || 'pm@ferex.com',
    notes: task.notes || '',
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
  const staff = await getDivisionStaff('digital');
  const saved = localStorage.getItem('ferex_digital_employees');
  let customEmployees: any[] = [];
  if (saved) {
    try { customEmployees = JSON.parse(saved); } catch {}
  }

  const staffEmployees = staff.map((s, i) => ({
    id: s.id || `EMP-${100 + i}`,
    name: s.name,
    role: s.roleLabel || s.role || 'Senior Full-Stack Engineer',
    department: s.department || 'Digital Delivery & UX',
    email: s.email,
    rating: 4.9,
    kpiScore: 96,
    tasksCount: 6,
    feedback: 'Top-tier sprint velocity and delivery excellence.',
    status: 'Active',
    projectsCount: 3,
  }));

  const merged = [...staffEmployees];
  for (const ce of customEmployees) {
    if (!merged.some(m => m.email === ce.email || m.name === ce.name)) {
      merged.push(ce);
    }
  }
  return merged;
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
export interface DigitalMeetingRecord {
  id: string;
  title: string;
  client: string;
  client_id?: string;
  host_staff_name: string;
  host_staff_email?: string;
  time: string;
  date?: string;
  platform?: string;
  meeting_type?: string;
  link?: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  created_at: string;
}

export async function getDigitalMeetings(): Promise<DigitalMeetingRecord[]> {
  const saved = localStorage.getItem('ferex_digital_meetings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  const initialMeetings: DigitalMeetingRecord[] = [
    {
      id: 'MTG-101',
      title: 'Fall Admissions Campaign Sprint Kickoff',
      client: 'Ferex Education Consultancy',
      host_staff_name: 'Digital Project Manager',
      host_staff_email: 'pm@ferex.com',
      time: 'Tomorrow, 11:30 AM',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      platform: 'Google Meet',
      meeting_type: 'Sprint Kickoff',
      link: 'https://meet.google.com/fer-dig-arch',
      notes: 'Review ad funnel conversion targets and creative storyboard assets.',
      status: 'Scheduled',
      created_at: new Date().toISOString(),
    },
    {
      id: 'MTG-102',
      title: 'Packaging Identity & Die-Cut Review Session',
      client: 'Rimi Frozen Foods Cold Chain',
      host_staff_name: 'Digital Agency Lead',
      host_staff_email: 'digital@ferex.com',
      time: 'Friday, 03:00 PM',
      date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      platform: 'Zoom',
      meeting_type: 'Design Review',
      link: 'https://zoom.us/j/9842103321',
      notes: 'Finalize blast frozen export packaging die-lines with supply chain team.',
      status: 'Scheduled',
      created_at: new Date().toISOString(),
    },
    {
      id: 'MTG-103',
      title: 'Merchant Checkout UX & Payment Gateways Demo',
      client: 'Nexus Retail & FinTech Group',
      host_staff_name: 'Digital Project Manager',
      host_staff_email: 'pm@ferex.com',
      time: 'Next Monday, 04:30 PM',
      date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      platform: 'Google Meet',
      meeting_type: 'Client Demo',
      link: 'https://meet.google.com/nex-fin-demo',
      notes: 'Demonstrate responsive checkout design system tokens.',
      status: 'Scheduled',
      created_at: new Date().toISOString(),
    }
  ];

  try { localStorage.setItem('ferex_digital_meetings', JSON.stringify(initialMeetings)); } catch {}
  return initialMeetings;
}

export async function createDigitalMeeting(mtg: {
  title: string;
  client: string;
  client_id?: string;
  host_staff_name?: string;
  host_staff_email?: string;
  time: string;
  date?: string;
  platform?: string;
  meeting_type?: string;
  link?: string;
  notes?: string;
}): Promise<DigitalMeetingRecord> {
  const current = await getDigitalMeetings();
  const created: DigitalMeetingRecord = {
    id: `MTG-${Math.floor(100 + Math.random() * 900)}`,
    title: mtg.title,
    client: mtg.client,
    client_id: mtg.client_id,
    host_staff_name: mtg.host_staff_name || 'Digital Project Manager',
    host_staff_email: mtg.host_staff_email || 'pm@ferex.com',
    time: mtg.time,
    date: mtg.date || new Date().toISOString().split('T')[0],
    platform: mtg.platform || 'Google Meet',
    meeting_type: mtg.meeting_type || 'Sprint Review',
    link: mtg.link || 'https://meet.google.com',
    notes: mtg.notes || '',
    status: 'Scheduled',
    created_at: new Date().toISOString(),
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
  const initialNotifs = [
    {
      id: 'notif-001',
      title: 'Campaign Sprint Kickoff Confirmed',
      message: 'Fall Admissions 2027 digital campaign creative storyboards ready for client review.',
      description: 'Fall Admissions 2027 digital campaign creative storyboards ready for client review.',
      category: 'Projects',
      type: 'Projects',
      link: '/digital/projects',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'notif-002',
      title: 'Packaging Die-Lines Deliverable Uploaded',
      message: 'Rimi Cold Chain export seafood packaging template files submitted to deliverables hub.',
      description: 'Rimi Cold Chain export seafood packaging template files submitted to deliverables hub.',
      category: 'Deliverables',
      type: 'Deliverables',
      link: '/digital/projects',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'notif-003',
      title: 'Retainer Milestone Invoice Generated',
      message: '₹6,500,000 billing milestone generated for Nexus Retail & FinTech omnichannel portal.',
      description: '₹6,500,000 billing milestone generated for Nexus Retail & FinTech omnichannel portal.',
      category: 'Finance',
      type: 'Finance',
      link: '/digital/invoices',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: 'notif-004',
      title: 'Client Architecture Review Scheduled',
      message: 'Omnichannel Merchant Acquiring review session scheduled for next Monday 04:30 PM.',
      description: 'Omnichannel Merchant Acquiring review session scheduled for next Monday 04:30 PM.',
      category: 'Meetings',
      type: 'Meetings',
      link: '/digital/meetings',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    }
  ];

  try {
    const { data, error } = await supabase
      .from('digital_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      try { localStorage.setItem('ferex_digital_notifications', JSON.stringify(data)); } catch {}
      return data;
    }

    const local = localStorage.getItem('ferex_digital_notifications');
    if (local !== null) {
      try { 
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    
    try { localStorage.setItem('ferex_digital_notifications', JSON.stringify(initialNotifs)); } catch {}
    return initialNotifs;
  } catch {
    const local = localStorage.getItem('ferex_digital_notifications');
    if (local !== null) {
      try { 
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return initialNotifs;
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
    description: notif.description || notif.message || '',
    type: notif.type || notif.category || 'Projects',
    category: notif.category || notif.type || 'Projects',
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
