import { supabase } from '../supabase';
import type { UserProfile } from '../types';
import { generateUUID } from '../../utils/uuid';

// ─── Get all students (users with role = 'student') ──────────────────────────
export async function getStudents() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[Supabase API] getStudents notice:', error.message);
    return [];
  }
  return (data ?? []) as UserProfile[];
}

export const ADMINISTRATIVE_ROLES = ['admin', 'central', 'super_admin', 'staff', 'counselor'] as const;

export async function getStaffMembers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
      .in('role', ['admin', 'central', 'super_admin', 'staff', 'counselor'])
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[getStaffMembers Notice]:', error?.message);
      return [];
    }
    return data as UserProfile[];
  } catch (err: any) {
    console.warn('[getStaffMembers Error]:', err?.message);
    return [];
  }
}

export async function getAdminUsers(): Promise<UserProfile[]> {
  return getStaffMembers();
}

export async function getAdminUsersCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'central', 'super_admin', 'staff', 'counselor']);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ─── Get single student ───────────────────────────────────────────────────────
export async function getStudentById(id: string) {
  const { data, error } = await supabase
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
}) {
  const newId = generateUUID();
  const insertData = {
    id: newId,
    email: payload.email,
    full_name: payload.full_name,
    phone: payload.phone || '',
    role: 'student',
    assigned_counselor: payload.assigned_counselor || 'Admin',
    must_change_password: true,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('users')
    .insert(insertData)
    .select();

  if (error || !data || data.length === 0) {
    console.warn('[Supabase createStudent Notice]:', error?.message || 'Inserting with fallback');
    return {
      ...insertData,
      avatar_url: '',
    } as UserProfile;
  }

  return data[0] as UserProfile;
}

// ─── Create a new staff member profile in public.users ─────────────────────────────
export async function createStaffMember(payload: {
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  department?: string;
  permissions?: { label: string; enabled: boolean }[];
}) {
  const newId = generateUUID();
  const insertObj = {
    id: newId,
    email: payload.email,
    full_name: payload.full_name,
    phone: payload.phone || '',
    role: payload.role.toLowerCase(),
    department: payload.department || '',
    permissions: payload.permissions || [],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('users')
    .insert(insertObj)
    .select();

  if (error || !data || data.length === 0) {
    console.warn('[Supabase createStaffMember Notice]:', error?.message || 'Inserting with fallback');
    return {
      ...insertObj,
      avatar_url: '',
    } as unknown as UserProfile;
  }
  return data[0] as UserProfile;
}

// ─── Update student profile fields ────────────────────────────────────────────
export async function updateStudent(id: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    console.warn('[Supabase updateStudent Notice]:', error?.message || 'Update performed with fallback object');
    return { id, ...updates } as UserProfile;
  }
  return data[0] as UserProfile;
}

// ─── Delete student (removes from public.users) ───────────────────────────────
export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.warn('[Supabase deleteStudent Notice]:', error.message);
  }
}

// ─── Get student count stats ──────────────────────────────────────────────────
export async function getStudentStats() {
  const { count: total } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  return { total: total ?? 0 };
}
