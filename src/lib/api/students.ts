import { supabase } from '../supabase';
import type { UserProfile } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

export const DEFAULT_COUNSELOR_ROSTER = [
  { id: 'c-1', name: 'Dr. Maria Kowalska', role: 'Senior European Admissions Lead', desk: 'Poland & NAWA Desk', email: 'maria.kowalska@ferex.com', country: 'Poland' },
  { id: 'c-2', name: 'Aarav Sharma', role: 'Senior Admissions Counselor', desk: 'Germany APS & Technical Desk', email: 'aarav.sharma@ferex.com', country: 'Germany' },
  { id: 'c-3', name: 'Elena Vance', role: 'Admissions Director', desk: 'UK CAS & Ireland Desk', email: 'elena.vance@ferex.com', country: 'United Kingdom' },
  { id: 'c-4', name: 'Sneha Reddy', role: 'Visa & Compliance Counselor', desk: 'France & Italy Desk', email: 'sneha.reddy@ferex.com', country: 'France' },
  { id: 'c-5', name: 'Vikram Malhotra', role: 'Global Admissions Head', desk: 'USA & Canada Desk', email: 'vikram.malhotra@ferex.com', country: 'United States' },
];

export function getDefaultCounselorForCountry(country?: string): string {
  if (!country) return `${DEFAULT_COUNSELOR_ROSTER[0].name} (${DEFAULT_COUNSELOR_ROSTER[0].desk})`;
  const match = DEFAULT_COUNSELOR_ROSTER.find(c =>
    country.toLowerCase().includes(c.country.toLowerCase()) ||
    c.country.toLowerCase().includes(country.toLowerCase())
  );
  if (match) return `${match.name} (${match.desk})`;
  return `${DEFAULT_COUNSELOR_ROSTER[0].name} (${DEFAULT_COUNSELOR_ROSTER[0].desk})`;
}

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

// Preseed default counselor test credentials if not already stored
try {
  DEFAULT_COUNSELOR_ROSTER.forEach(c => {
    const key = `ferex_admin_cred_${c.email.toLowerCase()}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({
        id: c.id,
        email: c.email,
        password: 'ferex123',
        fullName: c.name,
        role: 'counselor',
        department: `Admissions:${c.desk}`,
        phone: '',
        created_at: '2026-01-01T00:00:00.000Z'
      }));
    }
  });
} catch {}

export async function getStaffMembers(): Promise<UserProfile[]> {
  try {
    let dbStaff: UserProfile[] = [];
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
        .in('role', ['admin', 'central', 'super_admin', 'staff', 'counselor'])
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbStaff = data as UserProfile[];
      }
    } catch {}

    // 1. Gather local staff
    let localStaff: UserProfile[] = [];
    try {
      const localStaffRaw = localStorage.getItem('ferex_local_staff');
      if (localStaffRaw) {
        localStaff = JSON.parse(localStaffRaw);
      }
    } catch {}

    // 2. Gather from ferex_admin_cred_*
    const credStaff: UserProfile[] = [];
    try {
      const localKeys = Object.keys(localStorage).filter(k => k.startsWith('ferex_admin_cred_'));
      for (const k of localKeys) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || '{}');
          const role = (parsed.role || '').toLowerCase();
          if (['counselor', 'staff', 'admin', 'central', 'super_admin'].includes(role) && parsed.email) {
            credStaff.push({
              id: parsed.id || `staff-${parsed.email.replace(/[^a-z0-9]/g, '')}`,
              email: parsed.email,
              full_name: parsed.fullName || parsed.full_name || parsed.email.split('@')[0],
              role: role,
              department: parsed.department || 'Admissions',
              phone: parsed.phone || '',
              permissions: parsed.permissions || [],
              must_change_password: false,
              created_at: parsed.created_at || new Date().toISOString()
            });
          }
        } catch {}
      }
    } catch {}

    // 3. Exclude deleted staff IDs
    let deletedIds: string[] = [];
    try {
      const deletedRaw = localStorage.getItem('ferex_deleted_staff_ids');
      if (deletedRaw) {
        deletedIds = JSON.parse(deletedRaw);
      }
    } catch {}

    // 4. Default roster
    const defaultRoster: UserProfile[] = DEFAULT_COUNSELOR_ROSTER.map(c => ({
      id: c.id,
      email: c.email,
      full_name: c.name,
      role: 'counselor',
      department: `Admissions:${c.desk}`,
      phone: '',
      permissions: [],
      must_change_password: false,
      created_at: '2026-01-01T00:00:00.000Z'
    }));

    // Merge: custom/local first, then DB, then creds, then default roster
    const all = [...localStaff, ...dbStaff, ...credStaff, ...defaultRoster];
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();
    const deduped: UserProfile[] = [];

    for (const item of all) {
      if (!item || !item.email) continue;
      const lowerEmail = item.email.toLowerCase().trim();
      if (deletedIds.includes(item.id) || deletedIds.includes(lowerEmail)) continue;
      if (seenEmails.has(lowerEmail) || (item.id && seenIds.has(item.id))) continue;
      seenEmails.add(lowerEmail);
      if (item.id) seenIds.add(item.id);
      deduped.push(item);
    }

    return deduped;
  } catch (err: any) {
    console.warn('[getStaffMembers Error]:', err?.message);
    return DEFAULT_COUNSELOR_ROSTER.map(c => ({
      id: c.id,
      email: c.email,
      full_name: c.name,
      role: 'counselor',
      department: `Admissions:${c.desk}`,
      created_at: new Date().toISOString()
    })) as unknown as UserProfile[];
  }
}

export async function assignCounselorToStudent(studentId: string, counselorName: string): Promise<UserProfile | null> {
  try {
    const { data } = await supabase
      .from('users')
      .update({ assigned_counselor: counselorName, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .select()
      .maybeSingle();

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
  } catch (err) {
    console.warn('[assignCounselorToStudent Error]:', err);
    return null;
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
    assigned_counselor: payload.assigned_counselor && payload.assigned_counselor !== 'Admin'
      ? payload.assigned_counselor
      : getDefaultCounselorForCountry(),
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

  // 1. Store login credentials in local administrative registry
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

    // Also persist in ferex_local_staff
    const existingRaw = localStorage.getItem('ferex_local_staff');
    const existingList: UserProfile[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = existingList.filter(s => s.email.toLowerCase() !== cleanEmail);
    localStorage.setItem('ferex_local_staff', JSON.stringify([profileObj, ...filtered]));

    // Remove from deleted list if re-added
    const delRaw = localStorage.getItem('ferex_deleted_staff_ids');
    if (delRaw) {
      const delList: string[] = JSON.parse(delRaw);
      const filteredDel = delList.filter(id => id !== newId && id !== cleanEmail);
      localStorage.setItem('ferex_deleted_staff_ids', JSON.stringify(filteredDel));
    }
  } catch {}

  // 2. Insert into Supabase public.users
  try {
    await supabase.from('users').upsert(profileObj);
  } catch (dbErr) {
    console.warn('[Supabase createStaffMember Notice]:', dbErr);
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

  // 4. Broadcast events so all components refresh
  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));

  return profileObj;
}

// ─── Update student profile fields ────────────────────────────────────────────
export async function updateStudent(id: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  // Also update local staff if matching
  try {
    const existingRaw = localStorage.getItem('ferex_local_staff');
    if (existingRaw) {
      const list: UserProfile[] = JSON.parse(existingRaw);
      const updated = list.map(s => s.id === id ? { ...s, ...updates } : s);
      localStorage.setItem('ferex_local_staff', JSON.stringify(updated));
    }
  } catch {}

  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));

  if (error || !data || data.length === 0) {
    console.warn('[Supabase updateStudent Notice]:', error?.message || 'Update performed with fallback object');
    return { id, ...updates } as UserProfile;
  }
  return data[0] as UserProfile;
}

// ─── Delete student (removes from public.users) ───────────────────────────────
export async function deleteStudent(id: string) {
  try {
    await supabase
      .from('users')
      .delete()
      .eq('id', id);
  } catch (error: any) {
    console.warn('[Supabase deleteStudent Notice]:', error?.message);
  }

  // Also remove from local staff & admin credentials
  try {
    const existingRaw = localStorage.getItem('ferex_local_staff');
    if (existingRaw) {
      const list: UserProfile[] = JSON.parse(existingRaw);
      const target = list.find(s => s.id === id);
      if (target) {
        localStorage.removeItem(`ferex_admin_cred_${target.email.toLowerCase()}`);
      }
      const filtered = list.filter(s => s.id !== id);
      localStorage.setItem('ferex_local_staff', JSON.stringify(filtered));
    }

    const delRaw = localStorage.getItem('ferex_deleted_staff_ids');
    const delList: string[] = delRaw ? JSON.parse(delRaw) : [];
    if (!delList.includes(id)) {
      delList.push(id);
      localStorage.setItem('ferex_deleted_staff_ids', JSON.stringify(delList));
    }
  } catch {}

  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));
}

// ─── Get student count stats ──────────────────────────────────────────────────
export async function getStudentStats() {
  const { count: total } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  return { total: total ?? 0 };
}
