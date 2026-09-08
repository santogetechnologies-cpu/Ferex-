import { useState, useEffect, useCallback } from 'react';
import { getUniversities, createUniversity, updateUniversityRecord, deleteUniversity, restoreDefaultUniversities, clearAllUniversities } from '../lib/api/universities';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../lib/types';

export function useUniversities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUniversities = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await getUniversities();
      setUniversities(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch universities');
      if (!silent) setUniversities([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniversities();

    const handleDataChange = () => {
      fetchUniversities(true);
    };

    window.addEventListener('ferex_university_change', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    return () => {
      window.removeEventListener('ferex_university_change', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, [fetchUniversities]);

  const addUniversity = async (payload: {
    name: string;
    country: string;
    city?: string;
    logo_url?: string;
    image_url?: string;
    badge?: string;
    category?: string;
    description?: string;
    ranking?: number;
    rating?: number;
    programs?: string[];
    tuition_range?: string;
    intakes?: string[];
    university_fee?: string;
    vfs_fee?: string;
    agency_fee?: string;
    living_cost_monthly?: string;
    nawa_required?: boolean;
    course_programs?: CourseProgram[];
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

  const removeUniversity = async (id: string, name?: string) => {
    const target = universities.find(u => u.id === id);
    const resolvedName = name || target?.name;

    // Instant optimistic update so count and grid update immediately
    setUniversities(prev => prev.filter(u => {
      if (u.id === id) return false;
      if (resolvedName && u.name.trim().toLowerCase() === resolvedName.trim().toLowerCase()) return false;
      return true;
    }));

    await deleteUniversity(id, resolvedName);
  };

  const clearAll = async () => {
    setUniversities([]);
    await clearAllUniversities();
  };

  const resetToDefaults = async () => {
    setLoading(true);
    const restored = await restoreDefaultUniversities();
    setUniversities(restored);
    setLoading(false);
  };

  return {
    universities,
    loading,
    error,
    refresh: fetchUniversities,
    addUniversity,
    updateUniversity,
    removeUniversity,
    clearAll,
    resetToDefaults
  };
}

