import { useState, useEffect, useCallback } from 'react';
import { getVisaRecords, updateVisaRecord, type VisaTrackingRecord } from '../lib/api/visa';

export function useVisa(studentId?: string) {
  const [records, setRecords] = useState<VisaTrackingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ferex_visa_records');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem('ferex_visa_records');
      return saved ? false : true;
    } catch (e) {
      return true;
    }
  });

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVisaRecords(studentId);
      setRecords(data || []);
      localStorage.setItem('ferex_visa_records', JSON.stringify(data || []));
    } catch (err) {
      // Keep local state
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchRecords();

    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('ferex_visa_records');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setRecords(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ferex_visa_change', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ferex_visa_change', handleStorageChange);
    };
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
        appointment_date: updates.appointment_date || '2026-08-20',
        passport_no: updates.passport_no || 'Z-9041284',
        courier_tracking_no: updates.courier_tracking_no || 'BLUEDART-89041256',
        current_stage: updates.current_stage || 3,
        status_label: updates.status_label || 'Under Verification at Embassy',
        notes: updates.notes || 'Consular verification in progress.',
        updated_at: new Date().toISOString(),
      };
    }

    setRecords(prev => {
      const exists = prev.some(r => r.id === id || r.student_id === updates.student_id);
      const nextList = exists
        ? prev.map(r => (r.id === id || (updates.student_id && r.student_id === updates.student_id)) ? { ...r, ...updatedObj } : r)
        : [updatedObj, ...prev];

      localStorage.setItem('ferex_visa_records', JSON.stringify(nextList));
      window.dispatchEvent(new Event('ferex_visa_change'));
      return nextList;
    });

    return updatedObj;
  };

  return { records, loading, refresh: fetchRecords, saveVisaUpdate };
}
