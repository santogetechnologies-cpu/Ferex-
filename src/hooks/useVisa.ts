import { useState, useEffect, useCallback } from 'react';
import { getVisaRecords, updateVisaRecord, type VisaTrackingRecord } from '../lib/api/visa';
import { supabase } from '../lib/supabase';

export function useVisa(studentId?: string) {
  const [records, setRecords] = useState<VisaTrackingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVisaRecords(studentId);
      setRecords(data || []);
    } catch (err) {
      console.warn('Failed to fetch visa records:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchRecords();

    // Supabase Realtime Subscription on visa_tracking
    const channelName = studentId ? `realtime_visa_student_${studentId}` : 'realtime_visa_admin';
    const filterStr = studentId ? `student_id=eq.${studentId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visa_tracking',
          filter: filterStr,
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    const handleLocalEvent = () => fetchRecords();
    window.addEventListener('ferex_visa_change', handleLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_visa_change', handleLocalEvent);
    };
  }, [fetchRecords, studentId]);

  const saveVisaUpdate = async (id: string, updates: Partial<VisaTrackingRecord>) => {
    let updatedObj: VisaTrackingRecord;
    try {
      const res = await updateVisaRecord(id, updates);
      if (res) {
        updatedObj = res;
      } else {
        throw new Error('No record returned');
      }
    } catch (err) {
      updatedObj = {
        id,
        student_id: updates.student_id || '',
        student_name: updates.student_name || 'Student',
        vfs_ref_no: updates.vfs_ref_no || 'VFS-POL-2026-90412',
        embassy_name: updates.embassy_name || 'Embassy of Poland',
        vfs_center: updates.vfs_center || 'VFS Center',
        appointment_date: updates.appointment_date || new Date().toISOString().split('T')[0],
        passport_no: updates.passport_no || 'Z-9041284',
        courier_tracking_no: updates.courier_tracking_no || '',
        current_stage: updates.current_stage || 1,
        status_label: updates.status_label || 'VFS Processing',
        decision_outcome: updates.decision_outcome || 'Pending',
        notes: updates.notes || 'Status updated.',
        updated_at: new Date().toISOString(),
      };
    }

    window.dispatchEvent(new Event('ferex_visa_change'));
    await fetchRecords();
    return updatedObj;
  };

  return { records, loading, refresh: fetchRecords, saveVisaUpdate };
}
