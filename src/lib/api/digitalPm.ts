import { digitalList, digitalInsert, digitalUpdate } from './digitalStore';
import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import type { Task } from '../types';
import { getDigitalProjects, addDigitalDeliverable, type DigitalProjectRecord } from './digital';

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

/**
 * Resolves current authenticated user identity for PM filtering
 */
async function resolvePMIdentity(pm?: DigitalPMIdentity): Promise<{ id?: string; email?: string; name?: string; role?: string }> {
  let id = pm?.id;
  let email = pm?.email;
  let name = pm?.full_name || pm?.name;
  let role = '';

  if (!id && !email && !name) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      id = authData.user.id;
      email = authData.user.email;
      name = authData.user.user_metadata?.full_name;
      role = (authData.user.user_metadata?.role || '').toLowerCase();
    }
  }

  return { id, email, name, role };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PROJECTS ASSIGNED TO PM (Integrated Supabase + Local Cache with resilient fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalProjects(pm?: DigitalPMIdentity): Promise<DigitalProjectRecord[]> {
  const projects = await getDigitalProjects();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in to view projects');
  const { data: profile, error: profileError } = await supabase.from('users').select('role').eq('id', data.user.id).single();
  if (profileError) throw profileError;
  if (['digital_admin','digital','ferex_digital','central','superadmin','super_admin'].includes(profile.role)) return projects;
  return projects.filter(p => p.assigned_staff_id === data.user.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TASKS ASSIGNED TO PM (Integrates digital_tasks and tasks from Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalTasks(pm?: DigitalPMIdentity): Promise<DigitalPMTask[]> {
  const { getDigitalTasks } = await import('./digital');
  return await getDigitalTasks() as DigitalPMTask[];
}

export async function createDigitalTaskDirect(task: Partial<DigitalPMTask>): Promise<DigitalPMTask> {
  const { createDigitalTask } = await import('./digital');
  return await createDigitalTask(task as any) as DigitalPMTask;
}


export async function updateDigitalTaskStatusDirect(id: string, status: DigitalPMTask['status']) {
  const { updateDigitalTaskStatus } = await import('./digital');
  await updateDigitalTaskStatus(id, status);
  return { id, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SPRINTS & KANBAN (Pure Supabase + Resilient Cache)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalSprints(projectIds?: string[]): Promise<DigitalSprint[]> {
if(projectIds && !projectIds.length)return [];const data=await digitalList('digital_sprints');return projectIds?data.filter(s=>projectIds.includes(s.project_id)):data;
}

export async function createDigitalSprintDirect(sprint: Partial<DigitalSprint>): Promise<DigitalSprint> {
if(!sprint.project_id || !sprint.name?.trim() || !sprint.start_date || !sprint.end_date || sprint.end_date<sprint.start_date)throw new Error('Project, sprint name and valid dates required');return digitalInsert('digital_sprints',{...sprint,id:generateUUID(),status:sprint.status || 'Planning'});
}

export async function updateDigitalSprintStatus(id: string, status: DigitalSprint['status']) {
return digitalUpdate('digital_sprints',id,{status});
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MILESTONES (Pure Supabase + Resilient Cache)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalMilestones(projectIds?: string[]): Promise<DigitalMilestone[]> {
if(projectIds && !projectIds.length)return [];const data=await digitalList('digital_milestones');return projectIds?data.filter(s=>projectIds.includes(s.project_id)):data;
}

export async function createDigitalMilestoneDirect(milestone: Partial<DigitalMilestone>): Promise<DigitalMilestone> {
  const newId = generateUUID();
  const payload = {
    id: newId,
    project_id: milestone.project_id,
    project_title: milestone.project_title || '',
    title: milestone.title?.trim() || '',
    description: milestone.description?.trim() || '',
    due_date: milestone.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: milestone.status || 'Pending',
    deliverables_summary: milestone.deliverables_summary || '',
    completion_percentage: milestone.completion_percentage ?? 0,
    payment_percentage: milestone.payment_percentage ?? 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('digital_milestones').insert(payload);
  if (error) {
    throw new Error(`Failed to create milestone in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_digital_milestones_change'));
  return payload as DigitalMilestone;
}

export async function updateDigitalMilestoneDirect(id: string, updates: Partial<DigitalMilestone>) {
  const { error } = await supabase
    .from('digital_milestones')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update milestone in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_digital_milestones_change'));
  return { id, ...updates };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CLIENT TICKETS & REVISIONS (Pure Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalTickets(projectIds?: string[], pm?: DigitalPMIdentity): Promise<DigitalTicket[]> {
  const { id, email, name } = await resolvePMIdentity(pm);

  let query = supabase
    .from('digital_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  const filters: string[] = [];
  if (projectIds && projectIds.length > 0) {
    filters.push(`project_id.in.(${projectIds.join(',')})`);
  }
  if (id) filters.push(`assigned_staff_id.eq.${id}`);
  if (email) filters.push(`assigned_to_email.eq.${email}`);
  if (name) filters.push(`assigned_to_name.eq.${name}`);

  if (filters.length > 0) {
    query = query.or(filters.join(','));
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load client tickets from database: ${error.message}`);
  }

  return data || [];
}

export async function createDigitalTicketDirect(ticket: Partial<DigitalTicket>): Promise<DigitalTicket> {
  const newId = generateUUID();
  const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload = {
    id: newId,
    ticket_number: ticketNumber,
    project_id: ticket.project_id || null,
    project_title: ticket.project_title || '',
    client_id: ticket.client_id || null,
    client_name: ticket.client_name || '',
    title: ticket.title?.trim() || '',
    description: ticket.description?.trim() || '',
    priority: ticket.priority || 'Medium',
    status: ticket.status || 'Open',
    assigned_to_name: ticket.assigned_to_name || '',
    assigned_to_email: ticket.assigned_to_email || '',
    assigned_staff_id: ticket.assigned_staff_id || null,
    resolution_notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('digital_tickets').insert(payload);
  if (error) {
    throw new Error(`Failed to create client ticket in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_digital_tickets_change'));
  return payload as DigitalTicket;
}

export async function updateDigitalTicketDirect(id: string, updates: Partial<DigitalTicket>) {
  const { error } = await supabase
    .from('digital_tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update ticket in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_digital_tickets_change'));
  return { id, ...updates };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DELIVERABLES & DOCUMENTS (Integrated Supabase + Project Deliverables Sync)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalDeliverables(projectIds?: string[]) {
  let dbDeliverables: any[] = [];
  try {
    let query = supabase
      .from('digital_deliverables')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (projectIds && projectIds.length > 0) {
      query = query.in('project_id', projectIds);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      dbDeliverables = data;
    }
  } catch {}

  // Also collect deliverables attached directly inside digital projects
  let projectDeliverables: any[] = [];
  try {
    const allProjects = await getDigitalProjects();
    const targetProjects = (projectIds && projectIds.length > 0)
      ? allProjects.filter(p => projectIds.includes(p.id))
      : allProjects;

    targetProjects.forEach(p => {
      if (Array.isArray(p.deliverables)) {
        p.deliverables.forEach((d: any) => {
          projectDeliverables.push({
            id: d.id || `${p.id}-${d.title}`,
            project_id: p.id,
            project_title: p.title,
            title: d.title || 'Project Deliverable',
            file_url: d.url || d.file_url || '',
            version: d.version || 'v1.0',
            approved_by_client: d.status === 'Approved',
            uploaded_at: d.uploaded_at || p.created_at || new Date().toISOString()
          });
        });
      }
    });
  } catch {}

  const map = new Map<string, any>();
  projectDeliverables.forEach(d => map.set(d.id, d));
  dbDeliverables.forEach(d => map.set(d.id, d));

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()
  );
}

export async function createDigitalDeliverableDirect(deliverable: {
  project_id: string;
  title: string;
  file_url: string;
  version?: string;
  approved_by_client?: boolean;
}) {
const d=await addDigitalDeliverable(deliverable.project_id,{title:deliverable.title,type:'Live URL',url:deliverable.file_url,status:'Submitted',notes:deliverable.version});return {...d,file_url:d.url,project_id:deliverable.project_id};
}
