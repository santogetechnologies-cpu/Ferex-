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
const {data,error}=await supabase.from('shifts').select('*');if(error)throw error;return (data||[]).map(formatShiftFromDb).filter(s=>(!division||division==='all'||s.division===division||s.division==='all')&&s.is_active&&(!s.assigned_staff_emails?.length||s.assigned_staff_emails.includes(userEmail||''))&&(!s.assigned_roles?.length||s.assigned_roles.includes(userRole||'')));
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
const {data,error}=await supabase.from('attendance_timesheets').select('*').eq('user_email',userEmail).is('clock_out',null).order('clock_in',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data?{...data,date:data.work_date,status:'active'}:null;
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
const {data,error}=await supabase.rpc('ferex_clock_in',{p_division:params.division,p_shift:params.shiftId || null});if(error)throw error;window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));return {...data,date:data.work_date};
};

export const clockOut = async (
  timesheetId: string,
  workSummary: string
): Promise<AttendanceTimesheet | null> => {
const {data,error}=await supabase.rpc('ferex_clock_out',{p_id:timesheetId,p_summary:workSummary});if(error)throw error;window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));return {...data,date:data.work_date};
};

export const getTimesheets = async (filters?: {
  division?: string;
  userEmail?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<AttendanceTimesheet[]> => {
let query=supabase.from('attendance_timesheets').select('*').order('clock_in',{ascending:false});
 if(filters?.division && filters.division!=='all')query=query.eq('division',filters.division);
 if(filters?.userEmail)query=query.eq('user_email',filters.userEmail);
 if(filters?.date)query=query.eq('work_date',filters.date);
 if(filters?.startDate)query=query.gte('work_date',filters.startDate);
 if(filters?.endDate)query=query.lte('work_date',filters.endDate);
 if(filters?.status)query=query.eq('status',filters.status);
 const {data,error}=await query;if(error)throw error;return (data||[]).map(t=>({...t,date:t.work_date}));
};

export const verifyTimesheetByAdmin = async (
  timesheetId: string,
  adminId: string,
  adminName: string,
  notes?: string,
  hoursOverride?: number
): Promise<boolean> => {
if(hoursOverride!==undefined&&(!Number.isFinite(hoursOverride)||hoursOverride<0||hoursOverride>24))throw new Error('Verified hours must be between 0 and 24');const {error}=await supabase.from('attendance_timesheets').update({is_admin_verified:true,verified_by_admin_id:adminId,verified_by_admin_name:adminName,verified_at:new Date().toISOString(),admin_notes:notes,status:'verified',...(hoursOverride!==undefined?{total_hours:hoursOverride}:{})}).eq('id',timesheetId).select('id').single();if(error)throw error;window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));return true;
};

export const lockTimesheetsBySuperAdmin = async (
  timesheetIds: string[],
  superAdminId: string,
  superAdminName: string
): Promise<boolean> => {
const {data,error}=await supabase.from('attendance_timesheets').update({is_superadmin_locked:true,locked_by_superadmin_id:superAdminId,locked_by_superadmin_name:superAdminName,locked_at:new Date().toISOString(),status:'locked'}).in('id',timesheetIds).select('id');if(error||data?.length!==timesheetIds.length)throw new Error(error?.message||'Some timesheets could not be locked');window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));return true;
};

export const unlockTimesheetsBySuperAdmin = async (
  timesheetIds: string[],
  adminId: string,
  adminName: string
): Promise<boolean> => {
const {data,error}=await supabase.from('attendance_timesheets').update({is_superadmin_locked:false,locked_by_superadmin_id:null,locked_by_superadmin_name:null,locked_at:null,status:'completed'}).in('id',timesheetIds).select('id');if(error||data?.length!==timesheetIds.length)throw new Error(error?.message||'Some timesheets could not be unlocked');window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));return true;
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
const {data,error}=await supabase.from('leave_policy_configs').select('*').eq('is_active',true);if(error)throw error;return (data||[]).filter(p=>!division||division==='all'||p.division===division||p.division==='all');
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
let q=supabase.from('leave_permission_requests').select('*').order('created_at',{ascending:false});if(filters?.division&& !['all','central'].includes(filters.division))q=q.eq('division',filters.division);if(filters?.userEmail)q=q.eq('user_email',filters.userEmail);if(filters?.status&&filters.status!=='all')q=q.eq('status',filters.status);const {data,error}=await q;if(error)throw error;return (data||[]).filter(r=>(!filters?.excludeAdmins||!r.is_admin_request)&&(!filters?.adminsOnly||r.is_admin_request));
};

export const createLeaveRequest = async (
  req: Partial<LeavePermissionRequest>
): Promise<LeavePermissionRequest> => {
const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in required');if(!req.reason?.trim()||!req.start_date||!req.end_date||req.end_date<req.start_date)throw new Error('Reason and valid leave dates required');const {data:profile,error:profileError}=await supabase.from('users').select('role,full_name').eq('id',user.id).single();if(profileError)throw profileError;const {data,error}=await supabase.from('leave_permission_requests').insert({...req,id:crypto.randomUUID(),user_id:user.id,user_email:user.email,user_name:profile.full_name,user_role:profile.role,is_admin_request:['digital_admin','digital','ferex_digital','central','superadmin','super_admin'].includes(profile.role),status:'pending'}).select().single();if(error)throw error;window.dispatchEvent(new CustomEvent('ferex-leave-updated'));return data;
};

export const updateLeaveRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected' | 'cancelled',
  reviewerId: string,
  reviewerName: string,
  reviewNotes?: string
): Promise<boolean> => {
const {error}=await supabase.from('leave_permission_requests').update({status,reviewed_by_id:reviewerId,reviewed_by_name:reviewerName,review_notes:reviewNotes,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',requestId).select('id').single();if(error)throw error;window.dispatchEvent(new CustomEvent('ferex-leave-updated'));return true;
};

// ================= SALARIES & PAYROLL API =================
export const getEmployeeSalaries = async (): Promise<EmployeeSalary[]> => {
const {data,error}=await supabase.from('employee_salaries').select('*');if(error)throw error;return data||[];
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
let q=supabase.from('monthly_payrolls').select('*');if(month)q=q.eq('payroll_month',month);const {data,error}=await q;if(error)throw error;return data||[];
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
