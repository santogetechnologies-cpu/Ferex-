import { supabase } from '../supabase';

export interface Shift {
  id: string;
  name: string;
  division: string;
  start_time: string; // '09:00:00'
  end_time: string;   // '18:00:00'
  grace_period_mins: number;
  half_day_hours?: number;
  full_day_hours?: number;
  half_day_threshold_hours: number;
  full_day_threshold_hours: number;
  target_type?: 'all' | 'division' | 'specific_staff' | 'roles';
  assigned_staff_emails?: string[];
  assigned_roles?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceTimesheet {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  division: string;
  shift_id?: string | null;
  shift_name?: string | null;
  date: string; // 'YYYY-MM-DD'
  clock_in: string;
  clock_out?: string | null;
  clock_in_ip?: string | null;
  clock_out_ip?: string | null;
  work_summary?: string | null;
  total_hours: number;
  status: 'active' | 'completed' | 'verified' | 'locked';
  verified_by_admin_id?: string | null;
  verified_by_admin_name?: string | null;
  verified_at?: string | null;
  locked_by_superadmin_id?: string | null;
  locked_by_superadmin_name?: string | null;
  locked_at?: string | null;
  is_admin_verified: boolean;
  is_superadmin_locked: boolean;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeavePolicyConfig {
  id: string;
  name: string;
  code: string;
  category: 'full_day' | 'half_day' | 'hourly_permission' | 'emergency';
  division: string;
  annual_quota_days: number;
  monthly_max_permission_hours: number;
  is_monetizable: boolean;
  is_encashable: boolean;
  requires_attachment: boolean;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LeavePermissionRequest {
  id: string;
  user_id?: string | null;
  user_email: string;
  user_name: string;
  user_role: string;
  division: string;
  is_admin_request?: boolean;
  request_type: 'full_day_leave' | 'half_day_leave' | 'hourly_permission' | 'unplanned_emergency';
  policy_code: string;
  policy_name: string;
  start_date: string;
  end_date: string;
  half_day_session?: 'first_half' | 'second_half' | null;
  permission_start_time?: string | null;
  permission_end_time?: string | null;
  permission_hours?: number;
  total_days: number;
  is_monetizable: boolean;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeSalary {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  division: string;
  salary_type?: 'monthly' | 'hourly' | 'both';
  monthly_base_salary: number;
  hourly_rate: number;
  currency: string;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_name?: string | null;
  effective_from: string;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlyPayroll {
  id: string;
  payroll_month: string;
  user_id: string;
  user_email: string;
  user_name: string;
  division: string;
  user_role: string;
  total_working_days: number;
  attended_days: number;
  verified_hours: number;
  salary_type?: 'monthly' | 'hourly' | 'both';
  base_salary: number;
  hourly_rate: number;
  calculated_gross_pay: number;
  allowances: number;
  deductions: number;
  loss_of_pay_deduction?: number;
  custom_deductions?: number;
  deduction_reason?: string;
  net_payable: number;
  status: 'draft' | 'approved' | 'paid' | 'locked';
  payment_reference?: string | null;
  processed_by_id?: string | null;
  processed_by_name?: string | null;
  processed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollDeductionInput {
  lossOfPayDeduction?: number;
  customDeductions?: number;
  deductionReason?: string;
  allowances?: number;
}

const LOCAL_SHIFTS_KEY = 'ferex_shifts';
const LOCAL_TIMESHEETS_KEY = 'ferex_attendance_timesheets';
const LOCAL_POLICIES_KEY = 'ferex_leave_policies';
const LOCAL_LEAVE_REQ_KEY = 'ferex_leave_requests';
const LOCAL_SALARIES_KEY = 'ferex_employee_salaries';
const LOCAL_PAYROLLS_KEY = 'ferex_monthly_payrolls';

const getLocalData = <T>(key: string, defaultVal: T[]): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const saveLocalData = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save to ${key}`, e);
  }
};

// ================= SHIFTS API =================
export const formatShiftFromDb = (row: any): Shift => {
  const half = Number(row.half_day_hours ?? row.half_day_threshold_hours ?? 4.0);
  const full = Number(row.full_day_hours ?? row.full_day_threshold_hours ?? 8.0);
  return {
    id: row.id,
    name: row.name || 'Shift Timing',
    division: row.division || 'all',
    start_time: row.start_time || '09:00:00',
    end_time: row.end_time || '18:00:00',
    grace_period_mins: Number(row.grace_period_mins ?? 15),
    half_day_hours: half,
    full_day_hours: full,
    half_day_threshold_hours: half,
    full_day_threshold_hours: full,
    target_type: row.target_type || 'division',
    assigned_staff_emails: Array.isArray(row.assigned_staff_emails) ? row.assigned_staff_emails : [],
    assigned_roles: Array.isArray(row.assigned_roles) ? row.assigned_roles : [],
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const inferDivision = (
  role?: string,
  department?: string,
  email?: string
): string => {
  const r = (role || '').toLowerCase();
  const d = (department || '').toLowerCase();
  const em = (email || '').toLowerCase();

  if (r === 'superadmin' || d.includes('central') || em.includes('centraladmin@')) {
    return 'central';
  }
  if (
    r.includes('rimi') ||
    d.includes('rimi') ||
    d.includes('frozen') ||
    em.includes('rimi')
  ) {
    return 'rimi';
  }
  if (
    r.includes('trade') ||
    r.includes('logistics') ||
    r === 'operations_manager' ||
    d.includes('trade') ||
    em.includes('trade') ||
    em.includes('tlo@')
  ) {
    return 'trade';
  }
  if (
    r.includes('digital') ||
    r.includes('project_manager') ||
    r === 'pm' ||
    d.includes('digital') ||
    em.includes('digital') ||
    em.includes('dm@') ||
    em.includes('pm@')
  ) {
    return 'digital';
  }
  if (
    r.includes('counselor') ||
    r.includes('teacher') ||
    r.includes('student') ||
    r.includes('education') ||
    d.includes('education') ||
    em.includes('counselor') ||
    em.includes('education')
  ) {
    return 'education';
  }
  return 'education';
};

export const getShifts = async (
  division?: string,
  userEmail?: string,
  userRole?: string
): Promise<Shift[]> => {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) throw error;
    const formattedData = data.map(formatShiftFromDb);
    saveLocalData(LOCAL_SHIFTS_KEY, formattedData);

    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const cleanRole = (userRole || '').trim().toLowerCase();

    let result = formattedData.filter((s) => s.is_active !== false);

    if (division && division !== 'all' && division !== 'central') {
      result = result.filter((s) => {
        // Shift assigned to all enterprises / global
        if (s.division === 'all') return true;
        // Shift assigned to this specific division
        if (s.division === division) return true;
        // Explicitly assigned staff email
        if (
          cleanEmail &&
          s.assigned_staff_emails &&
          s.assigned_staff_emails.some((e) => (e || '').trim().toLowerCase() === cleanEmail)
        ) {
          return true;
        }
        // Explicitly assigned role
        if (
          cleanRole &&
          s.assigned_roles &&
          s.assigned_roles.some((r) => (r || '').trim().toLowerCase() === cleanRole)
        ) {
          return true;
        }
        return false;
      });
    }

    if (cleanEmail || cleanRole) {
      result.sort((a, b) => {
        const aMatch =
          (cleanEmail &&
            a.assigned_staff_emails?.some((e) => (e || '').trim().toLowerCase() === cleanEmail)) ||
          (cleanRole &&
            a.assigned_roles?.some((r) => (r || '').trim().toLowerCase() === cleanRole));
        const bMatch =
          (cleanEmail &&
            b.assigned_staff_emails?.some((e) => (e || '').trim().toLowerCase() === cleanEmail)) ||
          (cleanRole &&
            b.assigned_roles?.some((r) => (r || '').trim().toLowerCase() === cleanRole));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }
    return result;
  } catch (err) {
    console.warn('Fallback getting shifts from local storage:', err);
    const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, [
      {
        id: '55555555-5555-5555-5555-555555555001',
        name: 'General Corporate Shift (HQ)',
        division: 'all',
        start_time: '09:00:00',
        end_time: '18:00:00',
        grace_period_mins: 15,
        half_day_hours: 4.0,
        full_day_hours: 8.0,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        target_type: 'all',
        assigned_staff_emails: [],
        assigned_roles: [],
        is_active: true,
      },
      {
        id: '55555555-5555-5555-5555-555555555002',
        name: 'Education Admissions Morning Shift',
        division: 'education',
        start_time: '09:30:00',
        end_time: '18:30:00',
        grace_period_mins: 15,
        half_day_hours: 4.0,
        full_day_hours: 8.0,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        target_type: 'division',
        assigned_staff_emails: ['counselor@ferex.com', 'education@ferex.com'],
        assigned_roles: ['counselor', 'staff', 'education_admin'],
        is_active: true,
      },
      {
        id: '55555555-5555-5555-5555-555555555003',
        name: 'Rimi Cold Chain Distribution Shift',
        division: 'rimi',
        start_time: '08:00:00',
        end_time: '17:00:00',
        grace_period_mins: 15,
        half_day_hours: 4.0,
        full_day_hours: 8.0,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        target_type: 'division',
        assigned_staff_emails: ['rimi@ferex.com', 'logistics@ferex.com'],
        assigned_roles: ['logistics_officer', 'staff', 'rimi_admin'],
        is_active: true,
      },
      {
        id: '55555555-5555-5555-5555-555555555004',
        name: 'Global Trade Port Logistics Shift',
        division: 'trade',
        start_time: '09:00:00',
        end_time: '18:00:00',
        grace_period_mins: 15,
        half_day_hours: 4.0,
        full_day_hours: 8.0,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        target_type: 'division',
        assigned_staff_emails: ['trade@ferex.com'],
        assigned_roles: ['operations_manager', 'staff', 'trade_admin'],
        is_active: true,
      },
      {
        id: '55555555-5555-5555-5555-555555555005',
        name: 'Digital Agency Creative & Dev Shift',
        division: 'digital',
        start_time: '10:00:00',
        end_time: '19:00:00',
        grace_period_mins: 30,
        half_day_hours: 4.0,
        full_day_hours: 8.0,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        target_type: 'division',
        assigned_staff_emails: ['digimanager@ferex.com', 'digital@ferex.com', 'pm@ferex.com', 'creative@ferex.com'],
        assigned_roles: ['digital_manager', 'pm', 'digital_staff', 'digital_admin'],
        is_active: true,
      },
    ]);
    const formattedLocal = local.map(formatShiftFromDb);
    let result = formattedLocal;
    if (division && division !== 'all' && division !== 'central') {
      result = formattedLocal.filter(
        (s) =>
          s.division === division ||
          s.division === 'all' ||
          (userEmail && s.assigned_staff_emails && s.assigned_staff_emails.includes(userEmail)) ||
          (userRole && s.assigned_roles && s.assigned_roles.includes(userRole))
      );
    }
    if (userEmail || userRole) {
      result.sort((a, b) => {
        const aMatch =
          (userEmail && a.assigned_staff_emails?.includes(userEmail)) ||
          (userRole && a.assigned_roles?.includes(userRole));
        const bMatch =
          (userEmail && b.assigned_staff_emails?.includes(userEmail)) ||
          (userRole && b.assigned_roles?.includes(userRole));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }
    return result;
  }
};

export const createShift = async (shift: Partial<Shift>): Promise<Shift> => {
  const half = Number(shift.half_day_hours ?? shift.half_day_threshold_hours ?? 4.0);
  const full = Number(shift.full_day_hours ?? shift.full_day_threshold_hours ?? 8.0);

  const dbPayload: any = {
    name: shift.name || 'General Shift',
    division: shift.division || 'all',
    start_time: shift.start_time || '09:00:00',
    end_time: shift.end_time || '18:00:00',
    grace_period_mins: Number(shift.grace_period_mins ?? 15),
    half_day_hours: half,
    full_day_hours: full,
    target_type: shift.target_type || 'division',
    assigned_staff_emails: Array.isArray(shift.assigned_staff_emails) ? shift.assigned_staff_emails : [],
    assigned_roles: Array.isArray(shift.assigned_roles) ? shift.assigned_roles : [],
    is_active: shift.is_active ?? true,
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (shift.id && uuidRegex.test(shift.id)) {
    dbPayload.id = shift.id;
  }

  try {
    const { data, error } = await supabase.from('shifts').insert([dbPayload]).select().single();
    if (error || !data) throw error;
    const formatted = formatShiftFromDb(data);

    const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, []);
    local.unshift(formatted);
    saveLocalData(LOCAL_SHIFTS_KEY, local);

    window.dispatchEvent(new CustomEvent('ferex-shifts-updated'));
    return formatted;
  } catch (err) {
    console.warn('Supabase createShift error, falling back to local storage:', err);
    const fallbackId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `shift-${Date.now()}`;
    const newShift: Shift = {
      id: fallbackId,
      name: dbPayload.name,
      division: dbPayload.division,
      start_time: dbPayload.start_time,
      end_time: dbPayload.end_time,
      grace_period_mins: dbPayload.grace_period_mins,
      half_day_hours: half,
      full_day_hours: full,
      half_day_threshold_hours: half,
      full_day_threshold_hours: full,
      target_type: dbPayload.target_type,
      assigned_staff_emails: dbPayload.assigned_staff_emails,
      assigned_roles: dbPayload.assigned_roles,
      is_active: dbPayload.is_active,
      created_at: new Date().toISOString()
    };
    const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, []);
    local.unshift(newShift);
    saveLocalData(LOCAL_SHIFTS_KEY, local);
    window.dispatchEvent(new CustomEvent('ferex-shifts-updated'));
    return newShift;
  }
};

export const updateShift = async (id: string, updates: Partial<Shift>): Promise<Shift | null> => {
  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.division !== undefined) dbUpdates.division = updates.division;
  if (updates.start_time !== undefined) dbUpdates.start_time = updates.start_time;
  if (updates.end_time !== undefined) dbUpdates.end_time = updates.end_time;
  if (updates.grace_period_mins !== undefined) dbUpdates.grace_period_mins = Number(updates.grace_period_mins);
  if (updates.half_day_hours !== undefined || updates.half_day_threshold_hours !== undefined) {
    dbUpdates.half_day_hours = Number(updates.half_day_hours ?? updates.half_day_threshold_hours);
  }
  if (updates.full_day_hours !== undefined || updates.full_day_threshold_hours !== undefined) {
    dbUpdates.full_day_hours = Number(updates.full_day_hours ?? updates.full_day_threshold_hours);
  }
  if (updates.target_type !== undefined) dbUpdates.target_type = updates.target_type;
  if (updates.assigned_staff_emails !== undefined) dbUpdates.assigned_staff_emails = updates.assigned_staff_emails;
  if (updates.assigned_roles !== undefined) dbUpdates.assigned_roles = updates.assigned_roles;
  if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

  try {
    const { data, error } = await supabase
      .from('shifts')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw error;
    const formatted = formatShiftFromDb(data);

    const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, []);
    const idx = local.findIndex(s => s.id === id);
    if (idx !== -1) {
      local[idx] = formatted;
      saveLocalData(LOCAL_SHIFTS_KEY, local);
    }
    window.dispatchEvent(new CustomEvent('ferex-shifts-updated'));
    return formatted;
  } catch (err) {
    console.warn('Supabase updateShift fallback:', err);
    const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, []);
    const idx = local.findIndex(s => s.id === id);
    if (idx !== -1) {
      const half = Number(updates.half_day_hours ?? updates.half_day_threshold_hours ?? local[idx].half_day_hours ?? 4.0);
      const full = Number(updates.full_day_hours ?? updates.full_day_threshold_hours ?? local[idx].full_day_hours ?? 8.0);
      local[idx] = {
        ...local[idx],
        ...updates,
        half_day_hours: half,
        full_day_hours: full,
        half_day_threshold_hours: half,
        full_day_threshold_hours: full,
        updated_at: new Date().toISOString()
      };
      saveLocalData(LOCAL_SHIFTS_KEY, local);
      window.dispatchEvent(new CustomEvent('ferex-shifts-updated'));
      return local[idx];
    }
    return null;
  }
};

export const deleteShift = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) console.warn('Supabase delete shift error:', error.message);
  } catch (err) {
    console.warn('Fallback delete shift:', err);
  }
  const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, []);
  const filtered = local.filter(s => s.id !== id);
  saveLocalData(LOCAL_SHIFTS_KEY, filtered);
  window.dispatchEvent(new CustomEvent('ferex-shifts-updated'));
  return true;
};

export interface StaffMember {
  id?: string;
  email: string;
  name: string;
  role: string;
  division: string;
}

export const getEnterpriseStaff = async (): Promise<StaffMember[]> => {
  const staffMap = new Map<string, StaffMember>();

  // Baseline known staff
  const defaults: StaffMember[] = [
    { email: 'counselor@ferex.com', name: 'Education Counselor', role: 'counselor', division: 'education' },
    { email: 'education@ferex.com', name: 'Admissions Lead Counselor', role: 'education_admin', division: 'education' },
    { email: 'rimi@ferex.com', name: 'Rimi Cold Chain Logistics Lead', role: 'logistics_officer', division: 'rimi' },
    { email: 'trade@ferex.com', name: 'Global Trade Operations Director', role: 'operations_manager', division: 'trade' },
    { email: 'digital@ferex.com', name: 'Ferex Digital Director', role: 'digital_admin', division: 'digital' },
    { email: 'digimanager@ferex.com', name: 'Digital Delivery Manager', role: 'digital_manager', division: 'digital' },
    { email: 'pm@ferex.com', name: 'Digital Project Manager', role: 'project_manager', division: 'digital' },
    { email: 'creative@ferex.com', name: 'Lead Creative Designer', role: 'digital_staff', division: 'digital' },
    { email: 'centraladmin@ferexventures.com', name: 'Central Super Admin', role: 'superadmin', division: 'central' },
    { email: 'admin@ferex.com', name: 'Central Admin', role: 'superadmin', division: 'central' },
  ];
  defaults.forEach(s => staffMap.set(s.email.toLowerCase(), s));

  try {
    // 1. Fetch salaries for configured employees
    const { data: salaries } = await supabase.from('employee_salaries').select('user_email, user_name, user_role, division');
    if (salaries && Array.isArray(salaries)) {
      for (const sal of salaries) {
        if (sal.user_email) {
          const em = sal.user_email.toLowerCase();
          staffMap.set(em, {
            email: em,
            name: sal.user_name || em.split('@')[0],
            role: sal.user_role || 'staff',
            division: sal.division || 'central'
          });
        }
      }
    }

    // 2. Fetch users where role is not student
    const { data: users } = await supabase.from('users').select('id, email, full_name, role, department').neq('role', 'student');
    if (users && Array.isArray(users)) {
      for (const u of users) {
        if (u.email) {
          const emailLower = u.email.toLowerCase();
          const existing = staffMap.get(emailLower);
          let div = 'central';
          const dept = (u.department || '').toLowerCase();
          if (dept.includes('education') || u.role === 'counselor' || u.role === 'education_admin') div = 'education';
          else if (dept.includes('rimi') || dept.includes('cold') || dept.includes('logistics') || u.role === 'logistics_officer' || u.role === 'rimi_admin') div = 'rimi';
          else if (dept.includes('trade') || u.role === 'trade_admin' || u.role === 'operations_manager') div = 'trade';
          else if (dept.includes('digital') || u.role === 'digital_staff' || u.role === 'digital_admin' || u.role === 'project_manager') div = 'digital';

          staffMap.set(emailLower, {
            id: u.id,
            email: emailLower,
            name: u.full_name || existing?.name || emailLower.split('@')[0],
            role: u.role || existing?.role || 'staff',
            division: existing?.division || div
          });
        }
      }
    }
  } catch (err) {
    console.warn('Failed fetching live enterprise staff:', err);
  }

  return Array.from(staffMap.values());
};

// ================= ATTENDANCE & TIMESHEETS API =================
export const getActiveClockIn = async (userEmail: string): Promise<AttendanceTimesheet | null> => {
  if (!userEmail) return null;
  const emLower = userEmail.toLowerCase();
  try {
    const { data, error } = await supabase
      .from('attendance_timesheets')
      .select('*')
      .ilike('user_email', emLower)
      .or('status.eq.active,status.eq.Clocked In')
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        ...data,
        date: data.work_date || data.date || (data.clock_in ? data.clock_in.split('T')[0] : new Date().toISOString().split('T')[0]),
        status: 'active'
      } as AttendanceTimesheet;
    }
  } catch (err) {
    console.warn('Active clock-in query fallback:', err);
  }

  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  return local.find(t => t.user_email?.toLowerCase() === emLower && t.status === 'active') || null;
};

export const clockIn = async (params: {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  division: string;
  shiftId?: string;
  shiftName?: string;
}): Promise<AttendanceTimesheet> => {
  const today = new Date().toISOString().split('T')[0];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const recordId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
      );

  const newRecord: AttendanceTimesheet = {
    id: recordId,
    user_id: params.userId,
    user_email: params.userEmail,
    user_name: params.userName,
    user_role: params.userRole,
    division: params.division,
    shift_id: params.shiftId || null,
    shift_name: params.shiftName || 'Standard Shift',
    date: today,
    clock_in: new Date().toISOString(),
    clock_out: null,
    work_summary: null,
    total_hours: 0,
    status: 'active',
    is_admin_verified: false,
    is_superadmin_locked: false,
    created_at: new Date().toISOString()
  };

  // 1. Immediately cache in local storage so it is active across session and timesheets
  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  local.unshift(newRecord);
  saveLocalData(LOCAL_TIMESHEETS_KEY, local);

  // 2. Persist to Supabase with schema-aligned column names
  try {
    const dbPayload: any = {
      id: recordId,
      user_name: params.userName,
      user_email: params.userEmail,
      user_role: params.userRole,
      division: params.division,
      shift_name: params.shiftName || 'Standard Shift',
      work_date: today,
      clock_in: newRecord.clock_in,
      total_hours: 0,
      status: 'active'
    };
    if (uuidRegex.test(params.userId)) {
      dbPayload.user_id = params.userId;
    }
    if (params.shiftId && uuidRegex.test(params.shiftId)) {
      dbPayload.shift_id = params.shiftId;
    }

    const { error } = await supabase
      .from('attendance_timesheets')
      .insert([dbPayload]);
    if (error) {
      console.warn('[AttendanceAPI] Supabase clockIn insert warning:', error.message);
    }
  } catch (err) {
    console.warn('[AttendanceAPI] Supabase clockIn handled:', err);
  }

  window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
  return newRecord;
};

export const clockOut = async (
  timesheetId: string,
  workSummary: string
): Promise<AttendanceTimesheet | null> => {
  const clockOutTime = new Date().toISOString();

  // 1. Update local storage cache immediately
  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  const idx = local.findIndex(t => t.id === timesheetId);
  let updatedRecord: AttendanceTimesheet | null = null;
  let totalHours = 8.0;

  if (idx !== -1) {
    const rec = local[idx];
    const diffMs = new Date(clockOutTime).getTime() - new Date(rec.clock_in).getTime();
    totalHours = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
    updatedRecord = {
      ...rec,
      clock_out: clockOutTime,
      work_summary: workSummary,
      total_hours: totalHours,
      status: 'completed',
      updated_at: clockOutTime
    };
    local[idx] = updatedRecord;
    saveLocalData(LOCAL_TIMESHEETS_KEY, local);
  }

  // 2. Update Supabase
  try {
    const { data: current } = await supabase
      .from('attendance_timesheets')
      .select('clock_in')
      .eq('id', timesheetId)
      .maybeSingle();

    if (current?.clock_in) {
      const diffMs = new Date(clockOutTime).getTime() - new Date(current.clock_in).getTime();
      totalHours = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
    }

    const { data, error } = await supabase
      .from('attendance_timesheets')
      .update({
        clock_out: clockOutTime,
        work_summary: workSummary,
        total_hours: totalHours,
        status: 'completed',
        updated_at: clockOutTime
      })
      .eq('id', timesheetId)
      .select()
      .maybeSingle();

    if (!error && data) {
      const formatted: AttendanceTimesheet = {
        ...data,
        date: data.work_date || data.date || clockOutTime.split('T')[0],
        status: 'completed',
        is_admin_verified: !!(data.is_admin_verified || data.verified_by || data.verified_at),
        is_superadmin_locked: !!(data.is_superadmin_locked || data.locked_by || data.locked_at)
      };
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...formatted };
        saveLocalData(LOCAL_TIMESHEETS_KEY, local);
      }
      updatedRecord = updatedRecord ? { ...updatedRecord, ...formatted } : formatted;
    }
  } catch (err) {
    console.warn('[AttendanceAPI] Supabase clockOut handled:', err);
  }

  window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
  return updatedRecord;
};

export const getTimesheets = async (filters?: {
  division?: string;
  userEmail?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<AttendanceTimesheet[]> => {
  let dbTimesheets: AttendanceTimesheet[] = [];

  try {
    let query = supabase.from('attendance_timesheets').select('*').order('clock_in', { ascending: false });

    if (filters?.division && filters.division !== 'all' && filters.division !== 'central') {
      query = query.eq('division', filters.division);
    }
    if (filters?.userEmail) {
      query = query.ilike('user_email', filters.userEmail);
    }
    if (filters?.date) {
      query = query.or(`work_date.eq.${filters.date},date.eq.${filters.date}`);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      dbTimesheets = data.map((row: any) => {
        // Normalize status: handle both old ('Clocked In', 'Submitted') and new ('active', 'completed') values
        let normalizedStatus = (row.status || 'completed').toLowerCase();
        if (normalizedStatus === 'clocked in' || normalizedStatus === 'clocked_in') normalizedStatus = 'active';
        if (normalizedStatus === 'submitted') normalizedStatus = 'completed';
        // is_admin_verified: prefer boolean column, fallback to old text-based verified_by
        const isVerified = !!(row.is_admin_verified || (row.verified_by && row.verified_by !== '') || (row.verified_by_admin_id && row.verified_by_admin_id !== ''));
        const isLocked = !!(row.is_superadmin_locked || (row.locked_by && row.locked_by !== '') || (row.locked_by_superadmin_id && row.locked_by_superadmin_id !== ''));
        return {
          ...row,
          date: row.date || row.work_date || (row.clock_in ? row.clock_in.split('T')[0] : new Date().toISOString().split('T')[0]),
          status: isLocked ? 'locked' : isVerified ? 'verified' : normalizedStatus,
          is_admin_verified: isVerified,
          is_superadmin_locked: isLocked,
          verified_by_admin_id: row.verified_by_admin_id || row.verified_by || null,
          verified_by_admin_name: row.verified_by_admin_name || row.verified_by || null,
          locked_by_superadmin_id: row.locked_by_superadmin_id || row.locked_by || null,
          locked_by_superadmin_name: row.locked_by_superadmin_name || row.locked_by || null,
        };
      });
    }
  } catch (err) {
    console.warn('[AttendanceAPI] Supabase timesheets query fallback:', err);
  }

  // Merge Supabase records with local storage cache so attendance records are always visible
  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  const map = new Map<string, AttendanceTimesheet>();

  local.forEach(t => map.set(t.id, t));
  dbTimesheets.forEach(t => {
    const localItem = map.get(t.id);
    if (localItem && localItem.updated_at && t.updated_at) {
      if (new Date(localItem.updated_at).getTime() > new Date(t.updated_at).getTime()) {
        map.set(t.id, { ...t, ...localItem });
        return;
      }
    }
    map.set(t.id, { ...localItem, ...t });
  });

  let allRecords = Array.from(map.values()).sort(
    (a, b) => new Date(b.clock_in || b.created_at || '').getTime() - new Date(a.clock_in || a.created_at || '').getTime()
  );

  if (filters?.division && filters.division !== 'all' && filters.division !== 'central') {
    allRecords = allRecords.filter(t => t.division === filters.division);
  }
  if (filters?.userEmail) {
    allRecords = allRecords.filter(t => t.user_email?.toLowerCase() === filters.userEmail?.toLowerCase());
  }
  if (filters?.date) {
    allRecords = allRecords.filter(t => t.date === filters.date);
  }
  if (filters?.startDate) {
    allRecords = allRecords.filter(t => t.date >= filters.startDate!);
  }
  if (filters?.endDate) {
    allRecords = allRecords.filter(t => t.date <= filters.endDate!);
  }
  if (filters?.status && filters.status !== 'all') {
    allRecords = allRecords.filter(t => t.status === filters.status);
  }

  return allRecords;
};

export const verifyTimesheetByAdmin = async (
  timesheetId: string,
  adminId: string,
  adminName: string,
  notes?: string,
  hoursOverride?: number
): Promise<boolean> => {
  const verifiedAt = new Date().toISOString();

  // Update local cache immediately for instant UI feedback
  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  const idx = local.findIndex(t => t.id === timesheetId);
  let resolvedHours = hoursOverride;
  if (idx !== -1) {
    const prev = local[idx];
    if (resolvedHours === undefined || resolvedHours === null) {
      resolvedHours = prev.total_hours > 0 ? prev.total_hours : 8.0;
    }
    local[idx] = {
      ...prev,
      total_hours: resolvedHours,
      clock_out: prev.clock_out || verifiedAt,
      is_admin_verified: true,
      verified_by_admin_id: adminId,
      verified_by_admin_name: adminName,
      verified_at: verifiedAt,
      status: 'completed',
      admin_notes: notes || `Verified by Admin (${resolvedHours} hrs)`,
      updated_at: verifiedAt
    };
    saveLocalData(LOCAL_TIMESHEETS_KEY, local);
  }

  // Write to Supabase — write both new boolean columns AND old text column for backward compat
  try {
    const updatePayload: any = {
      is_admin_verified: true,
      verified_by_admin_id: adminId,
      verified_by_admin_name: adminName,
      verified_at: verifiedAt,
      verified_by: adminName,
      status: 'completed',
      admin_notes: notes || (resolvedHours ? `Verified by Admin (${resolvedHours} hrs)` : 'Verified by Division Admin'),
      updated_at: verifiedAt
    };
    if (resolvedHours !== undefined && resolvedHours !== null && resolvedHours > 0) {
      updatePayload.total_hours = resolvedHours;
    }

    const { error } = await supabase
      .from('attendance_timesheets')
      .update(updatePayload)
      .eq('id', timesheetId);

    if (error) {
      console.warn('[AttendanceAPI] Full verify update failed, retrying minimal:', error.message);
      const minimalPayload: any = {
        verified_by: adminName,
        status: 'Completed',
        updated_at: verifiedAt
      };
      if (resolvedHours !== undefined && resolvedHours > 0) {
        minimalPayload.total_hours = resolvedHours;
      }
      const { error: retryErr } = await supabase
        .from('attendance_timesheets')
        .update(minimalPayload)
        .eq('id', timesheetId);
      if (retryErr) console.warn('[AttendanceAPI] Minimal verify update warning:', retryErr.message);
    }
  } catch (err) {
    console.warn('[AttendanceAPI] Supabase verify handled:', err);
  }

  window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
  return true;
};

export const lockTimesheetsBySuperAdmin = async (
  timesheetIds: string[],
  superAdminId: string,
  superAdminName: string
): Promise<boolean> => {
  const lockedAt = new Date().toISOString();

  // Update local cache immediately
  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  timesheetIds.forEach(id => {
    const idx = local.findIndex(t => t.id === id);
    if (idx !== -1) {
      local[idx] = {
        ...local[idx],
        is_admin_verified: true,
        is_superadmin_locked: true,
        locked_by_superadmin_id: superAdminId,
        locked_by_superadmin_name: superAdminName,
        locked_at: lockedAt,
        status: 'locked',
        updated_at: lockedAt
      };
    }
  });
  saveLocalData(LOCAL_TIMESHEETS_KEY, local);

  // Write to Supabase — write both new boolean columns AND old text column
  try {
    const { error } = await supabase
      .from('attendance_timesheets')
      .update({
        // New columns (migration 20261027000001)
        is_admin_verified: true,
        is_superadmin_locked: true,
        locked_by_superadmin_id: superAdminId,
        locked_by_superadmin_name: superAdminName,
        locked_at: lockedAt,
        // Old text column backward compat
        locked_by: superAdminName,
        verified_by: superAdminName,
        status: 'locked',
        updated_at: lockedAt
      })
      .in('id', timesheetIds);

    if (error) {
      console.warn('[AttendanceAPI] Full lock update failed, retrying minimal:', error.message);
      // Minimal retry using only legacy columns
      await supabase
        .from('attendance_timesheets')
        .update({ locked_by: superAdminName, verified_by: superAdminName, status: 'Locked', updated_at: lockedAt })
        .in('id', timesheetIds);
    }
  } catch (err) {
    console.warn('[AttendanceAPI] Supabase lock handled:', err);
  }

  window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
  return true;
};

export const unlockTimesheetsBySuperAdmin = async (
  timesheetIds: string[],
  adminId: string,
  adminName: string
): Promise<boolean> => {
  const unlockedAt = new Date().toISOString();

  // Update local cache immediately
  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  timesheetIds.forEach(id => {
    const idx = local.findIndex(t => t.id === id);
    if (idx !== -1) {
      local[idx] = {
        ...local[idx],
        is_superadmin_locked: false,
        locked_by_superadmin_id: undefined,
        locked_by_superadmin_name: undefined,
        locked_at: undefined,
        status: 'completed',
        updated_at: unlockedAt
      };
    }
  });
  saveLocalData(LOCAL_TIMESHEETS_KEY, local);

  // Write to Supabase
  try {
    const { error } = await supabase
      .from('attendance_timesheets')
      .update({
        is_superadmin_locked: false,
        locked_by_superadmin_id: null,
        locked_by_superadmin_name: null,
        locked_at: null,
        locked_by: null,
        status: 'completed',
        updated_at: unlockedAt
      })
      .in('id', timesheetIds);

    if (error) {
      console.warn('[AttendanceAPI] Full unlock update failed, retrying minimal:', error.message);
      await supabase
        .from('attendance_timesheets')
        .update({ locked_by: null, status: 'Completed', updated_at: unlockedAt })
        .in('id', timesheetIds);
    }
  } catch (err) {
    console.warn('[AttendanceAPI] Supabase unlock handled:', err);
  }

  window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
  return true;
};

export const toggleTimesheetLock = async (
  timesheet: AttendanceTimesheet,
  adminId: string,
  adminName: string
): Promise<boolean> => {
  if (timesheet.is_superadmin_locked) {
    return unlockTimesheetsBySuperAdmin([timesheet.id], adminId, adminName);
  } else {
    return lockTimesheetsBySuperAdmin([timesheet.id], adminId, adminName);
  }
};

// ================= LEAVE & PERMISSIONS POLICIES API =================
export const getLeavePolicies = async (division?: string): Promise<LeavePolicyConfig[]> => {
  try {
    let query = supabase.from('leave_policy_configs').select('*').order('created_at', { ascending: true });
    if (division && division !== 'all' && division !== 'central') {
      query = query.or(`division.eq.${division},division.eq.all`);
    }
    const { data, error } = await query;
    if (error || !data) throw error;
    saveLocalData(LOCAL_POLICIES_KEY, data);
    return data as LeavePolicyConfig[];
  } catch (err) {
    return getLocalData<LeavePolicyConfig>(LOCAL_POLICIES_KEY, [
      {
        id: 'pol-cl',
        name: 'Casual Leave (CL)',
        code: 'CL',
        category: 'full_day',
        division: 'all',
        annual_quota_days: 12.0,
        monthly_max_permission_hours: 0,
        is_monetizable: true,
        is_encashable: false,
        requires_attachment: false,
        is_active: true,
        description: 'Standard paid personal leave'
      },
      {
        id: 'pol-sl',
        name: 'Sick / Medical Leave (SL)',
        code: 'SL',
        category: 'full_day',
        division: 'all',
        annual_quota_days: 10.0,
        monthly_max_permission_hours: 0,
        is_monetizable: true,
        is_encashable: false,
        requires_attachment: false,
        is_active: true,
        description: 'Medical leave with salary coverage'
      },
      {
        id: 'pol-pl',
        name: 'Annual Privilege Leave (PL)',
        code: 'PL',
        category: 'full_day',
        division: 'all',
        annual_quota_days: 15.0,
        monthly_max_permission_hours: 0,
        is_monetizable: true,
        is_encashable: true,
        requires_attachment: false,
        is_active: true,
        description: 'Paid holiday leave, encashable during annual appraisal'
      },
      {
        id: 'pol-unplanned',
        name: 'Unplanned / Emergency Leave',
        code: 'UNPLANNED',
        category: 'emergency',
        division: 'all',
        annual_quota_days: 5.0,
        monthly_max_permission_hours: 0,
        is_monetizable: true,
        is_encashable: false,
        requires_attachment: false,
        is_active: true,
        description: 'Emergency leave for unforeseen crisis'
      },
      {
        id: 'pol-half-day',
        name: 'Half-Day Leave',
        code: 'HALF_DAY',
        category: 'half_day',
        division: 'all',
        annual_quota_days: 8.0,
        monthly_max_permission_hours: 0,
        is_monetizable: true,
        is_encashable: false,
        requires_attachment: false,
        is_active: true,
        description: 'Half-day morning or evening leave (4 hours credit)'
      },
      {
        id: 'pol-hourly-perm',
        name: 'Hourly Permission (1-3 Hours)',
        code: 'HOURLY_PERM',
        category: 'hourly_permission',
        division: 'all',
        annual_quota_days: 0.0,
        monthly_max_permission_hours: 4.0,
        is_monetizable: true,
        is_encashable: false,
        requires_attachment: false,
        is_active: true,
        description: 'Short hourly permission up to 4 hrs / month without deduction'
      },
      {
        id: 'pol-unpaid',
        name: 'Unpaid Leave (Loss of Pay)',
        code: 'UNPAID',
        category: 'full_day',
        division: 'all',
        annual_quota_days: 99.0,
        monthly_max_permission_hours: 0,
        is_monetizable: false,
        is_encashable: false,
        requires_attachment: false,
        is_active: true,
        description: 'Leaves beyond quota; deducted during monthly payroll'
      }
    ]);
  }
};

export const upsertLeavePolicy = async (policy: Partial<LeavePolicyConfig>): Promise<LeavePolicyConfig> => {
  const rec: LeavePolicyConfig = {
    id: policy.id || `pol-${Date.now()}`,
    name: policy.name || 'Custom Policy',
    code: policy.code || `POL_${Date.now()}`,
    category: policy.category || 'full_day',
    division: policy.division || 'all',
    annual_quota_days: Number(policy.annual_quota_days) ?? 10,
    monthly_max_permission_hours: Number(policy.monthly_max_permission_hours) ?? 0,
    is_monetizable: policy.is_monetizable ?? true,
    is_encashable: policy.is_encashable ?? false,
    requires_attachment: policy.requires_attachment ?? false,
    description: policy.description || '',
    is_active: policy.is_active ?? true,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('leave_policy_configs')
      .upsert([rec], { onConflict: 'code' })
      .select()
      .single();

    if (error || !data) throw error;
    return data as LeavePolicyConfig;
  } catch (err) {
    const local = getLocalData<LeavePolicyConfig>(LOCAL_POLICIES_KEY, []);
    const idx = local.findIndex(p => p.code === rec.code);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...rec };
    } else {
      local.unshift(rec);
    }
    saveLocalData(LOCAL_POLICIES_KEY, local);
    return rec;
  }
};

// ================= ADMIN ROLE CHECK HELPER =================
export const isAdminUser = (role?: string | null, email?: string | null): boolean => {
  const r = (role || '').toLowerCase().trim();
  const e = (email || '').toLowerCase().trim();

  if ([
    'admin',
    'superadmin',
    'super_admin',
    'central_admin',
    'education_admin',
    'rimi_admin',
    'trade_admin',
    'digital_admin',
    'division_admin',
  ].includes(r)) {
    return true;
  }

  if (r.includes('admin') || r.includes('superadmin')) {
    return true;
  }

  if (
    e.includes('admin') ||
    e.includes('superadmin') ||
    e === 'education@ferex.com' ||
    e === 'trade@ferex.com' ||
    e === 'rimi@ferex.com' ||
    e === 'digital@ferex.com' ||
    e === 'centraladmin@ferexventures.com'
  ) {
    return true;
  }

  return false;
};

// ================= LEAVE & PERMISSION REQUESTS API =================
export const getLeaveRequests = async (filters?: {
  division?: string;
  userEmail?: string;
  status?: string;
  excludeAdmins?: boolean;
  adminsOnly?: boolean;
}): Promise<LeavePermissionRequest[]> => {
  try {
    let query = supabase.from('leave_permission_requests').select('*').order('created_at', { ascending: false });
    if (filters?.division && filters.division !== 'all' && filters.division !== 'central') {
      query = query.eq('division', filters.division);
    }
    if (filters?.userEmail) {
      query = query.eq('user_email', filters.userEmail);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    const { data, error } = await query;
    if (error || !data) throw error;
    saveLocalData(LOCAL_LEAVE_REQ_KEY, data);
    
    let result = (data as LeavePermissionRequest[]).map(r => ({
      ...r,
      is_admin_request: r.is_admin_request ?? isAdminUser(r.user_role, r.user_email)
    }));

    if (filters?.excludeAdmins) {
      result = result.filter(r => !r.is_admin_request && !isAdminUser(r.user_role, r.user_email));
    }
    if (filters?.adminsOnly) {
      result = result.filter(r => r.is_admin_request || isAdminUser(r.user_role, r.user_email));
    }

    return result;
  } catch (err) {
    let local = getLocalData<LeavePermissionRequest>(LOCAL_LEAVE_REQ_KEY, []);
    local = local.map(r => ({
      ...r,
      is_admin_request: r.is_admin_request ?? isAdminUser(r.user_role, r.user_email)
    }));

    if (filters?.division && filters.division !== 'all' && filters.division !== 'central') {
      local = local.filter(r => r.division === filters.division);
    }
    if (filters?.userEmail) {
      local = local.filter(r => r.user_email === filters.userEmail);
    }
    if (filters?.status && filters.status !== 'all') {
      local = local.filter(r => r.status === filters.status);
    }
    if (filters?.excludeAdmins) {
      local = local.filter(r => !r.is_admin_request && !isAdminUser(r.user_role, r.user_email));
    }
    if (filters?.adminsOnly) {
      local = local.filter(r => r.is_admin_request || isAdminUser(r.user_role, r.user_email));
    }
    return local;
  }
};

export const createLeaveRequest = async (
  req: Partial<LeavePermissionRequest>
): Promise<LeavePermissionRequest> => {
  let division = req.division;
  if (!division || division === 'education') {
    const inferred = inferDivision(req.user_role, undefined, req.user_email);
    if (inferred !== 'education') {
      division = inferred;
    }
  }

  const isAdmin = req.is_admin_request !== undefined ? req.is_admin_request : isAdminUser(req.user_role, req.user_email);

  const newReq: LeavePermissionRequest = {
    id: req.id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: req.user_id || null,
    user_email: req.user_email || '',
    user_name: req.user_name || 'Staff Member',
    user_role: req.user_role || (isAdmin ? 'admin' : 'staff'),
    division: division || 'education',
    is_admin_request: isAdmin,
    request_type: req.request_type || 'full_day_leave',
    policy_code: req.policy_code || 'CL',
    policy_name: req.policy_name || 'Casual Leave',
    start_date: req.start_date || new Date().toISOString().split('T')[0],
    end_date: req.end_date || req.start_date || new Date().toISOString().split('T')[0],
    half_day_session: req.half_day_session || null,
    permission_start_time: req.permission_start_time || null,
    permission_end_time: req.permission_end_time || null,
    permission_hours: req.permission_hours || 0,
    total_days: req.total_days || 1,
    is_monetizable: req.is_monetizable ?? true,
    reason: req.reason || 'Personal necessity',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('leave_permission_requests')
      .insert([newReq])
      .select()
      .single();

    if (error || !data) throw error;
    window.dispatchEvent(new CustomEvent('ferex-leave-updated'));
    return data as LeavePermissionRequest;
  } catch (err) {
    const local = getLocalData<LeavePermissionRequest>(LOCAL_LEAVE_REQ_KEY, []);
    local.unshift(newReq);
    saveLocalData(LOCAL_LEAVE_REQ_KEY, local);
    window.dispatchEvent(new CustomEvent('ferex-leave-updated'));
    return newReq;
  }
};

export const updateLeaveRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected' | 'cancelled',
  reviewerId: string,
  reviewerName: string,
  reviewNotes?: string
): Promise<boolean> => {
  const reviewedAt = new Date().toISOString();
  const updates = {
    status,
    reviewed_by_id: reviewerId,
    reviewed_by_name: reviewerName,
    reviewed_at: reviewedAt,
    review_notes: reviewNotes || `Status updated to ${status}`,
    updated_at: reviewedAt
  };

  // Always update local cache first (optimistic update)
  const local = getLocalData<LeavePermissionRequest>(LOCAL_LEAVE_REQ_KEY, []);
  const idx = local.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updates };
    saveLocalData(LOCAL_LEAVE_REQ_KEY, local);
  }

  try {
    const { error } = await supabase
      .from('leave_permission_requests')
      .update(updates)
      .eq('id', requestId);

    if (error) console.warn('[AttendanceAPI] Leave status update DB warning:', error.message);
  } catch (err) {
    console.warn('[AttendanceAPI] Leave status update handled locally:', err);
  }

  window.dispatchEvent(new CustomEvent('ferex-leave-updated'));
  return true;
};

// ================= SALARIES & PAYROLL API =================
export const getEmployeeSalaries = async (): Promise<EmployeeSalary[]> => {
  try {
    const { data, error } = await supabase
      .from('employee_salaries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) throw error;
    saveLocalData(LOCAL_SALARIES_KEY, data);
    return data as EmployeeSalary[];
  } catch (err) {
    return getLocalData<EmployeeSalary>(LOCAL_SALARIES_KEY, [
      {
        id: 'sal-01',
        user_id: 'usr-admin-01',
        user_email: 'admin@ferex.com',
        user_name: 'Central Admin',
        user_role: 'superadmin',
        division: 'central',
        salary_type: 'both',
        monthly_base_salary: 7500,
        hourly_rate: 45,
        currency: 'USD',
        effective_from: '2026-01-01'
      },
      {
        id: 'sal-02',
        user_id: 'usr-edu-01',
        user_email: 'education@ferex.com',
        user_name: 'Education Admin',
        user_role: 'admin',
        division: 'education',
        salary_type: 'monthly',
        monthly_base_salary: 5000,
        hourly_rate: 30,
        currency: 'USD',
        effective_from: '2026-01-01'
      },
      {
        id: 'sal-03',
        user_id: 'usr-counselor-01',
        user_email: 'counselor@ferex.com',
        user_name: 'Study Abroad Counselor',
        user_role: 'counselor',
        division: 'education',
        salary_type: 'monthly',
        monthly_base_salary: 3800,
        hourly_rate: 22,
        currency: 'USD',
        effective_from: '2026-01-01'
      },
      {
        id: 'sal-04',
        user_id: 'usr-rimi-01',
        user_email: 'rimi@ferex.com',
        user_name: 'Rimi Frozen Admin',
        user_role: 'admin',
        division: 'rimi',
        salary_type: 'monthly',
        monthly_base_salary: 5200,
        hourly_rate: 31,
        currency: 'USD',
        effective_from: '2026-01-01'
      },
      {
        id: 'sal-05',
        user_id: 'usr-trade-01',
        user_email: 'trade@ferex.com',
        user_name: 'Global Trade Director',
        user_role: 'admin',
        division: 'trade',
        salary_type: 'both',
        monthly_base_salary: 6000,
        hourly_rate: 35,
        currency: 'USD',
        effective_from: '2026-01-01'
      },
      {
        id: 'sal-06',
        user_id: 'usr-digital-01',
        user_email: 'digital@ferex.com',
        user_name: 'Digital Agency Admin',
        user_role: 'admin',
        division: 'digital',
        salary_type: 'monthly',
        monthly_base_salary: 5500,
        hourly_rate: 32,
        currency: 'USD',
        effective_from: '2026-01-01'
      },
      {
        id: 'sal-07',
        user_id: 'usr-digimanager-01',
        user_email: 'digimanager@ferex.com',
        user_name: 'Digital Project Lead',
        user_role: 'digital_manager',
        division: 'digital',
        salary_type: 'hourly',
        monthly_base_salary: 4500,
        hourly_rate: 26,
        currency: 'USD',
        effective_from: '2026-01-01'
      }
    ]);
  }
};

export const upsertEmployeeSalary = async (salary: Partial<EmployeeSalary>): Promise<EmployeeSalary> => {
  const salaryType = salary.salary_type || 'both';
  const rec: EmployeeSalary = {
    id: salary.id || `sal-${Date.now()}`,
    user_id: salary.user_id || `usr-${Date.now()}`,
    user_email: salary.user_email || '',
    user_name: salary.user_name || 'Staff Member',
    user_role: salary.user_role || 'staff',
    division: salary.division || 'general',
    salary_type: salaryType,
    monthly_base_salary: Number(salary.monthly_base_salary) || 0,
    hourly_rate: Number(salary.hourly_rate) || 0,
    currency: salary.currency || 'USD',
    bank_account_name: salary.bank_account_name || null,
    bank_account_number: salary.bank_account_number || null,
    bank_name: salary.bank_name || null,
    effective_from: salary.effective_from || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('employee_salaries')
      .upsert([rec], { onConflict: 'user_email' })
      .select()
      .single();

    if (error || !data) throw error;
    return data as EmployeeSalary;
  } catch (err) {
    const local = getLocalData<EmployeeSalary>(LOCAL_SALARIES_KEY, []);
    const idx = local.findIndex(s => s.user_email === rec.user_email);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...rec };
    } else {
      local.unshift(rec);
    }
    saveLocalData(LOCAL_SALARIES_KEY, local);
    return rec;
  }
};

export const getMonthlyPayrolls = async (month?: string): Promise<MonthlyPayroll[]> => {
  try {
    let query = supabase.from('monthly_payrolls').select('*').order('created_at', { ascending: false });
    if (month) {
      query = query.eq('payroll_month', month);
    }
    const { data, error } = await query;
    if (error || !data) throw error;
    return data as MonthlyPayroll[];
  } catch (err) {
    const local = getLocalData<MonthlyPayroll>(LOCAL_PAYROLLS_KEY, []);
    if (month) {
      return local.filter(p => p.payroll_month === month);
    }
    return local;
  }
};

export const generateMonthlyPayroll = async (
  month: string,
  processedById: string,
  processedByName: string,
  customDeductionsMap?: Record<string, PayrollDeductionInput>
): Promise<MonthlyPayroll[]> => {
  const [salaries, allTimesheets, allLeaveRequests] = await Promise.all([
    getEmployeeSalaries(),
    getTimesheets({ startDate: `${month}-01`, endDate: `${month}-31` }),
    getLeaveRequests()
  ]);

  const payrolls: MonthlyPayroll[] = [];

  for (const salary of salaries) {
    const userTimesheets = allTimesheets.filter(t => t.user_email === salary.user_email);
    const verifiedTimesheets = userTimesheets.filter(t => t.is_admin_verified || t.is_superadmin_locked);

    const userLeaves = allLeaveRequests.filter(
      l => l.user_email === salary.user_email && l.status === 'approved' && l.start_date.startsWith(month)
    );

    const paidLeaveDays = userLeaves.filter(l => l.is_monetizable).reduce((sum, l) => sum + (l.total_days || 0), 0);
    const unpaidLeaveDays = userLeaves.filter(l => !l.is_monetizable).reduce((sum, l) => sum + (l.total_days || 0), 0);

    const attendedDays = verifiedTimesheets.length + paidLeaveDays;
    const verifiedHours = verifiedTimesheets.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
    const totalWorkingDays = 22;

    const salaryType = salary.salary_type || 'both';
    let calculatedGross = 0;

    if (salaryType === 'hourly') {
      // Hourly scale: strictly based on verified working hours
      calculatedGross = Number((verifiedHours * (salary.hourly_rate || 0)).toFixed(2));
    } else if (salaryType === 'monthly') {
      // Monthly scale: fixed base prorated by attended days (including paid leaves)
      if (attendedDays >= totalWorkingDays) {
        calculatedGross = salary.monthly_base_salary;
      } else if (attendedDays > 0) {
        calculatedGross = Number(((salary.monthly_base_salary / totalWorkingDays) * attendedDays).toFixed(2));
      } else {
        calculatedGross = 0;
      }
    } else {
      // Both: Monthly base salary prorated by attendance + hourly overtime for verified hours exceeding standard shift quota (176 hrs)
      let basePart = salary.monthly_base_salary;
      if (attendedDays < totalWorkingDays && attendedDays > 0) {
        basePart = Number(((salary.monthly_base_salary / totalWorkingDays) * attendedDays).toFixed(2));
      } else if (attendedDays === 0) {
        basePart = 0;
      }
      const standardHoursThreshold = totalWorkingDays * 8; // 176 hrs
      const overtimeHours = Math.max(0, verifiedHours - standardHoursThreshold);
      const overtimePay = Number((overtimeHours * (salary.hourly_rate || 0)).toFixed(2));
      calculatedGross = Number((basePart + overtimePay).toFixed(2));
    }

    // Default unpaid deductions apply to monthly base salary
    let defaultLopDeduction = 0;
    if (salaryType !== 'hourly' && unpaidLeaveDays > 0) {
      defaultLopDeduction = Number(((salary.monthly_base_salary / totalWorkingDays) * unpaidLeaveDays).toFixed(2));
    }

    // Check if custom deductions were supplied
    const deductionOverride = customDeductionsMap ? customDeductionsMap[salary.user_email] : undefined;
    const lopDeduction = deductionOverride?.lossOfPayDeduction !== undefined
      ? deductionOverride.lossOfPayDeduction
      : defaultLopDeduction;
    const customDeductions = deductionOverride?.customDeductions ?? 0;
    const deductionReason = deductionOverride?.deductionReason || (lopDeduction > 0 ? `${unpaidLeaveDays} unpaid leave day(s)` : '');
    const allowances = deductionOverride?.allowances !== undefined ? deductionOverride.allowances : 150;

    const totalDeductions = Number((lopDeduction + customDeductions).toFixed(2));
    const netPayable = Math.max(0, Number((calculatedGross + allowances - totalDeductions).toFixed(2)));

    const payrollItem: MonthlyPayroll = {
      id: `pay-${month}-${salary.user_email.replace(/[@.]/g, '-')}`,
      payroll_month: month,
      user_id: salary.user_id,
      user_email: salary.user_email,
      user_name: salary.user_name,
      division: salary.division,
      user_role: salary.user_role,
      total_working_days: totalWorkingDays,
      attended_days: Math.min(totalWorkingDays, attendedDays),
      verified_hours: Number(verifiedHours.toFixed(1)),
      salary_type: salaryType,
      base_salary: salary.monthly_base_salary,
      hourly_rate: salary.hourly_rate,
      calculated_gross_pay: calculatedGross,
      allowances,
      deductions: totalDeductions,
      loss_of_pay_deduction: lopDeduction,
      custom_deductions: customDeductions,
      deduction_reason: deductionReason,
      net_payable: netPayable,
      status: 'approved',
      processed_by_id: processedById,
      processed_by_name: processedByName,
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    payrolls.push(payrollItem);
  }

  try {
    const { data, error } = await supabase
      .from('monthly_payrolls')
      .upsert(payrolls, { onConflict: 'payroll_month,user_email' })
      .select();

    if (error || !data) throw error;
    saveLocalData(LOCAL_PAYROLLS_KEY, data as MonthlyPayroll[]);
    window.dispatchEvent(new CustomEvent('ferex-payroll-updated'));
    return data as MonthlyPayroll[];
  } catch (err) {
    saveLocalData(LOCAL_PAYROLLS_KEY, payrolls);
    window.dispatchEvent(new CustomEvent('ferex-payroll-updated'));
    return payrolls;
  }
};

export const updatePayrollItem = async (
  payrollId: string,
  updates: Partial<MonthlyPayroll>
): Promise<MonthlyPayroll | null> => {
  const local = getLocalData<MonthlyPayroll>(LOCAL_PAYROLLS_KEY, []);
  const idx = local.findIndex(p => p.id === payrollId);
  let updated: MonthlyPayroll | null = null;

  if (idx !== -1) {
    const current = local[idx];
    const lop = updates.loss_of_pay_deduction !== undefined ? updates.loss_of_pay_deduction : (current.loss_of_pay_deduction || 0);
    const custom = updates.custom_deductions !== undefined ? updates.custom_deductions : (current.custom_deductions || 0);
    const totalDeductions = Number((lop + custom).toFixed(2));
    const allow = updates.allowances !== undefined ? updates.allowances : current.allowances;
    const gross = updates.calculated_gross_pay !== undefined ? updates.calculated_gross_pay : current.calculated_gross_pay;
    const net = Math.max(0, Number((gross + allow - totalDeductions).toFixed(2)));

    updated = {
      ...current,
      ...updates,
      deductions: totalDeductions,
      loss_of_pay_deduction: lop,
      custom_deductions: custom,
      allowances: allow,
      net_payable: net,
      updated_at: new Date().toISOString()
    };
    local[idx] = updated;
    saveLocalData(LOCAL_PAYROLLS_KEY, local);
  }

  try {
    if (updated) {
      await supabase
        .from('monthly_payrolls')
        .update({
          deductions: updated.deductions,
          loss_of_pay_deduction: updated.loss_of_pay_deduction,
          custom_deductions: updated.custom_deductions,
          deduction_reason: updated.deduction_reason,
          allowances: updated.allowances,
          net_payable: updated.net_payable,
          status: updated.status,
          updated_at: updated.updated_at
        })
        .eq('id', payrollId);
    }
  } catch (err) {
    console.warn('[AttendanceAPI] Supabase updatePayrollItem handled:', err);
  }

  window.dispatchEvent(new CustomEvent('ferex-payroll-updated'));
  return updated;
};

// ================= DATE FILTER & ATTENDANCE HELPERS =================
export const getDateRangeForPeriod = (
  period: 'daily' | 'weekly' | 'monthly' | 'all',
  selectedDate?: string, // 'YYYY-MM-DD'
  selectedMonth?: string // 'YYYY-MM'
): { startDate?: string; endDate?: string; label: string } => {
  const now = new Date();
  const todayStr = selectedDate || now.toISOString().split('T')[0];

  if (period === 'daily') {
    const d = new Date(todayStr + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    return { startDate: todayStr, endDate: todayStr, label: `Daily: ${label}` };
  }

  if (period === 'weekly') {
    const d = new Date(todayStr + 'T00:00:00');
    const dayOfWeek = d.getDay(); // 0 is Sunday
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startStr = monday.toISOString().split('T')[0];
    const endStr = sunday.toISOString().split('T')[0];
    const monLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sunLabel = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { startDate: startStr, endDate: endStr, label: `Weekly: ${monLabel} – ${sunLabel}` };
  }

  if (period === 'monthly') {
    const mStr = selectedMonth || todayStr.slice(0, 7);
    const parts = mStr.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const lastDay = new Date(y, m, 0).getDate();
    const startStr = `${mStr}-01`;
    const endStr = `${mStr}-${String(lastDay).padStart(2, '0')}`;
    const d = new Date(y, m - 1, 1);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { startDate: startStr, endDate: endStr, label: `Monthly: ${monthLabel}` };
  }

  return { label: 'All Records' };
};

export const isTimesheetForAdmin = (t: AttendanceTimesheet): boolean => {
  const r = (t.user_role || '').toLowerCase();
  const e = (t.user_email || '').toLowerCase();
  return (
    r.includes('admin') ||
    r === 'superadmin' ||
    e.includes('admin') ||
    e === 'education@ferex.com' ||
    e === 'trade@ferex.com' ||
    e === 'rimi@ferex.com' ||
    e === 'digital@ferex.com' ||
    e === 'centraladmin@ferexventures.com' ||
    e === 'eduadmin@santoge.com'
  );
};

export const closeTimesheetForDay = async (
  timesheetId: string,
  closedById: string,
  closedByName: string,
  hoursOverride?: number
): Promise<AttendanceTimesheet | null> => {
  await verifyTimesheetByAdmin(
    timesheetId,
    closedById,
    closedByName,
    `Shift closed and locked for payroll by ${closedByName}`,
    hoursOverride
  );
  await lockTimesheetsBySuperAdmin([timesheetId], closedById, closedByName);

  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  return local.find(t => t.id === timesheetId) || null;
};
