import { supabase } from '../supabase';
import type { Application, ChecklistItem } from '../types';
import { generateUUID } from '../../utils/uuid';
import { logActivity } from './activity';

// Helper regex to validate UUID strings
const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

const APPLICATIONS_STORAGE_KEY = 'ferex_applications_backup';

function getLocalApplications(): Application[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalApplications(apps: Application[]) {
  try {
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(apps));
  } catch {}
}

// ─── Get applications (optionally scoped to a student) ───────────────────────
export async function getApplications(studentId?: string): Promise<Application[]> {
  const local = getLocalApplications();
  try {
    const isStudentCall = studentId !== undefined && studentId !== '';

    let appQuery = supabase
      .from('applications')
      .select('id, student_id, student_name, university_id, university_name, program_name, course, intake, status, notes, created_at, updated_at, universities:university_id(id, name, country, city)')
      .order('created_at', { ascending: false });

    let offerQuery = supabase.from('offer_letters').select('id, student_id, application_id, offer_letter_url, file_url, url');
    let finalQuery = supabase.from('final_acceptance').select('id, student_id, application_id, final_acceptance_url, file_url, url');

    if (isStudentCall && studentId && isValidUuid(studentId)) {
      appQuery = appQuery.eq('student_id', studentId);
      offerQuery = offerQuery.eq('student_id', studentId);
      finalQuery = finalQuery.eq('student_id', studentId);
    }

    // Parallel fetch querying separate tables: applications, offer_letter, and final_acceptance
    const [appRes, offerRes, finalRes] = await Promise.all([
      appQuery,
      Promise.resolve(offerQuery).catch(() => ({ data: null })),
      Promise.resolve(finalQuery).catch(() => ({ data: null }))
    ]);

    const rawList = (appRes.data ?? []) as unknown as Application[];
    const offerLetters = offerRes.data;
    const finalAcceptances = finalRes.data;

    const dbApps = rawList.map(app => {
      let updatedApp = { ...app };

      // 1. Cross-sync Offer Letter URL strictly for this specific application_id
      const matchOffer = offerLetters?.find((o: any) =>
        Boolean(o.application_id) && String(o.application_id) === String(app.id)
      );
      const foundOfferUrl = matchOffer?.offer_letter_url || matchOffer?.file_url || matchOffer?.url;
      if (foundOfferUrl) {
        updatedApp.offer_letter_url = foundOfferUrl;
      }

      // 2. Cross-sync Final Acceptance Certificate URL strictly for this specific application_id
      const matchFinal = finalAcceptances?.find((f: any) =>
        Boolean(f.application_id) && String(f.application_id) === String(app.id)
      );
      const foundFinalUrl = matchFinal?.final_acceptance_url || matchFinal?.file_url || matchFinal?.url;
      if (foundFinalUrl) {
        updatedApp.final_acceptance_url = foundFinalUrl;
      }

      return updatedApp;
    });

    // Merge DB records and local storage applications
    const dbIds = new Set(dbApps.map(a => a.id));
    const merged = [...dbApps, ...local.filter(a => !dbIds.has(a.id))];

    if (isStudentCall && studentId) {
      const filtered = merged.filter(a =>
        a.student_id === studentId ||
        !isValidUuid(studentId) // if demo/testing, match
      );
      return filtered.length > 0 ? filtered : merged;
    }

    return merged;
  } catch (err) {
    if (studentId) {
      const filtered = local.filter(a => a.student_id === studentId);
      return filtered.length > 0 ? filtered : local;
    }
    return local;
  }
}

// ─── Get single application with checklist ────────────────────────────────────
export async function getApplicationById(id: string) {
  const local = getLocalApplications();
  const localMatch = local.find(a => a.id === id);
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) {
      return data as Application;
    }
  } catch {}
  return localMatch || null;
}

// ─── Auto-enroll student into NAWA Review on first document upload ────────────
export async function ensureStudentApplication(studentId: string, studentName: string = 'Enrolled Student') {
  if (!studentId) return;

  try {
    const existing = await getApplications(studentId);
    if (existing && existing.length > 0) return; // Already has an application

    const newId = generateUUID();
    const placeholderUnivId = generateUUID();

    const now = new Date().toISOString();
    const appObj: Application = {
      id: newId,
      student_id: studentId,
      student_name: studentName,
      university_id: placeholderUnivId,
      university_name: 'Pending University Selection',
      program_name: 'Pending Course Selection',
      course: 'Pending Course Selection',
      intake: 'TBD',
      status: 'NAWA Review',
      notes: 'Auto-enrolled on document submission. Awaiting NAWA apostille & legalization audit.',
      applied_date: now,
      created_at: now,
      updated_at: now,
    };

    const local = getLocalApplications();
    local.unshift(appObj);
    saveLocalApplications(local);

    if (isValidUuid(studentId)) {
      await supabase.from('applications').insert(appObj);
    }
  } catch (err) {
    console.warn('[ensureStudentApplication Notice]:', err);
  }
}

// ─── Get checklist items for an application ───────────────────────────────────
export async function getApplicationChecklist(applicationId: string) {
  const { data, error } = await supabase
    .from('application_checklist')
    .select('*')
    .eq('application_id', applicationId);
  if (error) return [];
  return (data ?? []) as ChecklistItem[];
}

// ─── Create a new application ─────────────────────────────────────────────────
export async function createApplication(payload: {
  student_id?: string;
  student_name?: string;
  university_name?: string;
  university_id?: string;
  program_name?: string;
  course?: string;
  intake?: string;
  tuition_fee?: string | number;
  course_fee?: string | number;
}) {
  const newId = generateUUID();
  const univName = payload.university_name || 'Partner University';
  const progName = payload.program_name || payload.course || 'Higher Studies';
  const intakeVal = payload.intake || 'October 2026';
  const studentNameVal = payload.student_name || 'Student';
  const feeVal = payload.tuition_fee || payload.course_fee || '';

  const validUnivId = isValidUuid(payload.university_id) ? payload.university_id! : generateUUID();
  const rawStudentId = payload.student_id || generateUUID();
  const validStudentId = isValidUuid(rawStudentId) ? rawStudentId : generateUUID();

  const targetId = newId;
  const now = new Date().toISOString();

  const appRecord: Application = {
    id: targetId,
    student_id: rawStudentId,
    student_name: studentNameVal,
    university_id: validUnivId,
    university_name: univName,
    program_name: progName,
    course: progName,
    intake: intakeVal,
    status: 'Submitted',
    notes: `Application submitted for ${progName} at ${univName}.`,
    applied_date: now,
    created_at: now,
    updated_at: now,
    tuition_fee: feeVal,
    course_fee: feeVal,
  };

  // 1. Immediately store to LocalStorage
  const local = getLocalApplications();
  // If exists, update; otherwise prepend
  const existingIdx = local.findIndex(a => a.student_id === rawStudentId && a.university_id === validUnivId);
  if (existingIdx >= 0) {
    local[existingIdx] = { ...local[existingIdx], ...appRecord };
  } else {
    local.unshift(appRecord);
  }
  saveLocalApplications(local);

  // 2. Insert/Upsert into Supabase
  try {
    const savePayload: any = {
      id: targetId,
      student_id: validStudentId,
      student_name: studentNameVal,
      university_id: validUnivId,
      university_name: univName,
      program_name: progName,
      course: progName,
      intake: intakeVal,
      status: 'Submitted',
      updated_at: now,
    };
    if (feeVal) {
      savePayload.tuition_fee = feeVal;
      savePayload.course_fee = feeVal;
    }

    const { data: dbData, error } = await supabase.from('applications').insert(savePayload).select();
    if (!error && dbData && dbData.length > 0) {
      console.log('✅ [createApplication]: Application saved to Supabase');
    }
  } catch (err) {
    console.warn('[createApplication Supabase Notice]:', err);
  }

  // 3. Log Activity & Notify
  try {
    await logActivity('APPLICATION_SUBMITTED', 'application', targetId, {
      university: univName,
      program: progName,
      student: studentNameVal,
    });
  } catch {}

  window.dispatchEvent(new Event('ferex_application_change'));
  return appRecord;
}

// ─── Upload Offer Letter PDF file/blob to Supabase Storage ────────────────────
export async function uploadOfferPdfToSupabase(fileOrBlob: File | Blob, _originalFilename?: string): Promise<string> {
  const { uploadFileToBucket } = await import('../storage');
  const res = await uploadFileToBucket('offer-letters', fileOrBlob, 'offer_letter');
  return res.url || '';
}

// ─── Update application status (admin action) ─────────────────────────────────
export async function updateApplicationStatus(
  id: string,
  status: Application['status'],
  notes?: string,
  offerLetterUrl?: string,
  finalAcceptanceUrl?: string
) {
  const now = new Date().toISOString();

  const updates: Partial<Application> = {
    status,
    notes: notes || '',
    updated_at: now,
  };
  if (offerLetterUrl) updates.offer_letter_url = offerLetterUrl;
  if (finalAcceptanceUrl) updates.final_acceptance_url = finalAcceptanceUrl;

  // 1. Update localStorage
  const local = getLocalApplications();
  const updatedLocal = local.map(a => a.id === id ? { ...a, ...updates } : a);
  saveLocalApplications(updatedLocal);

  // 2. Update Supabase
  try {
    const cleanPayload: any = { status, notes: notes || '', updated_at: now };
    if (offerLetterUrl) cleanPayload.offer_letter_url = offerLetterUrl;
    if (finalAcceptanceUrl) cleanPayload.final_acceptance_url = finalAcceptanceUrl;

    await supabase.from('applications').update(cleanPayload).eq('id', id);
  } catch (e) {
    console.warn('[updateApplicationStatus notice]:', e);
  }

  try {
    await logActivity('APPLICATION_STATUS_UPDATED', 'application', id, { status, notes });
  } catch {}

  window.dispatchEvent(new Event('ferex_application_change'));

  const matched = updatedLocal.find(a => a.id === id);
  return matched || { id, status, notes: notes || '' };
}

// ─── Withdraw Application ─────────────────────────────────────────────────────
export async function withdrawApplication(id: string) {
  return updateApplicationStatus(id, 'Withdrawn', 'Withdrawn by student.');
}
