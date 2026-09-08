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

async function syncAppsToSupabase(apps: Application[]) {
  for (const app of apps) {
    if (!isValidUuid(app.id)) continue;
    try {
      const studentId = isValidUuid(app.student_id) ? app.student_id : null;
      if (!studentId) continue;

      // Ensure user row exists in public.users
      await supabase.from('users').upsert({
        id: studentId,
        email: `${studentId}@student.ferex.com`,
        full_name: app.student_name || 'Student',
        role: 'student',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).catch(() => {});

      const payload: any = {
        id: app.id,
        student_id: studentId,
        university_id: isValidUuid(app.university_id) ? app.university_id : null,
        university_name: app.university_name || 'University',
        program_name: app.program_name || app.course || 'Program',
        course: app.course || app.program_name || 'Program',
        intake: app.intake || 'October 2026',
        status: app.status || 'Submitted',
        notes: app.notes || '',
        offer_letter_url: app.offer_letter_url || '',
        final_acceptance_url: app.final_acceptance_url || '',
        applied_date: app.applied_date || new Date().toISOString().split('T')[0],
      };

      await supabase.from('applications').upsert(payload, { onConflict: 'id' });
    } catch (e) {}
  }
}

// ─── Get applications (optionally scoped to a student) ───────────────────────
export async function getApplications(studentId?: string): Promise<Application[]> {
  const local = getLocalApplications();
  try {
    const isStudentCall = Boolean(studentId && studentId.trim() !== '');

    let appRes: any = await supabase
      .from('applications')
      .select(`
        id,
        student_id,
        university_id,
        university_name,
        program_name,
        course,
        intake,
        tuition_fee,
        course_fee,
        status,
        notes,
        offer_letter_url,
        final_acceptance_url,
        applied_date,
        created_at,
        updated_at,
        users:student_id ( id, full_name, email ),
        universities:university_id ( id, name, country, city )
      `)
      .order('created_at', { ascending: false });

    // If detailed join failed (e.g. relation name variance), fallback to select *
    if (appRes.error) {
      console.warn('[getApplications detailed select notice]:', appRes.error.message);
      appRes = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
    }

    // Parallel fetch offer letters, final acceptances, and registered users
    const [offerRes, finalRes, allUsersRes] = await Promise.all([
      supabase.from('offer_letters').select('id, student_id, application_id, offer_letter_url, file_url, url').catch(() => ({ data: null })),
      supabase.from('final_acceptance').select('id, student_id, application_id, final_acceptance_url, file_url, url').catch(() => ({ data: null })),
      supabase.from('users').select('id, full_name, email').catch(() => ({ data: null })),
    ]);

    const rawList = (appRes.data ?? []) as any[];
    const offerLetters = (offerRes as any)?.data as any[] | null;
    const finalAcceptances = (finalRes as any)?.data as any[] | null;
    const allUsers = (allUsersRes as any)?.data as any[] | null;
    const userMap = new Map<string, { full_name?: string; email?: string }>();
    if (allUsers && Array.isArray(allUsers)) {
      for (const u of allUsers) {
        if (u.id) userMap.set(u.id, u);
      }
    }

    const dbApps: Application[] = rawList.map(app => {
      const u = app.users || userMap.get(app.student_id);
      const studentName = u?.full_name || u?.email?.split('@')[0] || (app as any).student_name || 'Student';

      let updatedApp: Application = {
        ...app,
        student_name: studentName,
        course: app.course || app.program_name || 'Higher Studies',
        program_name: app.program_name || app.course || 'Higher Studies',
        intake: app.intake || 'October 2026',
        university_name: (app.university_name && app.university_name !== 'Pending University Selection')
          ? app.university_name
          : (app.universities?.name || 'University Applied For'),
      };

      // 1. Cross-sync Offer Letter URL
      const matchOffer = offerLetters?.find((o: any) =>
        Boolean(o.application_id) && String(o.application_id) === String(app.id)
      );
      const foundOfferUrl = matchOffer?.offer_letter_url || matchOffer?.file_url || matchOffer?.url;
      if (foundOfferUrl) {
        updatedApp.offer_letter_url = foundOfferUrl;
      }

      // 2. Cross-sync Final Acceptance Certificate URL
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

    // Background sync any local-only applications up to Supabase
    const unsyncedLocal = local.filter(a => !dbIds.has(a.id));
    if (unsyncedLocal.length > 0) {
      syncAppsToSupabase(unsyncedLocal);
    }

    if (isStudentCall && studentId) {
      const filtered = merged.filter(a =>
        a.student_id === studentId ||
        !isValidUuid(studentId)
      );
      return filtered.length > 0 ? filtered : merged;
    }

    return merged;
  } catch (err: any) {
    console.warn('[getApplications Error, falling back to local cache]:', err);
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
    const now = new Date().toISOString();
    const appObj: Application = {
      id: newId,
      student_id: studentId,
      student_name: studentName,
      university_id: '',
      university_name: 'Pending University Selection',
      program_name: 'Pending Course Selection',
      course: 'Pending Course Selection',
      intake: 'October 2026',
      status: 'NAWA Review',
      notes: 'Auto-enrolled on document submission. Awaiting NAWA apostille & legalization audit.',
      applied_date: now.split('T')[0],
      created_at: now,
      updated_at: now,
    };

    const local = getLocalApplications();
    local.unshift(appObj);
    saveLocalApplications(local);

    if (isValidUuid(studentId)) {
      await supabase.from('users').upsert({
        id: studentId,
        email: `${studentId}@student.ferex.com`,
        full_name: studentName,
        role: 'student'
      }, { onConflict: 'id' }).catch(() => {});

      await supabase.from('applications').insert({
        id: newId,
        student_id: studentId,
        university_id: null,
        university_name: 'Pending University Selection',
        program_name: 'Pending Course Selection',
        course: 'Pending Course Selection',
        intake: 'October 2026',
        status: 'NAWA Review',
        notes: 'Auto-enrolled on document submission.',
        applied_date: now.split('T')[0],
        created_at: now,
        updated_at: now,
      }).catch(() => {});
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
  const feeVal = payload.tuition_fee || payload.course_fee || '';

  // Get authenticated Supabase user context
  let authUserId = payload.student_id;
  let authUserEmail = '';
  let authUserName = payload.student_name || 'Student';

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      authUserId = authData.user.id;
      authUserEmail = authData.user.email || '';
      authUserName = payload.student_name || authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'Student';
    }
  } catch (e) {}

  const targetStudentId = authUserId || (isValidUuid(payload.student_id) ? payload.student_id! : generateUUID());

  // Guarantee student row exists in public.users so foreign key constraint is satisfied
  if (targetStudentId && isValidUuid(targetStudentId)) {
    try {
      await supabase.from('users').upsert({
        id: targetStudentId,
        email: authUserEmail || `${targetStudentId}@student.ferex.com`,
        full_name: authUserName,
        role: 'student',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[ensure user row in public.users]:', e);
    }
  }

  const targetId = newId;
  const now = new Date().toISOString();
  const isUniUuid = isValidUuid(payload.university_id);

  const appRecord: Application = {
    id: targetId,
    student_id: targetStudentId,
    student_name: authUserName,
    university_id: payload.university_id || '',
    university_name: univName,
    program_name: progName,
    course: progName,
    intake: intakeVal,
    status: 'Submitted',
    notes: `Application submitted for ${progName} at ${univName}. Student: ${authUserName}`,
    applied_date: now.split('T')[0],
    created_at: now,
    updated_at: now,
    tuition_fee: feeVal,
    course_fee: feeVal,
  };

  // 1. Immediately store to LocalStorage
  const local = getLocalApplications();
  const existingIdx = local.findIndex(a =>
    a.student_id === targetStudentId &&
    (a.university_id === payload.university_id || a.university_name === univName)
  );
  if (existingIdx >= 0) {
    local[existingIdx] = { ...local[existingIdx], ...appRecord };
  } else {
    local.unshift(appRecord);
  }
  saveLocalApplications(local);

  // 2. Insert into Supabase (strictly schema-compliant without unknown columns)
  try {
    const savePayload: any = {
      id: targetId,
      student_id: targetStudentId,
      university_id: isUniUuid ? payload.university_id : null,
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
    if (feeVal) {
      savePayload.tuition_fee = String(feeVal);
      savePayload.course_fee = String(feeVal);
    }

    let { data: dbData, error } = await supabase.from('applications').insert(savePayload).select();

    // If foreign key on university_id fails, retry with null
    if (error && (error.message.includes('university') || error.message.includes('foreign key'))) {
      savePayload.university_id = null;
      const retry = await supabase.from('applications').insert(savePayload).select();
      dbData = retry.data;
      error = retry.error;
    }

    if (!error && dbData && dbData.length > 0) {
      console.log('✅ [createApplication]: Application successfully saved to Supabase');
    } else if (error) {
      console.error('❌ [createApplication Supabase Error]:', error.message, error.details);
    }
  } catch (err: any) {
    console.warn('[createApplication Supabase Notice]:', err);
  }

  // 3. Log Activity & Notify
  try {
    await logActivity('APPLICATION_SUBMITTED', 'application', targetId, {
      university: univName,
      program: progName,
      student: authUserName,
    });
  } catch {}

  window.dispatchEvent(new Event('ferex_application_change'));
  return appRecord;
}

// ─── Upload Offer Letter PDF file/blob to Supabase Storage with permanent Data URL fallback ───
export async function uploadOfferPdfToSupabase(fileOrBlob: File | Blob, _originalFilename?: string): Promise<string> {
  try {
    const { uploadFileToBucket } = await import('../storage');
    const res = await uploadFileToBucket('offer-letters', fileOrBlob, 'offer_letter');
    if (res.url && !res.url.startsWith('blob:')) {
      return res.url;
    }
  } catch (err) {
    console.warn('[uploadOfferPdfToSupabase Notice]:', err);
  }

  // Convert to permanent base64 Data URL so it is never a broken or revoked blob URL
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

    const { error } = await supabase.from('applications').update(cleanPayload).eq('id', id);
    if (error) {
      console.warn('[updateApplicationStatus DB notice]:', error.message);
    }
  } catch (e) {
    console.warn('[updateApplicationStatus notice]:', e);
  }

  // 3. If offerLetterUrl is provided, cross-record to offer_letters table
  if (offerLetterUrl && isValidUuid(id)) {
    try {
      const match = updatedLocal.find(a => a.id === id);
      if (match?.student_id && isValidUuid(match.student_id)) {
        await supabase.from('offer_letters').upsert({
          id: generateUUID(),
          student_id: match.student_id,
          application_id: id,
          offer_letter_url: offerLetterUrl,
          file_url: offerLetterUrl,
          status: 'Issued',
          created_at: now
        }).catch(() => {});
      }
    } catch (e) {}
  }

  // 4. If finalAcceptanceUrl is provided, cross-record to final_acceptance table
  if (finalAcceptanceUrl && isValidUuid(id)) {
    try {
      const match = updatedLocal.find(a => a.id === id);
      if (match?.student_id && isValidUuid(match.student_id)) {
        await supabase.from('final_acceptance').upsert({
          id: generateUUID(),
          student_id: match.student_id,
          application_id: id,
          final_acceptance_url: finalAcceptanceUrl,
          file_url: finalAcceptanceUrl,
          status: 'Issued',
          created_at: now
        }).catch(() => {});
      }
    } catch (e) {}
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
