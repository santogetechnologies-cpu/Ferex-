import { useState, useEffect, useCallback } from 'react';
import { getApplications, updateApplicationStatus, createApplication } from '../lib/api/applications';
import { supabase } from '../lib/supabase';
import type { Application } from '../lib/types';

export function useApplications(studentId?: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getApplications(studentId);
      setApplications(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchApps();

    // Supabase Realtime Subscription on applications
    const channelName = studentId ? `realtime_apps_student_${studentId}` : 'realtime_apps_admin';
    const filterStr = studentId ? `student_id=eq.${studentId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: filterStr,
        },
        () => {
          fetchApps();
        }
      )
      .subscribe();

    const handleLocalEvent = () => fetchApps();
    window.addEventListener('ferex_application_change', handleLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_application_change', handleLocalEvent);
    };
  }, [fetchApps, studentId]);

  const changeStatus = async (id: string, status: Application['status'], notes?: string, offerLetterUrl?: string, finalAcceptanceUrl?: string) => {
    const updated = await updateApplicationStatus(id, status, notes, offerLetterUrl, finalAcceptanceUrl);
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updated, status: (updated.status || status) as Application['status'] } : a));
    window.dispatchEvent(new Event('ferex_application_change'));
    await fetchApps();
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
    window.dispatchEvent(new Event('ferex_application_change'));
    await fetchApps();
    return created;
  };

  return { applications, loading, error, refresh: fetchApps, changeStatus, addApp };
}
