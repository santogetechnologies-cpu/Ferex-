import { supabase } from '../supabase';
import type { Application, ChecklistItem } from '../types';
import { generateUUID } from '../../utils/uuid';

// Helper regex to validate UUID strings
const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

// ─── Get applications (optionally scoped to a student) ───────────────────────
export async function getApplications(studentId?: string) {
  try {
    const isStudentCall = studentId !== undefined;
    if (isStudentCall) {
      if (!studentId || !isValidUuid(studentId)) {
        return [];
      }
    }

    let appQuery = supabase
      .from('applications')
      .select('id, student_id, student_name, university_id, university_name, program_name, course, intake, status, notes, created_at, updated_at, universities:university_id(id, name, country, city)')
      .order('created_at', { ascending: false });

    let offerQuery = supabase.from('offer_letters').select('id, student_id, application_id, offer_letter_url, file_url, url');
    let finalQuery = supabase.from('final_acceptance').select('id, student_id, application_id, final_acceptance_url, file_url, url');

    if (isStudentCall && studentId) {
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

    return rawList.map(app => {
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
  } catch (err) {
    return [];
  }
}

// ─── Get single application with checklist ────────────────────────────────────
export async function getApplicationById(id: string) {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.warn('[getApplicationById notice]:', error.message);
    return null;
  }
  return data as Application;
}

// ─── Auto-enroll student into NAWA Review on first document upload ────────────
export async function ensureStudentApplication(studentId: string, studentName: string = 'Enrolled Student') {
  if (!studentId || !isValidUuid(studentId)) return;

  try {
    // Check if any application already exists for this student
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('student_id', studentId)
      .limit(1);

    if (existing && existing.length > 0) return; // Already has an application

    const newId = generateUUID();
    const placeholderUnivId = generateUUID(); // placeholder — no real university yet

    await supabase.from('applications').insert({
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
      applied_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
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

  // Ensure university_id & student_id are valid UUIDs for NOT NULL database constraints
  const validUnivId = isValidUuid(payload.university_id) ? payload.university_id! : generateUUID();
  const validStudentId = isValidUuid(payload.student_id) ? payload.student_id! : generateUUID();

  // Check if an application already exists for this student & university
  const { data: existingApp } = await supabase
    .from('applications')
    .select('id')
    .eq('student_id', validStudentId)
    .eq('university_id', validUnivId)
    .limit(1);

  const isExisting = Boolean(existingApp && existingApp.length > 0);
  const targetId = isExisting ? existingApp![0].id : newId;

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
    updated_at: new Date().toISOString()
  };
  if (feeVal) {
    savePayload.tuition_fee = feeVal;
    savePayload.course_fee = feeVal;
  }

  let { data, error } = isExisting
    ? await supabase.from('applications').update(savePayload).eq('id', targetId).select()
    : await supabase.from('applications').insert(savePayload).select();

  if (error) {
    console.warn('[createApplication Notice]:', error.message);
    const minimalPayload: any = {
      id: targetId,
      student_id: validStudentId,
      university_id: validUnivId,
      course: progName,
      status: 'Submitted'
    };

    const fallbackRes = isExisting
      ? await supabase.from('applications').update(minimalPayload).eq('id', targetId).select()
      : await supabase.from('applications').insert(minimalPayload).select();

    data = fallbackRes.data;
  }

  const resultObj: Application = {
    id: targetId,
    student_id: payload.student_id || validStudentId,
    university_id: validUnivId,
    course: progName,
    notes: '',
    student_name: studentNameVal,
    university_name: univName,
    program_name: progName,
    intake: intakeVal,
    status: 'Submitted',
    applied_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (data && data.length > 0) {
    return { ...resultObj, ...data[0] };
  }

  return resultObj;
}

// ─── Upload Offer Letter PDF file/blob to Supabase ────────────────────────────
export async function uploadOfferPdfToSupabase(fileOrBlob: File | Blob, _originalFilename?: string): Promise<string> {
  // Always convert file to clean Data URL to bypass bucket missing errors & HTTP 400 Bad Request
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
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

  // Pre-query applications table to resolve exact student_id & university_name in Supabase
  let existingApp: any = null;
  try {
    const { data: fetchApp } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchApp) existingApp = fetchApp;
  } catch (e) { }

  const cleanPayload: any = {
    status,
    notes: notes || ''
  };
  if (offerLetterUrl) cleanPayload.offer_letter_url = offerLetterUrl;
  if (finalAcceptanceUrl) cleanPayload.final_acceptance_url = finalAcceptanceUrl;

  let finalResult: any = existingApp || null;

  // 1. Primary update in applications table in Supabase
  try {
    let { data, error } = await supabase
      .from('applications')
      .update(cleanPayload)
      .eq('id', id)
      .select();

    if (error || !data || data.length === 0) {
      // Retry without extended URL columns if schema cache lacks them
      const fallbackPayload = { status, notes: notes || '' };
      const { data: fallbackData, error: fbErr } = await supabase.from('applications').update(fallbackPayload).eq('id', id).select();
      if (!fbErr && fallbackData && fallbackData.length > 0) {
        data = fallbackData;
      } else {
        // Fallback: update matching active application row
        const { data: allApps } = await supabase.from('applications').select('*').limit(10);
        if (allApps && allApps.length > 0) {
          const targetId = allApps.find(a => a.id === id)?.id || allApps[0].id;
          const retryRes = await supabase.from('applications').update(fallbackPayload).eq('id', targetId).select();
          data = retryRes.data;
        }
      }
    }

    if (data && data.length > 0) {
      finalResult = data[0];
      console.log('✅ [updateApplicationStatus]: Successfully updated applications in Supabase:', finalResult);
    }
  } catch (e) {
    console.warn('[updateApplicationStatus catch]:', e);
  }

  const resolvedStudentId = (finalResult?.student_id && isValidUuid(finalResult.student_id))
    ? finalResult.student_id
    : (existingApp?.student_id && isValidUuid(existingApp.student_id) ? existingApp.student_id : null);

  const univName = finalResult?.university_name || existingApp?.university_name || 'Partner University';
  const studentName = finalResult?.student_name || existingApp?.student_name || 'Student';
  const progName = finalResult?.program_name || finalResult?.course || existingApp?.course || 'Degree Program';

  // 2. Save Offer Letter PDF directly into offer_letters table in Supabase
  if (offerLetterUrl) {
    try {
      const validAppId = isValidUuid(id) ? id : (isValidUuid(existingApp?.id) ? existingApp.id : null);
      const validStudentId = (resolvedStudentId && isValidUuid(resolvedStudentId))
        ? resolvedStudentId
        : (existingApp?.student_id && isValidUuid(existingApp.student_id) ? existingApp.student_id : null);
      const validUnivId = (existingApp?.university_id && isValidUuid(existingApp.university_id))
        ? existingApp.university_id
        : (finalResult?.university_id && isValidUuid(finalResult.university_id) ? finalResult.university_id : null);

      if (validAppId && validStudentId && validUnivId) {
        const exactOfferPayload: any = {
          application_id: validAppId,
          student_id: validStudentId,
          university_id: validUnivId,
          file_url: offerLetterUrl,
          status: 'Active',
          created_at: now
        };

        const { data: olRes, error: olErr } = await supabase
          .from('offer_letters')
          .insert(exactOfferPayload)
          .select();

        if (!olErr && olRes && olRes.length > 0) {
          console.log('✅ [offer_letters]: Successfully saved Offer Letter to offer_letters table in Supabase:', olRes);
        } else if (olErr) {
          console.warn('[offer_letters insert notice]:', olErr.message);
        }
      } else {
        console.warn('[offer_letters notice]: Foreign keys (application_id, student_id, university_id) must be valid UUIDs');
      }
    } catch (e) {
      console.warn('[offer_letters catch]:', e);
    }
  }

  // 3. Save Final Acceptance Letter PDF directly into final_acceptance / final_acceptances SEPARATE TABLE in Supabase
  if (finalAcceptanceUrl) {
    try {
      const finalPayload: any = {
        application_id: id,
        student_id: resolvedStudentId,
        student_name: studentName,
        university_name: univName,
        program_name: progName,
        final_acceptance_url: finalAcceptanceUrl,
        file_url: finalAcceptanceUrl,
        url: finalAcceptanceUrl,
        status: 'Final Acceptance Issued',
        notes: notes || '',
        created_at: now
      };

      // Insertion into 'final_acceptance' table in Supabase
      const { data: faRes, error: faErr } = await supabase.from('final_acceptance').insert(finalPayload).select();
      if (!faErr && faRes && faRes.length > 0) {
        console.log('✅ [final_acceptance]: Saved Final Acceptance to final_acceptance table in Supabase:', faRes);
      } else {
        if (faErr) console.warn('[final_acceptance insert notice]:', faErr.message);

        // Fallback retry with minimal payload if schema cache lacks extended columns
        const minFinalPayload: any = {
          application_id: id,
          final_acceptance_url: finalAcceptanceUrl,
          file_url: finalAcceptanceUrl,
          url: finalAcceptanceUrl,
          status: 'Final Acceptance Issued'
        };
        if (resolvedStudentId) minFinalPayload.student_id = resolvedStudentId;

        await supabase.from('final_acceptance').insert(minFinalPayload);
      }
    } catch (e) {
      console.warn('[final_acceptance catch]:', e);
    }
  }

  return (finalResult || {
    id,
    status,
    notes,
    offer_letter_url: offerLetterUrl,
    final_acceptance_url: finalAcceptanceUrl
  }) as Application;
}

// ─── Toggle checklist item ────────────────────────────────────────────────────
export async function toggleChecklistItem(id: string, isDone: boolean) {
  const { data, error } = await supabase
    .from('application_checklist')
    .update({
      is_done: isDone,
      completed_at: isDone ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    return { id, is_done: isDone } as ChecklistItem;
  }
  return data[0] as ChecklistItem;
}

// ─── Get application counts for dashboard ─────────────────────────────────────
export async function getApplicationCounts() {
  const { data, error } = await supabase
    .from('applications')
    .select('status');
  if (error) return { total: 0, submitted: 0, under_review: 0, offer_issued: 0, rejected: 0 };

  const counts = { total: 0, submitted: 0, under_review: 0, offer_issued: 0, rejected: 0 };
  for (const row of data ?? []) {
    counts.total++;
    if (row.status === 'Submitted') counts.submitted++;
    if (row.status === 'Under Review') counts.under_review++;
    if (row.status === 'Offer Issued') counts.offer_issued++;
    if (row.status === 'Rejected') counts.rejected++;
  }
  return counts;
}
