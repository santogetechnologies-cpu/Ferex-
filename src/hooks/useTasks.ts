import { useState, useEffect, useCallback } from 'react';
import { getTasks, createTask, updateTaskStatus } from '../lib/api/tasks';
import type { Task } from '../lib/types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTasks();
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (payload: {
    created_by: string;
    assigned_to?: string;
    student_id?: string;
    title: string;
    description?: string;
    priority: Task['priority'];
    due_date?: string;
  }) => {
    const created = await createTask(payload);
    setTasks(prev => [created, ...prev]);
    return created;
  };

  const changeStatus = async (id: string, status: Task['status']) => {
    const updated = await updateTaskStatus(id, status);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updated } as Task : t));
    return updated;
  };

  return { tasks, loading, error, refresh: fetchTasks, addTask, changeStatus };
}
