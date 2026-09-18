import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { UserProfile } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

export const DEFAULT_COUNSELOR_ROSTER = [
  { id: 'c-1', name: 'Admissions Officer', role: 'European Admissions Lead', desk: 'Admissions Desk', email: 'info@ferexventures.com', country: 'Global' },
];

export function getDeletedStudentIds(): string[] {
  return [];
}

export function getDefaultCounselorForCountry(country?: string): string {
  if (!country || country === 'All') return 'Admissions Counselor (Global Desk)';
  return `Admissions Counselor (${country} Desk)`;
}

// ─── Get all students (users with role = 'student') ──────────────────────────
export async function getStudents(): Promise<UserProfile[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data, error } = await client
      .from('users')
      .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as UserProfile[];
    }
  } catch (err) {
    console.warn('[getStudents DB warning]:', err);
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (!error && data) {
    return data as UserProfile[];
  }

  return [];
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
}): Promise<UserProfile> {
  const newId = generateUUID();
  const insertData = {
    id: newId,
    email: payload.email.toLowerCase().trim(),
    full_name: payload.full_name.trim(),
    phone: payload.phone?.trim() || '',
    role: 'student',
    assigned_counselor: payload.assigned_counselor && payload.assigned_counselor !== 'Admin'
      ? payload.assigned_counselor
      : getDefaultCounselorForCountry(),
    must_change_password: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data, error } = await client
    .from('users')
    .insert(insertData)
    .select();

  if (error || !data || data.length === 0) {
    throw new Error(`Failed to create student: ${error?.message || 'Database error'}`);
  }

  window.dispatchEvent(new Event('ferex_students_change'));
  return data[0] as UserProfile;
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
  const newId = generateUUID();
  const cleanEmail = payload.email.trim().toLowerCase();
  const rawRole = (payload.role || 'counselor').toLowerCase().trim();
  const cleanRole = rawRole.replace(/\s+/g, '_');
  const cleanPassword = payload.password?.trim() || 'ferex2026!';
  const deptString = payload.desk 
    ? (payload.department?.includes(':') ? payload.department : `Admissions:${payload.desk}`)
    : (payload.department || 'Admissions:General');

  const profileObj: UserProfile = {
    id: newId,
    email: cleanEmail,
    full_name: payload.full_name.trim(),
    phone: payload.phone?.trim() || '',
    role: cleanRole,
    avatar_url: '',
    department: deptString,
    permissions: payload.permissions || [
      { label: 'View Students', enabled: true },
      { label: 'Edit Applications', enabled: true },
      { label: 'Approve Documents', enabled: true },
      { label: 'Manage Payments', enabled: false },
      { label: 'View Reports', enabled: true },
      { label: 'Manage Staff', enabled: false },
    ],
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Store login credentials for admin portal instant login
  try {
    const credRecord = {
      id: newId,
      email: cleanEmail,
      password: cleanPassword,
      fullName: payload.full_name.trim(),
      role: cleanRole,
      department: deptString,
      phone: payload.phone?.trim() || '',
      permissions: profileObj.permissions,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(`ferex_admin_cred_${cleanEmail}`, JSON.stringify(credRecord));
  } catch {}

  // 2. Insert into Supabase public.users
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const { error } = await client.from('users').upsert(profileObj);
  if (error) {
    throw new Error(`Failed to create staff member: ${error.message}`);
  }

  // 3. Attempt to register with Supabase Auth in background
  supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: {
        full_name: payload.full_name.trim(),
        role: cleanRole,
      }
    }
  }).catch(() => {});

  // 4. Broadcast events
  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));

  return profileObj;
}

// ─── Update student profile fields ────────────────────────────────────────────
export async function updateStudent(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data, error } = await client
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    throw new Error(`Failed to update student profile: ${error?.message || 'Database error'}`);
  }

  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));
  window.dispatchEvent(new Event('ferex_student_profile_change'));

  return data[0] as UserProfile;
}

// ─── Delete student (permanently removes from public.users & all related tables) ───
export async function deleteStudent(id: string): Promise<void> {
  if (!id) return;
  const cleanId = id.trim();

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  // 1. Delete from Supabase public.users (foreign keys with ON DELETE CASCADE handle relations)
  const { error } = await client.from('users').delete().eq('id', cleanId);
  if (error) {
    throw new Error(`Failed to delete student: ${error.message}`);
  }

  // Also clean up related records defensively
  try {
    await client.from('student_payments').delete().eq('student_id', cleanId);
    await client.from('student_documents').delete().eq('student_id', cleanId);
    await client.from('applications').delete().eq('student_id', cleanId);
    await client.from('tasks').delete().eq('student_id', cleanId);
    await client.from('support_tickets').delete().eq('student_id', cleanId);
  } catch {}

  // 2. Broadcast change events across tabs and components
  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));
  window.dispatchEvent(new Event('ferex_payment_change'));
  window.dispatchEvent(new Event('ferex_document_change'));
  window.dispatchEvent(new Event('ferex_tasks_change'));
  window.dispatchEvent(new Event('ferex_applications_change'));
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

    const students = studentsRes.data || [];
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
