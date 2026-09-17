import { useState, useEffect, useCallback } from 'react';
import { getUniversities, createUniversity, updateUniversityRecord, deleteUniversity, clearAllUniversities } from '../lib/api/universities';
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
    // Clear any stale mock-data localStorage keys from previous versions
    try {
      localStorage.removeItem('ferex_universities_purged');
      localStorage.removeItem('ferex_deleted_universities');
    } catch {}

    fetchUniversities();

    const handleDataChange = () => {
      fetchUniversities(true);
    };

    window.addEventListener('ferex_universities_change', handleDataChange);
    window.addEventListener('ferex_university_change', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    return () => {
      window.removeEventListener('ferex_universities_change', handleDataChange);
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
    tuition_fee_enabled?: boolean;
    agency_fee?: string;
    agency_fee_description?: string;
    vfs_fee?: string;
    living_cost_monthly?: string;
    nawa_required?: boolean;
    installments_enabled?: boolean;
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
    setUniversities(prev => prev.map(u => u.id === id ? { ...u, ...(updated || {}) } : u));
    return updated;
  };

  const removeUniversity = async (id: string, name?: string) => {
    // Optimistic update
    setUniversities(prev => prev.filter(u => {
      if (u.id === id) return false;
      if (name && u.name.trim().toLowerCase() === name.trim().toLowerCase()) return false;
      return true;
    }));
    await deleteUniversity(id, name);
    // Re-fetch to sync with actual DB state
    setTimeout(() => fetchUniversities(true), 300);
  };

  const clearAll = async () => {
    setUniversities([]);
    await clearAllUniversities();
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
  };
}
