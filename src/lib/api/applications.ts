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
        users:student_id ( id, full_name, email )
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
        return {
          id: app.id,
          student_id: app.student_id,
          student_name: studentName,
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
  const newId = generateUUID();
  const univName = payload.university_name?.trim() || 'Partner University';
  const progName = (payload.program_name || payload.course || 'Degree Program').trim();
  const intakeVal = payload.intake?.trim() || 'October 2026';

  let authUserId = payload.student_id;
  let authUserName = payload.student_name || 'Student';
  let authUserEmail = '';

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      authUserId = authData.user.id;
      authUserEmail = authData.user.email || '';
      authUserName = payload.student_name || authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'Student';
    }
  } catch {}

  const targetStudentId = authUserId || (isValidUuid(payload.student_id) ? payload.student_id! : generateUUID());

  // Guarantee student row in public.users to satisfy foreign key
  if (targetStudentId && isValidUuid(targetStudentId)) {
    try {
      const admin = await getAdminSupabaseClient();
      const client = admin || supabase;
      await client.from('users').upsert({
        id: targetStudentId,
        email: authUserEmail || `${targetStudentId}@student.ferex.com`,
        full_name: authUserName,
        role: 'student',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch {}
  }

  const now = new Date().toISOString();
  const isUniUuid = isValidUuid(payload.university_id);

  const appRecord: Application = {
    id: newId,
    student_id: targetStudentId,
    student_name: authUserName,
    university_id: payload.university_id || '',
    university_name: univName,
    program_name: progName,
    course: progName,
    intake: intakeVal,
    status: 'Submitted',
    notes: `Application for ${progName} at ${univName}. Student: ${authUserName}`,
    applied_date: now.split('T')[0],
    created_at: now,
    updated_at: now,
  };

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const dbPayload: any = {
    id: newId,
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

  const { error } = await client.from('applications').insert(dbPayload);
  if (error) {
    throw new Error(`Failed to create application: ${error.message}`);
  }

  // Update local cache
  const local = getLocalApplications();
  local.unshift(appRecord);
  saveLocalApplications(local);

  try {
    await logActivity('APPLICATION_SUBMITTED', 'application', newId, {
      university: univName,
      program: progName,
      student: authUserName,
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
