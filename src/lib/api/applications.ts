import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { Application, ChecklistItem } from '../types';
import { generateUUID } from '../../utils/uuid';
import { logActivity } from './activity';

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

export function isRealApplication(a: any): boolean {
  if (!a) return false;
  const name = (a.university_name || a.universities?.name || '').trim();
  if (!name || name.toLowerCase().includes('pending university') || name.toLowerCase() === 'not set') {
    return false;
  }
  return true;
}

export function isApplicationActive(a: any): boolean {
  if (!isRealApplication(a)) return false;
  const status = (a.status || '').trim();
  return status !== 'Withdrawn' && status !== 'Rejected';
}

export async function getActiveApplication(studentId: string): Promise<Application | null> {
  if (!studentId) return null;
  const apps = await getApplications(studentId);
  return apps.find(isApplicationActive) || null;
}

// ─── Get applications (optionally scoped to a student) ───────────────────────
export async function getApplications(studentId?: string): Promise<Application[]> {
  try {
    const isStudentCall = Boolean(studentId && studentId.trim() !== '');
    const admin = await getAdminSupabaseClient();
    const client = isStudentCall ? supabase : (admin || supabase);

    let query = client
      .from('applications')
      .select(`
        id,
        student_id,
        university_id,
        university_name,
        program_name,
        course,
        intake,
        status,
        notes,
        offer_letter_url,
        final_acceptance_url,
        applied_date,
        created_at,
        updated_at,
        users:student_id ( id, full_name, email, assigned_counselor )
      `)
      .order('created_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    let { data, error } = await query;

    if (error) {
      console.warn('[getApplications] Join select notice, falling back to simple select:', error.message);
      let fallbackQuery = client
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (studentId) {
        fallbackQuery = fallbackQuery.eq('student_id', studentId);
      }
      const res = await fallbackQuery;
      data = res.data;
      error = res.error;
    }

    if (!error && Array.isArray(data)) {
      const mapped: Application[] = data.map((app: any) => {
        const u = app.users;
        const studentName = u?.full_name || u?.email?.split('@')[0] || app.student_name || 'Student';
        const assignedCounselor = app.counselor || app.assigned_counselor || u?.assigned_counselor || '';
        return {
          id: app.id,
          student_id: app.student_id,
          student_name: studentName,
          counselor: assignedCounselor,
          assigned_counselor: assignedCounselor,
          university_id: app.university_id || '',
          university_name: app.university_name || 'Partner University',
          program_name: app.program_name || app.course || 'Degree Program',
          course: app.course || app.program_name || 'Degree Program',
          intake: app.intake || 'October 2026',
          status: app.status || 'Submitted',
          notes: app.notes || '',
          offer_letter_url: app.offer_letter_url || '',
          final_acceptance_url: app.final_acceptance_url || '',
          applied_date: app.applied_date || app.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          created_at: app.created_at || new Date().toISOString(),
          updated_at: app.updated_at || new Date().toISOString(),
          checklist: app.checklist || [],
        };
      });

      saveLocalApplications(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('[getApplications DB notice]:', err);
  }

  // Offline fallback
  const local = getLocalApplications();
  if (studentId) {
    return local.filter(a => a.student_id === studentId);
  }
  return local;
}

// ─── Get single application ───────────────────────────────────────────────────
export async function getApplicationById(id: string): Promise<Application | null> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data, error } = await client
      .from('applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return data as Application;
    }
  } catch {}

  const local = getLocalApplications();
  return local.find(a => a.id === id) || null;
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
}): Promise<Application> {
  const univName = payload.university_name?.trim() || 'Partner University';
  const progName = (payload.program_name || payload.course || 'Degree Program').trim();
  const intakeVal = payload.intake?.trim() || 'October 2026';

  // Preserve explicit payload student_id (essential when admin/counselor applies on behalf of student)
  let targetStudentId = payload.student_id;
  let targetStudentName = payload.student_name || 'Student';
  let targetStudentEmail = '';

  if (!targetStudentId || !isValidUuid(targetStudentId)) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        targetStudentId = authData.user.id;
        targetStudentEmail = authData.user.email || '';
        targetStudentName = payload.student_name || authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'Student';
      }
    } catch {}
  }

  if (!targetStudentId || !isValidUuid(targetStudentId)) {
    targetStudentId = generateUUID();
  }

  // ── Enforce: One Active University Application Per Student ──
  const isTargetReal = isRealApplication({ university_name: univName });
  if (isTargetReal && targetStudentId) {
    let existingApps: any[] = [];
    try {
      const admin = await getAdminSupabaseClient();
      const client = admin || supabase;
      const { data, error } = await client
        .from('applications')
        .select('id, university_name, status')
        .eq('student_id', targetStudentId);

      if (!error && Array.isArray(data)) {
        existingApps = data;
      }
    } catch {}

    if (existingApps.length === 0) {
      existingApps = getLocalApplications().filter(a => a.student_id === targetStudentId);
    }

    const activeApp = existingApps.find(isApplicationActive);
    if (activeApp) {
      throw new Error(
        `You already have an active application to ${activeApp.university_name || 'a partner university'}. A student can apply to only ONE university at a time. Please withdraw your existing application before applying to another university.`
      );
    }
  }

  // Check if there is an existing placeholder row to upgrade
  let placeholderId: string | null = null;
  if (isTargetReal && targetStudentId) {
    try {
      const admin = await getAdminSupabaseClient();
      const client = admin || supabase;
      const { data: placeholderRow } = await client
        .from('applications')
        .select('id')
        .eq('student_id', targetStudentId)
        .ilike('university_name', '%pending university%')
        .maybeSingle();

      if (placeholderRow?.id) {
        placeholderId = placeholderRow.id;
      }
    } catch {}
  }

  const finalAppId = placeholderId || generateUUID();

  // The student must already exist. Creating a profile here used to resurrect deleted students (with an invented
  // email) whenever an application was filed for a stale id.
  if (targetStudentId && isValidUuid(targetStudentId)) {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data: existingUser, error: userError } = await client.from('users').select('id').eq('id', targetStudentId).maybeSingle();
    if (userError) throw new Error(`Could not verify the student account: ${userError.message}`);
    if (!existingUser) throw new Error('This student account no longer exists, so an application cannot be created.');
  }

  const now = new Date().toISOString();
  const isUniUuid = isValidUuid(payload.university_id);

  const appRecord: Application = {
    id: finalAppId,
    student_id: targetStudentId,
    student_name: targetStudentName,
    university_id: payload.university_id || '',
    university_name: univName,
    program_name: progName,
    course: progName,
    intake: intakeVal,
    status: 'Submitted',
    notes: `Application for ${progName} at ${univName}. Student: ${targetStudentName}`,
    applied_date: now.split('T')[0],
    created_at: now,
    updated_at: now,
  };

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const dbPayload: any = {
    id: finalAppId,
    student_id: targetStudentId,
    university_id: isUniUuid ? payload.university_id : null,
    university_name: univName,
    program_name: progName,
    course: progName,
    intake: intakeVal,
    status: 'Submitted',
    notes: appRecord.notes,
    applied_date: appRecord.applied_date,
    created_at: now,
    updated_at: now,
  };

  let writeError: any = null;
  if (placeholderId) {
    const { error } = await client.from('applications').update(dbPayload).eq('id', placeholderId);
    writeError = error;
  } else {
    const { error } = await client.from('applications').insert(dbPayload);
    writeError = error;
  }

  if (writeError) {
    throw new Error(`Failed to create application: ${writeError.message}`);
  }

  // Update local cache
  const local = getLocalApplications();
  const existingIdx = local.findIndex(a => a.id === finalAppId || (placeholderId && a.id === placeholderId) || (a.student_id === targetStudentId && !isRealApplication(a)));
  if (existingIdx >= 0) {
    local[existingIdx] = appRecord;
  } else {
    local.unshift(appRecord);
  }
  saveLocalApplications(local);

  try {
    await logActivity('APPLICATION_SUBMITTED', 'application', finalAppId, {
      university: univName,
      program: progName,
      student: targetStudentName,
    });
  } catch {}

  window.dispatchEvent(new Event('ferex_application_change'));
  window.dispatchEvent(new Event('ferex_applications_change'));
  return appRecord;
}

// ─── Update application status ────────────────────────────────────────────────
export async function updateApplicationStatus(
  id: string,
  status: Application['status'],
  notes?: string,
  offerLetterUrl?: string,
  finalAcceptanceUrl?: string
): Promise<Partial<Application>> {
  const now = new Date().toISOString();

  const updates: any = {
    status,
    notes: notes || '',
    updated_at: now,
  };
  if (offerLetterUrl) updates.offer_letter_url = offerLetterUrl;
  if (finalAcceptanceUrl) updates.final_acceptance_url = finalAcceptanceUrl;

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client.from('applications').update(updates).eq('id', id);
  if (error) {
    throw new Error(`Failed to update application: ${error.message}`);
  }

  // Update local cache
  const local = getLocalApplications();
  const updatedLocal = local.map(a => a.id === id ? { ...a, ...updates } : a);
  saveLocalApplications(updatedLocal);

  try {
    await logActivity('APPLICATION_STATUS_UPDATED', 'application', id, { status, notes });
  } catch {}

  window.dispatchEvent(new Event('ferex_application_change'));
  window.dispatchEvent(new Event('ferex_applications_change'));

  return { id, status, ...updates };
}

export async function uploadOfferPdfToSupabase(fileOrBlob: File | Blob, _originalFilename?: string): Promise<string> {
  try {
    const { uploadFileToBucket } = await import('../storage');
    const res = await uploadFileToBucket('offer-letters', fileOrBlob, 'offer_letter');
    if (res.url && !res.url.startsWith('blob:')) {
      return res.url;
    }
  } catch (err) {
    console.warn('[uploadOfferPdfToSupabase notice]:', err);
  }

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(fileOrBlob);
  });
}

export async function withdrawApplication(id: string) {
  return updateApplicationStatus(id, 'Withdrawn', 'Withdrawn by student.');
}

export async function getApplicationChecklist(applicationId: string): Promise<ChecklistItem[]> {
  try {
    const { data, error } = await supabase
      .from('application_checklist')
      .select('*')
      .eq('application_id', applicationId);
    if (!error && data) return data as ChecklistItem[];
  } catch {}
  return [];
}

export async function ensureStudentApplication(studentId: string, studentName: string = 'Enrolled Student') {
  if (!studentId) return;
  try {
    const existing = await getApplications(studentId);
    if (existing && existing.length > 0) return;

    await createApplication({
      student_id: studentId,
      student_name: studentName,
      university_name: 'Pending University Selection',
      program_name: 'Degree Program',
    });
  } catch (err) {
    console.warn('[ensureStudentApplication notice]:', err);
  }
}
