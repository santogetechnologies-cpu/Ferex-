import { provisionAccount } from './provisionAccount';
import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { UserProfile } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

export const DEFAULT_COUNSELOR_ROSTER = [
  { id: 'c-1', name: 'Admissions Officer', role: 'European Admissions Lead', desk: 'Admissions Desk', email: 'info@ferexventures.com', country: 'Global' },
];

const DELETED_STUDENTS_KEY = 'ferex_deleted_student_ids';
const DELETED_STUDENT_EMAILS_KEY = 'ferex_deleted_student_emails';

export function getDeletedStudentIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_STUDENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getDeletedStudentEmails(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_STUDENT_EMAILS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isStudentDeleted(id?: string | null, email?: string | null): boolean {
  if (!id && !email) return false;
  const deletedIds = new Set(getDeletedStudentIds());
  if (id && deletedIds.has(id)) return true;
  const deletedEmails = new Set(getDeletedStudentEmails().map((e) => e.toLowerCase()));
  if (email && deletedEmails.has(email.toLowerCase().trim())) return true;
  return false;
}

export function markStudentDeleted(id?: string | null, email?: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (id) {
      const ids = Array.from(new Set([...getDeletedStudentIds(), id]));
      localStorage.setItem(DELETED_STUDENTS_KEY, JSON.stringify(ids));
    }
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail) {
        const emails = Array.from(new Set([...getDeletedStudentEmails(), cleanEmail]));
        localStorage.setItem(DELETED_STUDENT_EMAILS_KEY, JSON.stringify(emails));
      }
    }
  } catch {}
}

export function unmarkStudentDeleted(id?: string | null, email?: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (id) {
      const ids = getDeletedStudentIds().filter((i) => i !== id);
      localStorage.setItem(DELETED_STUDENTS_KEY, JSON.stringify(ids));
    }
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const emails = getDeletedStudentEmails().filter((e) => e.toLowerCase() !== cleanEmail);
      localStorage.setItem(DELETED_STUDENT_EMAILS_KEY, JSON.stringify(emails));
    }
  } catch {}
}

export function getDefaultCounselorForCountry(country?: string): string {
  if (!country || country === 'All') return 'Admissions Counselor (Global Desk)';
  return `Admissions Counselor (${country} Desk)`;
}

// ─── Get all students (users with role = 'student' + enrolled CRM leads) ──────
export async function getStudents(): Promise<UserProfile[]> {
  let userStudents: UserProfile[] = [];

  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data, error } = await client
      .from('users')
      .select('id, email, full_name, role, avatar_url, phone, country, target_country, destination_country, department, permissions, assigned_counselor, status, is_active, must_change_password, created_at, updated_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      userStudents = data as UserProfile[];
    }
  } catch (err) {
    console.warn('[getStudents DB warning]:', err);
  }

  if (userStudents.length === 0) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, avatar_url, phone, country, target_country, destination_country, department, permissions, assigned_counselor, status, is_active, must_change_password, created_at, updated_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (!error && data) {
        userStudents = data as UserProfile[];
      }
    } catch {}
  }

  // Filter out any records that are marked deleted or have status = 'deleted'
  userStudents = userStudents.filter(
    (u) => (u as any).status !== 'deleted' && !isStudentDeleted(u.id, u.email)
  );

  // ─── Dual-source Roster Federation: Enrolled CRM Leads ───
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data: enrolledLeads, error: leadsErr } = await client
      .from('education_leads')
      .select('*')
      .eq('status', 'Enrolled');

    if (!leadsErr && Array.isArray(enrolledLeads)) {
      const existingUserIds = new Set(userStudents.map((s) => s.id));
      const existingEmails = new Set(
        userStudents
          .map((s) => (s.email || '').toLowerCase().trim())
          .filter(Boolean)
      );
      const existingPhones = new Set(
        userStudents
          .map((s) => (s.phone || '').replace(/[^\d]/g, ''))
          .filter(Boolean)
      );

      for (const lead of enrolledLeads) {
        const leadEmail = (lead.email || '').toLowerCase().trim();
        const leadPhone = (lead.phone || '').replace(/[^\d]/g, '');

        // If lead or converted student is deleted or archived, do NOT synthesize
        if (
          lead.status === 'Archived' ||
          isStudentDeleted(lead.converted_student_id, leadEmail) ||
          isStudentDeleted(lead.id, leadEmail)
        ) {
          continue;
        }

        const alreadyExists =
          (lead.converted_student_id && existingUserIds.has(lead.converted_student_id)) ||
          existingUserIds.has(lead.id) ||
          (leadEmail && existingEmails.has(leadEmail)) ||
          (leadPhone && leadPhone.length >= 7 && existingPhones.has(leadPhone));

        if (!alreadyExists) {
          const studentId = lead.converted_student_id || lead.id;
          const fallbackEmail =
            leadEmail ||
            `student.${leadPhone.slice(-6) || lead.id.slice(0, 6)}@ferexstudent.org`;

          const destCountry = lead.preferred_country || 'Poland';
          const synthesizedStudent: UserProfile = {
            id: studentId,
            email: fallbackEmail,
            full_name: lead.name || 'Admitted Student',
            role: 'student',
            avatar_url: undefined,
            phone: lead.phone || '',
            country: destCountry,
            target_country: destCountry,
            destination_country: destCountry,
            department: 'Education',
            permissions: [],
            assigned_counselor: lead.assigned_counselor_name || 'Admissions Counselor',
            created_at: lead.created_at || new Date().toISOString(),
          };
          userStudents.push(synthesizedStudent);
          existingUserIds.add(studentId);
          if (leadEmail) existingEmails.add(leadEmail);
          if (leadPhone && leadPhone.length >= 7) existingPhones.add(leadPhone);

          // Asynchronously reconcile into public.users and public.applications
          reconcileEnrolledLeadUser(lead).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[getStudents leads federation warning]:', err);
  }

  // Final strict deduplication across IDs and normalized emails
  const uniqueStudents: UserProfile[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  for (const s of userStudents) {
    const normEmail = (s.email || '').toLowerCase().trim();
    if (seenIds.has(s.id)) continue;
    if (normEmail && seenEmails.has(normEmail)) continue;

    seenIds.add(s.id);
    if (normEmail) seenEmails.add(normEmail);
    uniqueStudents.push(s);
  }

  return uniqueStudents;
}

async function reconcileEnrolledLeadUser(lead: any) {
  try {
    const studentId = lead.converted_student_id || lead.id;
    const studentEmail =
      lead.email && lead.email.includes('@')
        ? lead.email.trim().toLowerCase()
        : `student.${(lead.phone || '').replace(/[^\d]/g, '').slice(-6) || lead.id.slice(0, 6)}@ferexstudent.org`;

    // Guard: Never reconcile if deleted or archived
    if (isStudentDeleted(studentId, studentEmail) || lead.status === 'Archived') {
      return;
    }

    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const destCountry = lead.preferred_country || 'Poland';

    // 1. Ensure user row in public.users
    await client
      .from('users')
      .upsert(
        {
          id: studentId,
          email: studentEmail,
          full_name: lead.name || 'Admitted Student',
          role: 'student',
          phone: lead.phone || '',
          country: destCountry,
          target_country: destCountry,
          destination_country: destCountry,
          department: 'Education',
          assigned_counselor: lead.assigned_counselor_name || 'Admissions Counselor',
          must_change_password: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    // 2. Ensure application record in public.applications
    const { data: existingApp } = await client
      .from('applications')
      .select('id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (!existingApp) {
      await client.from('applications').insert({
        student_id: studentId,
        student_name: lead.name || 'Admitted Student',
        student_email: studentEmail,
        university_name: 'Pending University Selection',
        program_name: lead.degree_level
          ? `${lead.degree_level} Degree`
          : 'Undergraduate / Postgraduate Program',
        country: destCountry,
        counselor: lead.assigned_counselor_name || 'Admissions Counselor',
        status: 'Enrolled',
        stage: 'Stage 1: Profile & Target Selection',
        intake: 'Upcoming Intake 2026',
        created_at: lead.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 3. Mark converted_student_id on the lead if missing
    if (!lead.converted_student_id) {
      await client
        .from('education_leads')
        .update({ converted_student_id: studentId, updated_at: new Date().toISOString() })
        .eq('id', lead.id);
    }
  } catch (err) {
    console.warn('[reconcileEnrolledLeadUser warning]:', err);
  }
}

export const ADMINISTRATIVE_ROLES = ['admin', 'central', 'super_admin', 'staff', 'counselor', 'education_admin', 'education'] as const;

export async function getStaffMembers(): Promise<UserProfile[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data, error } = await client
      .from('users')
      .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
      .in('role', ['admin', 'central', 'super_admin', 'education_admin', 'education', 'staff', 'counselor'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as UserProfile[];
    }
  } catch {}

  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
    .in('role', ['admin', 'central', 'super_admin', 'education_admin', 'education', 'staff', 'counselor'])
    .order('created_at', { ascending: false });

  if (!error && data) {
    return data as UserProfile[];
  }

  return [];
}

export async function assignCounselorToStudent(studentId: string, counselorName: string): Promise<UserProfile | null> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data, error } = await client
    .from('users')
    .update({ assigned_counselor: counselorName, updated_at: new Date().toISOString() })
    .eq('id', studentId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to assign counselor: ${error.message}`);
  }

  // Send student notification
  createNotification({
    user_id: studentId,
    title: 'Admissions Counselor Assigned',
    body: `Your dedicated file counselor has been updated to ${counselorName}. You can schedule one-on-one sessions and chat anytime.`,
    category: 'Counselor'
  }).catch(() => {});

  window.dispatchEvent(new Event('ferex_students_change'));
  window.dispatchEvent(new Event('ferex_student_profile_change'));

  return (data as UserProfile) || null;
}

export async function getAdminUsers(): Promise<UserProfile[]> {
  return getStaffMembers();
}

export async function getAdminUsersCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'central', 'super_admin', 'staff', 'counselor', 'education_admin', 'education']);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ─── Get single student ───────────────────────────────────────────────────────
export async function getStudentById(id: string): Promise<UserProfile> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as UserProfile;
}

// ─── Create a new student profile in public.users ─────────────────────────────
export async function createStudent(payload: {
  email: string;
  full_name: string;
  phone?: string;
  assigned_counselor?: string;
  target_country?: string;
  destination_country?: string;
  country?: string;
}): Promise<UserProfile> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const chosenCountry = payload.target_country || payload.destination_country || payload.country || 'Poland';

  // Clear any tombstone records so new user can be registered cleanly
  unmarkStudentDeleted(undefined, cleanEmail);

  const student = await provisionAccount({
    ...payload,
    email: cleanEmail,
    country: chosenCountry,
    role: 'student',
  });

  if (student?.id) {
    unmarkStudentDeleted(student.id, cleanEmail);
    try {
      const admin = await getAdminSupabaseClient();
      const client = admin || supabase;
      await client.from('users').update({
        target_country: chosenCountry,
        destination_country: chosenCountry,
        country: chosenCountry,
        status: 'active',
        is_active: true,
      }).eq('id', student.id);
    } catch {}
  }

  return student;
}

// ─── Create a new staff member profile in public.users & credentials ──────────
export async function createStaffMember(payload: {
  email: string;
  full_name: string;
  role: string;
  password?: string;
  phone?: string;
  department?: string;
  desk?: string;
  permissions?: { label: string; enabled: boolean }[];
}): Promise<UserProfile> {
  const department = payload.desk ? `${payload.department || 'Admissions'}:${payload.desk}` : payload.department || 'Admissions';
  return provisionAccount({ email: payload.email.trim(), full_name: payload.full_name.trim(), role: payload.role, password: payload.password, department, phone: payload.phone, permissions: payload.permissions });
}

// ─── Update student profile fields ────────────────────────────────────────────
export async function updateStudent(id: string, updates: Partial<UserProfile> & { target_country?: string; destination_country?: string }): Promise<UserProfile> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const destCountry = updates.target_country || updates.destination_country || updates.country;
  if (destCountry && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`ferex_student_target_country_${id}`, destCountry);
      localStorage.setItem(`ferex_student_country_${id}`, destCountry);
    } catch {}
  }

  const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
  if (destCountry) {
    dbUpdates.country = destCountry;
    dbUpdates.target_country = destCountry;
    dbUpdates.destination_country = destCountry;
  }

  const { data, error } = await client
    .from('users')
    .update(dbUpdates)
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    throw new Error(`Failed to update student profile: ${error?.message || 'Database error'}`);
  }

  // Synchronize applications table
  try {
    const appUpdates: any = { updated_at: new Date().toISOString() };
    if (destCountry) appUpdates.country = destCountry;
    if (updates.assigned_counselor) appUpdates.counselor = updates.assigned_counselor;
    if (updates.full_name) appUpdates.student_name = updates.full_name;

    if (Object.keys(appUpdates).length > 1) {
      await client.from('applications').update(appUpdates).eq('student_id', id);
    }
  } catch (appErr) {
    console.warn('[updateStudent app sync warning]:', appErr);
  }

  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));
  window.dispatchEvent(new Event('ferex_student_profile_change'));
  window.dispatchEvent(new Event('ferex_applications_change'));

  return data[0] as UserProfile;
}

// ─── Delete student (permanently removes from public.users & all related tables) ───
export async function deleteStudent(id: string, optionalEmail?: string): Promise<void> {
  if (!id && !optionalEmail) return;
  const cleanId = (id || '').trim();
  const cleanEmail = (optionalEmail || '').toLowerCase().trim();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  const targetUserId = isUuid ? cleanId : undefined;

  // 1. Mark in client deleted cache early to immediately hide from UI and prevent resurrection
  markStudentDeleted(cleanId, cleanEmail);

  let executionError: Error | null = null;
  let successConfirmed = false;

  // 2. Try Secure Database RPC function: delete_user_by_admin
  try {
    const { data, error } = await supabase.rpc('delete_user_by_admin', {
      target_user_id: targetUserId || null,
      target_email: cleanEmail || null,
    });

    if (error) {
      executionError = new Error(error.message);
    } else if (data && data.success) {
      successConfirmed = true;
      executionError = null;
    }
  } catch (err: any) {
    executionError = err;
  }

  // 3. Fallback: Call delete-user Edge Function (has service-role Supabase Admin access)
  if (!successConfirmed) {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: targetUserId, email: cleanEmail },
      });

      if (!error && data?.success) {
        successConfirmed = true;
        executionError = null;
      } else if (error) {
        let msg = error.message;
        try {
          const body = await error.context?.json();
          if (body?.error) msg = body.error;
        } catch {}
        if (!executionError) executionError = new Error(msg || 'Edge function delete failed');
      }
    } catch (err: any) {
      if (!executionError) executionError = err;
    }
  }

  // 4. Fallback: Direct RLS delete on public.users and related tables
  if (!successConfirmed) {
    try {
      const admin = await getAdminSupabaseClient();
      const client = admin || supabase;

      // Unlink and archive any matching education_leads
      if (cleanId || cleanEmail) {
        let leadsQuery = client.from('education_leads').update({
          status: 'Archived',
          converted_student_id: null,
          updated_at: new Date().toISOString(),
        });
        if (cleanId) leadsQuery = leadsQuery.eq('converted_student_id', cleanId);
        else if (cleanEmail) leadsQuery = leadsQuery.ilike('email', cleanEmail);
        await leadsQuery;
      }

      // Delete student records defensively
      if (cleanId) {
        await Promise.allSettled([
          client.from('applications').delete().eq('student_id', cleanId),
          client.from('education_service_agreements').delete().eq('student_id', cleanId),
          client.from('student_documents').delete().eq('student_id', cleanId),
          client.from('student_payments').delete().eq('student_id', cleanId),
          client.from('tasks').delete().eq('student_id', cleanId),
          client.from('support_tickets').delete().eq('student_id', cleanId),
        ]);
      }

      // Delete row from public.users
      let userQuery = client.from('users').delete();
      if (targetUserId) {
        userQuery = userQuery.eq('id', targetUserId);
      } else if (cleanEmail) {
        userQuery = userQuery.ilike('email', cleanEmail);
      } else {
        userQuery = userQuery.eq('id', cleanId);
      }

      const { error } = await userQuery;
      if (!error) {
        successConfirmed = true;
        executionError = null;
      } else if (!executionError) {
        executionError = new Error(error.message);
      }
    } catch (err: any) {
      if (!executionError) executionError = err;
    }
  }

  // If all attempts failed, rollback client cache and throw actual error
  if (!successConfirmed && executionError) {
    unmarkStudentDeleted(cleanId, cleanEmail);
    throw executionError;
  }

  // Remove student-specific localStorage keys
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(`ferex_student_target_country_${cleanId}`);
      localStorage.removeItem(`ferex_student_country_${cleanId}`);
      localStorage.removeItem(`ferex_agreement_${cleanId}`);
      localStorage.removeItem(`ferex_agreement_sig_${cleanId}`);
      localStorage.removeItem(`ferex_journey_${cleanId}`);
    } catch {}
  }

  // Broadcast change events across tabs and components
  window.dispatchEvent(new Event('ferex_students_change'));
  window.dispatchEvent(new Event('ferex_education_leads_change'));
  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_payment_change'));
  window.dispatchEvent(new Event('ferex_document_change'));
  window.dispatchEvent(new Event('ferex_tasks_change'));
  window.dispatchEvent(new Event('ferex_applications_change'));
  window.dispatchEvent(new Event('ferex_agreement_change'));
}

// ─── Get student count stats ──────────────────────────────────────────────────
export async function getStudentStats(): Promise<{ total: number }> {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  return { total: error ? 0 : (count ?? 0) };
}

export interface StudentOversightItem {
  id: string;
  displayId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  targetUni: string;
  course: string;
  stage: string;
  stageBadge: string;
  paymentStatus: string;
  paymentBadge: string;
  totalPaid: number;
  docStatus: string;
  docBadge: string;
  docCount: number;
  counselor: string;
  joined: string;
}

export async function getStudentsConsolidatedOversight(): Promise<StudentOversightItem[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    // Fetch students, applications, payments, and documents concurrently
    const [studentsRes, appsRes, payRes, docsRes] = await Promise.all([
      client.from('users').select('*').eq('role', 'student').order('created_at', { ascending: false }),
      client.from('applications').select('*'),
      client.from('payments').select('id, user_id, student_id, amount, status, purpose'),
      client.from('student_documents').select('id, student_id, status, doc_type'),
    ]);

    const rawStudents = studentsRes.data || [];
    const students = rawStudents.filter((s: any) => s.status !== 'deleted' && !isStudentDeleted(s.id, s.email));
    const apps = appsRes.data || [];
    const payments = payRes.data || [];
    const docs = docsRes.data || [];

    return students.map((s: any) => {
      const studentApps = apps.filter((a: any) => a.student_id === s.id || a.user_id === s.id);
      const studentPayments = payments.filter((p: any) => p.student_id === s.id || p.user_id === s.id);
      const studentDocs = docs.filter((d: any) => d.student_id === s.id);

      // 1. Target University & Course
      const primaryApp = studentApps[0];
      const targetUni = primaryApp?.university_name || primaryApp?.university || 'University Application Pending';
      const course = primaryApp?.course_name || primaryApp?.program_name || primaryApp?.program || 'Direct Enrollment';

      // 2. Journey Stage
      let stage = 'Profile Setup';
      let stageBadge = 'bg-slate-100 text-slate-700 border-slate-200';
      if (primaryApp?.status) {
        const st = primaryApp.status.toLowerCase();
        if (st.includes('enroll') || st.includes('admit') || st.includes('accept')) {
          stage = 'Enrolled & Verified';
          stageBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (st.includes('visa')) {
          stage = 'Visa Processing';
          stageBadge = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (st.includes('legal') || st.includes('nawa')) {
          stage = 'NAWA Legalization';
          stageBadge = 'bg-purple-50 text-purple-700 border-purple-200';
        } else if (st.includes('offer')) {
          stage = 'Offer Letter Received';
          stageBadge = 'bg-amber-50 text-amber-700 border-amber-200';
        } else if (st.includes('submit') || st.includes('review')) {
          stage = 'Application Submitted';
          stageBadge = 'bg-rose-50 text-rose-700 border-rose-200';
        } else {
          stage = primaryApp.status;
          stageBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        }
      }

      // 3. Payment Status
      const paidTxns = studentPayments.filter((p: any) => p.status === 'Paid' || p.status === 'Verified');
      const totalPaid = paidTxns.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      let paymentStatus = 'Pending Settlement';
      let paymentBadge = 'bg-amber-50 text-amber-700 border-amber-200';
      if (totalPaid > 0) {
        paymentStatus = `Paid (₹${totalPaid.toLocaleString('en-IN')})`;
        paymentBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else if (studentPayments.length === 0) {
        paymentStatus = 'No Invoices';
        paymentBadge = 'bg-slate-100 text-slate-600 border-slate-200';
      }

      // 4. Document Status
      const verifiedDocs = studentDocs.filter((d: any) => d.status === 'Verified' || d.status === 'Approved');
      const docCount = studentDocs.length;
      let docStatus = '0 Docs';
      let docBadge = 'bg-slate-100 text-slate-600 border-slate-200';
      if (docCount > 0) {
        if (verifiedDocs.length === docCount) {
          docStatus = `Approved (${verifiedDocs.length}/${docCount})`;
          docBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else {
          docStatus = `In Audit (${verifiedDocs.length}/${docCount})`;
          docBadge = 'bg-blue-50 text-blue-700 border-blue-200';
        }
      }

      return {
        id: s.id,
        displayId: `FX-${s.id.slice(0, 6).toUpperCase()}`,
        name: s.full_name || s.email.split('@')[0],
        email: s.email,
        phone: s.phone || '—',
        country: s.department || 'India',
        targetUni,
        course,
        stage,
        stageBadge,
        paymentStatus,
        paymentBadge,
        totalPaid,
        docStatus,
        docBadge,
        docCount,
        counselor: s.assigned_counselor || 'Unassigned',
        joined: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Active',
      };
    });
  } catch (err) {
    console.warn('[getStudentsConsolidatedOversight error]:', err);
    return [];
  }
}

export async function reassignStudentCounselor(studentId: string, counselorName: string): Promise<boolean> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client
    .from('users')
    .update({
      assigned_counselor: counselorName,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId);

  if (error) {
    throw new Error(`Failed to reassign counselor: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_students_change'));
  window.dispatchEvent(new Event('ferex_student_profile_change'));
  return true;
}
