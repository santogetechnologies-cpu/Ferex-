import { supabase } from '../supabase';
import type { Task } from '../types';
import { generateUUID } from '../../utils/uuid';

export async function getTasks() {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getTasks notice]:', error.message);
      return [];
    }
    return (data ?? []) as Task[];
  } catch (err) {
    return [];
  }
}

export async function createTask(payload: {
  title: string;
  assigned_to?: string;
  student_name?: string;
  priority?: Task['priority'];
  due_date?: string;
}) {
  const newId = generateUUID();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: newId,
      title: payload.title,
      assigned_to: payload.assigned_to || 'Staff Member',
      student_name: payload.student_name || '',
      priority: payload.priority || 'Medium',
      due_date: payload.due_date || new Date().toISOString().split('T')[0],
      status: 'Pending'
    })
    .select();

  if (error || !data || data.length === 0) {
    return {
      id: newId,
      created_by: 'admin',
      student_id: '',
      student_name: payload.student_name || '',
      title: payload.title,
      description: '',
      assigned_to: payload.assigned_to || 'Staff Member',
      priority: payload.priority || 'Medium',
      status: 'Pending',
      due_date: payload.due_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Task;
  }
  return data[0] as Task;
}

export async function updateTaskStatus(id: string, status: Task['status']) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    return { id, status } as Partial<Task>;
  }
  return data[0] as Task;
}
