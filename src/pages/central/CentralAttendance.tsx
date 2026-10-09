import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  Lock,
  DollarSign,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Award,
  Layers,
  FileText,
  Search,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ClockInOutWidget } from '../../components/ClockInOutWidget';
import { LeavePermissionModal } from '../../components/LeavePermissionModal';
import {
  getTimesheets,
  lockTimesheetsBySuperAdmin,
  getShifts,
  createShift,
  getEmployeeSalaries,
  upsertEmployeeSalary,
  getMonthlyPayrolls,
  generateMonthlyPayroll,
  getLeavePolicies,
  upsertLeavePolicy,
  getLeaveRequests,
  updateLeaveRequestStatus,
  type AttendanceTimesheet,
  type Shift,
  type EmployeeSalary,
  type MonthlyPayroll,
  type LeavePolicyConfig,
  type LeavePermissionRequest,
} from '../../lib/api/attendance';

export const CentralAttendance: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'timesheets' | 'shifts' | 'leave_policies' | 'leave_approvals' | 'salaries' | 'payroll'
  >('timesheets');

  // Timesheets state
  const [timesheets, setTimesheets] = useState<AttendanceTimesheet[]>([]);
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string>('');

  // Shifts state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    division: 'all',
    start_time: '09:00:00',
    end_time: '18:00:00',
    grace_period_mins: 15,
    half_day_threshold_hours: 4.0,
    full_day_threshold_hours: 8.0,
  });

  // Leave Policies & Requests state
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicyConfig[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeavePermissionRequest[]>([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [policyForm, setPolicyForm] = useState<Partial<LeavePolicyConfig>>({
    name: '',
    code: '',
    category: 'full_day',
    division: 'all',
    annual_quota_days: 12,
    monthly_max_permission_hours: 4,
    is_monetizable: true,
    is_encashable: false,
    description: '',
  });

  // Salaries state
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState<Partial<EmployeeSalary>>({
    user_email: '',
    user_name: '',
    user_role: 'staff',
    division: 'education',
    monthly_base_salary: 3500,
    hourly_rate: 22,
    currency: 'USD',
  });

  // Payroll state
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [payrolls, setPayrolls] = useState<MonthlyPayroll[]>([]);
  const [isGeneratingPayroll, setIsGeneratingPayroll] = useState(false);

  const superAdminId = user?.id || profile?.id || 'central-superadmin';
  const superAdminName = profile?.full_name || 'Central Super Admin';

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'timesheets') {
        const data = await getTimesheets({
          division: divisionFilter,
          status: statusFilter,
        });
        setTimesheets(data);
      } else if (activeTab === 'shifts') {
        const data = await getShifts();
        setShifts(data);
      } else if (activeTab === 'leave_policies') {
        const data = await getLeavePolicies();
        setLeavePolicies(data);
      } else if (activeTab === 'leave_approvals') {
        const data = await getLeaveRequests({ division: divisionFilter });
        setLeaveRequests(data);
      } else if (activeTab === 'salaries') {
        const data = await getEmployeeSalaries();
        setSalaries(data);
      } else if (activeTab === 'payroll') {
        const data = await getMonthlyPayrolls(selectedMonth);
        setPayrolls(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('ferex-attendance-updated', handleUpdate);
    window.addEventListener('ferex-leave-updated', handleUpdate);
    return () => {
      window.removeEventListener('ferex-attendance-updated', handleUpdate);
      window.removeEventListener('ferex-leave-updated', handleUpdate);
    };
  }, [activeTab, divisionFilter, statusFilter, selectedMonth]);

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleBulkLock = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await lockTimesheetsBySuperAdmin(selectedIds, superAdminId, superAdminName);
      showToast(`🔒 Successfully locked ${selectedIds.length} timesheets for payroll.`);
      setSelectedIds([]);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createShift(shiftForm);
      setShowShiftModal(false);
      showToast('✅ New shift timing successfully created and activated.');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertLeavePolicy(policyForm);
      setShowPolicyModal(false);
      showToast('✅ Leave Policy & Monetization configuration updated.');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewLeave = async (
    reqId: string,
    status: 'approved' | 'rejected',
    employeeName: string
  ) => {
    try {
      await updateLeaveRequestStatus(
        reqId,
        status,
        superAdminId,
        superAdminName,
        `Approved by Central Super Admin`
      );
      showToast(`Leave request for ${employeeName} has been ${status}.`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertEmployeeSalary(salaryForm);
      setShowSalaryModal(false);
      showToast('💰 Employee salary scale updated successfully.');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeneratePayroll = async () => {
    setIsGeneratingPayroll(true);
    try {
      const generated = await generateMonthlyPayroll(
        selectedMonth,
        superAdminId,
        superAdminName
      );
      setPayrolls(generated);
      showToast(`📊 Processed payroll for ${generated.length} employees (${selectedMonth}).`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPayroll(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-100">
      {actionSuccess && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl animate-bounce text-sm font-medium">
          <CheckCircle className="w-5 h-5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Clock className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Enterprise Attendance, Leave & Payroll Hub
            </h1>
          </div>
          <p className="text-xs text-indigo-200/70 max-w-xl">
            Configure shift timings, hourly permissions, monetizable leave policies, multi-tier locking, and automated monthly payroll.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowApplyLeaveModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-full transition-all"
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Apply Leave / Perm</span>
          </button>
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-indigo-500/30 backdrop-blur-md">
            <ClockInOutWidget divisionOverride="central" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('timesheets')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'timesheets'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Timesheets & Lock</span>
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'shifts'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Shift Timings</span>
          </button>

          <button
            onClick={() => setActiveTab('leave_policies')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'leave_policies'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Leave & Perm Policies</span>
          </button>

          <button
            onClick={() => setActiveTab('leave_approvals')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'leave_approvals'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Leave Approvals</span>
          </button>

          <button
            onClick={() => setActiveTab('salaries')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'salaries'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Salary Config</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'payroll'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Monthly Payroll</span>
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TAB 1: TIMESHEETS & SUPERADMIN LOCK */}
      {activeTab === 'timesheets' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Division:</span>
              </div>
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All Divisions</option>
                <option value="education">Education Counselors</option>
                <option value="rimi">Rimi Frozen Logistics</option>
                <option value="trade">Global Trade Floor</option>
                <option value="digital">Ferex Digital Tech</option>
                <option value="central">Central Platform</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Clocked In)</option>
                <option value="completed">Completed (Pending Verification)</option>
                <option value="verified">Admin Verified</option>
                <option value="locked">SuperAdmin Locked</option>
              </select>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkLock}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-amber-600/30 transition-all transform hover:scale-105"
              >
                <Lock className="w-4 h-4" />
                <span>SuperAdmin Lock Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={timesheets.length > 0 && selectedIds.length === timesheets.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(timesheets.map((t) => t.id));
                          else setSelectedIds([]);
                        }}
                        className="rounded bg-slate-700 border-slate-600 text-indigo-600"
                      />
                    </th>
                    <th className="p-3.5">Employee & Role</th>
                    <th className="p-3.5">Division</th>
                    <th className="p-3.5">Date & Timestamps</th>
                    <th className="p-3.5">Hours</th>
                    <th className="p-3.5">Shift Activity Summary</th>
                    <th className="p-3.5">Status & Verification</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {timesheets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No timesheet records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    timesheets.map((sheet) => {
                      const isSelected = selectedIds.includes(sheet.id);
                      return (
                        <tr key={sheet.id} className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-950/30' : ''}`}>
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds((prev) => [...prev, sheet.id]);
                                else setSelectedIds((prev) => prev.filter((id) => id !== sheet.id));
                              }}
                              className="rounded bg-slate-700 border-slate-600 text-indigo-600"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-white">{sheet.user_name}</div>
                            <div className="text-[11px] text-slate-400">
                              {sheet.user_email} • <span className="text-indigo-400 capitalize">{sheet.user_role}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-300 uppercase text-[10px]">
                              {sheet.division}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-slate-200">{sheet.date}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              In: {new Date(sheet.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {sheet.clock_out && <> • Out: {new Date(sheet.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                              {sheet.total_hours?.toFixed(1) || '0.0'}h
                            </span>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <p className="line-clamp-2 text-slate-300 text-[11px]">
                              {sheet.work_summary || <span className="italic text-slate-500">In Progress</span>}
                            </p>
                          </td>
                          <td className="p-3.5">
                            {sheet.is_superadmin_locked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : sheet.is_admin_verified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                                <ShieldCheck className="w-3 h-3" /> Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                {sheet.status}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {!sheet.is_superadmin_locked && (
                              <button
                                onClick={async () => {
                                  await lockTimesheetsBySuperAdmin([sheet.id], superAdminId, superAdminName);
                                  showToast(`🔒 Timesheet locked for ${sheet.user_name}`);
                                  loadData();
                                }}
                                className="bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/40 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                              >
                                Lock
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHIFTS CONFIGURATION */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Configured Shift Timings</span>
            </h2>
            <button
              onClick={() => setShowShiftModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Shift Timing</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((s) => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-bold uppercase">
                    {s.division}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>
                    {s.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{s.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Daily Schedule: <span className="text-slate-200 font-mono font-semibold">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-800/60 p-2.5 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Grace</span>
                    <span className="font-bold text-amber-400">{s.grace_period_mins}m</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Half-Day</span>
                    <span className="font-bold text-slate-200">{s.half_day_threshold_hours}h</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Full-Day</span>
                    <span className="font-bold text-emerald-400">{s.full_day_threshold_hours}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE POLICIES & MONETIZATION RULES */}
      {activeTab === 'leave_policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span>Central Leave Policies & Monetization Rules</span>
              </h2>
              <p className="text-xs text-slate-400">
                Only Central Super Admin can configure leave quotas, hourly permission allowances, and paid vs unpaid monetization.
              </p>
            </div>
            <button
              onClick={() => {
                setPolicyForm({
                  name: '',
                  code: '',
                  category: 'full_day',
                  division: 'all',
                  annual_quota_days: 12,
                  monthly_max_permission_hours: 4,
                  is_monetizable: true,
                  is_encashable: false,
                  description: '',
                });
                setShowPolicyModal(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Leave Policy</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leavePolicies.map((pol) => (
              <div key={pol.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-indigo-400 rounded-lg text-[11px] font-bold uppercase">
                    Code: {pol.code}
                  </span>
                  {pol.is_monetizable ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Monetizable (Paid)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3" /> Loss of Pay
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{pol.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{pol.description || 'Enterprise policy rule'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-2.5 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Annual Quota</span>
                    <span className="font-bold text-slate-200">{pol.annual_quota_days} Days</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Max Perm Hours</span>
                    <span className="font-bold text-indigo-400">{pol.monthly_max_permission_hours} hrs/mo</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      setPolicyForm(pol);
                      setShowPolicyModal(true);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Edit Policy Rule →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LEAVE & PERMISSION REQUEST APPROVALS */}
      {activeTab === 'leave_approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Leave & Permission Review Desk</span>
            </h2>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="all">All Divisions</option>
              <option value="education">Education</option>
              <option value="rimi">Rimi Frozen</option>
              <option value="trade">Global Trade</option>
              <option value="digital">Digital Agency</option>
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Type & Policy</th>
                    <th className="p-3.5">Schedule / Dates</th>
                    <th className="p-3.5">Duration / Hours</th>
                    <th className="p-3.5">Treatment</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No pending or reviewed leave requests found.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          <div>{req.user_name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {req.user_email} • <span className="text-indigo-400 capitalize">{req.division}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-200 block">{req.policy_name}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{req.request_type.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="p-3.5 text-slate-300 font-medium">
                          <div>{req.start_date} {req.end_date !== req.start_date ? `to ${req.end_date}` : ''}</div>
                          {req.permission_start_time && (
                            <div className="text-[11px] text-indigo-400 font-mono">
                              {req.permission_start_time} - {req.permission_end_time}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {req.permission_hours ? `${req.permission_hours} hrs` : `${req.total_days} days`}
                        </td>
                        <td className="p-3.5">
                          {req.is_monetizable ? (
                            <span className="text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold">
                              Paid
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-950/50 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full font-bold">
                              Unpaid / LOP
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-xs text-slate-300 text-[11px] line-clamp-2">
                          {req.reason}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {req.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleReviewLeave(req.id, 'approved', req.user_name)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition-all"
                                title="Approve Request"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleReviewLeave(req.id, 'rejected', req.user_name)}
                                className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md transition-all"
                                title="Reject Request"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SALARY CONFIG */}
      {activeTab === 'salaries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Employee Salary Scales</span>
            </h2>
            <button
              onClick={() => {
                setSalaryForm({
                  user_email: '',
                  user_name: '',
                  user_role: 'staff',
                  division: 'education',
                  monthly_base_salary: 3500,
                  hourly_rate: 22,
                  currency: 'USD',
                });
                setShowSalaryModal(true);
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Set Employee Salary</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Employee Name & Email</th>
                    <th className="p-3.5">Division & Role</th>
                    <th className="p-3.5">Monthly Base Salary</th>
                    <th className="p-3.5">Hourly Verified Rate</th>
                    <th className="p-3.5">Currency</th>
                    <th className="p-3.5">Effective Date</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {salaries.map((sal) => (
                    <tr key={sal.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        <div>{sal.user_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{sal.user_email}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 capitalize text-[11px]">
                          {sal.division} • {sal.user_role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          ${sal.monthly_base_salary.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-200">${sal.hourly_rate} / hr</td>
                      <td className="p-3.5 text-slate-400">{sal.currency}</td>
                      <td className="p-3.5 text-slate-400">{sal.effective_from}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSalaryForm(sal);
                            setShowSalaryModal(true);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg text-[11px] font-bold border border-slate-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: MONTHLY PAYROLL GENERATOR */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Payroll Period:</span>
              </div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none"
              />
            </div>

            <button
              onClick={handleGeneratePayroll}
              disabled={isGeneratingPayroll}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all transform hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 ${isGeneratingPayroll ? 'animate-spin' : ''}`} />
              <span>{isGeneratingPayroll ? 'Calculating Hours & Leaves...' : 'Calculate & Generate Payroll'}</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Division & Role</th>
                    <th className="p-3.5 text-center">Attended Days</th>
                    <th className="p-3.5 text-center">Verified Hours</th>
                    <th className="p-3.5">Base Salary</th>
                    <th className="p-3.5">Deductions (LOP)</th>
                    <th className="p-3.5">Net Payable</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No payroll records found for {selectedMonth}. Click "Calculate & Generate Payroll" to process.
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          <div>{p.user_name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{p.user_email}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 capitalize text-[11px]">
                            {p.division} • {p.user_role}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-200">
                          {p.attended_days} / {p.total_working_days}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-400">
                          {p.verified_hours} hrs
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">${p.base_salary?.toLocaleString()}</td>
                        <td className="p-3.5 font-mono text-amber-400">-${p.deductions}</td>
                        <td className="p-3.5">
                          <span className="font-mono font-black text-emerald-400 text-sm bg-emerald-950/40 border border-emerald-800/50 px-2 py-1 rounded-lg">
                            ${p.net_payable?.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                            <CheckCircle className="w-3 h-3" /> {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SHIFT MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleSaveShift} className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Shift Timing</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Shift Name</label>
              <input
                type="text"
                required
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Division</label>
              <select
                value={shiftForm.division}
                onChange={(e) => setShiftForm({ ...shiftForm, division: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="all">All Divisions</option>
                <option value="education">Education</option>
                <option value="rimi">Rimi Frozen</option>
                <option value="trade">Global Trade</option>
                <option value="digital">Digital Agency</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowShiftModal(false)} className="flex-1 bg-slate-800 py-2.5 rounded-xl text-xs text-slate-300">
                Cancel
              </button>
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg">
                Save Shift
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE LEAVE POLICY MODAL */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleSavePolicy} className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Configure Leave / Permission Policy</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Policy Name</label>
              <input
                type="text"
                required
                value={policyForm.name}
                onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                placeholder="e.g. Parental Leave / Hourly Permission"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Policy Code</label>
                <input
                  type="text"
                  required
                  value={policyForm.code}
                  onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. PL_CUSTOM"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  value={policyForm.category}
                  onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="full_day">Full Day</option>
                  <option value="half_day">Half Day</option>
                  <option value="hourly_permission">Hourly Permission</option>
                  <option value="emergency">Emergency / Unplanned</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Annual Quota (Days)</label>
                <input
                  type="number"
                  required
                  value={policyForm.annual_quota_days}
                  onChange={(e) => setPolicyForm({ ...policyForm, annual_quota_days: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Perm (Hrs/Mo)</label>
                <input
                  type="number"
                  value={policyForm.monthly_max_permission_hours}
                  onChange={(e) => setPolicyForm({ ...policyForm, monthly_max_permission_hours: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <input
                type="checkbox"
                id="is_monetizable"
                checked={policyForm.is_monetizable}
                onChange={(e) => setPolicyForm({ ...policyForm, is_monetizable: e.target.checked })}
                className="rounded bg-slate-700 border-slate-600 text-indigo-600"
              />
              <label htmlFor="is_monetizable" className="text-xs text-slate-200 cursor-pointer">
                <strong>Monetizable / Paid Leave:</strong> Leave days under this policy will not be deducted from monthly base salary.
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowPolicyModal(false)} className="flex-1 bg-slate-800 py-2.5 rounded-xl text-xs text-slate-300">
                Cancel
              </button>
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg">
                Save Policy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SALARY CONFIG MODAL */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <form onSubmit={handleSaveSalary} className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Set Employee Salary</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Employee Email</label>
              <input
                type="email"
                required
                value={salaryForm.user_email}
                onChange={(e) => setSalaryForm({ ...salaryForm, user_email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={salaryForm.user_name}
                onChange={(e) => setSalaryForm({ ...salaryForm, user_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Monthly Base ($)</label>
                <input
                  type="number"
                  required
                  value={salaryForm.monthly_base_salary}
                  onChange={(e) => setSalaryForm({ ...salaryForm, monthly_base_salary: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Hourly Rate ($)</label>
                <input
                  type="number"
                  required
                  value={salaryForm.hourly_rate}
                  onChange={(e) => setSalaryForm({ ...salaryForm, hourly_rate: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowSalaryModal(false)} className="flex-1 bg-slate-800 py-2.5 rounded-xl text-xs text-slate-300">
                Cancel
              </button>
              <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg">
                Save Salary Scale
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Universal Leave / Permission Application Modal */}
      <LeavePermissionModal
        isOpen={showApplyLeaveModal}
        onClose={() => setShowApplyLeaveModal(false)}
        divisionOverride="central"
        onSuccess={loadData}
      />
    </div>
  );
};
