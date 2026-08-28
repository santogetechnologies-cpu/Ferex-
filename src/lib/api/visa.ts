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
  decision_outcome: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  updated_at: string;
}

export async function getVisaRecords(studentId?: string): Promise<VisaTrackingRecord[]> {
  try {
    let query = supabase.from('visa_tracking').select('*').order('updated_at', { ascending: false });
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[getVisaRecords Notice]:', error.message);
      return [];
    }

    const records = (data ?? []).map((r: any) => {
      const statusLower = String(r.status_label || r.status || '').toLowerCase();
      const outcome = r.decision_outcome ||
        (statusLower.includes('approv') ? 'Approved' :
         statusLower.includes('reject') || statusLower.includes('refus') ? 'Rejected' : 'Pending');

      return {
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
    });

    return records;
  } catch (err) {
    console.error('[getVisaRecords Error]:', err);
    return [];
  }
}

function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function cleanDate(d?: string): string {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  } catch {}
  return '';
}

export async function updateVisaStatus(
  id: string,
  updates: Partial<VisaTrackingRecord>
): Promise<VisaTrackingRecord | null> {
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

  if (updates.decision_outcome === 'Approved') {
    cleanPayload.status_label = 'Visa Approved & Stamped';
  } else if (updates.decision_outcome === 'Rejected') {
    cleanPayload.status_label = 'Visa Application Refused by Embassy';
  }

  // Try update existing row by ID
  if (id && isValidUuid(id)) {
    try {
      const { data, error } = await supabase
        .from('visa_tracking')
        .update(cleanPayload)
        .eq('id', id)
        .select('*');

      if (!error && data && data.length > 0) {
        const updated = { ...data[0], decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
        window.dispatchEvent(new Event('ferex_visa_change'));
        return updated;
      }
    } catch (e) {}
  }

  // Fallback upsert new row
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
      window.dispatchEvent(new Event('ferex_visa_change'));
      return updated;
    }
  } catch (e) {}

  const finalResult = { ...upsertPayload, decision_outcome: updates.decision_outcome } as VisaTrackingRecord;

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

export const updateVisaRecord = updateVisaStatus;
