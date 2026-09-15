import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../supabaseAdmin';
import type { Task } from '../types';
import { generateUUID } from '../../utils/uuid';

const STORAGE_KEY = 'ferex_tasks_storage';
const SYSTEM_CONFIG_KEY = 'ferex_tasks_catalog';

function getLocalTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveLocalTasks(tasks: Task[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new Event('ferex_tasks_change'));
  } catch (e) {}
}

async function syncTasksToCloud(tasks: Task[]) {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    await client.from('system_config').upsert({
      key: SYSTEM_CONFIG_KEY,
      value: tasks,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch {}
}

export async function getTasks(): Promise<Task[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    // 1. Direct query on tasks table
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const dbTasks = data as Task[];
      saveLocalTasks(dbTasks);
      return dbTasks;
    }

    // 2. Cloud system_config catalog fallback
    const { data: catalogData } = await client
      .from('system_config')
      .select('value')
      .eq('key', SYSTEM_CONFIG_KEY)
      .maybeSingle();

    if (catalogData?.value && Array.isArray(catalogData.value) && catalogData.value.length > 0) {
      saveLocalTasks(catalogData.value);
      return catalogData.value;
    }
  } catch (err) {
    console.warn('[getTasks notice]:', err);
  }
  return getLocalTasks();
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

  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    await client.from('tasks').insert({
      id: newId,
      student_id: payload.student_id || null,
      assigned_to: payload.assigned_to || 'Staff Member',
      title: payload.title.trim(),
      description: payload.description?.trim() || '',
      priority: payload.priority || 'Medium',
      due_date: taskObj.due_date,
      status: 'Pending'
    });
  } catch (e) {
    console.warn('[createTask DB insert notice]:', e);
  }

  const current = getLocalTasks();
  const updated = [taskObj, ...current.filter(t => t.id !== newId)];
  saveLocalTasks(updated);
  syncTasksToCloud(updated).catch(() => {});

  return taskObj;
}

export async function updateTaskStatus(id: string, status: Task['status']): Promise<Partial<Task>> {
  const now = new Date().toISOString();
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    await client
      .from('tasks')
      .update({
        status,
        updated_at: now,
      })
      .eq('id', id);
  } catch (e) {
    console.warn('[updateTaskStatus DB notice]:', e);
  }

  const current = getLocalTasks();
  const updated = current.map(t => {
    if (t.id === id) {
      return { ...t, status, updated_at: now };
    }
    return t;
  });
  saveLocalTasks(updated);
  syncTasksToCloud(updated).catch(() => {});

  return { id, status };
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    await client.from('tasks').delete().eq('id', id);
  } catch (e) {}

  const current = getLocalTasks();
  const updated = current.filter(t => t.id !== id);
  saveLocalTasks(updated);
  syncTasksToCloud(updated).catch(() => {});
  return true;
}

