import { useState, useEffect, useCallback } from 'react';
import { getUniversities, createUniversity, updateUniversityRecord, deleteUniversity } from '../lib/api/universities';
import type { University, PaymentInstallment, CourseSemester } from '../lib/types';

export function useUniversities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUniversities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUniversities();
      setUniversities(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch universities');
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniversities();
  }, [fetchUniversities]);

  const addUniversity = async (payload: {
    name: string;
    country: string;
    city?: string;
    ranking?: number;
    rating?: number;
    programs?: string[];
    tuition_range?: string;
    intakes?: string[];
    university_fee?: string;
    vfs_fee?: string;
    agency_fee?: string;
    installments?: PaymentInstallment[];
    semesters?: CourseSemester[];
  }) => {
    const created = await createUniversity(payload);
    setUniversities(prev => [created, ...prev.filter(u => u.id !== created.id)]);
    return created;
  };

  const updateUniversity = async (id: string, payload: Partial<University>) => {
    const updated = await updateUniversityRecord(id, payload);
    setUniversities(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
    return updated;
  };

  const removeUniversity = async (id: string) => {
    await deleteUniversity(id);
    setUniversities(prev => prev.filter(u => u.id !== id));
  };

  return { universities, loading, error, refresh: fetchUniversities, addUniversity, updateUniversity, removeUniversity };
}
