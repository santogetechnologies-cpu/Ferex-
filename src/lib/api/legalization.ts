import { supabase } from '../supabase';
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

const LEGALIZATION_STORAGE_KEY = 'ferex_legalization_records';
const NAWA_STORAGE_KEY = 'ferex_nawa_records';

function getLocalRecords(): LegalizationRecord[] {
  try {
    const raw = localStorage.getItem(LEGALIZATION_STORAGE_KEY) || localStorage.getItem(NAWA_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRecords(records: LegalizationRecord[]) {
  try {
    localStorage.setItem(LEGALIZATION_STORAGE_KEY, JSON.stringify(records));
    localStorage.setItem(NAWA_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export async function getLegalizationRecords(country?: string, studentId?: string): Promise<LegalizationRecord[]> {
  const local = getLocalRecords();
  try {
    let query = supabase
      .from('legalization_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (country && country !== 'All') {
      query = query.ilike('country', `%${country}%`);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      // Try fallback to nawa_records table if legacy table exists
      try {
        let legacyQuery = supabase.from('nawa_records').select('*').order('created_at', { ascending: false });
        if (studentId) legacyQuery = legacyQuery.eq('student_id', studentId);
        const { data: legacyData } = await legacyQuery;
        if (legacyData && legacyData.length > 0) {
          const mappedLegacy: LegalizationRecord[] = legacyData.map((r: any) => ({
            id: r.id,
            student_id: r.student_id,
            student_name: r.student_name,
            student_email: r.student_email,
            country: r.country || 'Poland',
            authority: r.authority || 'NAWA Polish National Agency',
            authority_acronym: r.authority_acronym || 'NAWA',
            ref_no: r.ref_no || r.nawa_ref_no || `LEG/POL/${Math.floor(1000 + Math.random() * 9000)}`,
            nawa_ref_no: r.ref_no || r.nawa_ref_no,
            document_type: r.document_type || 'Academic Transcripts',
            current_step: r.current_step || 1,
            status: r.status || 'Draft',
            submission_date: r.submission_date || new Date().toISOString(),
            approval_date: r.approval_date,
            notes: r.notes,
            certificate_url: r.certificate_url,
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.updated_at
          }));
          return mappedLegacy;
        }
      } catch {}

      let filtered = local.map(r => ({ ...r, nawa_ref_no: r.nawa_ref_no || r.ref_no }));
      if (country && country !== 'All') {
        filtered = filtered.filter(r => r.country?.toLowerCase().includes(country.toLowerCase()));
      }
      if (studentId) {
        filtered = filtered.filter(r => r.student_id === studentId);
      }
      return filtered;
    }

    const dbRecs = (data ?? []).map((r: any) => ({ ...r, nawa_ref_no: r.nawa_ref_no || r.ref_no })) as LegalizationRecord[];
    const dbIds = new Set(dbRecs.map(r => r.id));
    const merged = [...dbRecs, ...local.map(r => ({ ...r, nawa_ref_no: r.nawa_ref_no || r.ref_no })).filter(r => !dbIds.has(r.id))];

    let result = merged;
    if (country && country !== 'All') {
      result = result.filter(r => r.country?.toLowerCase().includes(country.toLowerCase()));
    }
    if (studentId) {
      result = result.filter(r => r.student_id === studentId);
    }
    return result;
  } catch (err) {
    let filtered = local.map(r => ({ ...r, nawa_ref_no: r.nawa_ref_no || r.ref_no }));
    if (country && country !== 'All') {
      filtered = filtered.filter(r => r.country?.toLowerCase().includes(country.toLowerCase()));
    }
    if (studentId) {
      filtered = filtered.filter(r => r.student_id === studentId);
    }
    return filtered;
  }
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

  try {
    await supabase.from('legalization_records').insert(newRecord);
  } catch (e) {
    console.warn('[createLegalizationApplication] DB insert notice:', e);
  }

  // Update local storage
  const local = getLocalRecords();
  const updated = [newRecord, ...local.filter(r => r.id !== newRecord.id)];
  saveLocalRecords(updated);

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

  try {
    await supabase.from('legalization_records').update(updateData).eq('id', id);
  } catch (e) {
    console.warn('[updateLegalizationStatus] DB update notice:', e);
  }

  const local = getLocalRecords();
  let updatedRecord: LegalizationRecord | null = null;
  const updated = local.map(r => {
    if (r.id === id) {
      updatedRecord = { ...r, ...updateData };
      return updatedRecord;
    }
    return r;
  });

  saveLocalRecords(updated);
  window.dispatchEvent(new Event('ferex_legalization_change'));
  return updatedRecord;
}

export async function deleteLegalizationRecord(id: string): Promise<boolean> {
  try {
    await supabase.from('legalization_records').delete().eq('id', id);
  } catch (e) {}

  const local = getLocalRecords();
  saveLocalRecords(local.filter(r => r.id !== id));
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
