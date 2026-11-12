import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

export interface LegalizationRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  country: string;
  authority: string;
  authority_acronym: string;
  ref_no: string;
  nawa_ref_no?: string; // Legacy alias
  document_type: string;
  current_step: number;
  status: 'Draft' | 'Submitted' | 'Under Evaluation' | 'In Review' | 'Additional Docs Requested' | 'Approved' | 'Rejected';
  submission_date: string;
  approval_date?: string | null;
  notes?: string;
  certificate_url?: string | null;
  created_at: string;
  updated_at?: string;
}

// Backward-compatible alias
export type NawaRecord = LegalizationRecord;

// The legalization_records table is the only source of truth. An older JSON copy in system_config kept
// records of deleted students alive and hid failed saves, so it is no longer read or written.
export async function getLegalizationRecords(country?: string, studentId?: string): Promise<LegalizationRecord[]> {
  const admin = await getAdminSupabaseClient();
  let query = admin.from('legalization_records').select('*').order('created_at', { ascending: false });
  if (country && country !== 'All') query = query.ilike('country', `%${country}%`);
  if (studentId) query = query.eq('student_id', studentId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load legalization records: ${error.message}`);
  return (data || []).map((r: any) => ({ ...r, nawa_ref_no: r.nawa_ref_no || r.ref_no })) as LegalizationRecord[];
}

export async function createLegalizationApplication(payload: {
  student_id: string;
  student_name: string;
  student_email?: string;
  country?: string;
  authority?: string;
  authority_acronym?: string;
  ref_no?: string;
  nawa_ref_no?: string;
  document_type?: string;
  notes?: string;
}): Promise<LegalizationRecord> {
  const country = payload.country || 'Poland';
  const acronym = payload.authority_acronym || (country === 'Poland' ? 'NAWA' : country === 'Germany' ? 'APS' : country === 'UK' ? 'CAS' : country === 'France' ? 'Campus France' : 'CERT');
  const authority = payload.authority || `${country} Legalization & Qualification Authority`;
  const refNo = payload.ref_no || payload.nawa_ref_no || `${acronym}/${country.slice(0, 3).toUpperCase()}/2026/${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newRecord: LegalizationRecord = {
    id: generateUUID(),
    student_id: payload.student_id,
    student_name: payload.student_name,
    student_email: payload.student_email,
    country,
    authority,
    authority_acronym: acronym,
    ref_no: refNo,
    nawa_ref_no: refNo,
    document_type: payload.document_type || 'Academic Diploma & Transcripts',
    current_step: 1,
    status: 'Submitted',
    submission_date: now,
    notes: payload.notes || `Initial submission for ${acronym} qualification recognition.`,
    created_at: now,
    updated_at: now
  };

  const admin = await getAdminSupabaseClient();
  const { error: insertError } = await admin.from('legalization_records').insert(newRecord);
  if (insertError) throw new Error(`Could not save legalization record: ${insertError.message}`);

  // Send student notification
  try {
    await createNotification({
      user_id: payload.student_id,
      title: `${acronym} Legalization Dossier Initiated`,
      body: `Your official ${acronym} recognition file (${refNo}) has been submitted for ${country}.`,
      category: 'Legalization'
    });
  } catch {}

  window.dispatchEvent(new Event('ferex_legalization_change'));
  return newRecord;
}

export async function updateLegalizationStatus(
  id: string,
  status: LegalizationRecord['status'],
  step?: number,
  notes?: string,
  certificateUrl?: string
): Promise<LegalizationRecord | null> {
  const now = new Date().toISOString();
  const updateData: Partial<LegalizationRecord> = {
    status,
    updated_at: now
  };
  if (step !== undefined) updateData.current_step = step;
  if (notes) updateData.notes = notes;
  if (certificateUrl) updateData.certificate_url = certificateUrl;
  if (status === 'Approved') updateData.approval_date = now;

  const admin = await getAdminSupabaseClient();
  const { data, error: updateError } = await admin.from('legalization_records').update(updateData).eq('id', id).select();
  if (updateError) throw new Error(`Could not update legalization record: ${updateError.message}`);
  const updatedRecord: LegalizationRecord | null = data && data.length > 0 ? (data[0] as LegalizationRecord) : null;

  if (updatedRecord) {
    if (updatedRecord.student_id) {
      try {
        const isApproved = status === 'Approved';
        await createNotification({
          user_id: updatedRecord.student_id,
          title: isApproved ? 'Qualification Legalization Approved!' : `Legalization Status: ${status}`,
          body: isApproved
            ? `Your official qualifications for ${updatedRecord.country || 'Europe'} have been recognized and approved (${updatedRecord.ref_no || ''}). You can now file for your National Student Visa!`
            : `Your legalization file (${updatedRecord.ref_no || ''}) has reached Step ${updatedRecord.current_step || step || 1}: ${status}.`,
          category: 'Legalization',
          link: '/student/journey-tracker'
        });
      } catch {}
    }
  }

  window.dispatchEvent(new Event('ferex_legalization_change'));
  window.dispatchEvent(new Event('ferex_nawa_change'));
  return updatedRecord;
}

export async function deleteLegalizationRecord(id: string): Promise<boolean> {
  const admin = await getAdminSupabaseClient();
  const { error } = await admin.from('legalization_records').delete().eq('id', id);
  if (error) throw new Error(`Could not delete legalization record: ${error.message}`);
  window.dispatchEvent(new Event('ferex_legalization_change'));
  return true;
}

// ── Backward-compatible Aliases for Legacy NAWA Calls ────────────────
export const getNawaRecords = async (studentId?: string) => getLegalizationRecords(undefined, studentId);
export const createNawaApplication = async (payload: {
  student_id: string;
  student_name: string;
  student_email?: string;
  nawa_ref_no?: string;
  document_type?: string;
  notes?: string;
}) => createLegalizationApplication({
  ...payload,
  country: 'Poland',
  authority: 'NAWA Polish National Agency',
  authority_acronym: 'NAWA',
  ref_no: payload.nawa_ref_no
});
export const createNawaRecord = createLegalizationApplication;
export const updateNawaStep = async (id: string, step: number, status?: any, notes?: string, certificateUrl?: string) =>
  updateLegalizationStatus(id, status || 'In Review', step, notes, certificateUrl);
export const deleteNawaRecord = deleteLegalizationRecord;
