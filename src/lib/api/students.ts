import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { UserProfile } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

export const DEFAULT_COUNSELOR_ROSTER = [
  { id: 'c-1', name: 'Admissions Officer', role: 'European Admissions Lead', desk: 'Admissions Desk', email: 'admissions@ferex.com', country: 'Global' },
];

export function getDefaultCounselorForCountry(country?: string): string {
  if (!country || country === 'All') return 'Admissions Counselor (Global Desk)';
  return `Admissions Counselor (${country} Desk)`;
}

// Helper to retrieve deleted student IDs and emails
export function getDeletedStudentIds(): string[] {
  try {
    const raw = localStorage.getItem('ferex_deleted_student_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(s => String(s).toLowerCase());
    }
  } catch {}
  return [];
}

// ─── Get all students (users with role = 'student') ──────────────────────────
export async function getStudents(): Promise<UserProfile[]> {
  const deletedIds = getDeletedStudentIds();
  let students: UserProfile[] = [];

  try {
    const admin = await getAdminSupabaseClient();
    const { data, error } = await admin
      .from('users')
      .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });
    if (!error && data) {
      students = data as UserProfile[];
    }
  } catch {}

  if (students.length === 0) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });
    if (!error && data) {
      students = data as UserProfile[];
    }
  }

  // Filter out any students that have been marked deleted
  return students.filter(s => {
    const idLower = (s.id || '').toLowerCase();
    const emailLower = (s.email || '').toLowerCase();
    const nameLower = (s.full_name || '').toLowerCase();
    if (deletedIds.includes(idLower) || deletedIds.includes(emailLower)) return false;
    if (deletedIds.some(d => emailLower.includes(d) || idLower === d)) return false;
    return true;
  });
}

export const ADMINISTRATIVE_ROLES = ['admin', 'central', 'super_admin', 'staff', 'counselor'] as const;

export async function getStaffMembers(): Promise<UserProfile[]> {
  try {
    let dbStaff: UserProfile[] = [];
    try {
      const admin = await getAdminSupabaseClient();
      const { data, error } = await admin
        .from('users')
        .select('id, email, full_name, role, avatar_url, phone, department, permissions, assigned_counselor, must_change_password, created_at')
        .in('role', ['admin', 'central', 'super_admin', 'education_admin', 'education', 'staff', 'counselor'])
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbStaff = data as UserProfile[];
      }
    } catch {}

    // Exclude deleted staff IDs
    let deletedIds: string[] = [];
    try {
      const deletedRaw = localStorage.getItem('ferex_deleted_staff_ids');
      if (deletedRaw) {
        deletedIds = JSON.parse(deletedRaw);
      }
    } catch {}

    if (dbStaff.length > 0) {
      return dbStaff.filter(s => !deletedIds.includes(s.id) && !deletedIds.includes(s.email.toLowerCase()));
    }

    return [];
  } catch {
    return [];
  }
}


export async function assignCounselorToStudent(studentId: string, counselorName: string): Promise<UserProfile | null> {
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
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

// ─── Delete student (permanently removes from public.users & all related catalogs) ───
export async function deleteStudent(id: string) {
  if (!id) return;
  const cleanId = id.trim();
  let studentEmail = '';
  let studentName = '';

  // 1. Check local & admin store for student details
  try {
    const admin = await getAdminSupabaseClient();
    const { data: userRow } = await admin.from('users').select('id, email, full_name').or(`id.eq.${cleanId},email.eq.${cleanId}`).maybeSingle();
    if (userRow) {
      studentEmail = (userRow.email || '').toLowerCase();
      studentName = userRow.full_name || '';
    }
  } catch {}

  // 2. Add to deleted tracking list
  try {
    const delRaw = localStorage.getItem('ferex_deleted_student_ids');
    const delList: string[] = delRaw ? JSON.parse(delRaw) : [];
    if (!delList.includes(cleanId)) delList.push(cleanId);
    if (studentEmail && !delList.includes(studentEmail)) delList.push(studentEmail);
    localStorage.setItem('ferex_deleted_student_ids', JSON.stringify(delList));
  } catch {}

  // 3. Delete from Supabase public.users using admin client
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('users').delete().or(`id.eq.${cleanId},email.eq.${cleanId}`);

    // Cascade delete in relational tables
    await admin.from('payments').delete().or(`student_id.eq.${cleanId}${studentEmail ? `,student_name.ilike.%${studentEmail}%` : ''}`);
    await admin.from('student_documents').delete().eq('student_id', cleanId);
    await admin.from('documents').delete().eq('student_id', cleanId);
    await admin.from('applications').delete().eq('student_id', cleanId);
    await admin.from('tasks').delete().eq('student_id', cleanId);
    await admin.from('journey_stages').delete().eq('student_id', cleanId);
    await admin.from('student_visa_records').delete().eq('student_id', cleanId);
    await admin.from('student_predeparture_records').delete().eq('student_id', cleanId);

    // Also purge from system_config catalogs
    const catalogs = [
      'ferex_applications_catalog',
      'ferex_payment_records',
      'ferex_payments_catalog',
      'ferex_documents_catalog',
      'ferex_visa_records_catalog',
      'ferex_predeparture_catalog',
      'ferex_tasks_catalog'
    ];

    for (const catKey of catalogs) {
      try {
        const { data: catData } = await admin.from('system_config').select('key, value').eq('key', catKey).maybeSingle();
        if (catData?.value && Array.isArray(catData.value)) {
          const updatedCat = catData.value.filter((item: any) => {
            const itemStudentId = String(item.student_id || item.studentId || item.id || '').toLowerCase();
            const itemStudentEmail = String(item.student_email || item.email || '').toLowerCase();
            if (itemStudentId === cleanId.toLowerCase() || itemStudentId === studentEmail) return false;
            if (studentEmail && itemStudentEmail === studentEmail) return false;
            return true;
          });
          await admin.from('system_config').upsert({
            key: catKey,
            value: updatedCat,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
        }
      } catch {}
    }

    // Update cloud deleted students list
    try {
      const { data: delCfg } = await admin.from('system_config').select('value').eq('key', 'ferex_deleted_student_ids').maybeSingle();
      const existingDel: string[] = Array.isArray(delCfg?.value) ? delCfg.value : [];
      const combinedDel = Array.from(new Set([...existingDel, cleanId, ...(studentEmail ? [studentEmail] : [])]));
      await admin.from('system_config').upsert({
        key: 'ferex_deleted_student_ids',
        value: combinedDel,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}
  } catch (error: any) {
    console.warn('[deleteStudent Admin Notice]:', error?.message);
  }

  // 4. Also remove from local staff & admin credentials if applicable
  try {
    const existingRaw = localStorage.getItem('ferex_local_staff');
    if (existingRaw) {
      const list: UserProfile[] = JSON.parse(existingRaw);
      const target = list.find(s => s.id === cleanId || s.email.toLowerCase() === studentEmail);
      if (target) {
        localStorage.removeItem(`ferex_admin_cred_${target.email.toLowerCase()}`);
      }
      const filtered = list.filter(s => s.id !== cleanId && s.email.toLowerCase() !== studentEmail);
      localStorage.setItem('ferex_local_staff', JSON.stringify(filtered));
    }
  } catch {}

  // 5. Broadcast change events across tabs and components
  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));
  window.dispatchEvent(new Event('ferex_payment_change'));
  window.dispatchEvent(new Event('ferex_document_change'));
  window.dispatchEvent(new Event('ferex_tasks_change'));
  window.dispatchEvent(new Event('ferex_applications_change'));
}

// ─── Get student count stats ──────────────────────────────────────────────────
export async function getStudentStats() {
  const { count: total } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student');

  return { total: total ?? 0 };
}
