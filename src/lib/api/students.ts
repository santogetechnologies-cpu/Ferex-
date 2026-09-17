import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { UserProfile } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

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
  await client.from('student_payments').delete().eq('student_id', cleanId).catch?.(() => {});
  await client.from('student_documents').delete().eq('student_id', cleanId).catch?.(() => {});
  await client.from('applications').delete().eq('student_id', cleanId).catch?.(() => {});
  await client.from('tasks').delete().eq('student_id', cleanId).catch?.(() => {});
  await client.from('support_tickets').delete().eq('student_id', cleanId).catch?.(() => {});

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
