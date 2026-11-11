import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import { generateUUID } from '../../utils/uuid';

export interface DivisionStaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  division: string;
  department?: string;
  phone?: string;
  avatar_url?: string;
}

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  account_manager: 'Digital Account Manager',
  digital_account_manager: 'Digital Account Manager',
  accountmanager: 'Digital Account Manager',
  account_executive: 'Digital Account Executive',
  client_manager: 'Client Relationship Manager',
  digital_manager: 'Digital Operations Manager',
  project_manager: 'Digital Project Manager',
  pm: 'Digital Project Manager',
  digimanager: 'Digital Manager',
  digital_admin: 'Digital Agency Director',
  digital: 'Digital Agency Director',
  ferex_digital: 'Digital Agency Director',
  digital_director: 'Digital Agency Director',
  digital_staff: 'Digital Specialist',
  designer: 'UI/UX Designer',
  developer: 'Software Engineer',
  lead_developer: 'Lead Engineer',
  creative: 'Creative Lead',
  trade_admin: 'Trade Director',
  trade: 'Trade Director',
  global_trade: 'Trade Director',
  logistics_officer: 'Trade Logistics Officer',
  rimi_admin: 'Rimi Distribution Director',
  rimi: 'Rimi Distribution Director',
  rimi_frozen: 'Rimi Distribution Director',
  operations_manager: 'Warehouse & Operations Manager',
  education_admin: 'Education Admissions Lead',
  education: 'Education Admissions Lead',
  admin: 'Executive Admin',
  counselor: 'Admissions Counselor',
  staff: 'Operations Staff',
  superadmin: 'Central Super Admin',
  super_admin: 'Central Super Admin',
  central: 'Central Super Admin',
};

export const DELETED_STAFF_STORAGE_KEY = 'ferex_deleted_staff_list';
export const CUSTOM_STAFF_STORAGE_KEY = 'ferex_custom_staff_members';

export const LEGACY_MOCK_EMAILS = new Set([
  'pm@ferex.com',
  'digital@ferex.com',
  'digimanager@ferex.com',
  'creative@ferex.com',
  'accounts@ferex.com',
]);

export function getDeletedStaffList(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(DELETED_STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x: string) => String(x).toLowerCase().trim());
    }
  } catch {}
  return [];
}

export function markStaffDeleted(idOrEmail: string): void {
  try {
    if (typeof localStorage === 'undefined' || !idOrEmail) return;
    const current = getDeletedStaffList();
    const val = idOrEmail.toLowerCase().trim();
    if (!current.includes(val)) {
      current.push(val);
      localStorage.setItem(DELETED_STAFF_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {}
}

export function isStaffDeleted(idOrEmail?: string): boolean {
  if (!idOrEmail) return false;
  const val = idOrEmail.toLowerCase().trim();
  if (LEGACY_MOCK_EMAILS.has(val)) return true;
  const deleted = getDeletedStaffList();
  return deleted.includes(val);
}

export function getCustomStaffMembers(): DivisionStaffMember[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(m => !isStaffDeleted(m.email) && !isStaffDeleted(m.id));
    }
  } catch {}
  return [];
}

export function saveCustomStaffMember(member: DivisionStaffMember): void {
  try {
    if (typeof localStorage === 'undefined' || !member) return;
    if (isStaffDeleted(member.email) || isStaffDeleted(member.id)) return;
    const current = getCustomStaffMembers().filter(
      m => m.email.toLowerCase() !== member.email.toLowerCase() && m.id !== member.id
    );
    current.unshift(member);
    localStorage.setItem(CUSTOM_STAFF_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

const DEFAULT_DIVISION_STAFF: Record<string, DivisionStaffMember[]> = {
  digital: [],
  trade: [
    {
      id: '22222222-2222-4222-a222-222222222001',
      name: 'Global Trade Director',
      email: 'trade@ferex.com',
      role: 'trade_admin',
      roleLabel: 'Trade Director',
      division: 'trade',
      department: 'Trade Logistics',
      phone: '+91 98190 30001'
    }
  ],
  rimi: [
    {
      id: '33333333-3333-4333-a333-333333333001',
      name: 'Rimi Operations Lead',
      email: 'rimi@ferex.com',
      role: 'rimi_admin',
      roleLabel: 'Rimi Distribution Director',
      division: 'rimi',
      department: 'Cold Chain Logistics',
      phone: '+91 98190 40001'
    }
  ],
  education: [
    {
      id: '44444444-4444-4444-a444-444444444001',
      name: 'Admissions Lead Counselor',
      email: 'education@ferex.com',
      role: 'education_admin',
      roleLabel: 'Education Admissions Lead',
      division: 'education',
      department: 'Student Admissions',
      phone: '+91 98190 10001'
    }
  ]
};

const LOCAL_STORAGE_KEY = 'ferex_staff_registry_cache';

export async function getDivisionStaff(division: 'trade' | 'rimi' | 'digital' | 'education' | 'all' = 'all'): Promise<DivisionStaffMember[]> {
  const deletedList = getDeletedStaffList();
  const isDeleted = (m: { id?: string; email?: string }) => {
    const email = (m.email || '').toLowerCase().trim();
    const id = (m.id || '').toLowerCase().trim();
    return (email && deletedList.includes(email)) || (id && deletedList.includes(id));
  };

  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    let dbMembers: DivisionStaffMember[] = [];

    // 1. Try digital_staff_directory RPC for digital
    if (division === 'digital' || division === 'all') {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('digital_staff_directory');
        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          const rpcMembers = rpcData
            .filter((u: any) => !isDeleted(u))
            .map((u: any) => {
              const role = (u.role || 'project_manager').toLowerCase().trim();
              const roleLabel = ROLE_DISPLAY_NAMES[role] || role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
              return {
                id: u.id,
                name: u.name || u.full_name || u.email?.split('@')[0] || 'Digital Staff',
                email: (u.email || '').toLowerCase().trim(),
                role,
                roleLabel,
                division: 'digital',
                department: 'Digital Operations',
                phone: '',
                avatar_url: '',
              };
            });
          dbMembers.push(...rpcMembers);
        }
      } catch (e) {
        console.warn('[getDivisionStaff] RPC digital_staff_directory notice:', e);
      }
    }

    // 2. Query users table
    try {
      let query = client
        .from('users')
        .select('id, email, full_name, role, department, phone, avatar_url, status, created_at')
        .neq('role', 'student')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: DivisionStaffMember[] = data
          .filter(u => u && u.email && !isDeleted(u) && u.status !== 'inactive' && u.status !== 'deleted')
          .map(u => {
            const role = (u.role || 'staff').toLowerCase().trim();
            const roleLabel = ROLE_DISPLAY_NAMES[role] || role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            return {
              id: u.id,
              name: u.full_name || u.email.split('@')[0],
              email: u.email.toLowerCase().trim(),
              role,
              roleLabel,
              division: getDivisionFromRole(role, u.department),
              department: u.department || 'Operations',
              phone: u.phone || '',
              avatar_url: u.avatar_url || '',
            };
          });
        dbMembers.push(...mapped);
      }
    } catch (e) {
      console.warn('[getDivisionStaff] Users table query notice:', e);
    }

    // 3. Current authenticated user check
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const cu = sessionData?.session?.user;
      if (cu && cu.email && !isDeleted({ email: cu.email, id: cu.id })) {
        const userRole = (cu.user_metadata?.role || cu.app_metadata?.role || '').toLowerCase();
        const fullName = cu.user_metadata?.full_name || cu.email.split('@')[0];
        if (
          userRole.includes('digital') ||
          userRole.includes('pm') ||
          userRole.includes('account') ||
          userRole.includes('central') ||
          userRole.includes('admin') ||
          userRole.includes('manager')
        ) {
          dbMembers.push({
            id: cu.id,
            name: fullName,
            email: cu.email.toLowerCase().trim(),
            role: userRole || 'digital_manager',
            roleLabel: ROLE_DISPLAY_NAMES[userRole] || 'Digital Manager',
            division: 'digital',
            department: 'Digital Agency HQ',
          });
        }
      }
    } catch {}

    // 4. Custom staff members saved in local store
    try {
      const customStaff = getCustomStaffMembers();
      customStaff.forEach(cs => {
        if (!isDeleted(cs)) {
          dbMembers.push(cs);
        }
      });
    } catch {}

    // Deduplicate DB & custom members by email
    const dedupedMap = new Map<string, DivisionStaffMember>();
    dbMembers.forEach(m => {
      if (m.email && !isDeleted(m)) {
        dedupedMap.set(m.email.toLowerCase(), m);
      }
    });
    const uniqueDbMembers = Array.from(dedupedMap.values());

    let result = uniqueDbMembers;
    if (division !== 'all') {
      result = uniqueDbMembers.filter(s => matchDivision(s, division));
    }

    // Merge with default staff ONLY if they are NOT in deletedList
    const defaults = (division === 'all'
      ? Object.values(DEFAULT_DIVISION_STAFF).flat()
      : (DEFAULT_DIVISION_STAFF[division] || [])
    ).filter(d => !isDeleted(d));

    const map = new Map<string, DivisionStaffMember>();
    defaults.forEach(d => map.set(d.email.toLowerCase(), d));
    // Real DB and custom accounts override defaults with real UUIDs and details
    result.forEach(r => {
      if (!isDeleted(r)) {
        map.set(r.email.toLowerCase(), r);
      }
    });

    const combined = Array.from(map.values()).filter(m => !isDeleted(m));

    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${division}`, JSON.stringify(combined));
    } catch {}

    return combined;
  } catch (err) {
    console.warn('[getDivisionStaff] DB notice:', err);
  }

  // Offline fallback
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${division}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((m: any) => !isDeleted(m));
      }
    }
  } catch {}

  const defaults = (division === 'all'
    ? Object.values(DEFAULT_DIVISION_STAFF).flat()
    : (DEFAULT_DIVISION_STAFF[division] || [])
  ).filter(d => !isDeleted(d));

  return defaults;
}

export function getDivisionStaffSync(division: 'trade' | 'rimi' | 'digital' | 'education' | 'all' = 'all'): DivisionStaffMember[] {
  const deletedList = getDeletedStaffList();
  const isDeleted = (m: { id?: string; email?: string }) => {
    const email = (m.email || '').toLowerCase().trim();
    const id = (m.id || '').toLowerCase().trim();
    return (email && deletedList.includes(email)) || (id && deletedList.includes(id));
  };

  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${division}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((m: any) => !isDeleted(m));
      }
    }
  } catch {}

  const defaults = (division === 'all'
    ? Object.values(DEFAULT_DIVISION_STAFF).flat()
    : (DEFAULT_DIVISION_STAFF[division] || [])
  ).filter(d => !isDeleted(d));

  return defaults;
}

export function getDivisionFromRole(role: string, department?: string): string {
  const dept = (department || '').toLowerCase();
  const r = role.toLowerCase();
  if (r.includes('trade') || r.includes('logistics') || dept.includes('trade')) return 'trade';
  if (r.includes('rimi') || r.includes('operations_manager') || dept.includes('rimi') || dept.includes('frozen')) return 'rimi';
  if (
    r.includes('digital') ||
    r.includes('project_manager') ||
    r.includes('pm') ||
    r.includes('account_manager') ||
    r.includes('accountmanager') ||
    r.includes('account_executive') ||
    r.includes('client_manager') ||
    r.includes('manager') ||
    dept.includes('digital') ||
    dept.includes('creative') ||
    dept.includes('tech')
  ) return 'digital';
  if (r.includes('education') || r.includes('counselor') || dept.includes('education')) return 'education';
  return 'central';
}

function matchDivision(staff: DivisionStaffMember, division: string): boolean {
  if (division === 'all') return true;
  const r = (staff.role || '').toLowerCase();
  const dept = (staff.department || '').toLowerCase();
  const email = (staff.email || '').toLowerCase();

  if (division === 'trade') {
    return (r.includes('trade') || r.includes('logistics') || dept.includes('trade') || email.includes('trade')) && !r.includes('digital') && !r.includes('rimi') && !r.includes('education');
  }
  if (division === 'rimi') {
    return (r.includes('rimi') || r.includes('operations') || r.includes('warehouse') || dept.includes('rimi') || dept.includes('frozen') || email.includes('rimi')) && !r.includes('digital') && !r.includes('trade') && !r.includes('education');
  }
  if (division === 'digital') {
    const digitalRoles = [
      'digital', 'digital_admin', 'ferex_digital', 'digital_director',
      'project_manager', 'digital_manager', 'pm', 'digimanager',
      'account_manager', 'accountmanager', 'digital_account_manager', 'account_executive', 'client_manager',
      'digital_staff', 'designer', 'developer', 'lead_developer', 'creative',
      'central', 'superadmin', 'super_admin', 'admin'
    ];
    return (
      digitalRoles.includes(r) ||
      r.includes('digital') ||
      r.includes('project_manager') ||
      r.includes('account_manager') ||
      r.includes('accountmanager') ||
      r.includes('account') ||
      r.includes('manager') ||
      dept.includes('digital') ||
      dept.includes('creative') ||
      dept.includes('tech') ||
      email.includes('digital') ||
      email.includes('pm@') ||
      email.includes('accounts@') ||
      email.includes('account') ||
      email.includes('creative@') ||
      email.includes('manager')
    ) && !r.includes('rimi') && !r.includes('trade') && !r.includes('education');
  }
  if (division === 'education') {
    return (r.includes('education') || r.includes('counselor') || r.includes('admissions') || dept.includes('education') || email.includes('edu') || email.includes('counselor')) && !r.includes('rimi') && !r.includes('digital') && !r.includes('trade');
  }
  return false;
}

export const getTradeStaff = () => getDivisionStaff('trade');
export const getRimiStaff = () => getDivisionStaff('rimi');
export const getDigitalStaff = () => getDivisionStaff('digital');
export const getEducationStaff = () => getDivisionStaff('education');

export async function createDivisionStaff(staff: {
  name: string;
  email: string;
  role: string;
  division: 'trade' | 'rimi' | 'digital' | 'education';
  department?: string;
  phone?: string;
}): Promise<DivisionStaffMember> {
  const newId = generateUUID();
  const roleLabel = ROLE_DISPLAY_NAMES[staff.role] || (staff.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  const email = staff.email.toLowerCase().trim();

  const newStaff: DivisionStaffMember = {
    id: newId,
    name: staff.name.trim(),
    email,
    role: staff.role,
    roleLabel,
    division: staff.division,
    department: staff.department || `${staff.division.toUpperCase()} Operations`,
    phone: staff.phone || '',
  };

  // Remove from deleted list if it was previously marked deleted
  try {
    const deleted = getDeletedStaffList().filter(x => x !== email && x !== newId);
    localStorage.setItem(DELETED_STAFF_STORAGE_KEY, JSON.stringify(deleted));
  } catch {}

  // Save in custom staff store
  saveCustomStaffMember(newStaff);

  // Update cache immediately
  try {
    const key = `${LOCAL_STORAGE_KEY}_${staff.division}`;
    const raw = localStorage.getItem(key);
    const current = raw ? JSON.parse(raw) : [];
    const updated = [newStaff, ...current.filter((m: any) => m.email?.toLowerCase() !== email)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}

  // Also persist to Supabase
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    await client.from('users').upsert({
      id: newStaff.id,
      email: newStaff.email,
      full_name: newStaff.name,
      role: newStaff.role,
      department: newStaff.department,
      phone: newStaff.phone,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });
  } catch (err) {
    console.warn('[createDivisionStaff] Supabase upsert note:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_staff_users_change'));
    window.dispatchEvent(new Event('ferex_digital_tasks_change'));
    window.dispatchEvent(new Event('ferex_digital_projects_change'));
  }

  return newStaff;
}

export async function deleteDivisionStaff(idOrEmail: string, optionalEmail?: string): Promise<{ success: boolean; message?: string }> {
  const param1 = (idOrEmail || '').trim();
  const param2 = (optionalEmail || '').toLowerCase().trim();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param1);
  const resolvedId = isUuid ? param1 : undefined;
  const resolvedEmail = param2 || (!isUuid && param1.includes('@') ? param1.toLowerCase() : '');

  let executionError: Error | null = null;
  let successConfirmed = false;

  // 1. Primary backend execution: Call secure database RPC function delete_user_by_admin
  try {
    const { data, error } = await supabase.rpc('delete_user_by_admin', {
      target_user_id: resolvedId || null,
      target_email: resolvedEmail || null,
    });

    if (error) {
      executionError = new Error(error.message);
    } else if (data && data.success) {
      successConfirmed = true;
    }
  } catch (err: any) {
    executionError = err;
  }

  // 2. Secondary fallback: Call delete-user Edge Function
  if (!successConfirmed) {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: resolvedId, email: resolvedEmail },
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

  // 3. Third fallback: Direct RLS delete on public.users if caller has delete policy
  if (!successConfirmed) {
    try {
      let query = supabase.from('users').delete();
      if (resolvedId) {
        query = query.eq('id', resolvedId);
      } else if (resolvedEmail) {
        query = query.ilike('email', resolvedEmail);
      }
      const { error } = await query;
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

  // If all attempts failed, throw the actual backend error (no false success notification)
  if (!successConfirmed && executionError) {
    throw executionError;
  }

  // Deletion confirmed by backend: update local storage and client registries
  if (resolvedEmail) markStaffDeleted(resolvedEmail);
  if (resolvedId) markStaffDeleted(resolvedId);

  // Remove from custom staff store
  try {
    const custom = getCustomStaffMembers().filter(
      m =>
        (resolvedEmail ? m.email.toLowerCase() !== resolvedEmail : true) &&
        (resolvedId ? m.id !== resolvedId : true)
    );
    localStorage.setItem(CUSTOM_STAFF_STORAGE_KEY, JSON.stringify(custom));
  } catch {}

  // Remove from all cached registries
  const divisions = ['digital', 'trade', 'rimi', 'education', 'all'];
  for (const d of divisions) {
    try {
      const key = `${LOCAL_STORAGE_KEY}_${d}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (m: any) =>
              (resolvedEmail ? m.email?.toLowerCase() !== resolvedEmail : true) &&
              (resolvedId ? m.id !== resolvedId : true)
          );
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_staff_users_change'));
    window.dispatchEvent(new Event('ferex_staff_change'));
    window.dispatchEvent(new Event('ferex_digital_tasks_change'));
    window.dispatchEvent(new Event('ferex_digital_projects_change'));
  }

  return { success: true };
}

export async function getStaffAssignedStudents(staffName?: string) {
  try {
    let query = supabase.from('users').select('*').eq('role', 'student');
    if (staffName) {
      query = query.or(`assigned_counselor.ilike.%${staffName}%,assigned_counselor.eq.${staffName}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}
