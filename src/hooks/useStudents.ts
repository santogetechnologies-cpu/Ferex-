import { useState, useEffect, useCallback } from 'react';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../lib/api/students';
import type { UserProfile } from '../lib/types';

export function useStudents() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudents();
      setStudents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const addStudent = async (payload: { email: string; full_name: string; phone?: string; assigned_counselor?: string }) => {
    const created = await createStudent(payload);
    setStudents(prev => [created, ...prev]);
    return created;
  };

  const editStudent = async (id: string, updates: Partial<UserProfile>) => {
    const updated = await updateStudent(id, updates);
    setStudents(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  };

  const removeStudent = async (id: string) => {
    await deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  return { students, loading, error, refresh: fetchStudents, addStudent, editStudent, removeStudent };
}
