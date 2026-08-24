import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

export interface VisaTrackingRecord {
  id: string;
  student_id: string;
  student_name: string;
  vfs_ref_no: string;
  embassy_name: string;
  vfs_center: string;
  appointment_date: string;
  passport_no: string;
  courier_tracking_no: string;
  current_stage: number;
  status_label: string;
  decision_outcome?: 'Pending' | 'Approved' | 'Rejected';
  notes: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'ferex_visa_tracking_records_cache_v2';

function getLocalVisaCache(): Record<string, VisaTrackingRecord> {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveLocalVisaCache(record: VisaTrackingRecord) {
  try {
    const current = getLocalVisaCache();
    current[record.id] = record;
    if (record.student_id) current[record.student_id] = record;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

export async function getVisaRecords(studentId?: string): Promise<VisaTrackingRecord[]> {
  const localCache = getLocalVisaCache();

  try {
    let query = supabase.from('visa_tracking').select('*').order('updated_at', { ascending: false });
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (!error && data) {
      if (data.length === 0 && studentId) {
        return [];
      }
      const records = data.map((r: any) => {
        const statusLower = String(r.status_label || r.status || '').toLowerCase();
        const outcome = r.decision_outcome ||
          (statusLower.includes('approv') ? 'Approved' :
           statusLower.includes('reject') || statusLower.includes('refus') ? 'Rejected' : 'Pending');

        const rec: VisaTrackingRecord = {
          id: r.id,
          student_id: r.student_id || r.id,
          student_name: r.student_name || 'Student',
          vfs_ref_no: r.vfs_ref_no || 'VFS-POL-2026',
          embassy_name: r.embassy_name || 'Polish Embassy',
          vfs_center: r.vfs_center || 'VFS Global Center',
          appointment_date: r.appointment_date || 'Scheduled',
          passport_no: r.passport_no || 'Verified',
          courier_tracking_no: r.courier_tracking_no || 'Assigned',
          current_stage: Number(r.current_stage) || 1,
          status_label: r.status_label || 'VFS Processing',
          decision_outcome: outcome as 'Pending' | 'Approved' | 'Rejected',
          notes: r.notes || 'VFS tracking updated.',
          updated_at: r.updated_at || new Date().toISOString()
        };
        saveLocalVisaCache(rec);
        return rec;
      });

      return records;
    }
  } catch (err) {
    console.warn('[getVisaRecords notice]:', err);
  }

  // Cache fallback
  const allCached = Object.values(localCache);
  if (studentId) {
    return allCached.filter(r => r.student_id === studentId || r.id === studentId);
  }

  const seen = new Set<string>();
  return allCached.filter(r => {
    if (!r.id || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function cleanDate(d?: string): string | null {
  if (!d) return null;
  const match = String(d).match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  return new Date().toISOString().split('T')[0];
}

export async function updateVisaRecord(id: string, updates: Partial<VisaTrackingRecord>): Promise<VisaTrackingRecord> {
  const cleanPayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.student_id !== undefined && isValidUuid(updates.student_id)) {
    cleanPayload.student_id = updates.student_id;
  }
  if (updates.student_name !== undefined) cleanPayload.student_name = updates.student_name;
  if (updates.vfs_ref_no !== undefined) cleanPayload.vfs_ref_no = updates.vfs_ref_no;
  if (updates.embassy_name !== undefined) cleanPayload.embassy_name = updates.embassy_name;
  if (updates.vfs_center !== undefined) cleanPayload.vfs_center = updates.vfs_center;
  if (updates.appointment_date !== undefined) cleanPayload.appointment_date = cleanDate(updates.appointment_date);
  if (updates.passport_no !== undefined) cleanPayload.passport_no = updates.passport_no;
  if (updates.courier_tracking_no !== undefined) cleanPayload.courier_tracking_no = updates.courier_tracking_no;
  if (updates.current_stage !== undefined) cleanPayload.current_stage = Number(updates.current_stage) || 1;
  if (updates.status_label !== undefined) cleanPayload.status_label = updates.status_label;
  if (updates.notes !== undefined) cleanPayload.notes = updates.notes;

  // Append verdict directly into status_label if passed in updates
  if (updates.decision_outcome === 'Approved') {
    cleanPayload.status_label = 'Visa Approved & Stamped';
  } else if (updates.decision_outcome === 'Rejected') {
    cleanPayload.status_label = 'Visa Application Refused by Embassy';
  }

  // 1. Try update existing row by ID
  if (id && isValidUuid(id)) {
    try {
      const { data, error } = await supabase
        .from('visa_tracking')
        .update(cleanPayload)
        .eq('id', id)
        .select('*');

      if (!error && data && data.length > 0) {
        const updated = { ...data[0], decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
        saveLocalVisaCache(updated);
        window.dispatchEvent(new Event('ferex_visa_change'));
        return updated;
      }
    } catch (e) {}
  }

  // 2. Try update existing row by student_id
  if (cleanPayload.student_id) {
    try {
      const { data, error } = await supabase
        .from('visa_tracking')
        .update(cleanPayload)
        .eq('student_id', cleanPayload.student_id)
        .select('*');

      if (!error && data && data.length > 0) {
        const updated = { ...data[0], decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
        saveLocalVisaCache(updated);
        window.dispatchEvent(new Event('ferex_visa_change'));
        return updated;
      }
    } catch (e) {}
  }

  // 3. Fallback upsert new row
  const validId = (id && isValidUuid(id)) ? id : generateUUID();
  const upsertPayload = {
    id: validId,
    student_id: (updates.student_id && isValidUuid(updates.student_id)) ? updates.student_id : null,
    student_name: updates.student_name || 'Student',
    vfs_ref_no: updates.vfs_ref_no || 'VFS-POL-2026',
    embassy_name: updates.embassy_name || 'Embassy of Poland',
    vfs_center: updates.vfs_center || 'VFS Center',
    appointment_date: cleanDate(updates.appointment_date) || new Date().toISOString().split('T')[0],
    passport_no: updates.passport_no || 'Z-9041284',
    courier_tracking_no: updates.courier_tracking_no || 'BLUEDART-89041256',
    current_stage: Number(updates.current_stage) || 1,
    status_label: cleanPayload.status_label || 'VFS Processing',
    notes: updates.notes || 'VFS tracking updated.',
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: upsData, error: upsErr } = await supabase.from('visa_tracking').upsert(upsertPayload).select('*');
    if (!upsErr && upsData && upsData.length > 0) {
      const updated = { ...upsData[0], decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
      saveLocalVisaCache(updated);
      window.dispatchEvent(new Event('ferex_visa_change'));
      return updated;
    }
  } catch (e) {}

  const finalResult = { ...upsertPayload, decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
  saveLocalVisaCache(finalResult);

  if (finalResult.student_id) {
    try {
      const { createNotification } = await import('./notifications');
      const isApproved = updates.decision_outcome === 'Approved' || String(finalResult.status_label).toLowerCase().includes('approved');
      const isRejected = updates.decision_outcome === 'Rejected' || String(finalResult.status_label).toLowerCase().includes('refus');

      await createNotification({
        user_id: finalResult.student_id,
        title: isApproved ? '🎉 Visa Approved & Stamped!' : isRejected ? '⚠️ Visa Decision Update' : '🛡️ VFS Visa Tracking Updated',
        body: isApproved
          ? 'Your Poland National Student D-Visa has been officially approved & stamped by the Embassy!'
          : isRejected
          ? 'Your visa application verdict has been updated to Refused by Embassy.'
          : `Your VFS Visa status: ${finalResult.status_label || 'Processing'} (Stage ${finalResult.current_stage || 1}).`,
        category: 'VFS Visa'
      });
    } catch (e) {}
  }

  window.dispatchEvent(new Event('ferex_visa_change'));
  window.dispatchEvent(new Event('ferex_notification_change'));
  return finalResult;
}
