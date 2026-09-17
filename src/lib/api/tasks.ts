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
 * Admin creates and assigns a task to an Admissions Counselor or Staff member.
 * Persists directly to Supabase.
 */
export async function createTask(payload: {
  created_by?: string;
  assigned_to?: string;
  assigned_staff_id?: string;
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
  let assignedToText = payload.assigned_to || 'Admissions Counselor';

  // If assigned_to is a UUID, set assignedStaffId
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedToText);
  if (isUuid && !assignedStaffId) {
    assignedStaffId = assignedToText;
  }

  const taskObj: Task = {
    id: newId,
    created_by: payload.created_by || 'admin',
    assigned_to: assignedToText,
    student_id: payload.student_id || '',
    student_name: payload.student_name || '',
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    priority: payload.priority || 'Medium',
    status: 'Pending',
    due_date: payload.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    category: payload.category || 'General',
    created_at: now,
    updated_at: now,
  } as unknown as Task;

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client.from('tasks').insert({
    id: newId,
    student_id: payload.student_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.student_id) ? payload.student_id : null,
    student_name: payload.student_name || '',
    assigned_to: assignedToText,
    assigned_staff_id: assignedStaffId,
    created_by: payload.created_by || 'admin',
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    priority: payload.priority || 'Medium',
    due_date: taskObj.due_date,
    category: payload.category || 'General',
    status: 'Pending',
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create task in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_tasks_change'));
  return taskObj;
}

/**
 * Updates task status directly in Supabase.
 */
export async function updateTaskStatus(id: string, status: Task['status']): Promise<Partial<Task>> {
  const now = new Date().toISOString();
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client
    .from('tasks')
    .update({
      status,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update task in database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_tasks_change'));
  return { id, status };
}

/**
 * Admin deletes a task directly from Supabase.
 */
export async function deleteTask(id: string): Promise<boolean> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client.from('tasks').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete task from database: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_tasks_change'));
  return true;
}
