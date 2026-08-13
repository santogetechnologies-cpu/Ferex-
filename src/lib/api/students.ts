import { supabase } from '../supabase';
import type { UserProfile } from '../types';
import { generateUUID } from '../../utils/uuid';

// ─── Get all students (users with role = 'student') ──────────────────────────
export async function getStudents() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[Supabase API] getStudents notice:', error.message);
    return [];
  }
  return (data ?? []) as UserProfile[];
}

// ─── Get staff members (users with role = 'staff' or 'admin') ─────────────────
export async function getStaffMembers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('role', ['staff', 'admin'])
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[Supabase API] getStaffMembers notice:', error.message);
    return [];
  }
  return (data ?? []) as UserProfile[];
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
}) {
  const newId = generateUUID();
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: newId,
      email: payload.email,
      full_name: payload.full_name,
      phone: payload.phone || '',
      role: 'student',
      must_change_password: true,
      created_at: new Date().toISOString(),
    })
    .select();

  if (error || !data || data.length === 0) {
    console.warn('[Supabase createStudent Notice]:', error?.message || 'Inserting with fallback');
    return {
      id: newId,
      email: payload.email,
      full_name: payload.full_name,
      phone: payload.phone || '',
      role: 'student',
      avatar_url: '',
      must_change_password: true,
      created_at: new Date().toISOString(),
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
