import { supabase } from '../supabase';
import { getDigitalProjects, type DigitalProjectRecord } from './digital';

export interface DigitalPMIdentity {
  id?: string;
  email?: string;
  full_name?: string;
  name?: string;
}

export interface DigitalSprint {
  id: string;
  project_id: string;
  project_title?: string;
  name: string;
  goal?: string;
  status: 'Planning' | 'Active' | 'Completed' | 'Archived';
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface DigitalMilestone {
  id: string;
  project_id: string;
  project_title?: string;
  title: string;
  description?: string;
  due_date: string;
  status: 'Pending' | 'In Progress' | 'In Review' | 'Completed' | 'Approved';
  deliverables_summary?: string;
  completion_percentage: number;
  payment_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface DigitalTicket {
  id: string;
  ticket_number: string;
  project_id: string;
  project_title?: string;
  client_id?: string;
  client_name?: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  assigned_to_name?: string;
  assigned_to_email?: string;
  assigned_staff_id?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DigitalPMTask {
  id: string;
  project_id?: string;
  project_title?: string;
  title: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  due_date?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  assigned_staff_id?: string;
  notes?: string;
  task_type?: 'Task' | 'Sprint' | 'Milestone' | 'Ticket' | 'Central Directive';
  created_by?: string;
  is_central_directive?: boolean;
  sprint_id?: string;
  sprint_name?: string;
  story_points?: number;
  milestone_id?: string;
  milestone_name?: string;
  created_at: string;
  updated_at: string;
}

// Visibility is decided by the database: administrators see everything, team members see the projects assigned to them
// and the tasks assigned to them. Nothing is cached locally and nothing is guessed from names or emails.
const fail = (what: string, e: { message: string }) => new Error(`${what}: ${e.message}`);
const notify = (...events: string[]) => { if (typeof window !== 'undefined') events.forEach(e => window.dispatchEvent(new Event(e))); };
const nowIso = () => new Date().toISOString();
const clean = <T extends Record<string, any>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export async function getAssignedDigitalProjects(_pm?: DigitalPMIdentity): Promise<DigitalProjectRecord[]> {
  return getDigitalProjects();
}

export async function getAssignedDigitalTasks(_pm?: DigitalPMIdentity): Promise<DigitalPMTask[]> {
  const { data, error } = await supabase.from('digital_tasks').select('*').order('created_at', { ascending: false });
  if (error) throw fail('Failed to load tasks', error);
  return (data || []) as DigitalPMTask[];
}

export interface TaskOriginInfo {
  type: 'me' | 'digital_admin' | 'central_admin';
  label: string;
  creatorName?: string;
}

export function getTaskOrigin(
  task: DigitalPMTask,
  currentUserId?: string,
  currentUserEmail?: string,
  currentUserName?: string
): TaskOriginInfo {
  const cBy = (task.created_by || '').trim();
  const cByLower = cBy.toLowerCase();
  const myEmail = (currentUserEmail || '').toLowerCase().trim();
  const myName = (currentUserName || '').toLowerCase().trim();
  const myId = (currentUserId || '').trim();

  // 1. Central Admin Directive
  if (
    task.is_central_directive ||
    task.task_type === 'Central Directive' ||
    (task as any).central_task_id ||
    cByLower === 'central admin' ||
    cByLower === 'central' ||
    cByLower === 'superadmin' ||
    cByLower.includes('central directive') ||
    (task.project_title && task.project_title.toLowerCase().includes('central directive'))
  ) {
    return {
      type: 'central_admin',
      label: 'Central Admin',
      creatorName: 'Central Operations HQ'
    };
  }

  // 2. Created by Me (Self / Current Staff / PM)
  if (
    (myId && (cBy === myId || (task as any).created_by_id === myId)) ||
    (myEmail && (cByLower === myEmail || cByLower.includes(myEmail))) ||
    (myName && (cByLower === myName || cByLower === 'me' || cByLower === 'self' || cByLower.includes(myName)))
  ) {
    return {
      type: 'me',
      label: 'Created by Me',
      creatorName: currentUserName || 'Me'
    };
  }

  // 3. Digital Admin (Agency Director)
  if (
    cByLower.includes('admin') ||
    cByLower.includes('director') ||
    cByLower.includes('digital') ||
    !cBy
  ) {
    return {
      type: 'digital_admin',
      label: 'Digital Admin',
      creatorName: cBy || 'Digital Director'
    };
  }

  return {
    type: 'digital_admin',
    label: cBy ? `By ${cBy}` : 'Digital Admin',
    creatorName: cBy || 'Digital Admin'
  };
}

export async function createDigitalTaskDirect(task: Partial<DigitalPMTask>): Promise<DigitalPMTask> {
  if (!task.title?.trim()) throw new Error('A task needs a title');
  const { data: auth } = await supabase.auth.getUser();
  const payload = clean({
    project_id: task.project_id || null,
    project_title: task.project_title || '',
    title: task.title.trim(),
    priority: task.priority || 'Medium',
    status: task.status || 'To Do',
    due_date: task.due_date || null,
    assigned_staff_id: task.assigned_staff_id || (task.assigned_to_email ? undefined : auth.user?.id) || null,
    assigned_to_email: task.assigned_to_email || null,
    notes: task.notes || '',
    task_type: task.task_type || 'Task',
    created_by: task.created_by || auth.user?.email || '',
    sprint_id: task.sprint_id || null,
    sprint_name: task.sprint_name || '',
    story_points: task.story_points || 1,
    milestone_id: task.milestone_id || null,
    milestone_name: task.milestone_name || '',
  });
  const { data, error } = await supabase.from('digital_tasks').insert(payload).select('*').single();
  if (error) throw fail('Failed to create task', error);
  notify('ferex_digital_tasks_change');
  return data as DigitalPMTask;
}

export async function updateDigitalTaskStatusDirect(id: string, status: DigitalPMTask['status']) {
  const { data, error } = await supabase.from('digital_tasks').update({ status, updated_at: nowIso() }).eq('id', id).select('id');
  if (error) throw fail('Failed to update task status', error);
  if (!data?.length) throw new Error('You cannot change this task (it is not assigned to you).');
  notify('ferex_digital_tasks_change');
  return { id, status };
}

export async function getAssignedDigitalSprints(projectIds?: string[]): Promise<DigitalSprint[]> {
  let q = supabase.from('digital_sprints').select('*').order('start_date', { ascending: false });
  if (projectIds?.length) q = q.in('project_id', projectIds);
  const { data, error } = await q;
  if (error) throw fail('Failed to load sprints', error);
  return (data || []) as DigitalSprint[];
}

export async function createDigitalSprintDirect(sprint: Partial<DigitalSprint>): Promise<DigitalSprint> {
  if (!sprint.project_id) throw new Error('Choose the project this sprint belongs to');
  if (!sprint.name?.trim()) throw new Error('A sprint needs a name');
  if (!sprint.start_date || !sprint.end_date || sprint.end_date < sprint.start_date) throw new Error('The sprint end date must be on or after its start date');
  const { data, error } = await supabase.from('digital_sprints').insert(clean({
    project_id: sprint.project_id, project_title: sprint.project_title || '', name: sprint.name.trim(), goal: sprint.goal || '',
    status: sprint.status || 'Planning', start_date: sprint.start_date, end_date: sprint.end_date,
  })).select('*').single();
  if (error) throw fail('Failed to create sprint', error);
  notify('ferex_digital_sprints_change');
  return data as DigitalSprint;
}

export async function updateDigitalSprintStatus(id: string, status: DigitalSprint['status']) {
  const { data, error } = await supabase.from('digital_sprints').update({ status, updated_at: nowIso() }).eq('id', id).select('id');
  if (error) throw fail('Failed to update sprint', error);
  if (!data?.length) throw new Error('You cannot change this sprint');
  notify('ferex_digital_sprints_change');
}

export async function getAssignedDigitalMilestones(projectIds?: string[]): Promise<DigitalMilestone[]> {
  let q = supabase.from('digital_milestones').select('*').order('due_date', { ascending: true });
  if (projectIds?.length) q = q.in('project_id', projectIds);
  const { data, error } = await q;
  if (error) throw fail('Failed to load milestones', error);
  return (data || []) as DigitalMilestone[];
}

export async function createDigitalMilestoneDirect(m: Partial<DigitalMilestone> & { part_id?: string | null }): Promise<DigitalMilestone> {
  if (!m.project_id) throw new Error('Choose the project this milestone belongs to');
  if (!m.title?.trim()) throw new Error('A milestone needs a title');
  const { data, error } = await supabase.from('digital_milestones').insert(clean({
    project_id: m.project_id, project_title: m.project_title || '', title: m.title.trim(), description: m.description?.trim() || '',
    due_date: m.due_date || null, status: m.status || 'Pending', deliverables_summary: m.deliverables_summary || '',
    completion_percentage: m.completion_percentage ?? 0, payment_percentage: m.payment_percentage ?? 0, part_id: m.part_id || null,
  })).select('*').single();
  if (error) throw fail('Failed to create milestone', error);
  notify('ferex_digital_milestones_change');
  return data as DigitalMilestone;
}

export async function updateDigitalMilestoneDirect(id: string, updates: Partial<DigitalMilestone> & { part_id?: string | null }) {
  const { data, error } = await supabase.from('digital_milestones').update({ ...updates, updated_at: nowIso() }).eq('id', id).select('id');
  if (error) throw fail('Failed to update milestone', error);
  if (!data?.length) throw new Error('You cannot change this milestone');
  notify('ferex_digital_milestones_change');
  return { id, ...updates };
}

export async function getAssignedDigitalTickets(projectIds?: string[], _pm?: DigitalPMIdentity): Promise<DigitalTicket[]> {
  let q = supabase.from('digital_tickets').select('*').order('created_at', { ascending: false });
  if (projectIds?.length) q = q.in('project_id', projectIds);
  const { data, error } = await q;
  if (error) throw fail('Failed to load client tickets', error);
  return (data || []) as DigitalTicket[];
}

export async function createDigitalTicketDirect(t: Partial<DigitalTicket>): Promise<DigitalTicket> {
  if (!t.title?.trim()) throw new Error('A ticket needs a title');
  const { data, error } = await supabase.from('digital_tickets').insert(clean({
    ticket_number: `TKT-${Date.now().toString(36).toUpperCase()}`,
    project_id: t.project_id || null, project_title: t.project_title || '', client_id: t.client_id || null, client_name: t.client_name || '',
    title: t.title.trim(), description: t.description?.trim() || '', priority: t.priority || 'Medium', status: t.status || 'Open',
    assigned_staff_id: t.assigned_staff_id || null, assigned_to_email: t.assigned_to_email || null, resolution_notes: '',
  })).select('*').single();
  if (error) throw fail('Failed to create ticket', error);
  notify('ferex_digital_tickets_change');
  return data as DigitalTicket;
}

export async function updateDigitalTicketDirect(id: string, updates: Partial<DigitalTicket>) {
  const { data, error } = await supabase.from('digital_tickets').update({ ...updates, updated_at: nowIso() }).eq('id', id).select('id');
  if (error) throw fail('Failed to update ticket', error);
  if (!data?.length) throw new Error('You cannot change this ticket');
  notify('ferex_digital_tickets_change');
  return { id, ...updates };
}

export async function getAssignedDigitalDeliverables(projectIds?: string[]) {
  let q = supabase.from('digital_deliverables').select('*').order('uploaded_at', { ascending: false });
  if (projectIds?.length) q = q.in('project_id', projectIds);
  const { data, error } = await q;
  if (error) throw fail('Failed to load deliverables', error);
  return (data || []).map((d: any) => ({ ...d, file_url: d.file_url || d.url || '' }));
}

export async function createDigitalDeliverableDirect(d: { project_id: string; title: string; file_url: string; version?: string; approved_by_client?: boolean }) {
  if (!d.project_id) throw new Error('Choose a project');
  if (!d.title?.trim()) throw new Error('A deliverable needs a title');
  if (!/^https?:\/\//i.test(d.file_url || '')) throw new Error('Enter a full link starting with http:// or https://');
  const { data, error } = await supabase.from('digital_deliverables').insert({
    project_id: d.project_id, title: d.title.trim(), file_url: d.file_url, url: d.file_url, type: 'Live URL',
    version: d.version || 'v1.0', status: d.approved_by_client ? 'Approved' : 'Submitted', approved_by_client: !!d.approved_by_client,
  }).select('*').single();
  if (error) throw fail('Failed to save deliverable', error);
  notify('ferex_digital_deliverables_change', 'ferex_digital_projects_change');
  return data;
}
