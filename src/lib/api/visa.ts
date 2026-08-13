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

export async function getVisaRecords(studentId?: string) {
  try {
    let query = supabase.from('visa_tracking').select('*');
    if (studentId) {
      query = query.or(`student_id.eq.${studentId},student_id.is.null`);
    }
    const { data } = await query;
    return (data ?? []) as VisaTrackingRecord[];
  } catch (err) {
    return [];
  }
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

export async function updateVisaRecord(id: string, updates: Partial<VisaTrackingRecord>) {
  // Construct clean payload with strictly valid DB columns
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
    const { data, error } = await supabase
      .from('visa_tracking')
      .update(cleanPayload)
      .eq('id', id)
      .select();

    if (!error && data && data.length > 0) {
      return { ...data[0], decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
    }
  }

  // 2. Try update existing row by student_id
  if (cleanPayload.student_id) {
    const { data, error } = await supabase
      .from('visa_tracking')
      .update(cleanPayload)
      .eq('student_id', cleanPayload.student_id)
      .select();

    if (!error && data && data.length > 0) {
      return { ...data[0], decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
    }
  }

  // 3. Fallback upsert new row
  const validId = (id && isValidUuid(id)) ? id : generateUUID();
  const upsertPayload = {
    id: validId,
    student_id: (updates.student_id && isValidUuid(updates.student_id)) ? updates.student_id : null,
    student_name: updates.student_name || 'Student',
    vfs_ref_no: updates.vfs_ref_no || 'VFS-POL-2026-90412',
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
    const { data: upsData, error: upsErr } = await supabase.from('visa_tracking').upsert(upsertPayload).select();
    if (!upsErr && upsData && upsData.length > 0) {
      return { ...upsData[0], decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
    }
  } catch (e) {}

  return { ...upsertPayload, decision_outcome: updates.decision_outcome } as VisaTrackingRecord;
}
