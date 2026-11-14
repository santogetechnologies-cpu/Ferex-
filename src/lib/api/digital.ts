import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { getDivisionStaff, getDivisionStaffSync } from './staff';
import {
  sendDigitalClientWelcomeEmail,
  sendDigitalProjectMilestoneEmail,
  sendDigitalMeetingEmail
} from './email';
import { trackContract, formatTotals, type CommerceBody } from '../digitalCommerce';

export const getDigitalStaffMembers = () => getDivisionStaff('digital');
export const getDigitalStaffMembersSync = () => getDivisionStaffSync('digital');

// Everything here reads from and writes to the database only. Nothing is kept in browser storage, so every user sees the
// same records and a deleted record never comes back. Writes throw the real database error so screens can show it.

function triggerLocalSync(eventName: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(eventName));
}
function fail(error: { message?: string } | null | undefined, fallback = 'Request failed'): never {
  throw new Error(error?.message || fallback);
}
function ok<T>(res: { data: T; error: any }, fallback?: string): T {
  if (res.error) fail(res.error, fallback);
  return res.data;
}
const isUuid = (v?: string | null): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const num = (v: unknown) => Number(v) || 0;
const pick = (src: Record<string, any>, keys: string[]) => {
  const out: Record<string, any> = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k];
  return out;
};

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
  client_type: string;
  status: string;
  total_revenue?: number;
  estimated_budget?: number;
  notes?: string;
  tags?: string[];
  lead_stage?: string;
  lead_source?: string;
  website?: string;
  priority?: string;
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
  stage_history: Array<{ stage: DigitalProjectStage; timestamp: string; confirmed_by: string; notes?: string }>;
  start_date: string;
  deadline: string;
  assigned_staff_id?: string | null;
  assigned_staff_name: string;
  assigned_staff_email?: string;
  lead_developer?: string;
  created_by?: string;
  budget: number;
  progress: number;
  payment_terms: 'Advance Payment' | 'Milestone-Based' | 'Full Payment' | string;
  payment_status: 'Paid' | 'Pending' | 'Overdue' | 'Partially Paid';
  advance_amount: number;
  advance_paid: number;
  balance_amount: number;
  balance_paid: number;
  deliverables: DigitalDeliverable[];
  payment_split_type?: string;
  advance_percentage?: number;
  currency?: string;
  country?: string;
  created_at: string;
  updated_at: string;
  client?: any;
}

const CLIENT_COLUMNS = ['company_name', 'contact_person', 'email', 'phone', 'industry', 'city', 'client_type', 'status', 'total_revenue', 'estimated_budget',
  'notes', 'tags', 'lead_stage', 'lead_source', 'website', 'priority', 'tax_id', 'country', 'currency', 'contract_value'];

function mapClient(c: any): DigitalClientRecord {
  return { ...c, name: c.company_name, tags: Array.isArray(c.tags) ? c.tags : [], total_revenue: num(c.total_revenue), estimated_budget: num(c.estimated_budget) };
}

export async function getDigitalClients(): Promise<DigitalClientRecord[]> {
  const rows = ok(await supabase.from('digital_clients').select('*').eq('is_deleted', false).order('created_at', { ascending: false }));
  return ((rows || []) as any[]).map(mapClient);
}

export async function createDigitalClient(client: {
  company_name?: string; name?: string; contact_person: string; email: string; phone?: string; industry?: string; city?: string;
  client_type?: string; status?: string; estimated_budget?: number; total_revenue?: number; notes?: string; tags?: string[];
  lead_stage?: string; lead_source?: string; website?: string; priority?: string; created_by?: string;
}) {
  const company = (client.company_name || client.name || '').trim();
  if (!company) throw new Error('Company name is required');
  if (!client.contact_person?.trim()) throw new Error('Contact person is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((client.email || '').trim())) throw new Error('Enter a valid email address');
  const estimated = num(client.estimated_budget ?? client.total_revenue);
  const { data, error } = await supabase.from('digital_clients').insert({
    company_name: company,
    contact_person: client.contact_person.trim(),
    email: client.email.trim().toLowerCase(),
    phone: client.phone || '',
    industry: client.industry || '',
    city: client.city || '',
    client_type: client.client_type || 'External',
    status: client.status || 'Active',
    total_revenue: 0,
    estimated_budget: estimated,
    notes: client.notes || '',
    tags: client.tags || [],
    lead_stage: client.lead_stage || null,
    lead_source: client.lead_source || null,
    website: client.website || null,
    priority: client.priority || null,
    is_deleted: false,
    created_by: client.created_by || '',
    updated_by: client.created_by || '',
  }).select().single();
  if (error) {
    if ((error as any).code === '23505') throw new Error(`A client named "${company}" already exists.`);
    fail(error, 'Could not save the client');
  }
  triggerLocalSync('ferex_digital_clients_change');
  const created = mapClient(data);
  if (created.status !== 'Lead' && created.email) {
    sendDigitalClientWelcomeEmail({
      clientEmail: created.email,
      clientName: created.contact_person || created.company_name,
      companyName: created.company_name,
      serviceRetainer: created.industry || 'Digital services',
    }).catch(() => {});
  }
  return created;
}

export async function updateDigitalClient(id: string, updates: any) {
  const patch: any = { ...pick(updates, CLIENT_COLUMNS), updated_at: new Date().toISOString() };
  if (patch.email) patch.email = String(patch.email).trim().toLowerCase();
  const { data, error } = await supabase.from('digital_clients').update(patch).eq('id', id).select().maybeSingle();
  if (error) {
    if ((error as any).code === '23505') throw new Error('Another client already uses that company name.');
    fail(error, 'Could not update the client');
  }
  if (!data) throw new Error('This client no longer exists. Refresh the page.');
  triggerLocalSync('ferex_digital_clients_change');
  return mapClient(data);
}

/** Archives a client. A client that still has live projects cannot be deleted. */
export async function deleteDigitalClient(id: string, _deleted_by?: string) {
  const { count } = await supabase.from('digital_projects').select('id', { count: 'exact', head: true }).eq('client_id', id).eq('is_deleted', false);
  if ((count || 0) > 0) throw new Error(`This client still has ${count} project(s). Delete or reassign them first.`);
  const { data, error } = await supabase.from('digital_clients').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id).select('id');
  if (error) fail(error, 'Could not delete the client');
  if (!data || data.length === 0) throw new Error('The client could not be deleted (it may already be gone, or you do not have permission).');
  triggerLocalSync('ferex_digital_clients_change');
  return true;
}

// ─── Digital Leads ──────────────────────────────────────────────
export async function getDigitalLeads() {
  const clients = await getDigitalClients();
  return clients.filter(c => c.status === 'Lead');
}

export async function createDigitalLead(lead: {
  company_name: string; contact_person: string; email: string; phone?: string; industry?: string; estimated_budget?: number;
  client_type?: 'Internal' | 'External'; lead_stage?: string; lead_source?: string; website?: string; notes?: string; priority?: string;
}) {
  return createDigitalClient({ ...lead, status: 'Lead', client_type: lead.client_type || 'External', estimated_budget: num(lead.estimated_budget) });
}

/** Turns a lead into an active client and, optionally, its first project, in one database step. */
export async function convertDigitalLead(leadId: string, projectData?: {
  title: string; service_category?: string; budget?: number; scope?: string; payment_terms?: string; start_date?: string; deadline?: string;
}) {
  if (projectData && !projectData.title?.trim()) throw new Error('Enter a title for the first project');
  const data = ok(
    await supabase.rpc('digital_convert_lead', {
      p_id: leadId,
      p_project: projectData ? {
        title: projectData.title.trim(),
        service_category: projectData.service_category || 'Digital Services',
        budget: num(projectData.budget),
        scope: projectData.scope || '',
        payment_terms: projectData.payment_terms || 'Milestone-Based',
        start_date: projectData.start_date || null,
        deadline: projectData.deadline || null,
      } : null,
    }),
    'Could not convert the lead'
  ) as any;
  triggerLocalSync('ferex_digital_clients_change');
  triggerLocalSync('ferex_digital_projects_change');
  return { client: mapClient(data.client), project: data.project || null };
}

// ─── Digital Projects ───────────────────────────────────────────

const PROJECT_COLUMNS = ['title', 'scope', 'description', 'service_category', 'budget', 'start_date', 'deadline', 'notes', 'payment_terms', 'progress',
  'status', 'currency', 'country', 'client_id', 'client_name', 'client_type', 'advance_amount', 'balance_amount', 'payment_split_type', 'advance_percentage'];

function mapProject(p: any): DigitalProjectRecord {
  return {
    ...p,
    client_name: p.client_name || '',
    budget: num(p.budget),
    progress: num(p.progress),
    advance_amount: num(p.advance_amount),
    advance_paid: num(p.advance_paid),
    balance_amount: num(p.balance_amount),
    balance_paid: num(p.balance_paid),
    stage_history: Array.isArray(p.stage_history) ? p.stage_history : [],
    deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
    assigned_staff_name: p.assigned_staff_name || '',
  } as DigitalProjectRecord;
}

export async function getDigitalProjects(filters?: {
  category?: string; status?: string; staffId?: string; staffName?: string; staffEmail?: string; clientId?: string; search?: string;
}): Promise<DigitalProjectRecord[]> {
  const rows = ok(await supabase.from('digital_projects').select('*').eq('is_deleted', false).order('created_at', { ascending: false })) as any[];
  let projects = (rows || []).map(mapProject);
  if (filters?.category && filters.category !== 'All') projects = projects.filter(p => p.service_category === filters.category);
  if (filters?.status && filters.status !== 'All') projects = projects.filter(p => p.status === filters.status);
  if (filters?.clientId) projects = projects.filter(p => p.client_id === filters.clientId);
  if (filters?.staffId || filters?.staffName || filters?.staffEmail) {
    projects = projects.filter(p =>
      (filters.staffId && p.assigned_staff_id === filters.staffId) ||
      (filters.staffEmail && (p.assigned_staff_email || '').toLowerCase() === filters.staffEmail.toLowerCase()) ||
      (filters.staffName && p.assigned_staff_name === filters.staffName)
    );
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    projects = projects.filter(p => (p.title || '').toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q) || (p.assigned_staff_name || '').toLowerCase().includes(q));
  }
  return projects;
}

/** Resolves a person picked by name (or email) to a real Digital login. */
async function resolveStaff(by: { id?: string; email?: string; name?: string }) {
  const staff = await getDivisionStaff('digital');
  const found = staff.find(s =>
    (by.id && s.id === by.id) || (by.email && s.email.toLowerCase() === by.email.toLowerCase()) || (by.name && s.name.toLowerCase() === by.name.toLowerCase())
  );
  if (!found || !isUuid(found.id)) {
    throw new Error('Choose a Digital team member who has a login account. Create their staff login first if they do not have one.');
  }
  return found;
}

export async function createDigitalProject(project: {
  client_id?: string; client_name?: string; client_type?: string; title: string; scope?: string; description?: string; service_category?: string;
  budget?: number; advance_amount?: number; balance_amount?: number; progress?: number; start_date?: string; deadline?: string;
  assigned_staff_name?: string; assigned_staff_email?: string; assigned_staff_id?: string; lead_developer?: string; payment_terms?: string;
  status?: DigitalProjectStage; deliverables?: DigitalDeliverable[]; created_by?: string; currency?: string; country?: string;
}): Promise<DigitalProjectRecord> {
  if (!project.title?.trim()) throw new Error('Project title is required');
  if (!isUuid(project.client_id)) throw new Error('Choose the client this project is for');
  const budget = num(project.budget);
  if (budget < 0) throw new Error('The project budget cannot be negative');
  if (project.start_date && project.deadline && new Date(project.deadline) < new Date(project.start_date)) throw new Error('The deadline cannot be before the start date');

  const client = ok(await supabase.from('digital_clients').select('id, company_name, client_type, email, contact_person').eq('id', project.client_id).maybeSingle()) as any;
  if (!client) throw new Error('That client no longer exists');

  let staff: { id: string } | null = null;
  if (project.assigned_staff_id || project.assigned_staff_email || project.assigned_staff_name) {
    staff = await resolveStaff({ id: project.assigned_staff_id, email: project.assigned_staff_email, name: project.assigned_staff_name });
  }
  const stage = project.status || 'Briefing';
  const row = ok(
    await supabase.from('digital_projects').insert({
      client_id: client.id,
      client_name: client.company_name,
      client_type: client.client_type || project.client_type || 'External',
      title: project.title.trim(),
      scope: project.scope || '',
      description: project.description || project.scope || '',
      service_category: project.service_category || 'Digital Services',
      status: stage,
      stage_history: [{ stage, timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16), confirmed_by: project.created_by || 'Digital Admin', notes: 'Project created' }],
      start_date: project.start_date || new Date().toISOString().slice(0, 10),
      deadline: project.deadline || null,
      assigned_staff_id: staff?.id || null,
      created_by: project.created_by || '',
      budget,
      currency: project.currency || 'INR',
      country: project.country || '',
      progress: num(project.progress),
      payment_terms: project.payment_terms || 'Milestone-Based',
      payment_status: 'Pending',
      advance_amount: num(project.advance_amount),
      advance_paid: 0,
      balance_amount: project.balance_amount !== undefined ? num(project.balance_amount) : budget,
      balance_paid: 0,
      deliverables: [],
    }).select().single(),
    'Could not create the project'
  );
  triggerLocalSync('ferex_digital_projects_change');
  const created = mapProject(row);
  if (client.email) {
    sendDigitalProjectMilestoneEmail({ clientEmail: client.email, clientName: client.contact_person || client.company_name, projectTitle: created.title, stage, amount: created.budget }).catch(() => {});
  }
  return created;
}

export async function assignDigitalProject(projectId: string, staffId: string, staffName: string, staffEmail: string, _assignedBy?: string): Promise<boolean> {
  const staff = await resolveStaff({ id: staffId, email: staffEmail, name: staffName });
  const { data, error } = await supabase.from('digital_projects').update({ assigned_staff_id: staff.id, updated_at: new Date().toISOString() }).eq('id', projectId).select('id');
  if (error) fail(error, 'Could not assign the project');
  if (!data || data.length === 0) throw new Error('This project no longer exists, or you do not have permission to assign it.');
  triggerLocalSync('ferex_digital_projects_change');
  return true;
}

export async function reassignDigitalProject(projectId: string, leadName: string, staffEmail?: string, staffId?: string): Promise<boolean> {
  return assignDigitalProject(projectId, staffId || '', leadName, staffEmail || '');
}

export async function updateDigitalProject(id: string, updates: any) {
  const patch: any = { ...pick(updates, PROJECT_COLUMNS), updated_at: new Date().toISOString() };
  if (updates.assigned_staff_id !== undefined || updates.assigned_staff_email !== undefined || updates.assigned_staff_name !== undefined) {
    if (updates.assigned_staff_id || updates.assigned_staff_email || updates.assigned_staff_name) {
      patch.assigned_staff_id = (await resolveStaff({ id: updates.assigned_staff_id, email: updates.assigned_staff_email, name: updates.assigned_staff_name })).id;
    } else {
      patch.assigned_staff_id = null;
    }
  }
  if (patch.progress !== undefined) patch.progress = Math.max(0, Math.min(100, num(patch.progress)));
  const { data, error } = await supabase.from('digital_projects').update(patch).eq('id', id).select().maybeSingle();
  if (error) fail(error, 'Could not update the project');
  if (!data) throw new Error('This project no longer exists, or you do not have permission to change it.');
  triggerLocalSync('ferex_digital_projects_change');
  return mapProject(data);
}

export async function updateDigitalProjectStage(projectId: string, newStage: DigitalProjectStage | string): Promise<boolean> {
  await advanceDigitalProjectStage(projectId, newStage, 'Digital Admin');
  return true;
}

const STAGE_PROGRESS: Record<string, number> = { Briefing: 15, 'In Progress': 45, Review: 75, Revisions: 85, Delivered: 95, Closed: 100 };

export async function advanceDigitalProjectStage(
  projectId: string, newStage: DigitalProjectStage | string, confirmedBy: string = 'Digital Lead', notes?: string
): Promise<DigitalProjectRecord | null> {
  const current = ok(await supabase.from('digital_projects').select('*').eq('id', projectId).eq('is_deleted', false).maybeSingle()) as any;
  if (!current) throw new Error('This project no longer exists. Refresh the page.');
  const history = [
    ...(Array.isArray(current.stage_history) ? current.stage_history : []),
    { stage: newStage, timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16), confirmed_by: confirmedBy, notes: notes || `Advanced to stage: ${newStage}` },
  ];
  const progress = STAGE_PROGRESS[newStage] ?? num(current.progress);
  const row = ok(
    await supabase.from('digital_projects').update({ status: newStage, progress, stage_history: history, updated_at: new Date().toISOString() }).eq('id', projectId).select().maybeSingle(),
    'Could not move the project to the next stage'
  );
  if (!row) throw new Error('You do not have permission to change this project.');
  triggerLocalSync('ferex_digital_projects_change');
  const project = mapProject(row);
  if (project.client_id) {
    const client = (await supabase.from('digital_clients').select('email, contact_person').eq('id', project.client_id).maybeSingle()).data as any;
    if (client?.email) {
      sendDigitalProjectMilestoneEmail({ clientEmail: client.email, clientName: client.contact_person || project.client_name, projectTitle: project.title, stage: newStage, amount: project.budget }).catch(() => {});
    }
  }
  return project;
}

// Deliverables

export async function addDigitalDeliverable(
  projectId: string,
  deliverable: { title: string; type: DigitalDeliverable['type']; url: string; status?: 'Draft' | 'Submitted' | 'Approved'; notes?: string }
): Promise<DigitalDeliverable> {
  if (!deliverable.title?.trim()) throw new Error('Enter a title for the deliverable');
  if (!/^https?:\/\//i.test(deliverable.url || '')) throw new Error('Enter a full link starting with http:// or https://');
  const item: DigitalDeliverable = {
    id: generateUUID(),
    title: deliverable.title.trim(),
    type: deliverable.type,
    url: deliverable.url.trim(),
    added_at: new Date().toISOString().slice(0, 10),
    status: deliverable.status === 'Approved' ? 'Submitted' : (deliverable.status || 'Submitted'), // approval is a separate admin action
    notes: deliverable.notes || '',
  };
  ok(await supabase.rpc('digital_add_deliverable', { p_project: projectId, p_deliverable: item }), 'Could not add the deliverable');
  triggerLocalSync('ferex_digital_projects_change');
  return item;
}

export async function reviewDigitalDeliverable(projectId: string, deliverableId: string, status: 'Draft' | 'Submitted' | 'Approved') {
  ok(await supabase.rpc('digital_review_deliverable', { p_project: projectId, p_deliverable: deliverableId, p_status: status }), 'Could not update the deliverable');
  triggerLocalSync('ferex_digital_projects_change');
  return true;
}

export async function deleteDigitalDeliverable(projectId: string, deliverableId: string): Promise<boolean> {
  const { error } = await supabase.rpc('digital_remove_deliverable', { p_project: projectId, p_deliverable: deliverableId });
  if (error) fail(error, 'Could not remove the deliverable');
  triggerLocalSync('ferex_digital_projects_change');
  return true;
}

/** Archives a project. A project with payments recorded cannot be deleted until they are refunded. */
export async function deleteDigitalProject(id: string) {
  const { error } = await supabase.rpc('digital_delete_project', { p_id: id });
  if (error) fail(error, 'Could not delete the project');
  triggerLocalSync('ferex_digital_projects_change');
  triggerLocalSync('ferex_digital_tasks_change');
  triggerLocalSync('ferex_digital_commerce_change');
  return true;
}

// ─── Digital Tasks ─────────────────────────────────────────────
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
  assigned_staff_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TASK_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];
const TASK_COLUMNS = ['title', 'priority', 'status', 'due_date', 'notes', 'project_id', 'sprint_id', 'sprint_name', 'story_points', 'milestone_id', 'milestone_name', 'task_type', 'assigned_staff_id', 'assigned_to_email', 'assigned_to_name'];

export async function getDigitalTasks(projectId?: string) {
  let query = supabase.from('digital_tasks').select('*, project:digital_projects(title, client_id, client_name)').order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const rows = ok(await query) as any[];
  // Directives from Central Admin arrive in this table through a database trigger, so there is one list.
  return (rows || []).map(t => {
    const central = Boolean(t.is_central_directive) || t.task_type === 'Central Directive' || t.created_by === 'Central Admin';
    return { ...t, project_title: t.project?.title || t.project_title || (central ? 'Central Operations Directive' : ''), is_central_directive: central, created_by: central ? 'Central Admin' : t.created_by };
  });
}

export async function createDigitalTask(task: {
  project_id?: string; project_title?: string; title: string; priority?: string; status?: string; due_date?: string;
  assigned_to_name?: string; assigned_to_email?: string; assigned_staff_id?: string; notes?: string;
  task_type?: string; sprint_id?: string; sprint_name?: string; story_points?: number; milestone_id?: string; milestone_name?: string;
}) {
  if (!task.title?.trim()) throw new Error('Task title is required');
  if (!isUuid(task.project_id)) throw new Error('Choose the project this task belongs to');
  if (task.priority && !TASK_PRIORITIES.includes(task.priority)) throw new Error('Priority must be Low, Medium, High or Critical');
  if (task.status && !TASK_STATUSES.includes(task.status)) throw new Error('Unknown task status');
  const proj = ok(await supabase.from('digital_projects').select('id, title').eq('id', task.project_id).eq('is_deleted', false).maybeSingle()) as any;
  if (!proj) throw new Error('That project no longer exists');

  let staffId: string | null = null;
  if (task.assigned_staff_id || task.assigned_to_email || task.assigned_to_name) {
    staffId = (await resolveStaff({ id: task.assigned_staff_id, email: task.assigned_to_email, name: task.assigned_to_name })).id;
  }
  const { data: userRes } = await supabase.auth.getUser();
  const row = ok(
    await supabase.from('digital_tasks').insert({
      project_id: proj.id,
      project_title: proj.title,
      title: task.title.trim(),
      priority: task.priority || 'Medium',
      status: task.status || 'To Do',
      due_date: task.due_date || null,
      assigned_staff_id: staffId,
      notes: task.notes || '',
      task_type: task.task_type || 'Task',
      sprint_id: isUuid(task.sprint_id) ? task.sprint_id : null,
      sprint_name: task.sprint_name || '',
      story_points: task.story_points ?? null,
      milestone_id: isUuid(task.milestone_id) ? task.milestone_id : null,
      milestone_name: task.milestone_name || '',
      created_by: userRes?.user?.id || '',
    }).select().single(),
    'Could not create the task'
  );
  triggerLocalSync('ferex_digital_tasks_change');
  return row as any;
}

export async function updateDigitalTask(id: string, updates: any) {
  const patch: any = { ...pick(updates, TASK_COLUMNS), updated_at: new Date().toISOString() };
  if (patch.priority && !TASK_PRIORITIES.includes(patch.priority)) throw new Error('Priority must be Low, Medium, High or Critical');
  if (patch.status && !TASK_STATUSES.includes(patch.status)) throw new Error('Unknown task status');
  if (updates.assigned_staff_id !== undefined || updates.assigned_to_email !== undefined || updates.assigned_to_name !== undefined) {
    if (updates.assigned_staff_id || updates.assigned_to_email || updates.assigned_to_name) {
      patch.assigned_staff_id = (await resolveStaff({ id: updates.assigned_staff_id, email: updates.assigned_to_email, name: updates.assigned_to_name })).id;
      delete patch.assigned_to_email; delete patch.assigned_to_name;
    } else {
      patch.assigned_staff_id = null; patch.assigned_to = null; patch.assigned_to_name = null; patch.assigned_to_email = null;
    }
  }
  const { data, error } = await supabase.from('digital_tasks').update(patch).eq('id', id).select().maybeSingle();
  if (error) fail(error, 'Could not update the task');
  if (!data) throw new Error('This task no longer exists, or you do not have permission to change it.');
  triggerLocalSync('ferex_digital_tasks_change');
  triggerLocalSync('ferex_tasks_change');
  return data as any;
}

export async function updateDigitalTaskStatus(id: string, status: string) {
  return updateDigitalTask(id, { status });
}

export async function deleteDigitalTask(id: string) {
  const { data, error } = await supabase.from('digital_tasks').delete().eq('id', id).select('id');
  if (error) fail(error, 'Could not delete the task');
  if (!data || data.length === 0) throw new Error('The task could not be deleted (it may already be gone, or you do not have permission).');
  triggerLocalSync('ferex_digital_tasks_change');
  triggerLocalSync('ferex_tasks_change');
  return true;
}

// ─── Digital Sprints ───────────────────────────────────────────
export async function getDigitalSprints() {
  return (ok(await supabase.from('digital_sprints').select('*').order('created_at', { ascending: false })) || []) as any[];
}

export async function createDigitalSprint(sprint: { name: string; project_id?: string; start_date: string; end_date: string; status?: string; goal?: string }) {
  if (!sprint.name?.trim()) throw new Error('Sprint name is required');
  if (sprint.end_date < sprint.start_date) throw new Error('The sprint cannot end before it starts');
  const proj = isUuid(sprint.project_id) ? ((await supabase.from('digital_projects').select('title').eq('id', sprint.project_id).maybeSingle()).data as any) : null;
  const row = ok(await supabase.from('digital_sprints').insert({
    name: sprint.name.trim(), goal: sprint.goal || '', project_id: isUuid(sprint.project_id) ? sprint.project_id : null, project_title: proj?.title || '',
    start_date: sprint.start_date, end_date: sprint.end_date, status: sprint.status || 'Active',
  }).select().single(), 'Could not create the sprint');
  triggerLocalSync('ferex_digital_sprints_change');
  return row as any;
}

export async function updateDigitalSprint(id: string, updates: any) {
  const patch = { ...pick(updates, ['name', 'goal', 'status', 'start_date', 'end_date']), updated_at: new Date().toISOString() };
  const row = ok(await supabase.from('digital_sprints').update(patch).eq('id', id).select().maybeSingle(), 'Could not update the sprint');
  if (!row) throw new Error('This sprint no longer exists. Refresh the page.');
  triggerLocalSync('ferex_digital_sprints_change');
  return row as any;
}

// ─── Invoices & billing summaries ───────────────────────────────
// Billing lives in one place: the project contract (services, payment terms, partial collections, refunds, documents).
// These summaries are read straight from it, so dashboards, client views and reports always agree with the ledger.

export async function getDigitalInvoices(clientId?: string) {
  const [contractRes, projectRes] = await Promise.all([
    supabase.from('digital_contracts').select('*').order('created_at', { ascending: false }),
    supabase.from('digital_projects').select('id, title, client_id, client_name, currency, deadline, is_deleted, service_category, created_at'),
  ]);
  const contracts = (contractRes.data || []) as any[];
  const projects = new Map(((projectRes.data || []) as any[]).filter(p => !p.is_deleted).map(p => [p.id, p]));
  const out: any[] = [];
  for (const c of contracts) {
    const proj = projects.get(c.project_id);
    if (!proj) continue;
    const body = c.body as CommerceBody;
    const t = trackContract(body);
    const status = t.total > 0 && t.received >= t.total ? 'Paid' : t.overdue_count > 0 ? 'Overdue' : t.received > 0 ? 'Partially Paid' : 'Sent';
    out.push({
      id: c.id,
      contract_id: c.id,
      client_id: proj.client_id,
      client: { id: proj.client_id, company_name: proj.client_name },
      client_name: proj.client_name,
      project_id: c.project_id,
      project: { id: proj.id, title: proj.title },
      invoice_no: '',
      amount: num(body.total),
      subtotal: num(body.subtotal),
      tax_amount: num(body.tax),
      total_amount: num(body.total),
      amount_received: t.received,
      balance_due: t.outstanding,
      currency: body.currency,
      status,
      due_date: t.next_due?.due_date || '',
      notes: body.notes || '',
      items: (body.lines || []).map(l => ({ projectId: proj.id, projectTitle: proj.title, description: l.title, amount: num(l.amount) })),
      payment_parts: t.terms,
      overdue_amount: t.overdue_amount,
      service_category: proj.service_category,
      issued_at: c.created_at,
      paid_at: status === 'Paid' ? c.updated_at : null,
      created_at: c.created_at,
      updated_at: c.updated_at,
    });
  }
  return clientId ? out.filter(i => i.client_id === clientId) : out;
}

// ─── Digital Expenses ────────────────────────────────────────
export async function getDigitalExpenses() {
  return (ok(await supabase.from('digital_expenses').select('*').order('created_at', { ascending: false })) || []) as any[];
}

export async function createDigitalExpense(expense: { title: string; category: string; amount: number; project_id?: string; vendor?: string; date?: string; currency?: string }) {
  if (!expense.title?.trim()) throw new Error('Enter what the expense is for');
  if (!(Number(expense.amount) > 0)) throw new Error('Enter an amount greater than zero');
  const row = ok(await supabase.from('digital_expenses').insert({
    title: expense.title.trim(), category: expense.category || 'General', amount: Number(expense.amount),
    project_id: isUuid(expense.project_id) ? expense.project_id : null, vendor: expense.vendor || '',
    date: expense.date || new Date().toISOString().slice(0, 10), status: 'Approved', currency: expense.currency || 'INR',
  }).select().single(), 'Could not save the expense');
  triggerLocalSync('ferex_digital_expenses_change');
  return row as any;
}

export async function deleteDigitalExpense(id: string) {
  const { data, error } = await supabase.from('digital_expenses').delete().eq('id', id).select('id');
  if (error) fail(error, 'Could not delete the expense');
  if (!data || data.length === 0) throw new Error('The expense could not be deleted.');
  triggerLocalSync('ferex_digital_expenses_change');
  return true;
}

// ─── Digital Employees ───────────────────────────────────────
// The team is the set of real Digital logins. Task and project counts are counted from real records; there are no
// invented ratings or scores. Extra records (contractors without a login) are stored in the database.

export async function getDigitalEmployees() {
  const [staff, tasksRes, projects, extraRes] = await Promise.all([
    getDivisionStaff('digital'),
    supabase.from('digital_tasks').select('assigned_staff_id, status'),
    getDigitalProjects().catch(() => [] as DigitalProjectRecord[]),
    supabase.from('digital_employees').select('*'),
  ]);
  const tasks = (tasksRes.data || []) as any[];
  const fromStaff = staff.map(s => {
    const mine = tasks.filter(t => t.assigned_staff_id === s.id);
    const done = mine.filter(t => t.status === 'Done').length;
    return {
      id: s.id,
      name: s.name,
      role: s.roleLabel || s.role || '',
      department: s.department || 'Digital',
      email: s.email,
      status: 'Active',
      tasksCount: mine.length,
      projectsCount: projects.filter(p => p.assigned_staff_id === s.id).length,
      kpiScore: mine.length ? Math.round((done / mine.length) * 100) : null,
      rating: null as number | null,
      feedback: '',
    };
  });
  const extras = ((extraRes.data || []) as any[]).filter(e => !fromStaff.some(s => s.email && s.email.toLowerCase() === (e.email || '').toLowerCase()));
  return [...fromStaff, ...extras] as any[];
}

export async function createDigitalEmployee(emp: { name: string; role: string; department: string; email: string; rating?: number; kpiScore?: number; feedback?: string }) {
  if (!emp.name?.trim()) throw new Error('Name is required');
  const row = ok(await supabase.from('digital_employees').insert({
    name: emp.name.trim(), role: emp.role || '', department: emp.department || '', email: (emp.email || '').trim().toLowerCase(), status: 'Active',
    rating: emp.rating ?? null, 'kpiScore': emp.kpiScore ?? null, feedback: emp.feedback || '',
  } as any).select().single(), 'Could not save the team member');
  triggerLocalSync('ferex_digital_employees_change');
  return row as any;
}

export async function updateDigitalEmployee(id: string, updates: any) {
  const row = ok(await supabase.from('digital_employees').update({ ...pick(updates, ['name', 'role', 'department', 'email', 'phone', 'status', 'rating', 'kpiScore', 'feedback']), updated_at: new Date().toISOString() } as any).eq('id', id).select().maybeSingle(), 'Could not update the team member');
  if (!row) throw new Error('This record belongs to a staff login. Change it from the staff directory instead.');
  triggerLocalSync('ferex_digital_employees_change');
  return row as any;
}

export async function deleteDigitalEmployee(id: string) {
  const { data, error } = await supabase.from('digital_employees').delete().eq('id', id).select('id');
  if (error) fail(error, 'Could not remove the team member');
  if (!data || data.length === 0) throw new Error('This person is a staff login. Remove their login from the staff directory instead.');
  triggerLocalSync('ferex_digital_employees_change');
  return true;
}

// ─── Digital Meetings ────────────────────────────────────────
export interface DigitalMeetingRecord {
  id: string; title: string; client: string; client_id?: string; host_staff_name: string; host_staff_email?: string; time: string; date?: string;
  platform?: string; meeting_type?: string; link?: string; notes?: string; status: 'Scheduled' | 'Completed' | 'Cancelled'; created_at: string;
}

function mapMeeting(m: any): DigitalMeetingRecord {
  const when = m.scheduled_at ? new Date(m.scheduled_at) : null;
  return {
    id: m.id, title: m.title, client: m.client_name || '', client_id: m.client_id || undefined,
    host_staff_name: m.host_staff_name || '', host_staff_email: m.host_staff_email || '',
    time: m.time_display || (when ? when.toTimeString().slice(0, 5) : ''), date: m.date_display || (when ? when.toISOString().slice(0, 10) : ''),
    platform: m.platform || '', meeting_type: m.meeting_type || '', link: m.meeting_url || '', notes: m.notes || m.agenda || '',
    status: (m.status as any) || 'Scheduled', created_at: m.created_at,
  };
}

export async function getDigitalMeetings(): Promise<DigitalMeetingRecord[]> {
  return ((ok(await supabase.from('digital_meetings').select('*').order('scheduled_at', { ascending: false })) || []) as any[]).map(mapMeeting);
}

export async function createDigitalMeeting(mtg: {
  title: string; client: string; client_id?: string; host_staff_name?: string; host_staff_email?: string; time: string; date?: string;
  platform?: string; meeting_type?: string; link?: string; notes?: string;
}): Promise<DigitalMeetingRecord> {
  if (!mtg.title?.trim()) throw new Error('Meeting title is required');
  if (!mtg.time || !mtg.date) throw new Error('Choose the meeting date and time');
  const scheduled = new Date(`${mtg.date}T${mtg.time}`);
  if (Number.isNaN(scheduled.getTime())) throw new Error('The meeting date or time is not valid');
  const row = ok(await supabase.from('digital_meetings').insert({
    title: mtg.title.trim(), client_id: mtg.client_id || null, client_name: mtg.client || '', scheduled_at: scheduled.toISOString(),
    time_display: mtg.time, date_display: mtg.date, platform: mtg.platform || '', meeting_type: mtg.meeting_type || '',
    meeting_url: mtg.link || '', notes: mtg.notes || '', status: 'Scheduled',
    host_staff_name: mtg.host_staff_name || '', host_staff_email: mtg.host_staff_email || '',
  }).select().single(), 'Could not schedule the meeting');
  triggerLocalSync('ferex_digital_meetings_change');
  const created = mapMeeting(row);
  const client = mtg.client_id ? ((await supabase.from('digital_clients').select('email, contact_person, company_name').eq('id', mtg.client_id).maybeSingle()).data as any) : null;
  if (client?.email) {
    sendDigitalMeetingEmail({ clientEmail: client.email, clientName: client.contact_person || client.company_name, title: created.title, meetingDate: created.date || '', startTime: created.time, meetLink: created.link || '' }).catch(() => {});
  }
  return created;
}

export async function deleteDigitalMeeting(id: string) {
  const { data, error } = await supabase.from('digital_meetings').delete().eq('id', id).select('id');
  if (error) fail(error, 'Could not delete the meeting');
  if (!data || data.length === 0) throw new Error('The meeting could not be deleted.');
  triggerLocalSync('ferex_digital_meetings_change');
  return true;
}

// ─── Digital Messages ────────────────────────────────────────
export async function getDigitalMessages(conversationId: string = '1') {
  return (ok(await supabase.from('digital_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true })) || []) as any[];
}

export async function sendDigitalMessage(msg: { conversation_id: string; contact_name: string; contact_role: string; sender_name: string; message: string; is_self?: boolean }) {
  if (!msg.message?.trim()) throw new Error('Type a message first');
  const row = ok(await supabase.from('digital_messages').insert({
    conversation_id: msg.conversation_id, contact_name: msg.contact_name, contact_role: msg.contact_role,
    sender_name: msg.sender_name, sender_role: msg.contact_role, message: msg.message.trim(), is_self: msg.is_self ?? true,
  }).select().single(), 'Could not send the message');
  return row as any;
}

// ─── Digital Dashboard Stats ─────────────────────────────────────
export async function getDigitalDashboardStats() {
  const [clients, projects, tasks, invoices] = await Promise.all([getDigitalClients(), getDigitalProjects(), getDigitalTasks(), getDigitalInvoices()]);
  const pipeline: Record<string, number> = {};
  for (const p of projects) { const c = p.currency || 'INR'; pipeline[c] = (pipeline[c] || 0) + num(p.budget); }
  const collected: Record<string, number> = {};
  const outstanding: Record<string, number> = {};
  const overdue: Record<string, number> = {};
  for (const i of invoices) {
    collected[i.currency] = (collected[i.currency] || 0) + i.amount_received;
    outstanding[i.currency] = (outstanding[i.currency] || 0) + i.balance_due;
    overdue[i.currency] = (overdue[i.currency] || 0) + i.overdue_amount;
  }
  return {
    activeClientsCount: clients.filter(c => c.status === 'Active').length,
    activeProjectsCount: projects.filter(p => p.status === 'In Progress').length,
    totalProjectsCount: projects.length,
    totalPipelineValueStr: formatTotals(pipeline),
    totalCollectedStr: formatTotals(collected),
    totalOutstandingStr: formatTotals(outstanding),
    totalOverdueStr: formatTotals(overdue),
    overdueTermsCount: invoices.reduce((s, i) => s + (i.payment_parts || []).filter((t: any) => t.status === 'Overdue').length, 0),
    pendingTasksCount: tasks.filter((t: any) => t.status !== 'Done').length,
  };
}

// ─── Client portal logins ───────────────────────────────────────
// A client gets a real login through an invitation email: they set their own password. No password is ever shown or
// kept in the browser.

export interface ProvisionedClientCredential {
  email: string;
  invited: boolean;
  clientId: string;
  fullName: string;
  companyName: string;
}

export async function provisionDigitalClientLogin(client: { id: string; email: string; name?: string; company_name?: string; contact_person?: string }): Promise<ProvisionedClientCredential> {
  const email = client.email.trim().toLowerCase();
  const fullName = client.contact_person || client.name || client.company_name || 'Client';
  const { data, error } = await supabase.functions.invoke('provision-digital-user', {
    body: { email, full_name: fullName, role: 'digital_client', client_id: client.id },
  });
  if (error) {
    let message = error.message;
    try { message = (await (error as any).context?.json())?.error || message; } catch { /* keep the gateway message */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  triggerLocalSync('ferex_digital_clients_change');
  return { email, invited: true, clientId: client.id, fullName, companyName: client.company_name || client.name || '' };
}

/** Whether a client already has a portal login. */
export async function getDigitalClientAccess(clientId: string): Promise<boolean> {
  const { count } = await supabase.from('digital_client_users').select('user_id', { count: 'exact', head: true }).eq('client_id', clientId);
  return (count || 0) > 0;
}

export function getDigitalClientCredentials(_clientId: string): null {
  return null;
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

const ASSET_COLUMNS = ['name', 'type', 'provider', 'cost_per_month_inr', 'renewal_date', 'status', 'assigned_to_project', 'assigned_team_lead', 'license_seats'];

export async function getDigitalAssets(): Promise<DigitalAsset[]> {
  const rows = (ok(await supabase.from('digital_assets').select('*').order('created_at', { ascending: false })) || []) as any[];
  return rows.map(a => ({ ...a, cost_per_month_inr: num(a.cost_per_month_inr), renewal_date: a.renewal_date || '' }));
}

export async function createDigitalAsset(asset: Partial<DigitalAsset>): Promise<DigitalAsset> {
  if (!asset.name?.trim()) throw new Error('Enter the asset or licence name');
  const row = ok(await supabase.from('digital_assets').insert({
    name: asset.name.trim(), type: asset.type || 'SaaS License', provider: asset.provider || '', cost_per_month_inr: num(asset.cost_per_month_inr),
    renewal_date: asset.renewal_date || null, status: asset.status || 'Active', assigned_to_project: asset.assigned_to_project || '',
    assigned_team_lead: asset.assigned_team_lead || '', license_seats: asset.license_seats ? num(asset.license_seats) : 1,
  }).select().single(), 'Could not save the asset');
  triggerLocalSync('ferex_digital_assets_change');
  return row as any;
}

export async function updateDigitalAsset(id: string, updates: Partial<DigitalAsset>) {
  const { data, error } = await supabase.from('digital_assets').update({ ...pick(updates, ASSET_COLUMNS), updated_at: new Date().toISOString() }).eq('id', id).select('id');
  if (error) fail(error, 'Could not update the asset');
  if (!data || data.length === 0) throw new Error('This asset no longer exists. Refresh the page.');
  triggerLocalSync('ferex_digital_assets_change');
  return true;
}

export async function deleteDigitalAsset(id: string) {
  const { data, error } = await supabase.from('digital_assets').delete().eq('id', id).select('id');
  if (error) fail(error, 'Could not delete the asset');
  if (!data || data.length === 0) throw new Error('The asset could not be deleted.');
  triggerLocalSync('ferex_digital_assets_change');
  return true;
}

export async function getDigitalAssetCostSummary() {
  const assets = await getDigitalAssets();
  return {
    totalMonthlyInr: assets.reduce((s, a) => s + num(a.cost_per_month_inr), 0),
    expiringSoonCount: assets.filter(a => a.status === 'Expiring Soon').length,
    activeCount: assets.filter(a => a.status === 'Active').length,
    totalAssetsCount: assets.length,
  };
}

// ─── Digital Notifications ──────────────────────────────────────
// Stored notifications live in the database; alerts about reviews, deliverables, overdue payment terms and urgent tasks are
// worked out from live data. Read state is saved per signed-in user in the database.

export async function getDigitalNotifications(): Promise<any[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  const [stored, reads, projects, tasks, invoices] = await Promise.all([
    supabase.from('digital_notifications').select('*').order('created_at', { ascending: false }).limit(200),
    uid ? supabase.from('digital_notification_reads').select('notification_id').eq('user_id', uid) : Promise.resolve({ data: [] as any[] }),
    getDigitalProjects().catch(() => [] as DigitalProjectRecord[]),
    getDigitalTasks().catch(() => [] as any[]),
    getDigitalInvoices().catch(() => [] as any[]),
  ]);
  const readIds = new Set(((reads.data || []) as any[]).map(r => String(r.notification_id)));
  const list = new Map<string, any>();
  for (const n of (stored.data || []) as any[]) list.set(n.id, { ...n, description: n.description || n.message });

  const add = (id: string, n: any) => { if (!list.has(id)) list.set(id, { id, is_read: false, ...n }); };
  for (const p of projects) {
    if (p.status === 'Review' || p.status === 'Revisions') {
      add(`dyn-proj-rev-${p.id}`, { title: `Project Review: "${p.title}"`, message: `Project for ${p.client_name} is in ${p.status} awaiting stakeholder review.`, category: 'Projects', type: 'Projects', severity: 'Action Required', link: '/digital/projects', created_at: p.updated_at });
    }
    for (const d of p.deliverables || []) {
      if (d.status === 'Submitted') add(`dyn-deliv-${d.id}`, { title: `Deliverable submitted: "${d.title}"`, message: `${d.type} for "${p.title}" is waiting for approval.`, category: 'Deliverables', type: 'Deliverables', severity: 'Info', link: '/digital/deliverables', created_at: d.added_at ? new Date(d.added_at).toISOString() : p.updated_at });
    }
  }
  for (const inv of invoices) {
    for (const t of inv.payment_parts || []) {
      if (t.status === 'Overdue') add(`dyn-term-od-${inv.id}-${t.id}`, { title: `Payment overdue: ${inv.project?.title}`, message: `"${t.label}" is ${Math.abs(t.days_to_due)} day(s) overdue. ${new Intl.NumberFormat('en', { style: 'currency', currency: inv.currency }).format(t.remaining)} outstanding from ${inv.client_name}.`, category: 'Invoices', type: 'Invoices', severity: 'Urgent', link: '/digital/billing', created_at: new Date(t.due_date).toISOString() });
      else if (t.status === 'Due Soon') add(`dyn-term-due-${inv.id}-${t.id}`, { title: `Payment due soon: ${inv.project?.title}`, message: `"${t.label}" is due in ${t.days_to_due} day(s) from ${inv.client_name}.`, category: 'Invoices', type: 'Invoices', severity: 'Info', link: '/digital/billing', created_at: new Date().toISOString() });
    }
  }
  for (const t of tasks) {
    if ((t.priority === 'Critical' || t.priority === 'High') && t.status !== 'Done') {
      add(`dyn-task-${t.id}`, { title: `${t.priority}-priority task: "${t.title}"`, message: `Assigned to ${t.assigned_to_name || 'nobody yet'} · ${t.status || 'To Do'}.`, category: 'Tasks', type: 'Tasks', severity: 'Urgent', link: '/digital/tasks', created_at: t.created_at });
    }
  }
  return Array.from(list.values())
    .map(n => ({ ...n, is_read: readIds.has(String(n.id)) }))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

export async function createDigitalNotification(notif: { title: string; message?: string; description?: string; type?: string; category?: string; link?: string }) {
  if (!notif.title?.trim()) throw new Error('Enter a title');
  const row = ok(await supabase.from('digital_notifications').insert({
    title: notif.title.trim(), message: notif.message || notif.description || '', description: notif.description || notif.message || '',
    type: notif.type || notif.category || 'Projects', category: notif.category || notif.type || 'Projects', link: notif.link || '', is_read: false,
  }).select().single(), 'Could not create the notification');
  triggerLocalSync('ferex_digital_notifications_change');
  return row as any;
}

export async function markDigitalNotificationRead(id: string) {
  const { error } = await supabase.rpc('digital_mark_notification_read', { p_id: String(id) });
  if (error) fail(error, 'Could not mark the notification as read');
  triggerLocalSync('ferex_digital_notifications_change');
  return true;
}

export async function markAllDigitalNotificationsRead() {
  const all = await getDigitalNotifications();
  for (const n of all.filter(n => !n.is_read)) {
    const { error } = await supabase.rpc('digital_mark_notification_read', { p_id: String(n.id) });
    if (error) fail(error, 'Could not mark the notifications as read');
  }
  triggerLocalSync('ferex_digital_notifications_change');
  return true;
}

export async function deleteDigitalNotification(id: string) {
  const sid = String(id);
  if (isUuid(sid)) {
    const { data } = await supabase.from('digital_notifications').delete().eq('id', sid).select('id');
    if (data && data.length > 0) { triggerLocalSync('ferex_digital_notifications_change'); return true; }
  }
  // Alerts that are worked out from live data, or that only an admin may delete, are cleared for this user by marking them read.
  return markDigitalNotificationRead(sid);
}
