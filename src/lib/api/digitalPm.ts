import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import type { Task } from '../types';

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
  task_type?: 'Task' | 'Sprint' | 'Milestone' | 'Ticket';
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
async function resolvePMIdentity(pm?: DigitalPMIdentity): Promise<{ id?: string; email?: string; name?: string }> {
  let id = pm?.id;
  let email = pm?.email;
  let name = pm?.full_name || pm?.name;

  if (!id && !email && !name) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      id = authData.user.id;
      email = authData.user.email;
      name = authData.user.user_metadata?.full_name;
    }
  }

  return { id, email, name };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PROJECTS ASSIGNED TO PM (Pure Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalProjects(pm?: DigitalPMIdentity) {
  const { id, email, name } = await resolvePMIdentity(pm);

  let query = supabase
    .from('digital_projects')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter strictly by the PM's assigned identity
  const filters: string[] = [];
  if (id) filters.push(`assigned_staff_id.eq.${id}`);
  if (email) {
    filters.push(`assigned_staff_email.eq.${email}`);
    filters.push(`assigned_staff_email.ilike.%${email}%`);
  }
  if (name) {
    filters.push(`assigned_staff_name.eq.${name}`);
    filters.push(`assigned_staff_name.ilike.%${name}%`);
  }

  if (filters.length > 0) {
    query = query.or(filters.join(','));
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load assigned digital projects from database: ${error.message}`);
  }

  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TASKS ASSIGNED TO PM (Integrates digital_tasks and tasks from Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalTasks(pm?: DigitalPMIdentity): Promise<DigitalPMTask[]> {
  const { id, email, name } = await resolvePMIdentity(pm);

  // 1. Query digital_tasks table
  let digitalQuery = supabase
    .from('digital_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  const dFilters: string[] = [];
  if (id) {
    dFilters.push(`assigned_staff_id.eq.${id}`);
    dFilters.push(`assigned_to.eq.${id}`);
  }
  if (email) {
    dFilters.push(`assigned_to_email.eq.${email}`);
    dFilters.push(`assigned_to_email.ilike.%${email}%`);
  }
  if (name) {
    dFilters.push(`assigned_to_name.eq.${name}`);
    dFilters.push(`assigned_to_name.ilike.%${name}%`);
  }

  if (dFilters.length > 0) {
    digitalQuery = digitalQuery.or(dFilters.join(','));
  }

  const { data: dTasks, error: dError } = await digitalQuery;
  if (dError) {
    throw new Error(`Failed to load digital tasks from database: ${dError.message}`);
  }

  // 2. Query general tasks assigned to PM (from Central Admin / Super Admin)
  let generalQuery = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  const gFilters: string[] = [];
  if (id) {
    gFilters.push(`assigned_staff_id.eq.${id}`);
    gFilters.push(`assigned_to.eq.${id}`);
  }
  if (email) {
    gFilters.push(`assigned_to.eq.${email}`);
    gFilters.push(`assigned_to.ilike.%${email}%`);
  }
  if (name) {
    gFilters.push(`assigned_to.eq.${name}`);
    gFilters.push(`assigned_to.ilike.%${name}%`);
  }

  if (gFilters.length > 0) {
    generalQuery = generalQuery.or(gFilters.join(','));
  }

  const { data: gTasks } = await generalQuery;

  // Format general tasks into standard DigitalPMTask
  const mappedGeneralTasks: DigitalPMTask[] = (gTasks || []).map((t: any) => ({
    id: t.id,
    project_title: t.category ? `[${t.category}] General Task` : 'General Administrative Task',
    title: t.title,
    priority: (t.priority || 'Medium') as any,
    status: (t.status === 'Completed' ? 'Done' : t.status === 'In Progress' ? 'In Progress' : 'To Do') as any,
    due_date: t.due_date,
    assigned_to_name: t.assigned_to,
    notes: t.description || '',
    task_type: (t.category || 'Task') as any,
    created_at: t.created_at,
    updated_at: t.updated_at
  }));

  // Combine and de-duplicate by ID
  const allTasks = [...(dTasks || []), ...mappedGeneralTasks];
  const uniqueMap = new Map<string, DigitalPMTask>();
  for (const t of allTasks) {
    uniqueMap.set(t.id, t);
  }

  return Array.from(uniqueMap.values());
}

export async function createDigitalTaskDirect(task: Partial<DigitalPMTask>): Promise<DigitalPMTask> {
  const newId = generateUUID();
  const payload = {
    id: newId,
    project_id: task.project_id || null,
    project_title: task.project_title || '',
    title: task.title?.trim() || '',
    priority: task.priority || 'Medium',
    status: task.status || 'To Do',
    due_date: task.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assigned_to_name: task.assigned_to_name || '',
    assigned_to_email: task.assigned_to_email || '',
    assigned_staff_id: task.assigned_staff_id || null,
    notes: task.notes || '',
    task_type: task.task_type || 'Task',
    sprint_id: task.sprint_id || null,
    sprint_name: task.sprint_name || '',
    story_points: task.story_points || 1,
    milestone_id: task.milestone_id || null,
    milestone_name: task.milestone_name || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('digital_tasks').insert(payload);
  if (error) {
    throw new Error(`Failed to create task in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_digital_tasks_change'));
  return payload as DigitalPMTask;
}

export async function updateDigitalTaskStatusDirect(id: string, status: DigitalPMTask['status']) {
  const { error } = await supabase
    .from('digital_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    // Also try general tasks table in case it was a general task
    const { error: gError } = await supabase
      .from('tasks')
      .update({ status: status === 'Done' ? 'Completed' : status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (gError && !gError.message.includes('0 rows')) {
      throw new Error(`Failed to update task status in database: ${error.message}`);
    }
  }

  window.dispatchEvent(new Event('ferex_digital_tasks_change'));
  window.dispatchEvent(new Event('ferex_tasks_change'));
  return { id, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SPRINTS & KANBAN (Pure Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalSprints(projectIds?: string[]): Promise<DigitalSprint[]> {
  let query = supabase
    .from('digital_sprints')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectIds && projectIds.length > 0) {
    query = query.in('project_id', projectIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load sprints from database: ${error.message}`);
  }

  return data || [];
}

export async function createDigitalSprintDirect(sprint: Partial<DigitalSprint>): Promise<DigitalSprint> {
  const newId = generateUUID();
  const payload = {
    id: newId,
    project_id: sprint.project_id,
    project_title: sprint.project_title || '',
    name: sprint.name?.trim() || '',
    goal: sprint.goal?.trim() || '',
    status: sprint.status || 'Active',
    start_date: sprint.start_date || new Date().toISOString().split('T')[0],
    end_date: sprint.end_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('digital_sprints').insert(payload);
  if (error) {
    throw new Error(`Failed to create sprint in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_digital_sprints_change'));
  return payload as DigitalSprint;
}

export async function updateDigitalSprintStatus(id: string, status: DigitalSprint['status']) {
  const { error } = await supabase
    .from('digital_sprints')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update sprint status: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_digital_sprints_change'));
  return { id, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MILESTONES (Pure Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalMilestones(projectIds?: string[]): Promise<DigitalMilestone[]> {
  let query = supabase
    .from('digital_milestones')
    .select('*')
    .order('due_date', { ascending: true });

  if (projectIds && projectIds.length > 0) {
    query = query.in('project_id', projectIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load milestones from database: ${error.message}`);
  }

  return data || [];
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
// 6. DELIVERABLES & DOCUMENTS (Pure Supabase)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAssignedDigitalDeliverables(projectIds?: string[]) {
  let query = supabase
    .from('digital_deliverables')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (projectIds && projectIds.length > 0) {
    query = query.in('project_id', projectIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load deliverables from database: ${error.message}`);
  }

  return data || [];
}

export async function createDigitalDeliverableDirect(deliverable: {
  project_id: string;
  title: string;
  file_url: string;
  version?: string;
  approved_by_client?: boolean;
}) {
  const newId = generateUUID();
  const payload = {
    id: newId,
    project_id: deliverable.project_id,
    title: deliverable.title?.trim() || 'Deliverable Asset',
    file_url: deliverable.file_url?.trim() || '',
    version: deliverable.version || 'v1.0',
    approved_by_client: deliverable.approved_by_client || false,
    uploaded_at: new Date().toISOString()
  };

  const { error } = await supabase.from('digital_deliverables').insert(payload);
  if (error) {
    throw new Error(`Failed to add deliverable in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_digital_deliverables_change'));
  return payload;
}
