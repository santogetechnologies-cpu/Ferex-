import { supabase } from '../supabase';

export interface Shift {
  id: string;
  name: string;
  division: string;
  start_time: string; // '09:00:00'
  end_time: string;   // '18:00:00'
  grace_period_mins: number;
  half_day_threshold_hours: number;
  full_day_threshold_hours: number;
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
  code: string; // 'CL', 'SL', 'PL', 'UNPLANNED', 'HOURLY_PERM', 'HALF_DAY', 'UNPAID'
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
  payroll_month: string; // 'YYYY-MM'
  user_id: string;
  user_email: string;
  user_name: string;
  division: string;
  user_role: string;
  total_working_days: number;
  attended_days: number;
  verified_hours: number;
  base_salary: number;
  hourly_rate: number;
  calculated_gross_pay: number;
  allowances: number;
  deductions: number;
  net_payable: number;
  status: 'draft' | 'approved' | 'paid' | 'locked';
  payment_reference?: string | null;
  processed_by_id?: string | null;
  processed_by_name?: string | null;
  processed_at?: string | null;
  created_at?: string;
  updated_at?: string;
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
export const getShifts = async (division?: string): Promise<Shift[]> => {
  try {
    let query = supabase.from('shifts').select('*').order('created_at', { ascending: false });
    if (division && division !== 'all' && division !== 'central') {
      query = query.or(`division.eq.${division},division.eq.all`);
    }
    const { data, error } = await query;
    if (error || !data) throw error;
    saveLocalData(LOCAL_SHIFTS_KEY, data);
    return data as Shift[];
  } catch (err) {
    const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, [
      {
        id: 'shift-std-01',
        name: 'Standard Morning Shift',
        division: 'all',
        start_time: '09:00:00',
        end_time: '18:00:00',
        grace_period_mins: 15,
        half_day_threshold_hours: 4.5,
        full_day_threshold_hours: 8.0,
        is_active: true
      },
      {
        id: 'shift-edu-01',
        name: 'Counselor Day Shift',
        division: 'education',
        start_time: '09:30:00',
        end_time: '18:30:00',
        grace_period_mins: 15,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        is_active: true
      },
      {
        id: 'shift-rimi-01',
        name: 'Warehouse & Logistics Shift',
        division: 'rimi',
        start_time: '08:00:00',
        end_time: '17:00:00',
        grace_period_mins: 10,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        is_active: true
      },
      {
        id: 'shift-trade-01',
        name: 'Global Trading Floor Shift',
        division: 'trade',
        start_time: '08:30:00',
        end_time: '17:30:00',
        grace_period_mins: 15,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        is_active: true
      },
      {
        id: 'shift-digital-01',
        name: 'Tech & PM Core Shift',
        division: 'digital',
        start_time: '10:00:00',
        end_time: '19:00:00',
        grace_period_mins: 20,
        half_day_threshold_hours: 4.0,
        full_day_threshold_hours: 8.0,
        is_active: true
      }
    ]);
    if (division && division !== 'all' && division !== 'central') {
      return local.filter(s => s.division === division || s.division === 'all');
    }
    return local;
  }
};

export const createShift = async (shift: Partial<Shift>): Promise<Shift> => {
  const newShift: Shift = {
    id: `shift-${Date.now()}`,
    name: shift.name || 'General Shift',
    division: shift.division || 'all',
    start_time: shift.start_time || '09:00:00',
    end_time: shift.end_time || '18:00:00',
    grace_period_mins: shift.grace_period_mins ?? 15,
    half_day_threshold_hours: shift.half_day_threshold_hours ?? 4.0,
    full_day_threshold_hours: shift.full_day_threshold_hours ?? 8.0,
    is_active: shift.is_active ?? true,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('shifts').insert([newShift]).select().single();
    if (error || !data) throw error;
    return data as Shift;
  } catch (err) {
    const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, []);
    local.unshift(newShift);
    saveLocalData(LOCAL_SHIFTS_KEY, local);
    return newShift;
  }
};

export const updateShift = async (id: string, updates: Partial<Shift>): Promise<Shift | null> => {
  try {
    const { data, error } = await supabase.from('shifts').update(updates).eq('id', id).select().single();
    if (error || !data) throw error;
    return data as Shift;
  } catch (err) {
    const local = getLocalData<Shift>(LOCAL_SHIFTS_KEY, []);
    const idx = local.findIndex(s => s.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...updates, updated_at: new Date().toISOString() };
      saveLocalData(LOCAL_SHIFTS_KEY, local);
      return local[idx];
    }
    return null;
  }
};

// ================= ATTENDANCE & TIMESHEETS API =================
export const getActiveClockIn = async (userEmail: string): Promise<AttendanceTimesheet | null> => {
  try {
    const { data, error } = await supabase
      .from('attendance_timesheets')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active')
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as AttendanceTimesheet;
  } catch (err) {
    console.warn('Active clock-in query fallback:', err);
  }

  const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
  return local.find(t => t.user_email === userEmail && t.status === 'active') || null;
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
  const newRecord: AttendanceTimesheet = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

  try {
    const { data, error } = await supabase
      .from('attendance_timesheets')
      .insert([newRecord])
      .select()
      .single();
    if (error || !data) throw error;
    window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
    return data as AttendanceTimesheet;
  } catch (err) {
    const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
    local.unshift(newRecord);
    saveLocalData(LOCAL_TIMESHEETS_KEY, local);
    window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
    return newRecord;
  }
};

export const clockOut = async (
  timesheetId: string,
  workSummary: string
): Promise<AttendanceTimesheet | null> => {
  const clockOutTime = new Date().toISOString();

  try {
    let clockInTime: string | null = null;
    const { data: current } = await supabase
      .from('attendance_timesheets')
      .select('clock_in')
      .eq('id', timesheetId)
      .single();

    if (current) clockInTime = current.clock_in;

    let totalHours = 8.0;
    if (clockInTime) {
      const diffMs = new Date(clockOutTime).getTime() - new Date(clockInTime).getTime();
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
      .single();

    if (error || !data) throw error;
    window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
    return data as AttendanceTimesheet;
  } catch (err) {
    const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
    const idx = local.findIndex(t => t.id === timesheetId);
    if (idx !== -1) {
      const rec = local[idx];
      const diffMs = new Date(clockOutTime).getTime() - new Date(rec.clock_in).getTime();
      const totalHours = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
      local[idx] = {
        ...rec,
        clock_out: clockOutTime,
        work_summary: workSummary,
        total_hours: totalHours,
        status: 'completed',
        updated_at: clockOutTime
      };
      saveLocalData(LOCAL_TIMESHEETS_KEY, local);
      window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
      return local[idx];
    }
    return null;
  }
};

export const getTimesheets = async (filters?: {
  division?: string;
  userEmail?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  excludeAdmins?: boolean;
  onlyAdmins?: boolean;
}): Promise<AttendanceTimesheet[]> => {
  try {
    let query = supabase.from('attendance_timesheets').select('*').order('clock_in', { ascending: false });

    if (filters?.division && filters.division !== 'all' && filters.division !== 'central') {
      query = query.eq('division', filters.division);
    }
    if (filters?.userEmail) {
      query = query.eq('user_email', filters.userEmail);
    }
    if (filters?.date) {
      query = query.eq('date', filters.date);
    }
    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error || !data) throw error;
    return data as AttendanceTimesheet[];
  } catch (err) {
    let local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
    if (filters?.division && filters.division !== 'all' && filters.division !== 'central') {
      local = local.filter(t => t.division === filters.division);
    }
    if (filters?.userEmail) {
      local = local.filter(t => t.user_email === filters.userEmail);
    }
    if (filters?.date) {
      local = local.filter(t => t.date === filters.date);
    }
    if (filters?.startDate) {
      local = local.filter(t => t.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      local = local.filter(t => t.date <= filters.endDate!);
    }
    if (filters?.status && filters.status !== 'all') {
      local = local.filter(t => t.status === filters.status);
    }
    return local;
  }
};

export const verifyTimesheetByAdmin = async (
  timesheetId: string,
  adminId: string,
  adminName: string,
  notes?: string
): Promise<boolean> => {
  const verifiedAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('attendance_timesheets')
      .update({
        is_admin_verified: true,
        verified_by_admin_id: adminId,
        verified_by_admin_name: adminName,
        verified_at: verifiedAt,
        status: 'verified',
        admin_notes: notes || 'Verified by Division Admin'
      })
      .eq('id', timesheetId);

    if (error) throw error;
    window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
    return true;
  } catch (err) {
    const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
    const idx = local.findIndex(t => t.id === timesheetId);
    if (idx !== -1) {
      local[idx] = {
        ...local[idx],
        is_admin_verified: true,
        verified_by_admin_id: adminId,
        verified_by_admin_name: adminName,
        verified_at: verifiedAt,
        status: 'verified',
        admin_notes: notes || 'Verified by Division Admin'
      };
      saveLocalData(LOCAL_TIMESHEETS_KEY, local);
      window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
      return true;
    }
    return false;
  }
};

export const lockTimesheetsBySuperAdmin = async (
  timesheetIds: string[],
  superAdminId: string,
  superAdminName: string
): Promise<boolean> => {
  const lockedAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('attendance_timesheets')
      .update({
        is_superadmin_locked: true,
        locked_by_superadmin_id: superAdminId,
        locked_by_superadmin_name: superAdminName,
        locked_at: lockedAt,
        status: 'locked'
      })
      .in('id', timesheetIds);

    if (error) throw error;
    window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
    return true;
  } catch (err) {
    const local = getLocalData<AttendanceTimesheet>(LOCAL_TIMESHEETS_KEY, []);
    timesheetIds.forEach(id => {
      const idx = local.findIndex(t => t.id === id);
      if (idx !== -1) {
        local[idx] = {
          ...local[idx],
          is_superadmin_locked: true,
          locked_by_superadmin_id: superAdminId,
          locked_by_superadmin_name: superAdminName,
          locked_at: lockedAt,
          status: 'locked'
        };
      }
    });
    saveLocalData(LOCAL_TIMESHEETS_KEY, local);
    window.dispatchEvent(new CustomEvent('ferex-attendance-updated'));
    return true;
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

// ================= LEAVE & PERMISSION REQUESTS API =================
export const getLeaveRequests = async (filters?: {
  division?: string;
  userEmail?: string;
  status?: string;
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
    return data as LeavePermissionRequest[];
  } catch (err) {
    let local = getLocalData<LeavePermissionRequest>(LOCAL_LEAVE_REQ_KEY, []);
    if (filters?.division && filters.division !== 'all' && filters.division !== 'central') {
      local = local.filter(r => r.division === filters.division);
    }
    if (filters?.userEmail) {
      local = local.filter(r => r.user_email === filters.userEmail);
    }
    if (filters?.status && filters.status !== 'all') {
      local = local.filter(r => r.status === filters.status);
    }
    return local;
  }
};

export const createLeaveRequest = async (
  req: Partial<LeavePermissionRequest>
): Promise<LeavePermissionRequest> => {
  const newReq: LeavePermissionRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: req.user_id || null,
    user_email: req.user_email || '',
    user_name: req.user_name || 'Staff Member',
    user_role: req.user_role || 'staff',
    division: req.division || 'education',
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
  try {
    const { error } = await supabase
      .from('leave_permission_requests')
      .update({
        status,
        reviewed_by_id: reviewerId,
        reviewed_by_name: reviewerName,
        reviewed_at: reviewedAt,
        review_notes: reviewNotes || `Status updated to ${status}`
      })
      .eq('id', requestId);

    if (error) throw error;
    window.dispatchEvent(new CustomEvent('ferex-leave-updated'));
    return true;
  } catch (err) {
    const local = getLocalData<LeavePermissionRequest>(LOCAL_LEAVE_REQ_KEY, []);
    const idx = local.findIndex(r => r.id === requestId);
    if (idx !== -1) {
      local[idx] = {
        ...local[idx],
        status,
        reviewed_by_id: reviewerId,
        reviewed_by_name: reviewerName,
        reviewed_at: reviewedAt,
        review_notes: reviewNotes || `Status updated to ${status}`
      };
      saveLocalData(LOCAL_LEAVE_REQ_KEY, local);
      window.dispatchEvent(new CustomEvent('ferex-leave-updated'));
      return true;
    }
    return false;
  }
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
        monthly_base_salary: 4500,
        hourly_rate: 26,
        currency: 'USD',
        effective_from: '2026-01-01'
      }
    ]);
  }
};

export const upsertEmployeeSalary = async (salary: Partial<EmployeeSalary>): Promise<EmployeeSalary> => {
  const rec: EmployeeSalary = {
    id: salary.id || `sal-${Date.now()}`,
    user_id: salary.user_id || `usr-${Date.now()}`,
    user_email: salary.user_email || '',
    user_name: salary.user_name || 'Staff Member',
    user_role: salary.user_role || 'staff',
    division: salary.division || 'general',
    monthly_base_salary: Number(salary.monthly_base_salary) || 3000,
    hourly_rate: Number(salary.hourly_rate) || 20,
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
  processedByName: string
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

    // Filter approved leaves for this user in this month
    const userLeaves = allLeaveRequests.filter(
      l => l.user_email === salary.user_email && l.status === 'approved' && l.start_date.startsWith(month)
    );

    // Monetizable approved paid leaves count as attended days
    const paidLeaveDays = userLeaves.filter(l => l.is_monetizable).reduce((sum, l) => sum + (l.total_days || 0), 0);
    const unpaidLeaveDays = userLeaves.filter(l => !l.is_monetizable).reduce((sum, l) => sum + (l.total_days || 0), 0);

    const attendedDays = verifiedTimesheets.length + paidLeaveDays;
    const verifiedHours = verifiedTimesheets.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
    const totalWorkingDays = 22; // standard 22 working days in a month

    let calculatedGross = salary.monthly_base_salary;
    if (attendedDays < totalWorkingDays && attendedDays > 0) {
      calculatedGross = Number(((salary.monthly_base_salary / totalWorkingDays) * attendedDays).toFixed(2));
    } else if (attendedDays === 0) {
      calculatedGross = Number((verifiedHours * salary.hourly_rate).toFixed(2));
    }

    // Unpaid leave deduction
    const unpaidDeductions = Number(((salary.monthly_base_salary / totalWorkingDays) * unpaidLeaveDays).toFixed(2));
    const allowances = 150;
    const deductions = unpaidDeductions;
    const netPayable = Math.max(0, calculatedGross + allowances - deductions);

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
      base_salary: salary.monthly_base_salary,
      hourly_rate: salary.hourly_rate,
      calculated_gross_pay: calculatedGross,
      allowances,
      deductions,
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
    return data as MonthlyPayroll[];
  } catch (err) {
    saveLocalData(LOCAL_PAYROLLS_KEY, payrolls);
    return payrolls;
  }
};
