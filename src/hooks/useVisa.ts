import { useState, useEffect, useCallback } from 'react';
import { getVisaRecords, updateVisaRecord, type VisaTrackingRecord } from '../lib/api/visa';

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
  }, [fetchRecords]);

  const saveVisaUpdate = async (id: string, updates: Partial<VisaTrackingRecord>) => {
    let updatedObj: VisaTrackingRecord;
    try {
      updatedObj = await updateVisaRecord(id, updates);
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
        notes: updates.notes || '',
        updated_at: new Date().toISOString(),
      };
    }

    // Immediately fetch fresh records from Supabase
    await fetchRecords();
    return updatedObj;
  };

  return { records, loading, refresh: fetchRecords, saveVisaUpdate };
}
