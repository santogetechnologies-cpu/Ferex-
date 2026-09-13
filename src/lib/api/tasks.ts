import { supabase } from '../supabase';
import type { Task } from '../types';
import { generateUUID } from '../../utils/uuid';

const STORAGE_KEY = 'ferex_tasks_storage';

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

export async function getTasks(): Promise<Task[]> {
  const local = getLocalTasks();
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const dbTasks = data as Task[];
      const dbIds = new Set(dbTasks.map(t => t.id));
      const merged = [...dbTasks, ...local.filter(t => !dbIds.has(t.id))];
      saveLocalTasks(merged);
      return merged;
    }
  } catch (err) {
    console.warn('[getTasks notice]:', err);
  }
  return local;
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
    await supabase.from('tasks').insert({
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
  const updated = [taskObj, ...current];
  saveLocalTasks(updated);

  return taskObj;
}

export async function updateTaskStatus(id: string, status: Task['status']): Promise<Partial<Task>> {
  const now = new Date().toISOString();
  try {
    await supabase
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

  return { id, status };
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    await supabase.from('tasks').delete().eq('id', id);
  } catch (e) {}

  const current = getLocalTasks();
  const updated = current.filter(t => t.id !== id);
  saveLocalTasks(updated);
  return true;
}
