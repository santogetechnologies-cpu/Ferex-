import { digitalList, digitalInsert, digitalUpdate, digitalDelete, requireText, requireAmount } from './digitalStore';
import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { getDivisionStaff, getDivisionStaffSync, type DivisionStaffMember } from './staff';
import {
  sendDigitalClientWelcomeEmail,
  sendDigitalProjectMilestoneEmail,
  sendDigitalDeliverableEmail,
  sendDigitalInvoiceEmail,
  sendDigitalMeetingEmail
} from './email';

export const getDigitalStaffMembers = async (): Promise<DivisionStaffMember[]> => {
const {data,error}=await supabase.rpc('digital_staff_directory');if(error)throw error;return (data||[]).map((s:any)=>({...s,division:'digital',roleLabel:s.role,department:'Digital'}));
};
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
  country?: string;
  currency?: string;
  tax_id?: string;
  contract_value?: number;
  industry?: string;
  city?: string;
  client_type: string; // From masters (configurable, not hardcoded)
  status: string;
  total_revenue?: number;
  estimated_budget?: number;
  notes?: string;
  tags?: string[];
  lead_stage?: string;
  lead_source?: string;
  website?: string;
  priority?: string;
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
  assigned_staff_id?: string | null;
  assigned_staff_name: string;
  assigned_staff_email?: string;
  lead_developer?: string;
  created_by?: string;
  currency?: string;
  country?: string;
  payment_split_type?: 'advance_30' | 'advance_50' | 'three_milestones' | 'full' | 'custom';
  advance_percentage?: number;
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

function getDeletedClientIds(): Set<string> {
  try {
    const raw = localStorage.getItem('ferex_deleted_client_ids');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function addDeletedClientId(id: string) {
  try {
    const set = getDeletedClientIds();
    set.add(id);
    localStorage.setItem('ferex_deleted_client_ids', JSON.stringify(Array.from(set)));
  } catch {}
}

export async function getDigitalClients(): Promise<DigitalClientRecord[]> {
return (await digitalList('digital_clients')).filter(c => !c.is_deleted);
}

export async function createDigitalClient(client: {
  company_name?: string;
  name?: string;
  contact_person: string;
  email: string;
  phone?: string;
  country?: string;
  currency?: string;
  tax_id?: string;
  contract_value?: number;
  industry?: string;
  city?: string;
  client_type?: string;
  status?: string;
  estimated_budget?: number;
  total_revenue?: number;
  notes?: string;
  tags?: string[];
  lead_stage?: string;
  lead_source?: string;
  website?: string;
  priority?: string;
  created_by?: string;
}) {
requireText(client.company_name || client.name, 'Company name');
 requireText(client.email, 'Email');
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) throw new Error('Enter a valid email');
 return digitalInsert('digital_clients', { ...client, id: generateUUID(), company_name: client.company_name || client.name, status: client.status || 'Active', client_type: client.client_type || 'External', total_revenue: 0, estimated_budget: Number(client.estimated_budget || 0) });
}

export async function updateDigitalClient(id: string, updates: any) {
return digitalUpdate('digital_clients', id, updates);
}

export async function deleteDigitalClient(id: string, deleted_by?: string) {
await digitalUpdate('digital_clients', id, { is_deleted: true, updated_by: deleted_by }); return true;
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
  lead_stage?: string;
  lead_source?: string;
  website?: string;
  notes?: string;
  priority?: string;
}) {
  return createDigitalClient({
    ...lead,
    status: 'Lead',
    client_type: lead.client_type || 'External',
    estimated_budget: Number(lead.estimated_budget) || 0,
    total_revenue: Number(lead.estimated_budget) || 0
  });
}

export async function convertDigitalLead(leadId: string, projectData?: {
  title: string;
  service_category?: string;
  budget?: number;
  scope?: string;
  payment_terms?: string;
  start_date?: string;
  deadline?: string;
}) {
const {data,error}=await supabase.rpc('digital_convert_lead',{p_id:leadId,p_project:projectData || null});if(error)throw error;triggerLocalSync('ferex_digital_clients_change');triggerLocalSync('ferex_digital_projects_change');return data;
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
let projects = (await digitalList('digital_projects')).filter(p => !p.is_deleted);
 if (filters?.category && filters.category !== 'All') projects = projects.filter(p => p.service_category === filters.category);
 if (filters?.status && filters.status !== 'All') projects = projects.filter(p => p.status === filters.status);
 if (filters?.clientId) projects = projects.filter(p => p.client_id === filters.clientId);
 if (filters?.staffId) projects = projects.filter(p => p.assigned_staff_id === filters.staffId);
 if (filters?.staffEmail) projects = projects.filter(p => p.assigned_staff_email === filters.staffEmail);
 if (filters?.search) projects = projects.filter(p => [p.title,p.client_name,p.assigned_staff_name].join(' ').toLowerCase().includes(filters.search!.toLowerCase()));
 return projects;
}

export async function createDigitalProject(project: {
  client_id?: string;
  client_name?: string;
  client_type?: string;
  title: string;
  scope?: string;
  description?: string;
  service_category?: string;
  country?: string;
  currency?: string;
  payment_split_type?: string;
  advance_percentage?: number;
  budget?: number;
  advance_amount?: number;
  balance_amount?: number;
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
requireText(project.title, 'Project title');
 const budget = Number(project.budget || 0); requireAmount(budget);
 if (project.deadline && project.start_date && project.deadline < project.start_date) throw new Error('Deadline must follow the start date');
 const advance = project.advance_amount ?? (project.payment_terms === 'Full Payment' ? budget : Math.round(budget * 0.3 * 100) / 100);
 if (advance < 0 || advance > budget) throw new Error('Advance must be within the project budget');
 return digitalInsert('digital_projects', { ...project, id: generateUUID(), client_id: project.client_id || null, client_name: project.client_name || '', client_type: project.client_type || 'External', budget, progress: 0, status: project.status || 'Briefing', start_date: project.start_date || new Date().toISOString().slice(0,10), deadline: project.deadline || null, assigned_staff_id: project.assigned_staff_id || null, assigned_staff_name: project.assigned_staff_name || '', assigned_staff_email: project.assigned_staff_email || '', payment_terms: project.payment_terms || 'Advance Payment', payment_status: 'Pending', advance_amount: advance, balance_amount: budget - advance, advance_paid: 0, balance_paid: 0, deliverables: [], stage_history: [] });
}

export async function assignDigitalProject(
  projectId: string,
  staffId: string,
  staffName: string,
  staffEmail: string,
  assignedBy: string
): Promise<boolean> {
requireText(staffId, 'Staff member'); await updateDigitalProject(projectId, { assigned_staff_id: staffId, assigned_staff_name: staffName, assigned_staff_email: staffEmail, lead_developer: staffName }); return true;
}

export async function reassignDigitalProject(projectId: string, leadName: string, staffEmail?: string, staffId?: string): Promise<boolean> {
requireText(staffId, 'Staff member'); await updateDigitalProject(projectId, { assigned_staff_id: staffId, assigned_staff_name: leadName, assigned_staff_email: staffEmail, lead_developer: leadName }); return true;
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
const project = (await getDigitalProjects()).find(p => p.id === projectId); if (!project) throw new Error('Project not found');
 const progress: Record<string,number> = { Briefing: 15, 'In Progress': 45, Review: 75, Revisions: 85, Delivered: 95, Closed: 100 };
 return updateDigitalProject(projectId, { status: newStage, progress: progress[newStage] ?? project.progress, stage_history: [...(project.stage_history || []), { stage: newStage, timestamp: new Date().toISOString(), confirmed_by: confirmedBy, notes }] });
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
requireText(deliverable.title, 'Deliverable title');
 const url = new URL(deliverable.url); if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Use a valid HTTPS or HTTP asset link');
 const { data, error } = await supabase.rpc('digital_add_deliverable', { p_project: projectId, p_deliverable: { ...deliverable, id: generateUUID(), added_at: new Date().toISOString(), status: 'Submitted' } });
 if (error) throw error; triggerLocalSync('ferex_digital_projects_change'); return data as DigitalDeliverable;
}

export async function deleteDigitalDeliverable(projectId: string, deliverableId: string): Promise<boolean> {
const { error } = await supabase.rpc('digital_remove_deliverable', { p_project: projectId, p_deliverable: deliverableId }); if (error) throw error; triggerLocalSync('ferex_digital_projects_change'); return true;
}

export async function updateDigitalProject(id: string, updates: any) {
if (updates.budget !== undefined) requireAmount(Number(updates.budget)); return digitalUpdate('digital_projects', id, updates);
}

export async function deleteDigitalProject(id: string) {
await updateDigitalProject(id, { is_deleted: true }); return true;
}

export async function deleteAllDigitalProjects() {
throw new Error('Bulk project deletion is disabled. Archive individual projects to retain financial history.');
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
const tasks = await digitalList('digital_tasks'); return projectId ? tasks.filter(t => t.project_id === projectId) : tasks;
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
  assigned_staff_id?: string;
  notes?: string;
}) {
requireText(task.title, 'Task title'); requireText(task.assigned_staff_id, 'Assignee');
 return digitalInsert('digital_tasks', { ...task, id: generateUUID(), project_id: task.project_id || null, status: task.status || 'To Do', priority: task.priority || 'Medium' });
}

export async function updateDigitalTask(id: string, updates: any) {
return digitalUpdate('digital_tasks', id, updates);
}

export async function updateDigitalTaskStatus(id: string, status: string) {
  return updateDigitalTask(id, { status });
}

export async function deleteDigitalTask(id: string) {
return digitalDelete('digital_tasks', id);
}

// ─── Digital Sprints ────────────────────────────────────────────────────────
export async function getDigitalSprints() {
return digitalList('digital_sprints');
}

export async function createDigitalSprint(sprint: {
  name: string;
  project_id?: string;
  start_date: string;
  end_date: string;
  status?: string;
}) {
 return digitalInsert('digital_sprints', { ...sprint, id: generateUUID(), status: sprint.status || 'Planning' });
}

export async function updateDigitalSprint(id: string, updates: any) {
return digitalUpdate('digital_sprints', id, updates);
}

// ─── Digital Invoices: Automatic Single Source of Truth Synchronization ────
export async function getDigitalInvoices(clientId?: string) {
const {commerceList}=await import('./digitalCommerce');const docs=await commerceList('digital_financial_documents');return docs.filter(d=>d.kind==='Invoice').map(d=>({...d,invoice_no:d.number,client_name:d.body.client_name,project_title:d.body.project_title,project_id:d.body.project_id,amount:d.body.amount,currency:d.body.currency,status:'Issued',items:d.body.lines}));
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
throw new Error('Use Centralised Billing to issue immutable invoices and record payments against a payment term.');
}

export async function updateDigitalInvoice(id: string, updates: any) {
throw new Error('Use Centralised Billing to issue immutable invoices and record payments against a payment term.');
}

export async function updateDigitalInvoiceStatus(id: string, status: string) {
  return updateDigitalInvoice(id, { status, paid_at: status === 'Paid' ? new Date().toISOString() : null });
}

export async function deleteDigitalInvoice(id: string) {
throw new Error('Use Centralised Billing to issue immutable invoices and record payments against a payment term.');
}

// ─── Digital Expenses ───────────────────────────────────────────────────────
export async function getDigitalExpenses() {
return digitalList('digital_expenses');
}

export async function createDigitalExpense(expense: {
  title: string;
  category: string;
  amount: number;
  currency?: string;
  project_id?: string;
  vendor?: string;
  date?: string;
}) {
requireAmount(Number(expense.amount)); return digitalInsert('digital_expenses', { ...expense, id: generateUUID(), status: 'Pending', date: expense.date || new Date().toISOString().slice(0,10) });
}

export async function deleteDigitalExpense(id: string) {
return digitalDelete('digital_expenses', id);
}

// ─── Digital Employees ──────────────────────────────────────────────────────
export async function getDigitalEmployees() {
return digitalList('digital_employees');
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
 return digitalInsert('digital_employees', { ...emp, id: generateUUID(),  });
}

export async function updateDigitalEmployee(id: string, updates: any) {
return digitalUpdate('digital_employees', id, updates);
}

export async function deleteDigitalEmployee(id: string) {
return digitalDelete('digital_employees', id);
}

// ─── Digital Attendance & HR ────────────────────────────────────────────────
export async function getDigitalAttendance() {
return digitalList('digital_attendance');
}

export async function recordDigitalAttendance(record: any) {
return digitalInsert('digital_attendance', { ...record, id: generateUUID() });
}

// ─── Digital Meetings ───────────────────────────────────────────────────────
export interface DigitalMeetingRecord {
  id: string;
  title: string;
  client?: string;
  client_id?: string;
  host_staff_name?: string;
  host_staff_email?: string;
  time?: string;
  date?: string;
  platform?: string;
  meeting_type?: string;
  link?: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  created_at: string;
}

export async function getDigitalMeetings(): Promise<DigitalMeetingRecord[]> {
const {getDigitalMeetings:load}=await import('./digitalMeetings');return (await load()).map(m=>({...m,client:m.client_name||'',time:m.time_display||''}));
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
const {createDigitalMeeting:create}=await import('./digitalMeetings');const {meetingTimestamp}=await import('../digitalTime');const m=await create({title:mtg.title,client_id:mtg.client_id,client_name:mtg.client,host_staff_name:mtg.host_staff_name,host_staff_email:mtg.host_staff_email,scheduled_at:meetingTimestamp(mtg.date || new Date().toISOString().slice(0,10),mtg.time || '10:00'),time_display:mtg.time,date_display:mtg.date,platform:(mtg.platform || 'Google Meet') as any,meeting_type:mtg.meeting_type,meeting_url:mtg.link,notes:mtg.notes});return {...m,client:m.client_name||'',time:m.time_display||''};
}

export async function deleteDigitalMeeting(id: string) {
const { deleteDigitalMeeting: remove }=await import('./digitalMeetings');return remove(id);
}

// ─── Digital Messages ───────────────────────────────────────────────────────
export async function getDigitalMessages(conversationId: string = '1') {
const {data,error}=await supabase.from('digital_messages').select('*').eq('conversation_id',conversationId).order('created_at');if(error)throw error;return data||[];
}

export async function sendDigitalMessage(msg: {
  conversation_id: string;
  contact_name: string;
  contact_role: string;
  sender_name: string;
  message: string;
  is_self?: boolean;
}) {
return digitalInsert('digital_messages',{...msg,id:generateUUID()});
}

// ─── Digital Dashboard Stats ────────────────────────────────────────────────
export async function getDigitalDashboardStats() {
const [clients,projects,tasks]=await Promise.all([getDigitalClients(),getDigitalProjects(),getDigitalTasks()]);
 const {commerceList}=await import('./digitalCommerce');const [contracts,collections,refunds]=await Promise.all([commerceList('digital_contracts'),commerceList('digital_collections'),commerceList('digital_refunds')]);
 const totals:Record<string,{agreed:number,paid:number}>={};for(const c of contracts){const r=totals[c.body.currency]??={agreed:0,paid:0};r.agreed+=Number(c.body.total);r.paid+=collections.filter(t=>t.contract_id===c.id).reduce((s,t)=>s+Number(t.amount),0)-refunds.filter(t=>t.contract_id===c.id).reduce((s,t)=>s+Number(t.amount),0);}
 const fmt=(n:number,currency:string)=>new Intl.NumberFormat('en',{style:'currency',currency}).format(n);
 return {activeClientsCount:clients.filter(c=>c.status==='Active').length,activeProjectsCount:projects.filter(p=>!['Closed','Delivered'].includes(p.status)).length,totalProjectsCount:projects.length,totalPipelineValueStr:Object.entries(totals).map(([c,r])=>fmt(r.agreed,c)).join(' / ')||'No billing',totalCollectedStr:Object.entries(totals).map(([c,r])=>fmt(r.paid,c)).join(' / ')||'No collections',pendingTasksCount:tasks.filter(t=>t.status!=='Done').length};
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
const {data,error}=await supabase.functions.invoke('provision-digital-user',{body:{email:client.email,full_name:client.contact_person||client.company_name,role:'digital_client',client_id:client.id}});if(error||data?.error)throw new Error(data?.error || error?.message);return {email:client.email,tempPassword:'',role:'digital_client',fullName:client.contact_person||client.company_name||client.name,companyName:client.company_name||client.name,clientId:client.id,requirePasswordReset:true,provisionedAt:new Date().toISOString()};
}

export function getDigitalClientCredentials(clientId: string): ProvisionedClientCredential | null {
return null;
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
throw new Error('Use Centralised Billing to issue immutable invoices and record payments against a payment term.');
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
return digitalList('digital_assets');
}

export async function createDigitalAsset(asset: Partial<DigitalAsset>): Promise<DigitalAsset> {
 return digitalInsert('digital_assets', { ...asset, id: generateUUID(),  });
}

export async function updateDigitalAsset(id: string, updates: Partial<DigitalAsset>) {
return digitalUpdate('digital_assets', id, updates);
}

export async function deleteDigitalAsset(id: string) {
return digitalDelete('digital_assets', id);
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
export async function getDigitalNotifications(): Promise<any[]> {
const notifications=await digitalList('digital_notifications');const {data,error}=await supabase.from('digital_notification_reads').select('notification_id');if(error)throw error;const read=new Set((data||[]).map(r=>r.notification_id));return notifications.map(n=>({...n,is_read:read.has(n.id)}));
}

export async function createDigitalNotification(notif: {
  title: string;
  message?: string;
  description?: string;
  type?: string;
  category?: string;
  link?: string;
}) {
 return digitalInsert('digital_notifications', { ...notif, id: generateUUID(), message: notif.message || notif.description || '', is_read: false });
}

export async function markDigitalNotificationRead(id: string) {
const { error } = await supabase.rpc('digital_mark_notification_read', { p_id: id }); if (error) throw error; triggerLocalSync('ferex_digital_notifications_change');
}

export async function markAllDigitalNotificationsRead() {
const { error } = await supabase.rpc('digital_mark_notification_read', { p_id: null }); if (error) throw error; triggerLocalSync('ferex_digital_notifications_change');
}

export async function deleteDigitalNotification(id: string) {
return digitalDelete('digital_notifications', id);
}
