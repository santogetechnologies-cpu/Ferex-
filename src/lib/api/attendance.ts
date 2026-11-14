import { supabase } from '../supabase';

// One attendance module for every platform. All rules live in the database; these functions only call it.

export type AttendanceLevel = 'staff' | 'admin' | 'superadmin';
export type DayStatus = 'Open' | 'Present' | 'Half Day' | 'Absent' | 'Leave';

export interface AttendanceRules {
  division: string;
  work_start: string;
  work_end: string;
  grace_minutes: number;
  full_day_hours: number;
  half_day_hours: number;
  weekly_off: number[];
  pay_basis: 'working_days' | 'calendar_30';
  lop_factor: number;
  late_to_half_day: number;
  timezone: string;
}

export interface AttendanceContext {
  user_id: string;
  name: string;
  email: string;
  role: string;
  level: AttendanceLevel;
  division: string;
  rules: AttendanceRules;
  today: string;
}

export interface TeamMember { user_id: string; name: string; email: string; role: string; division: string; level: 'staff' | 'admin'; is_me: boolean }

export interface AttendanceDay {
  id: string; user_id: string; user_name: string; user_email: string; user_role: string; division: string; work_date: string;
  clock_in: string | null; clock_out: string | null; hours: number; late: boolean; status: DayStatus; source: string;
  work_summary: string; note: string; review: 'Pending' | 'Verified'; reviewed_by_name: string | null; reviewed_at: string | null;
}

export interface LeaveType { code: string; name: string; kind: 'full_day' | 'half_day' | 'hourly'; annual_quota: number; monthly_max_hours: number; is_paid: boolean; on_exceed: 'lop' | 'block'; is_active: boolean; sort: number }
export interface LeaveBalance { code: string; name: string; kind: string; quota: number; monthly_max_hours: number; is_paid: boolean; used: number; remaining: number }
export interface LeaveRequest {
  id: string; user_id: string; user_name: string; user_role: string; division: string; type_code: string; type_name: string; kind: string;
  start_date: string; end_date: string; half_session: string | null; from_time: string | null; to_time: string | null; hours: number;
  total_days: number; paid_days: number; lop_days: number; reason: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decided_by_name: string | null; decided_at: string | null; decision_note: string; created_at: string;
}

export interface Incentive {
  id: string; user_id: string; user_name: string; division: string; month: string; kind: string; amount: number; currency: string; reference: string; notes: string;
  status: 'Pending' | 'Approved' | 'Rejected'; logged_by_name: string; decided_by_name: string | null; created_at: string;
}

export interface Salary { user_id: string; division: string; monthly_salary: number; currency: string; bank_name: string; account_name: string; account_number: string; ifsc: string }

export interface Payroll {
  id: string; user_id: string; month: string; division: string; user_name: string; user_email: string; user_role: string; currency: string; base_salary: number;
  working_days: number; present_days: number; paid_leave_days: number; lop_days: number; unverified_days: number; per_day: number; lop_deduction: number;
  other_deductions: number; deduction_note: string; incentives: number; gross: number; net: number; status: 'Draft' | 'Verified' | 'Approved' | 'Paid';
  verified_by_name: string | null; approved_by_name: string | null; paid_at: string | null; paid_reference: string;
}

export interface Holiday { id: string; division: string; holiday_date: string; name: string }

const fail = (what: string, e: { message: string }) => new Error(e.message || what);
const changed = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('ferex-attendance-updated')); };

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw fail(fn, error);
  return data as T;
}
async function write<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const data = await rpc<T>(fn, args);
  changed();
  return data;
}
async function select<T>(q: PromiseLike<{ data: any; error: { message: string } | null }>, what: string): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw fail(what, error);
  return (data || []) as T[];
}

export async function getContext(): Promise<AttendanceContext> {
  const c = await rpc<AttendanceContext>('attendance_context');
  if (!c || !c.user_id || !c.rules) throw new Error('Could not load your attendance profile');
  return c;
}
export const getTeam = () => rpc<TeamMember[]>('attendance_team');

export const clockIn = (note = '') => write<AttendanceDay>('attendance_clock_in', { p_note: note });
export const clockOut = (summary = '') => write<AttendanceDay>('attendance_clock_out', { p_summary: summary });

export async function getDays(from: string, to: string, userId?: string): Promise<AttendanceDay[]> {
  let q = supabase.from('attendance_days').select('*').gte('work_date', from).lte('work_date', to).order('work_date', { ascending: false }).order('user_name');
  if (userId) q = q.eq('user_id', userId);
  return select<AttendanceDay>(q, 'Failed to load attendance');
}

export const getOpenSession = async (userId: string): Promise<AttendanceDay | null> => {
  const rows = await select<AttendanceDay>(supabase.from('attendance_days').select('*').eq('user_id', userId).is('clock_out', null).not('clock_in', 'is', null).order('work_date', { ascending: false }).limit(1), 'Failed to load your session');
  return rows[0] || null;
};

export const markDay = (p: { user: string; date: string; status: 'Present' | 'Half Day' | 'Absent' | 'Leave'; from?: string; to?: string; note?: string }) =>
  write<AttendanceDay>('attendance_mark', { p_user: p.user, p_date: p.date, p_status: p.status, p_in: p.from || null, p_out: p.to || null, p_note: p.note || '' });
type VerifyResult = { verified: number; marked_absent: number; still_open: number; own_days_left_for_superadmin: number };
// With a list of people (one platform's team), each is verified in turn; otherwise everyone the caller is responsible for.
export async function verifyRange(from: string, to: string, userId?: string, fillAbsent = true, onlyUsers?: string[]): Promise<VerifyResult> {
  const one = (u: string | null) => rpc<VerifyResult>('attendance_verify', { p_from: from, p_to: to, p_user: u, p_fill_absent: fillAbsent });
  const total: VerifyResult = { verified: 0, marked_absent: 0, still_open: 0, own_days_left_for_superadmin: 0 };
  for (const r of onlyUsers ? await Promise.all(onlyUsers.map(one)) : [await one(userId || null)]) {
    total.verified += r.verified; total.marked_absent += r.marked_absent; total.still_open += r.still_open; total.own_days_left_for_superadmin += r.own_days_left_for_superadmin;
  }
  changed();
  return total;
}
export const reopenDay = (id: string, reason: string) => write<AttendanceDay>('attendance_reopen', { p_day: id, p_reason: reason });

export const getLeaveTypes = () => select<LeaveType>(supabase.from('attendance_leave_types').select('*').order('sort'), 'Failed to load leave types');
export const getLeaveBalance = (userId?: string, year?: number) => rpc<LeaveBalance[]>('attendance_leave_balance', { p_user: userId || null, p_year: year || null });
export const getLeaves = (userId?: string) => {
  let q = supabase.from('attendance_leaves').select('*').order('created_at', { ascending: false }).limit(300);
  if (userId) q = q.eq('user_id', userId);
  return select<LeaveRequest>(q, 'Failed to load leave');
};
export const submitLeave = (p: { type: string; start: string; end: string; session?: string; from?: string; to?: string; reason: string }) =>
  write<LeaveRequest>('attendance_leave_submit', { p_type: p.type, p_start: p.start, p_end: p.end, p_session: p.session || null, p_from: p.from || null, p_to: p.to || null, p_reason: p.reason });
export const decideLeave = (id: string, approve: boolean, note = '') => write<LeaveRequest>('attendance_leave_decide', { p_id: id, p_approve: approve, p_note: note });
export const cancelLeave = (id: string) => write<LeaveRequest>('attendance_leave_cancel', { p_id: id });

export const getIncentives = (month?: string) => {
  let q = supabase.from('attendance_incentives').select('*').order('created_at', { ascending: false }).limit(500);
  if (month) q = q.eq('month', month);
  return select<Incentive>(q, 'Failed to load incentives');
};
export const addIncentive = (p: { user: string; month: string; kind: string; amount: number; reference?: string; notes?: string }) =>
  write<Incentive>('attendance_incentive_add', { p_user: p.user, p_month: p.month, p_kind: p.kind, p_amount: p.amount, p_reference: p.reference || '', p_notes: p.notes || '' });
export const decideIncentive = (id: string, approve: boolean) => write<Incentive>('attendance_incentive_decide', { p_id: id, p_approve: approve });
export const removeIncentive = (id: string) => write<void>('attendance_incentive_remove', { p_id: id });

export const getSalaries = () => select<Salary>(supabase.from('attendance_salaries').select('*'), 'Failed to load salaries');
export const setSalary = (p: { user: string; amount: number; currency?: string; bank_name?: string; account_name?: string; account_number?: string; ifsc?: string }) =>
  write<Salary>('attendance_set_salary', { p_user: p.user, p_amount: p.amount, p_currency: p.currency || 'INR', p_bank_name: p.bank_name || '', p_account_name: p.account_name || '', p_account_number: p.account_number || '', p_ifsc: p.ifsc || '' });

export const getPayroll = (month?: string) => {
  let q = supabase.from('attendance_payroll').select('*').order('month', { ascending: false }).order('user_name').limit(500);
  if (month) q = q.eq('month', month);
  return select<Payroll>(q, 'Failed to load payroll');
};
export const generatePayroll = (month: string, division?: string) =>
  write<{ prepared: number; no_salary_set: number; already_verified_or_paid: number }>('attendance_payroll_generate', { p_month: month, p_division: division || null });
export const adjustPayroll = (id: string, otherDeductions: number, note: string) => write<Payroll>('attendance_payroll_adjust', { p_id: id, p_other_deductions: otherDeductions, p_note: note });
export const advancePayroll = (id: string, to: 'Draft' | 'Verified' | 'Approved' | 'Paid', reference = '') => write<Payroll>('attendance_payroll_advance', { p_id: id, p_to: to, p_reference: reference });

export const getRules = () => select<AttendanceRules>(supabase.from('attendance_rules').select('*'), 'Failed to load rules');
export const saveRules = (division: string, rules: Partial<AttendanceRules>) => write<AttendanceRules>('attendance_rules_save', { p_division: division, p_rules: rules });
export const saveLeaveType = (t: Partial<LeaveType>) => write<LeaveType>('attendance_leave_type_save', { p_type: t });
export const getHolidays = () => select<Holiday>(supabase.from('attendance_holidays').select('*').order('holiday_date'), 'Failed to load holidays');
export const saveHoliday = (division: string, date: string, name: string, remove = false) => write<void>('attendance_holiday_save', { p_division: division, p_date: date, p_name: name, p_remove: remove });

// ── small helpers shared by the screens ──
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekStart = (iso: string) => { const d = new Date(iso + 'T00:00:00Z'); const dow = (d.getUTCDay() + 6) % 7; return addDays(iso, -dow); };
export const monthOf = (iso: string) => iso.slice(0, 7);
export const previousMonth = (iso: string) => { const d = new Date(iso.slice(0, 7) + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); };
export const monthBounds = (month: string) => { const first = month + '-01'; const d = new Date(first + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return { from: first, to: d.toISOString().slice(0, 10) }; };
export const platformName = (d: string) => ({ education: 'Ferex Education', rimi: 'Rimi Frozen', trade: 'Global Trade', digital: 'Ferex Digital', central: 'Central' } as Record<string, string>)[d] || d;
