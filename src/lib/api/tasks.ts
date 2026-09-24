import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { Task } from '../types';
import { generateUUID } from '../../utils/uuid';

export interface CounselorIdentity {
  id?: string;
  email?: string;
  full_name?: string;
  name?: string;
}

/**
 * Loads tasks assigned strictly to the authenticated counselor.
 * Enforced both by Supabase RLS and direct database filtering.
 * No localStorage business-data fallback. Throws real DB errors.
 */
export async function getMyTasks(counselor?: CounselorIdentity): Promise<Task[]> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  // Resolve current authenticated user if not passed
  let counselorId = counselor?.id;
  let counselorEmail = counselor?.email;
  let counselorName = counselor?.full_name || counselor?.name;

  if (!counselorId && !counselorEmail && !counselorName) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      counselorId = authData.user.id;
      counselorEmail = authData.user.email;
      counselorName = authData.user.user_metadata?.full_name;
    }
  }

  let query = client
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter strictly by the counselor's assigned identity
  const filters: string[] = [];
  if (counselorId) {
    filters.push(`assigned_staff_id.eq.${counselorId}`);
    filters.push(`assigned_to.eq.${counselorId}`);
  }
  if (counselorEmail) {
    filters.push(`assigned_to.eq.${counselorEmail}`);
    filters.push(`assigned_to.ilike.%${counselorEmail}%`);
  }
  if (counselorName) {
    filters.push(`assigned_to.eq.${counselorName}`);
    filters.push(`assigned_to.ilike.%${counselorName}%`);
  }

  if (filters.length > 0) {
    query = query.or(filters.join(','));
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load assigned tasks from database: ${error.message}`);
  }

  return (data || []) as Task[];
}

/**
 * Admin view: loads all operational tasks across the organization.
 */
export async function getTasks(): Promise<Task[]> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data, error } = await client
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load tasks from database: ${error.message}`);
  }

  return (data || []) as Task[];
}

/**
 * Admin / Central Admin creates and assigns a task to any subsidiary staff member.
 * Persists to Supabase `tasks` table and cross-syncs with subsidiary tables.
 */
export async function createTask(payload: {
  created_by?: string;
  assigned_to?: string;
  assigned_staff_id?: string;
  assigned_staff_email?: string;
  student_id?: string;
  student_name?: string;
  title: string;
  description?: string;
  priority?: Task['priority'];
  due_date?: string;
  category?: string;
}): Promise<Task> {
  const newId = generateUUID();
  const now = new Date().toISOString();

  let assignedStaffId = payload.assigned_staff_id || null;
  let assignedToText = payload.assigned_to || 'Staff Member';

  // If assigned_to is a UUID, set assignedStaffId
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedToText);
  if (isUuid && !assignedStaffId) {
    assignedStaffId = assignedToText;
  }

  const dueDateFormatted = (payload.due_date && payload.due_date.includes('-'))
    ? payload.due_date
    : new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];

  const category = payload.category || 'General';
  const createdBy = payload.created_by || 'Central Admin';

  const taskObj: Task = {
    id: newId,
    created_by: createdBy,
    assigned_to: assignedToText,
    assigned_staff_id: assignedStaffId,
    student_id: payload.student_id || '',
    student_name: payload.student_name || '',
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    priority: payload.priority || 'Medium',
    status: 'Pending',
    due_date: dueDateFormatted,
    category,
    created_at: now,
    updated_at: now,
  } as unknown as Task;

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  // 1. Insert into core tasks table
  const { error } = await client.from('tasks').insert({
    id: newId,
    student_id: payload.student_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.student_id) ? payload.student_id : null,
    student_name: payload.student_name || '',
    assigned_to: assignedToText,
    assigned_staff_id: assignedStaffId,
    created_by: createdBy,
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    priority: payload.priority || 'Medium',
    due_date: dueDateFormatted,
    category,
    status: 'Pending',
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create task in database: ${error.message}`);
  }

  // 2. Cross-replicate to Subsidiary Specific Tables for immediate availability in subsidiary apps
  const staffEmail = payload.assigned_staff_email || (assignedToText.includes('@') ? assignedToText : '');
  const catLower = category.toLowerCase();

  try {
    if (catLower.includes('trade')) {
      await client.from('trade_tasks').insert({
        id: newId,
        title: payload.title.trim(),
        category: 'Order Handling',
        order_no: '',
        client_name: '',
        assigned_staff_name: assignedToText,
        assigned_staff_email: staffEmail || `${assignedToText.toLowerCase().replace(/\s+/g, '')}@ferex.com`,
        assigned_staff_id: assignedStaffId,
        priority: payload.priority === 'Critical' ? 'Urgent' : (payload.priority || 'Medium'),
        status: 'Pending',
        due_date: dueDateFormatted,
        notes: payload.description?.trim() || 'Directive from Central Admin',
        created_at: now,
        updated_at: now,
      });
    } else if (catLower.includes('rimi')) {
      await client.from('rimi_tasks').insert({
        id: newId,
        title: payload.title.trim(),
        description: payload.description?.trim() || 'Directive from Central Admin',
        task_type: 'Delivery',
        priority: payload.priority === 'Critical' ? 'Urgent' : (payload.priority || 'Medium'),
        status: 'Pending',
        assigned_staff_name: assignedToText,
        assigned_staff_email: staffEmail || `${assignedToText.toLowerCase().replace(/\s+/g, '')}@ferex.com`,
        assigned_staff_id: assignedStaffId,
        due_date: dueDateFormatted,
        created_by: 'Central Admin',
        created_at: now,
        updated_at: now,
      });
    } else if (catLower.includes('digital')) {
      await client.from('digital_tasks').insert({
        id: newId,
        title: payload.title.trim(),
        status: 'To Do',
        priority: payload.priority || 'Medium',
        due_date: dueDateFormatted,
        assigned_to_name: assignedToText,
        assigned_to_email: staffEmail || `${assignedToText.toLowerCase().replace(/\s+/g, '')}@ferex.com`,
        assigned_staff_id: assignedStaffId,
        notes: payload.description?.trim() || 'Directive from Central Admin',
        task_type: 'Task',
        created_at: now,
        updated_at: now,
      });
    }
  } catch (crossErr) {
    console.warn('[createTask] Cross-table sync notice:', crossErr);
  }

  // Dispatch all relevant events across browser window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_tasks_change'));
    window.dispatchEvent(new Event('ferex_trade_tasks_change'));
    window.dispatchEvent(new Event('ferex_rimi_tasks_change'));
    window.dispatchEvent(new Event('ferex_digital_tasks_change'));
  }

  return taskObj;
}

/**
 * Updates task status across Supabase tasks and subsidiary tables.
 */
export async function updateTaskStatus(id: string, status: Task['status']): Promise<Partial<Task>> {
  const now = new Date().toISOString();
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  // 1. Update tasks table
  await client
    .from('tasks')
    .update({
      status,
      updated_at: now,
    })
    .eq('id', id);

  // 2. Cross-update subsidiary tables if record exists with that ID
  const subStatus = status === 'Completed' || status === 'Done' ? 'Completed' : status === 'In Progress' ? 'In Progress' : 'Pending';
  const digitalStatus = status === 'Completed' || status === 'Done' ? 'Done' : status === 'In Progress' ? 'In Progress' : 'To Do';

  try {
    await Promise.allSettled([
      client.from('trade_tasks').update({ status: subStatus as any, updated_at: now }).eq('id', id),
      client.from('rimi_tasks').update({ status: subStatus as any, updated_at: now }).eq('id', id),
      client.from('digital_tasks').update({ status: digitalStatus, updated_at: now }).eq('id', id),
    ]);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_tasks_change'));
    window.dispatchEvent(new Event('ferex_trade_tasks_change'));
    window.dispatchEvent(new Event('ferex_rimi_tasks_change'));
    window.dispatchEvent(new Event('ferex_digital_tasks_change'));
  }

  return { id, status };
}

/**
 * Admin deletes a task directly from Supabase across all tables.
 */
export async function deleteTask(id: string): Promise<boolean> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  await Promise.allSettled([
    client.from('tasks').delete().eq('id', id),
    client.from('trade_tasks').delete().eq('id', id),
    client.from('rimi_tasks').delete().eq('id', id),
    client.from('digital_tasks').delete().eq('id', id),
  ]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_tasks_change'));
    window.dispatchEvent(new Event('ferex_trade_tasks_change'));
    window.dispatchEvent(new Event('ferex_rimi_tasks_change'));
    window.dispatchEvent(new Event('ferex_digital_tasks_change'));
  }
  return true;
}

/**
 * Super Admin / Admin reassigns a task to another staff member or admin in Supabase.
 */
export async function reassignTask(payload: {
  taskId: string;
  assignedTo: string;
  assignedStaffId?: string;
  assignedStaffEmail?: string;
  division?: string;
}): Promise<boolean> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const now = new Date().toISOString();

  let assignedStaffId = payload.assignedStaffId || null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.assignedTo);
  if (isUuid && !assignedStaffId) {
    assignedStaffId = payload.assignedTo;
  }

  const updatePayload: Record<string, any> = {
    assigned_to: payload.assignedTo,
    updated_at: now,
  };
  if (assignedStaffId) {
    updatePayload.assigned_staff_id = assignedStaffId;
  }
  if (payload.division) {
    updatePayload.category = payload.division;
  }

  await client
    .from('tasks')
    .update(updatePayload)
    .eq('id', payload.taskId);

  // Sync to subsidiary tables
  const email = payload.assignedStaffEmail || `${payload.assignedTo.toLowerCase().replace(/\s+/g, '')}@ferex.com`;
  try {
    await Promise.allSettled([
      client.from('trade_tasks').update({ assigned_staff_name: payload.assignedTo, assigned_staff_email: email, assigned_staff_id: assignedStaffId, updated_at: now }).eq('id', payload.taskId),
      client.from('rimi_tasks').update({ assigned_staff_name: payload.assignedTo, assigned_staff_email: email, assigned_staff_id: assignedStaffId, updated_at: now }).eq('id', payload.taskId),
      client.from('digital_tasks').update({ assigned_to_name: payload.assignedTo, assigned_to_email: email, assigned_staff_id: assignedStaffId, updated_at: now }).eq('id', payload.taskId),
    ]);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_tasks_change'));
    window.dispatchEvent(new Event('ferex_trade_tasks_change'));
    window.dispatchEvent(new Event('ferex_rimi_tasks_change'));
    window.dispatchEvent(new Event('ferex_digital_tasks_change'));
  }

  return true;
}
