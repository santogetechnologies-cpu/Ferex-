import { useState, useEffect, useCallback } from 'react';
import { getApplications, updateApplicationStatus, createApplication } from '../lib/api/applications';
import type { Application } from '../lib/types';

export function useApplications(studentId?: string) {
  const [applications, setApplications] = useState<Application[]>(() => {
    try {
      const saved = localStorage.getItem('ferex_student_applications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem('ferex_student_applications');
      return saved ? false : true;
    } catch (e) {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getApplications(studentId);
      setApplications(data || []);
      localStorage.setItem('ferex_student_applications', JSON.stringify(data || []));
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchApps();

    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('ferex_student_applications');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setApplications(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ferex_applications_change', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ferex_applications_change', handleStorageChange);
    };
  }, [fetchApps]);

  const changeStatus = async (id: string, status: Application['status'], notes?: string, offerLetterUrl?: string, finalAcceptanceUrl?: string) => {
    const updated = await updateApplicationStatus(id, status, notes, offerLetterUrl, finalAcceptanceUrl);
    setApplications(prev => {
      const nextList = prev.map(a => a.id === id ? { ...a, ...updated, status: (updated.status || status) as Application['status'] } : a);
      localStorage.setItem('ferex_student_applications', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_applications_change'));
      return nextList;
    });
    return updated;
  };

  const addApp = async (payload: {
    student_id?: string;
    student_name?: string;
    university_name?: string;
    university_id?: string;
    program_name?: string;
    course?: string;
    intake?: string;
    notes?: string;
    tuition_fee?: string | number;
    course_fee?: string | number;
  }) => {
    const created = await createApplication(payload);
    setApplications(prev => {
      const nextList = [created, ...prev];
      localStorage.setItem('ferex_student_applications', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_applications_change'));
      return nextList;
    });
    return created;
  };

  return { applications, loading, error, refresh: fetchApps, changeStatus, addApp };
}
