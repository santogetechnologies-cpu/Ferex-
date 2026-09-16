import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import { isSuperAdmin } from '../roleRouter';

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

const ROLE_DISPLAY_NAMES: Record<string, string> = {
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

// Legacy mock person names to sanitize out of any stored caches
const MOCK_NAMES_BLACKLIST = [
  'marcus vance',
  'elena rostova',
  'krzysztof nowak',
  'rahul sharma',
  'vikram malhotra',
  'sneha patel',
  'ananya roy',
  'kavita iyer',
  'rohan verma',
  'priya nair',
  'sneha sen',
];

export function isMockName(nameOrEmail?: string): boolean {
  if (!nameOrEmail) return false;
  const s = nameOrEmail.toLowerCase().trim();
  return MOCK_NAMES_BLACKLIST.some(m => s.includes(m));
}

// Fallback real enterprise role accounts when no custom DB staff is provisioned
const REAL_DEFAULT_DIVISION_STAFF: Record<string, DivisionStaffMember[]> = {
  trade: [
    { id: 'stf-trd-1', name: 'Trade Logistics Desk', email: 'logistics@ferex.com', role: 'logistics_officer', roleLabel: 'Trade Logistics Officer', division: 'trade', department: 'Trade Logistics & Customs' },
    { id: 'stf-trd-2', name: 'Trade Operations Lead', email: 'trade@ferex.com', role: 'trade_admin', roleLabel: 'Trade Director', division: 'trade', department: 'Executive Trade Desk' },
  ],
  rimi: [
    { id: 'stf-rimi-1', name: 'Rimi Operations Desk', email: 'ops@ferex.com', role: 'operations_manager', roleLabel: 'Warehouse & Operations Manager', division: 'rimi', department: 'Cold Chain & Fleet Dispatch' },
    { id: 'stf-rimi-2', name: 'Rimi Distribution Director', email: 'rimi@ferex.com', role: 'rimi_admin', roleLabel: 'Distribution Director', division: 'rimi', department: 'Supply Chain Operations' },
  ],
  digital: [
    { id: 'stf-dig-1', name: 'Digital Project Manager', email: 'pm@ferex.com', role: 'project_manager', roleLabel: 'Digital Project Manager', division: 'digital', department: 'Digital Delivery & UX' },
    { id: 'stf-dig-2', name: 'Digital Agency Lead', email: 'digital@ferex.com', role: 'digital_admin', roleLabel: 'Digital Agency Director', division: 'digital', department: 'Marketing & Development' },
  ],
  education: [
    { id: 'stf-edu-1', name: 'Admissions Counselor', email: 'counselor@ferex.com', role: 'counselor', roleLabel: 'Admissions Counselor', division: 'education', department: 'European Admissions Desk' },
    { id: 'stf-edu-2', name: 'Education Admin', email: 'education@ferex.com', role: 'education_admin', roleLabel: 'Education Director', division: 'education', department: 'Student Recruitment Lead' },
  ],
};

export function getDeletedStaffIds(): string[] {
  try {
    const raw = localStorage.getItem('ferex_deleted_staff_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(s => String(s).toLowerCase());
    }
  } catch {}
  return [];
}

/**
 * Loads real staff members for a specific division or all divisions
 */
export async function getDivisionStaff(division: 'trade' | 'rimi' | 'digital' | 'education' | 'all' = 'all'): Promise<DivisionStaffMember[]> {
  const deletedIds = getDeletedStaffIds();
  const staffMap = new Map<string, DivisionStaffMember>();

  // 1. Fetch from Supabase users
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('users')
      .select('id, email, full_name, role, department, phone, avatar_url, created_at')
      .neq('role', 'student')
      .order('created_at', { ascending: false });

    if (Array.isArray(data) && data.length > 0) {
      for (const u of data) {
        const email = (u.email || '').toLowerCase().trim();
        const role = (u.role || '').toLowerCase().trim();
        const fullName = u.full_name || '';
        if (!email || deletedIds.includes(u.id) || deletedIds.includes(email) || isMockName(email) || isMockName(fullName)) continue;

        const roleLabel = ROLE_DISPLAY_NAMES[role] || (role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()));
        staffMap.set(email, {
          id: u.id,
          name: u.full_name || email.split('@')[0],
          email,
          role,
          roleLabel,
          division: getDivisionFromRole(role, u.department),
          department: u.department || 'Operations',
          phone: u.phone,
          avatar_url: u.avatar_url,
        });
      }
    }
  } catch {}

  // 2. Fetch from Local Storage registry (e.g. provisioned via Central or Admin)
  if (typeof localStorage !== 'undefined') {
    try {
      const customStaffRaw = localStorage.getItem('ferex_staff_users');
      if (customStaffRaw) {
        const parsed = JSON.parse(customStaffRaw);
        if (Array.isArray(parsed)) {
          for (const u of parsed) {
            const email = (u.email || '').toLowerCase().trim();
            const role = (u.role || '').toLowerCase().trim();
            const name = u.full_name || u.name || '';
            if (!email || deletedIds.includes(u.id) || deletedIds.includes(email) || isMockName(email) || isMockName(name)) continue;
            if (!staffMap.has(email)) {
              staffMap.set(email, {
                id: u.id || `local-${email}`,
                name: name || email.split('@')[0],
                email,
                role: role || 'staff',
                roleLabel: ROLE_DISPLAY_NAMES[role] || 'Operations Staff',
                division: getDivisionFromRole(role, u.department),
                department: u.department || 'Operations',
                phone: u.phone,
              });
            }
          }
        }
      }

      // 3. Current active user (if staff/admin)
      const curUserRaw = localStorage.getItem('ferex_user');
      if (curUserRaw) {
        const cur = JSON.parse(curUserRaw);
        const email = (cur.email || '').toLowerCase().trim();
        const role = (cur.role || '').toLowerCase().trim();
        const name = cur.full_name || cur.name || '';
        if (email && role !== 'student' && !deletedIds.includes(email) && !isMockName(email) && !isMockName(name)) {
          if (!staffMap.has(email)) {
            staffMap.set(email, {
              id: cur.id || `cur-${email}`,
              name: name || email.split('@')[0],
              email,
              role,
              roleLabel: ROLE_DISPLAY_NAMES[role] || 'Operations Specialist',
              division: getDivisionFromRole(role, cur.department),
              department: cur.department || 'Active Desk',
            });
          }
        }
      }
    } catch {}
  }

  let allStaff = Array.from(staffMap.values());

  // Filter for division
  if (division !== 'all') {
    allStaff = allStaff.filter(s => matchDivision(s, division));
  }

  // If no DB staff found for division, provide clean enterprise division roster
  if (allStaff.length === 0 && division !== 'all') {
    allStaff = REAL_DEFAULT_DIVISION_STAFF[division] || [];
  }

  // Cache in sync storage for instant lookup (sanitized)
  try {
    localStorage.setItem(`ferex_division_staff_${division}`, JSON.stringify(allStaff));
  } catch {}

  return allStaff;
}

export function getDivisionStaffSync(division: 'trade' | 'rimi' | 'digital' | 'education' | 'all' = 'all'): DivisionStaffMember[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(`ferex_division_staff_${division}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.filter(s => !isMockName(s.name) && !isMockName(s.email));
          if (sanitized.length > 0) return sanitized;
        }
      }
    } catch {}
  }
  return REAL_DEFAULT_DIVISION_STAFF[division] || REAL_DEFAULT_DIVISION_STAFF.trade;
}

function getDivisionFromRole(role: string, department?: string): string {
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

  // Strict division matching: No cross-division leak, and no superadmin leaking into business unit staff rosters
  if (division === 'trade') {
    return (r.includes('trade') || r.includes('logistics') || dept.includes('trade') || dept.includes('logistics') || email.includes('trade') || email.includes('logistics')) && !r.includes('digital') && !r.includes('rimi') && !r.includes('education');
  }
  if (division === 'rimi') {
    return (r.includes('rimi') || r.includes('operations') || r.includes('warehouse') || r.includes('cold') || dept.includes('rimi') || dept.includes('frozen') || dept.includes('warehouse') || dept.includes('cold') || email.includes('rimi') || email.includes('ops')) && !r.includes('digital') && !r.includes('trade') && !r.includes('education');
  }
  if (division === 'digital') {
    return (r.includes('digital') || r.includes('project_manager') || r.includes('developer') || r.includes('designer') || dept.includes('digital') || dept.includes('agency') || email.includes('digital') || email.includes('pm')) && !r.includes('rimi') && !r.includes('trade') && !r.includes('education');
  }
  if (division === 'education') {
    return (r.includes('education') || r.includes('counselor') || r.includes('admissions') || dept.includes('education') || dept.includes('admissions') || email.includes('edu') || email.includes('counselor')) && !r.includes('rimi') && !r.includes('digital') && !r.includes('trade');
  }
  return false;
}

// Convenience getters
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
  const roleLabel = ROLE_DISPLAY_NAMES[staff.role] || (staff.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()));
  const newStaff: DivisionStaffMember = {
    id: `stf-${staff.division.slice(0, 3)}-${Date.now()}`,
    name: staff.name,
    email: staff.email.toLowerCase().trim(),
    role: staff.role,
    roleLabel,
    division: staff.division,
    department: staff.department || `${staff.division.toUpperCase()} Operations`,
    phone: staff.phone,
  };

  try {
    const raw = localStorage.getItem('ferex_staff_users');
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [newStaff, ...existing.filter((s: any) => (s.email || '').toLowerCase() !== newStaff.email)];
    localStorage.setItem('ferex_staff_users', JSON.stringify(updated));
  } catch {}

  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('users').upsert({
      id: newStaff.id,
      email: newStaff.email,
      full_name: newStaff.name,
      role: newStaff.role,
      department: newStaff.department,
      phone: newStaff.phone,
    });
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_staff_users_change'));
  }

  return newStaff;
}

export async function deleteDivisionStaff(idOrEmail: string): Promise<boolean> {
  const target = idOrEmail.toLowerCase().trim();
  const deleted = getDeletedStaffIds();
  if (!deleted.includes(target)) {
    deleted.push(target);
    try {
      localStorage.setItem('ferex_deleted_staff_ids', JSON.stringify(deleted));
    } catch {}
  }

  try {
    const raw = localStorage.getItem('ferex_staff_users');
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter((s: any) => (s.id || '').toLowerCase() !== target && (s.email || '').toLowerCase() !== target);
      localStorage.setItem('ferex_staff_users', JSON.stringify(filtered));
    }
  } catch {}

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
