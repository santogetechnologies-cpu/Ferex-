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
  trade_admin: 'Trade Director',
  trade: 'Trade Director',
  global_trade: 'Trade Director',
  logistics_officer: 'Trade Logistics Officer',
  rimi_admin: 'Rimi Distribution Director',
  rimi: 'Rimi Distribution Director',
  rimi_frozen: 'Rimi Distribution Director',
  operations_manager: 'Warehouse & Operations Manager',
  digital_admin: 'Digital Agency Director',
  digital: 'Digital Agency Director',
  ferex_digital: 'Digital Agency Director',
  project_manager: 'Digital Project Manager',
  education_admin: 'Education Admissions Lead',
  education: 'Education Admissions Lead',
  admin: 'Executive Admin',
  counselor: 'Admissions Counselor',
  staff: 'Operations Staff',
  superadmin: 'Central Super Admin',
  super_admin: 'Central Super Admin',
  central: 'Central Super Admin',
};

const DEFAULT_DIVISION_STAFF: Record<string, DivisionStaffMember[]> = {
  digital: [
    {
      id: '11111111-1111-4111-a111-111111111001',
      name: 'Digital Project Manager',
      email: 'pm@ferex.com',
      role: 'project_manager',
      roleLabel: 'Digital Project Manager',
      division: 'digital',
      department: 'Digital Project Management',
      phone: '+91 98190 20001'
    },
    {
      id: '11111111-1111-4111-a111-111111111002',
      name: 'Ferex Digital Director',
      email: 'digital@ferex.com',
      role: 'digital_admin',
      roleLabel: 'Digital Agency Director',
      division: 'digital',
      department: 'Digital Agency HQ',
      phone: '+91 98190 20002'
    },
    {
      id: '11111111-1111-4111-a111-111111111003',
      name: 'Digital Manager',
      email: 'digimanager@ferex.com',
      role: 'project_manager',
      roleLabel: 'Digital Project Manager',
      division: 'digital',
      department: 'Digital Operations',
      phone: '+91 98190 20003'
    },
    {
      id: '11111111-1111-4111-a111-111111111004',
      name: 'Lead Creative Designer',
      email: 'creative@ferex.com',
      role: 'digital_staff',
      roleLabel: 'Creative & UI/UX Lead',
      division: 'digital',
      department: 'Creative & Design',
      phone: '+91 98190 20004'
    }
  ],
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
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    let query = client
      .from('users')
      .select('id, email, full_name, role, department, phone, avatar_url, created_at')
      .neq('role', 'student')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: DivisionStaffMember[] = data
        .filter(u => u && u.email)
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

      let result = mapped;
      if (division !== 'all') {
        result = mapped.filter(s => matchDivision(s, division));
      }

      // Merge with default staff so standard roles like Digital Manager are always selectable
      const defaults = division === 'all'
        ? Object.values(DEFAULT_DIVISION_STAFF).flat()
        : (DEFAULT_DIVISION_STAFF[division] || []);

      const map = new Map<string, DivisionStaffMember>();
      defaults.forEach(d => map.set(d.email.toLowerCase(), d));
      result.forEach(r => map.set(r.email.toLowerCase(), r));
      const combined = Array.from(map.values());

      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_${division}`, JSON.stringify(combined));
      } catch {}

      return combined;
    }
  } catch (err) {
    console.warn('[getDivisionStaff] DB notice:', err);
  }

  // Offline fallback
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${division}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  const defaults = division === 'all'
    ? Object.values(DEFAULT_DIVISION_STAFF).flat()
    : (DEFAULT_DIVISION_STAFF[division] || []);

  return defaults;
}

export function getDivisionStaffSync(division: 'trade' | 'rimi' | 'digital' | 'education' | 'all' = 'all'): DivisionStaffMember[] {
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${division}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  const defaults = division === 'all'
    ? Object.values(DEFAULT_DIVISION_STAFF).flat()
    : (DEFAULT_DIVISION_STAFF[division] || []);

  return defaults;
}

export function getDivisionFromRole(role: string, department?: string): string {
  const dept = (department || '').toLowerCase();
  const r = role.toLowerCase();
  if (r.includes('trade') || r.includes('logistics') || dept.includes('trade')) return 'trade';
  if (r.includes('rimi') || r.includes('operations_manager') || dept.includes('rimi') || dept.includes('frozen')) return 'rimi';
  if (r.includes('digital') || r.includes('project_manager') || dept.includes('digital')) return 'digital';
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
    return (r.includes('digital') || r.includes('project_manager') || dept.includes('digital') || email.includes('digital')) && !r.includes('rimi') && !r.includes('trade') && !r.includes('education');
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

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { error } = await client.from('users').upsert({
    id: newStaff.id,
    email: newStaff.email,
    full_name: newStaff.name,
    role: newStaff.role,
    department: newStaff.department,
    phone: newStaff.phone,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email' });

  if (error) {
    throw new Error(`Failed to save staff member: ${error.message}`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_staff_users_change'));
  }

  return newStaff;
}

export async function deleteDivisionStaff(idOrEmail: string): Promise<boolean> {
  const target = idOrEmail.toLowerCase().trim();
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
  let delError = null;

  if (isUuid) {
    const { error } = await client.from('users').delete().eq('id', target);
    delError = error;
  } else {
    const { error } = await client.from('users').delete().eq('email', target);
    delError = error;
  }

  if (delError) {
    throw new Error(`Failed to delete staff member: ${delError.message}`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_staff_users_change'));
  }
  return true;
}

export async function getStaffAssignedStudents(staffName?: string) {
  try {
    let query = supabase.from('users').select('*').eq('role', 'student');
    if (staffName) {
      query = query.or(`assigned_counselor.ilike.%${staffName}%,assigned_counselor.eq.${staffName}`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getStaffTasks(staffName?: string) {
  try {
    let query = supabase.from('tasks').select('*');
    if (staffName) {
      query = query.ilike('assigned_to', `%${staffName}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getStaffMeetings(counselorName?: string) {
  try {
    let query = supabase.from('meetings').select('*');
    if (counselorName) {
      query = query.ilike('advisor_name', `%${counselorName}%`);
    }
    const { data, error } = await query.order('scheduled_date', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}
