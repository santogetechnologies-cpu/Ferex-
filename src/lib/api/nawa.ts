import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

export interface NawaRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  nawa_ref_no: string;
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

const NAWA_STORAGE_KEY = 'ferex_nawa_records';

function getLocalNawaRecords(): NawaRecord[] {
  try {
    const raw = localStorage.getItem(NAWA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNawaRecords(records: NawaRecord[]) {
  try {
    localStorage.setItem(NAWA_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

// ─── Query NAWA records directly from nawa_records table in Supabase ─────────────────
export async function getNawaRecords(studentId?: string): Promise<NawaRecord[]> {
  const local = getLocalNawaRecords();
  try {
    let query = supabase
      .from('nawa_records')
      .select('id, student_id, student_name, student_email, nawa_ref_no, document_type, current_step, status, submission_date, approval_date, notes, certificate_url, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      if (studentId) {
        return local.filter(r => r.student_id === studentId);
      }
      return local;
    }

    // Merge Supabase records with any locally stored ones
    const dbRecs = (data ?? []) as NawaRecord[];
    const dbIds = new Set(dbRecs.map(r => r.id));
    const merged = [...dbRecs, ...local.filter(r => !dbIds.has(r.id))];

    if (studentId) {
      return merged.filter(r => r.student_id === studentId);
    }
    return merged;
  } catch (err) {
    if (studentId) {
      return local.filter(r => r.student_id === studentId);
    }
    return local;
  }
}

// ─── Create/Apply for NAWA in nawa_records table in Supabase ───────────────
export async function createNawaApplication(payload: {
  student_id: string;
  student_name: string;
  student_email?: string;
  nawa_ref_no?: string;
  document_type?: string;
  notes?: string;
}): Promise<NawaRecord> {
  // Check if NAWA record already exists for this student
  try {
    const existing = await getNawaRecords(payload.student_id);
    if (existing && existing.length > 0) {
      console.log('[createNawaRecord]: Record already exists for student', payload.student_id);
      return existing[0]; // Return existing record instead of creating duplicate
    }
  } catch (e) {
    console.warn('[createNawaRecord]: Could not check for existing records:', e);
  }

  const now = new Date().toISOString();
  const refNo = payload.nawa_ref_no || `NAWA/POL/2026/${Math.floor(1000 + Math.random() * 9000)}`;
  const docType = payload.document_type || 'Academic Diploma & Transcripts';

  const record: NawaRecord = {
    id: generateUUID(),
    student_id: payload.student_id,
    student_name: payload.student_name,
    student_email: payload.student_email || '',
    nawa_ref_no: refNo,
    document_type: docType,
    current_step: 1,
    status: 'Submitted',
    submission_date: now.slice(0, 10),
    notes: payload.notes || 'Initiated NAWA legalization & sworn translation audit.',
    created_at: now,
    updated_at: now
  };

  // 1. Save to localStorage immediately
  const local = getLocalNawaRecords();
  local.unshift(record);
  saveLocalNawaRecords(local);

  // 2. Save to Supabase
  try {
    await supabase.from('nawa_records').insert(record);
  } catch (e) {
    console.warn('[createNawaRecord insert notice]:', e);
  }

  // 3. Create Notification
  try {
    await createNotification({
      user_id: payload.student_id,
      title: '📜 NAWA Legalization Initiated',
      body: `Your degree documents (${docType}) have been submitted to NAWA Warsaw for legalization (Ref: ${refNo}).`,
      category: 'Application'
    });
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_nawa_change'));
  window.dispatchEvent(new Event('ferex_application_change'));
  return record;
}

// ─── Update NAWA process stage in nawa_records table in Supabase ────────────────
export async function updateNawaStep(
  id: string,
  step: number,
  status: NawaRecord['status'],
  notes?: string
): Promise<NawaRecord | null> {
  const now = new Date().toISOString();
  const isApproved = status === 'Approved' || step >= 4;

  const notesVal = notes || (isApproved
    ? 'NAWA Recognition Certificate issued successfully by Polish National Agency.'
    : `NAWA Process Stage ${step} updated.`);

  const cleanId = id.replace('nawa-app-', '').replace('nawa-std-', '');

  const updatedPayload = {
    current_step: step,
    status: isApproved ? ('Approved' as const) : status,
    notes: notesVal,
    approval_date: isApproved ? now.slice(0, 10) : null,
    updated_at: now
  };

  // 1. Update localStorage
  const local = getLocalNawaRecords();
  const updatedLocal = local.map(r => {
    if (r.id === id || r.id === cleanId || r.student_id === cleanId) {
      return { ...r, ...updatedPayload };
    }
    return r;
  });
  saveLocalNawaRecords(updatedLocal);

  // 2. Update Supabase
  try {
    await supabase
      .from('nawa_records')
      .update(updatedPayload)
      .or(`id.eq.${cleanId},student_id.eq.${cleanId},id.eq.${id}`);
  } catch (e) {
    console.warn('[updateNawaStep DB notice]:', e);
  }

  const updatedRecord: NawaRecord = {
    id: cleanId,
    student_id: cleanId,
    student_name: 'Student',
    nawa_ref_no: `NAWA/POL/2026/${String(cleanId).slice(0, 4).toUpperCase()}`,
    document_type: 'Academic Diploma & Transcripts',
    current_step: step,
    status: isApproved ? 'Approved' : status,
    notes: notesVal,
    submission_date: now.slice(0, 10),
    approval_date: isApproved ? now.slice(0, 10) : null,
    created_at: now,
    updated_at: now
  };

  if (isApproved && cleanId) {
    try {
      await createNotification({
        user_id: cleanId,
        title: '🎉 Academic Legalization Approved!',
        body: `Your educational degree recognition & verification has been officially approved. Your university application is now cleared to proceed!`,
        category: 'Application'
      });
    } catch (e) {}
  }

  // Two-way synchronization with applications table
  if (cleanId) {
    try {
      const syncStatus = isApproved ? 'NAWA Approved' : (status === 'Submitted' ? 'NAWA Submitted' : 'NAWA Review');
      await supabase
        .from('applications')
        .update({ status: syncStatus, updated_at: now })
        .or(`student_id.eq.${cleanId},id.eq.${cleanId}`);
    } catch (e) {}
  }

  window.dispatchEvent(new Event('ferex_nawa_change'));
  window.dispatchEvent(new Event('ferex_application_change'));
  window.dispatchEvent(new Event('ferex_applications_change'));

  return updatedRecord;
}

// ─── Delete NAWA record from nawa_records table ──────────────────────────────
export async function deleteNawaRecord(id: string): Promise<void> {
  const cleanId = id.replace('nawa-app-', '').replace('nawa-std-', '');

  const local = getLocalNawaRecords();
  const filtered = local.filter(r => r.id !== id && r.id !== cleanId && r.student_id !== cleanId);
  saveLocalNawaRecords(filtered);

  try {
    await supabase.from('nawa_records').delete().or(`id.eq.${cleanId},student_id.eq.${cleanId},id.eq.${id}`);
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_nawa_change'));
  window.dispatchEvent(new Event('ferex_application_change'));
}

export const createNawaRecord = createNawaApplication;
