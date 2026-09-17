import { useState, useEffect, useCallback } from 'react';
import { getTasks, getMyTasks, createTask, updateTaskStatus, type CounselorIdentity } from '../lib/api/tasks';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/types';

export function useTasks(counselor?: CounselorIdentity) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCounselorScope = Boolean(counselor && (counselor.id || counselor.email || counselor.full_name || counselor.name));

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = isCounselorScope
        ? await getMyTasks(counselor)
        : await getTasks();
      setTasks(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks from database');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [isCounselorScope, counselor?.id, counselor?.email, counselor?.full_name, counselor?.name]);

  useEffect(() => {
    fetchTasks();

    const handleLocalEvent = () => fetchTasks();
    window.addEventListener('ferex_tasks_change', handleLocalEvent);

    // Supabase Realtime subscription for live multi-portal task updates
    const channel = supabase
      .channel('realtime_tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('ferex_tasks_change', handleLocalEvent);
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const addTask = async (payload: {
    created_by: string;
    assigned_to?: string;
    assigned_staff_id?: string;
    student_id?: string;
    student_name?: string;
    title: string;
    description?: string;
    priority: Task['priority'];
    due_date?: string;
    category?: string;
  }) => {
    const created = await createTask(payload);
    setTasks(prev => [created, ...prev]);
    return created;
  };

  const changeStatus = async (id: string, status: Task['status']) => {
    const updated = await updateTaskStatus(id, status);
    setTasks(prev => prev.map(t => (t.id === id ? ({ ...t, ...updated } as Task) : t)));
    return updated;
  };

  return { tasks, loading, error, refresh: fetchTasks, addTask, changeStatus };
}
