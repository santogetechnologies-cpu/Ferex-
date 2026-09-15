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

const LEGALIZATION_CATALOG_ID = 'ferex_legalization_catalog';

async function fetchLegalizationCatalog(): Promise<LegalizationRecord[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('system_config')
      .select('config')
      .eq('id', LEGALIZATION_CATALOG_ID)
      .maybeSingle();
    if (data?.config && Array.isArray(data.config)) {
      return data.config;
    }
  } catch {}
  try {
    const raw = localStorage.getItem('ferex_legalization_cloud_catalog');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function syncLegalizationToCloudCatalog(record: LegalizationRecord) {
  try {
    const current = await fetchLegalizationCatalog();
    const filtered = current.filter(r => r.id !== record.id);
    const updated = [record, ...filtered];
    try {
      localStorage.setItem('ferex_legalization_cloud_catalog', JSON.stringify(updated));
    } catch {}
    const admin = await getAdminSupabaseClient();
    await admin.from('system_config').upsert({
      id: LEGALIZATION_CATALOG_ID,
      config: updated,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[syncLegalizationToCloudCatalog notice]:', e);
  }
}

export async function getLegalizationRecords(country?: string, studentId?: string): Promise<LegalizationRecord[]> {
  try {
    const admin = await getAdminSupabaseClient();
    let query = admin
      .from('legalization_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (country && country !== 'All') {
      query = query.ilike('country', `%${country}%`);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data } = await query;
    const dbRecs = ((data ?? []) as any[]).map((r: any) => ({
      ...r,
      nawa_ref_no: r.nawa_ref_no || r.ref_no
    })) as LegalizationRecord[];

    const cloudCatalog = await fetchLegalizationCatalog();
    let targetCloud = cloudCatalog.map(r => ({ ...r, nawa_ref_no: r.nawa_ref_no || r.ref_no }));
    if (country && country !== 'All') {
      targetCloud = targetCloud.filter(r => r.country?.toLowerCase().includes(country.toLowerCase()));
    }
    if (studentId) {
      targetCloud = targetCloud.filter(r => r.student_id === studentId);
    }

    const dbIds = new Set(dbRecs.map(r => r.id));
    const merged = [...dbRecs, ...targetCloud.filter(r => !dbIds.has(r.id))];

    if (country && country !== 'All') {
      return merged.filter(r => r.country?.toLowerCase().includes(country.toLowerCase()));
    }
    if (studentId) {
      return merged.filter(r => r.student_id === studentId);
    }
    return merged;
  } catch (err) {
    const cloudCatalog = await fetchLegalizationCatalog();
    let filtered = cloudCatalog.map(r => ({ ...r, nawa_ref_no: r.nawa_ref_no || r.ref_no }));
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
    const admin = await getAdminSupabaseClient();
    await admin.from('legalization_records').insert(newRecord);
  } catch (e) {
    console.warn('[createLegalizationApplication] DB insert notice:', e);
  }

  await syncLegalizationToCloudCatalog(newRecord);

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

  let updatedRecord: LegalizationRecord | null = null;
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin.from('legalization_records').update(updateData).eq('id', id).select();
    if (data && data.length > 0) {
      updatedRecord = data[0] as LegalizationRecord;
    }
  } catch (e) {
    console.warn('[updateLegalizationStatus] DB update notice:', e);
  }

  if (!updatedRecord) {
    const catalog = await fetchLegalizationCatalog();
    const existing = catalog.find(r => r.id === id);
    if (existing) {
      updatedRecord = { ...existing, ...updateData };
    }
  }

  if (updatedRecord) {
    await syncLegalizationToCloudCatalog(updatedRecord);
  }

  window.dispatchEvent(new Event('ferex_legalization_change'));
  return updatedRecord;
}

export async function deleteLegalizationRecord(id: string): Promise<boolean> {
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('legalization_records').delete().eq('id', id);
  } catch (e) {}

  try {
    const catalog = await fetchLegalizationCatalog();
    const filtered = catalog.filter(r => r.id !== id);
    const admin = await getAdminSupabaseClient();
    await admin.from('system_config').upsert({
      id: LEGALIZATION_CATALOG_ID,
      config: filtered,
      updated_at: new Date().toISOString()
    });
  } catch {}

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
