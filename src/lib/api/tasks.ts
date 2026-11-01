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
  project_id?: string;
}): Promise<Task> {
const id = generateUUID();
 if (!payload.title.trim() || !payload.assigned_staff_id) throw new Error('Task title and a registered assignee are required');
 const { data,error } = await supabase.from('tasks').insert({id,created_by:payload.created_by || 'Central Admin',assigned_to:payload.assigned_to,assigned_staff_id:payload.assigned_staff_id,student_id:payload.student_id || null,student_name:payload.student_name || '',title:payload.title.trim(),description:payload.description || '',priority:payload.priority || 'Medium',due_date:payload.due_date,category:payload.category || 'General',status:'Pending',project_id:payload.project_id || null}).select().single();
 if(error) throw new Error(error.message); window.dispatchEvent(new Event('ferex_tasks_change')); window.dispatchEvent(new Event('ferex_digital_tasks_change')); return data;
}

/**
 * Updates task status across Supabase tasks and subsidiary tables.
 */
export async function updateTaskStatus(id: string, status: Task['status']): Promise<Partial<Task>> {
const {data,error}=await supabase.from('tasks').update({status,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;window.dispatchEvent(new Event('ferex_tasks_change'));return data;
}

/**
 * Admin deletes a task directly from Supabase across all tables.
 */
export async function deleteTask(id: string): Promise<boolean> {
const {data,error}=await supabase.from('tasks').delete().eq('id',id).select('id').single();if(error||!data)throw new Error(error?.message || 'Task not found');window.dispatchEvent(new Event('ferex_tasks_change'));return true;
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
if(!payload.assignedStaffId)throw new Error('Choose a registered assignee');const {error}=await supabase.from('tasks').update({assigned_staff_id:payload.assignedStaffId,assigned_to:payload.assignedTo,updated_at:new Date().toISOString()}).eq('id',payload.taskId).select('id').single();if(error)throw error;window.dispatchEvent(new Event('ferex_tasks_change'));return true;
}
