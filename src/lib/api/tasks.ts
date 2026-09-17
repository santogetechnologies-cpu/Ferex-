import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { Task } from '../types';
import { generateUUID } from '../../utils/uuid';

const STORAGE_KEY = 'ferex_tasks_storage';

export async function getTasks(): Promise<Task[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    const { data, error } = await client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
      return data as Task[];
    }
  } catch (err) {
    console.warn('[getTasks DB warning]:', err);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

export async function createTask(payload: {
  created_by?: string;
  assigned_to?: string;
  student_id?: string;
  student_name?: string;
  title: string;
  description?: string;
  priority?: Task['priority'];
  due_date?: string;
}): Promise<Task> {
  const newId = generateUUID();
  const now = new Date().toISOString();

  const taskObj: Task = {
    id: newId,
    created_by: payload.created_by || 'admin',
    assigned_to: payload.assigned_to || 'Staff Member',
    student_id: payload.student_id || '',
    student_name: payload.student_name || '',
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    priority: payload.priority || 'Medium',
    status: 'Pending',
    due_date: payload.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    created_at: now,
    updated_at: now,
  } as unknown as Task;

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client.from('tasks').insert({
    id: newId,
    student_id: payload.student_id || null,
    assigned_to: payload.assigned_to || 'Staff Member',
    created_by: payload.created_by || 'admin',
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    priority: payload.priority || 'Medium',
    due_date: taskObj.due_date,
    status: 'Pending',
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [taskObj, ...existing.filter((t: any) => t.id !== newId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('ferex_tasks_change'));
  } catch {}

  return taskObj;
}

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
    throw new Error(`Failed to update task status: ${error.message}`);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const current: Task[] = JSON.parse(raw);
      const updated = current.map(t => (t.id === id ? { ...t, status, updated_at: now } : t));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('ferex_tasks_change'));
    }
  } catch {}

  return { id, status };
}

export async function deleteTask(id: string): Promise<boolean> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client.from('tasks').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const current: Task[] = JSON.parse(raw);
      const updated = current.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('ferex_tasks_change'));
    }
  } catch {}

  return true;
}
