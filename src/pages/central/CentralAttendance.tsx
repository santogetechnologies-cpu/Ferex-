import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  Edit2,
  Trash2,
  Users,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LeavePermissionModal } from '../../components/LeavePermissionModal';
import {
  getTimesheets,
  lockTimesheetsBySuperAdmin,
  getShifts,
  createShift,
  updateShift,
  deleteShift,
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

const KNOWN_STAFF = [
  { email: 'counselor@ferex.com', name: 'Education Counselor', role: 'counselor', division: 'education' },
  { email: 'education@ferex.com', name: 'Education Admin', role: 'admin', division: 'education' },
  { email: 'rimi@ferex.com', name: 'Rimi Logistics Officer', role: 'logistics_officer', division: 'rimi' },
  { email: 'trade@ferex.com', name: 'Trade Ops Manager', role: 'operations_manager', division: 'trade' },
  { email: 'digital@ferex.com', name: 'Digital Staff', role: 'digital_staff', division: 'digital' },
  { email: 'digimanager@ferex.com', name: 'Digital Manager', role: 'digital_manager', division: 'digital' },
  { email: 'pm@ferex.com', name: 'Project Manager', role: 'pm', division: 'digital' },
  { email: 'centraladmin@ferexventures.com', name: 'Central Admin', role: 'superadmin', division: 'central' },
];

const ALL_ROLES = [
  { id: 'counselor', label: 'Education Counselor' },
  { id: 'logistics_officer', label: 'Logistics Officer (Rimi)' },
  { id: 'operations_manager', label: 'Trade Ops Manager' },
  { id: 'digital_manager', label: 'Digital Manager' },
  { id: 'pm', label: 'Project Manager' },
  { id: 'digital_staff', label: 'Digital Staff' },
  { id: 'admin', label: 'Division Admin' },
  { id: 'superadmin', label: 'Central Super Admin' },
];

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
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<{
    name: string;
    division: string;
    start_time: string;
    end_time: string;
    grace_period_mins: number;
    half_day_threshold_hours: number;
    full_day_threshold_hours: number;
    target_type: 'all' | 'division' | 'roles' | 'specific_staff';
    assigned_staff_emails: string[];
    assigned_roles: string[];
    is_active: boolean;
  }>({
    name: '',
    division: 'all',
    start_time: '09:00:00',
    end_time: '18:00:00',
    grace_period_mins: 15,
    half_day_threshold_hours: 4.0,
    full_day_threshold_hours: 8.0,
    target_type: 'division',
    assigned_staff_emails: [],
    assigned_roles: [],
    is_active: true,
  });
  const [customEmailInput, setCustomEmailInput] = useState('');

  // Leave Policies & Requests state
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicyConfig[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeavePermissionRequest[]>([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
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
        setTimesheets(data || []);
      } else if (activeTab === 'shifts') {
        const data = await getShifts();
        setShifts(data || []);
      } else if (activeTab === 'leave_policies') {
        const data = await getLeavePolicies();
        setLeavePolicies(data || []);
      } else if (activeTab === 'leave_approvals') {
        const data = await getLeaveRequests({ division: divisionFilter });
        setLeaveRequests(data || []);
      } else if (activeTab === 'salaries') {
        const data = await getEmployeeSalaries();
        setSalaries(data || []);
      } else if (activeTab === 'payroll') {
        const data = await getMonthlyPayrolls(selectedMonth);
        setPayrolls(data || []);
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
    window.addEventListener('ferex-shifts-updated', handleUpdate);
    return () => {
      window.removeEventListener('ferex-attendance-updated', handleUpdate);
      window.removeEventListener('ferex-leave-updated', handleUpdate);
      window.removeEventListener('ferex-shifts-updated', handleUpdate);
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
      showToast(`Locked ${selectedIds.length} timesheets for payroll.`);
      setSelectedIds([]);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddShift = () => {
    setEditingShiftId(null);
    setShiftForm({
      name: '',
      division: 'all',
      start_time: '09:00:00',
      end_time: '18:00:00',
      grace_period_mins: 15,
      half_day_threshold_hours: 4.0,
      full_day_threshold_hours: 8.0,
      target_type: 'division',
      assigned_staff_emails: [],
      assigned_roles: [],
      is_active: true,
    });
    setShowShiftModal(true);
  };

  const handleOpenEditShift = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setShiftForm({
      name: shift.name,
      division: shift.division || 'all',
      start_time: shift.start_time || '09:00:00',
      end_time: shift.end_time || '18:00:00',
      grace_period_mins: shift.grace_period_mins ?? 15,
      half_day_threshold_hours: shift.half_day_threshold_hours ?? 4.0,
      full_day_threshold_hours: shift.full_day_threshold_hours ?? 8.0,
      target_type: (shift.target_type as any) || 'division',
      assigned_staff_emails: shift.assigned_staff_emails || [],
      assigned_roles: shift.assigned_roles || [],
      is_active: shift.is_active ?? true,
    });
    setShowShiftModal(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShiftId) {
        await updateShift(editingShiftId, shiftForm);
        showToast('Shift timing updated successfully.');
      } else {
        await createShift(shiftForm);
        showToast('New shift timing created and activated.');
      }
      setShowShiftModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShift = async (id: string, name: string) => {
    if (!window.confirm(`Delete shift "${name}"?`)) return;
    try {
      await deleteShift(id);
      showToast(`Shift "${name}" deleted.`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStaffEmail = (email: string) => {
    setShiftForm((prev) => {
      const exists = prev.assigned_staff_emails.includes(email);
      return {
        ...prev,
        assigned_staff_emails: exists
          ? prev.assigned_staff_emails.filter((e) => e !== email)
          : [...prev.assigned_staff_emails, email],
      };
    });
  };

  const toggleRole = (roleId: string) => {
    setShiftForm((prev) => {
      const exists = prev.assigned_roles.includes(roleId);
      return {
        ...prev,
        assigned_roles: exists
          ? prev.assigned_roles.filter((r) => r !== roleId)
          : [...prev.assigned_roles, roleId],
      };
    });
  };

  const handleAddCustomEmail = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (customEmailInput.trim()) {
      const em = customEmailInput.trim().toLowerCase();
      if (!shiftForm.assigned_staff_emails.includes(em)) {
        setShiftForm((prev) => ({
          ...prev,
          assigned_staff_emails: [...prev.assigned_staff_emails, em],
        }));
      }
      setCustomEmailInput('');
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertLeavePolicy(policyForm);
      setShowPolicyModal(false);
      showToast('Leave Policy configuration updated.');
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
        `Reviewed and approved by Central Super Admin`
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
      showToast('Employee salary scale updated successfully.');
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
      setPayrolls(generated || []);
      showToast(`Processed payroll for ${(generated || []).length} employees for ${selectedMonth}.`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPayroll(false);
    }
  };

  return (
    <div className="space-y-6 relative text-left pb-8 text-slate-900">
      {/* Toast Notification Portal */}
      {actionSuccess &&
        createPortal(
          <div className="fixed top-5 right-5 z-[99999] flex items-center gap-2 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-2xl animate-fade-in text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-white shrink-0" />
            <span>{actionSuccess}</span>
          </div>,
          document.body
        )}

      {/* Page Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/10 text-[#58051E] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Enterprise Attendance, Shift & Payroll HQ
            </h1>
            <span className="bg-[#58051E]/10 text-[#58051E] text-[11px] font-bold px-2.5 py-0.5 rounded border border-[#58051E]/20">
              Super Admin Console
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Configure shift timings with staff and role targeting, review daily work activity logs, approve leave requests, lock timesheets, and execute monthly payroll calculation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('timesheets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'timesheets'
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timesheets & Locking</span>
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'shifts'
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Shift Timings & Staff Assignment</span>
          </button>

          <button
            onClick={() => setActiveTab('leave_policies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'leave_policies'
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Leave & Permission Policies</span>
          </button>

          <button
            onClick={() => setActiveTab('leave_approvals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'leave_approvals'
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Leave Approvals</span>
          </button>

          <button
            onClick={() => setActiveTab('salaries')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'salaries'
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Salary Config</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Monthly Payroll</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TIMESHEETS & SUPERADMIN LOCK */}
      {activeTab === 'timesheets' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Division:</span>
              </div>
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58051E]"
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
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58051E]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Clocked In)</option>
                <option value="completed">Completed (Pending Review)</option>
                <option value="verified">Admin Verified</option>
                <option value="locked">SuperAdmin Locked</option>
              </select>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkLock}
                className="flex items-center gap-1.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>SuperAdmin Lock Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={timesheets.length > 0 && selectedIds.length === timesheets.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(timesheets.map((t) => t.id));
                          else setSelectedIds([]);
                        }}
                        className="rounded border-slate-300 text-[#58051E] focus:ring-[#58051E]"
                      />
                    </th>
                    <th className="p-3">Employee & Role</th>
                    <th className="p-3">Division</th>
                    <th className="p-3">Date & Timestamps</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Shift Activity Summary</th>
                    <th className="p-3">Status & Verification</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timesheets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No timesheet records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    timesheets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds([...selectedIds, t.id]);
                              else setSelectedIds(selectedIds.filter((id) => id !== t.id));
                            }}
                            className="rounded border-slate-300 text-[#58051E]"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{t.user_name}</div>
                          <div className="text-[11px] text-slate-400">{t.user_email}</div>
                          <span className="inline-block mt-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                            {t.user_role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="uppercase font-bold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {t.division}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{t.date}</div>
                          <div className="text-[11px] text-slate-400">
                            In: {new Date(t.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {t.clock_out &&
                              ` | Out: ${new Date(t.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {Number(t.total_hours || 0).toFixed(1)} hrs
                        </td>
                        <td className="p-3 max-w-xs">
                          {t.work_summary ? (
                            <p className="line-clamp-2 text-slate-600 italic">"{t.work_summary}"</p>
                          ) : (
                            <span className="text-slate-400 italic">No summary logged yet</span>
                          )}
                        </td>
                        <td className="p-3">
                          {t.is_superadmin_locked ? (
                            <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3" /> Locked for Payroll
                            </span>
                          ) : t.is_admin_verified ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Admin Verified
                            </span>
                          ) : t.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 animate-spin" /> In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!t.is_superadmin_locked && t.status === 'completed' && (
                            <button
                              onClick={() => {
                                lockTimesheetsBySuperAdmin([t.id], superAdminId, superAdminName).then(() => {
                                  showToast(`Timesheet locked for ${t.user_name}.`);
                                  loadData();
                                });
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded shadow-xs transition-all"
                            >
                              Lock
                            </button>
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

      {/* TAB 2: SHIFT TIMINGS & TARGET STAFF */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Shift Timings & Targeted Assignments</h2>
              <p className="text-xs text-slate-500">
                Create shifts, assign specific staff members or roles, configure working hours and grace thresholds.
              </p>
            </div>
            <button
              onClick={handleOpenAddShift}
              className="flex items-center gap-1.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Shift</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{shift.name}</h3>
                      <span className="inline-block uppercase font-bold text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-0.5">
                        {shift.division === 'all' ? 'All Enterprise' : `${shift.division} division`}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        shift.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {shift.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 my-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Timing:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {shift.start_time.slice(0, 5)} — {shift.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Grace Period:</span>
                      <span className="font-medium text-slate-700">{shift.grace_period_mins} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Full-Day Req:</span>
                      <span className="font-medium text-slate-700">{shift.full_day_threshold_hours} hrs</span>
                    </div>
                  </div>

                  {/* Targeted Staff or Roles Display */}
                  <div className="space-y-1 mb-3 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Target Audience ({shift.target_type || 'division'}):
                    </span>
                    {shift.assigned_staff_emails && shift.assigned_staff_emails.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {shift.assigned_staff_emails.map((email) => (
                          <span
                            key={email}
                            className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium px-1.5 py-0.5 rounded"
                          >
                            {email}
                          </span>
                        ))}
                      </div>
                    ) : shift.assigned_roles && shift.assigned_roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {shift.assigned_roles.map((r) => (
                          <span
                            key={r}
                            className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium px-1.5 py-0.5 rounded"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">
                        {shift.division === 'all' ? 'All employees across enterprise' : `All ${shift.division} staff`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEditShift(shift)}
                    className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Shift</span>
                  </button>
                  <button
                    onClick={() => handleDeleteShift(shift.id, shift.name)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-200 cursor-pointer"
                    title="Delete Shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE & PERMISSION POLICIES */}
      {activeTab === 'leave_policies' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Leave Policies & Monetization Rules</h2>
              <p className="text-xs text-slate-500">
                Configure annual quotas, hourly permission allowances (1-3 hrs), half-days, and whether each leave type is paid or Loss of Pay (LOP).
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
              className="flex items-center gap-1.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Leave Policy</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Policy Name & Code</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Division</th>
                    <th className="p-3">Annual Quota</th>
                    <th className="p-3">Monthly Perm Hours</th>
                    <th className="p-3">Monetization Status</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leavePolicies.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.code}
                        </span>
                      </td>
                      <td className="p-3 capitalize font-medium text-slate-700">{p.category.replace('_', ' ')}</td>
                      <td className="p-3 uppercase font-semibold text-slate-600">{p.division}</td>
                      <td className="p-3 font-semibold text-slate-900">{p.annual_quota_days} days/year</td>
                      <td className="p-3 font-semibold text-slate-900">{p.monthly_max_permission_hours} hrs/mo</td>
                      <td className="p-3">
                        {p.is_monetizable ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            <DollarSign className="w-3 h-3" /> Paid / Monetizable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            Loss of Pay (LOP)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs">{p.description || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEAVE APPROVALS */}
      {activeTab === 'leave_approvals' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Enterprise Leave & Permission Review Queue</h2>
              <p className="text-xs text-slate-500">
                Review and approve counselor, trade, logistics, and digital staff leave requests.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Division</th>
                    <th className="p-3">Type & Policy</th>
                    <th className="p-3">Duration / Time</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No pending leave or permission requests.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{req.user_name}</div>
                          <div className="text-[11px] text-slate-400">{req.user_email}</div>
                        </td>
                        <td className="p-3 uppercase font-bold text-slate-700">{req.division}</td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block capitalize">
                            {req.request_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {req.policy_name} ({req.is_monetizable ? 'Paid' : 'Unpaid'})
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">
                            {req.start_date} {req.end_date !== req.start_date && `to ${req.end_date}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {req.request_type === 'hourly_permission'
                              ? `${req.permission_start_time} - ${req.permission_end_time} (${req.permission_hours} hrs)`
                              : req.request_type === 'half_day_leave'
                              ? `Half-Day (${req.half_day_session?.replace('_', ' ')})`
                              : `${req.total_days} Day(s)`}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs">
                          <p className="text-slate-600 line-clamp-2">{req.reason}</p>
                        </td>
                        <td className="p-3">
                          {req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Approved
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {req.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleReviewLeave(req.id, 'approved', req.user_name)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewLeave(req.id, 'rejected', req.user_name)}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-xs"
                              >
                                Reject
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

      {/* TAB 5: SALARY SCALE CONFIG */}
      {activeTab === 'salaries' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Employee Salary Scales & Base Rates</h2>
              <p className="text-xs text-slate-500">
                Define base monthly compensation, hourly rates, and currency scales used for automated payroll calculation.
              </p>
            </div>
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
              className="flex items-center gap-1.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Staff Salary</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Division & Role</th>
                    <th className="p-3">Monthly Base</th>
                    <th className="p-3">Hourly Rate</th>
                    <th className="p-3">Currency</th>
                    <th className="p-3">Effective Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaries.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{s.user_name}</div>
                        <div className="text-[11px] text-slate-400">{s.user_email}</div>
                      </td>
                      <td className="p-3">
                        <span className="uppercase font-bold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {s.division}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{s.user_role}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {s.currency} {Number(s.monthly_base_salary || 0).toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        {s.currency} {Number(s.hourly_rate || 0)} / hr
                      </td>
                      <td className="p-3 font-bold text-slate-600">{s.currency}</td>
                      <td className="p-3 text-slate-500">{s.effective_from}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSalaryForm(s);
                            setShowSalaryModal(true);
                          }}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded transition-all cursor-pointer"
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Payroll Month:</span>
              </div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#58051E]"
              />
            </div>

            <button
              onClick={handleGeneratePayroll}
              disabled={isGeneratingPayroll}
              className="flex items-center gap-1.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>{isGeneratingPayroll ? 'Processing...' : 'Run Enterprise Payroll Calculation'}</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Division</th>
                    <th className="p-3">Attended Days / Hrs</th>
                    <th className="p-3">Base Scale</th>
                    <th className="p-3">Gross Pay</th>
                    <th className="p-3">Deductions</th>
                    <th className="p-3">Net Payable</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No payroll processed yet for {selectedMonth}. Click "Run Enterprise Payroll Calculation" above.
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{p.user_name}</div>
                          <div className="text-[11px] text-slate-400">{p.user_email}</div>
                        </td>
                        <td className="p-3 uppercase font-bold text-slate-700">{p.division}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{p.attended_days} / {p.total_working_days} days</div>
                          <div className="text-[11px] text-emerald-700 font-mono">{Number(p.verified_hours || 0)} verified hrs</div>
                        </td>
                        <td className="p-3 font-mono text-slate-700">${Number(p.base_salary || 0).toLocaleString()}</td>
                        <td className="p-3 font-mono text-slate-700">${Number(p.calculated_gross_pay || 0).toLocaleString()}</td>
                        <td className="p-3 font-mono text-rose-600">-${Number(p.deductions || 0).toLocaleString()}</td>
                        <td className="p-3 font-mono font-black text-emerald-700 text-sm">
                          ${Number(p.net_payable || 0).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            {p.status}
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

      {/* CREATE / EDIT SHIFT MODAL WITH TARGET STAFF ASSIGNMENT (PORTAL) */}
      {showShiftModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowShiftModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center border border-[#58051E]/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingShiftId ? 'Edit Shift Timing' : 'Create New Shift Timing'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Define working hours, thresholds, and assign targeted staff members or roles
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveShift} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shift Name*
                    </label>
                    <input
                      type="text"
                      required
                      value={shiftForm.name}
                      onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                      placeholder="e.g. Education Counselor Regular Shift"
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Division
                    </label>
                    <select
                      value={shiftForm.division}
                      onChange={(e) => setShiftForm({ ...shiftForm, division: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="all">All Divisions (Global)</option>
                      <option value="education">Education Counselors</option>
                      <option value="rimi">Rimi Frozen Logistics</option>
                      <option value="trade">Global Trade Floor</option>
                      <option value="digital">Ferex Digital Tech</option>
                      <option value="central">Central Platform</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Time*
                    </label>
                    <input
                      type="time"
                      required
                      step="1"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Time*
                    </label>
                    <input
                      type="time"
                      required
                      step="1"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Grace Period (Mins)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      required
                      value={shiftForm.grace_period_mins}
                      onChange={(e) =>
                        setShiftForm({ ...shiftForm, grace_period_mins: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Half-Day Min Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="12"
                      required
                      value={shiftForm.half_day_threshold_hours}
                      onChange={(e) =>
                        setShiftForm({ ...shiftForm, half_day_threshold_hours: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full-Day Min Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      required
                      value={shiftForm.full_day_threshold_hours}
                      onChange={(e) =>
                        setShiftForm({ ...shiftForm, full_day_threshold_hours: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                {/* TARGET AUDIENCE & STAFF ASSIGNMENT */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Target Audience & Staff Assignment
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: 'All Staff' },
                      { id: 'division', label: 'Entire Division' },
                      { id: 'roles', label: 'Target Roles' },
                      { id: 'specific_staff', label: 'Target Staff' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setShiftForm({ ...shiftForm, target_type: t.id as any })}
                        className={`p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          shiftForm.target_type === t.id
                            ? 'bg-[#58051E] text-white border-[#58051E]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* If Roles selected */}
                  {shiftForm.target_type === 'roles' && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        Select Roles who must use this shift:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_ROLES.map((r) => {
                          const checked = shiftForm.assigned_roles.includes(r.id);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => toggleRole(r.id)}
                              className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs text-left transition-all cursor-pointer ${
                                checked
                                  ? 'bg-purple-50 border-purple-400 text-purple-800 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                className="rounded text-purple-600"
                              />
                              <span>{r.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* If Specific Staff selected */}
                  {shiftForm.target_type === 'specific_staff' && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-semibold text-slate-600 block">
                        Assign Specific Staff Members (Quick Toggle or Add Email):
                      </span>

                      <div className="flex flex-wrap gap-1.5">
                        {KNOWN_STAFF.map((st) => {
                          const isAssigned = shiftForm.assigned_staff_emails.includes(st.email);
                          return (
                            <button
                              key={st.email}
                              type="button"
                              onClick={() => toggleStaffEmail(st.email)}
                              className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                                isAssigned
                                  ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>{st.name} ({st.email})</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <input
                          type="email"
                          placeholder="Add custom staff email..."
                          value={customEmailInput}
                          onChange={(e) => setCustomEmailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomEmail(e);
                            }
                          }}
                          className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58051E]"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomEmail}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Add Email
                        </button>
                      </div>

                      {shiftForm.assigned_staff_emails.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          <span className="text-[11px] text-slate-500 mr-1">Assigned:</span>
                          {shiftForm.assigned_staff_emails.map((em) => (
                            <span
                              key={em}
                              className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                            >
                              {em}
                              <button
                                type="button"
                                onClick={() => toggleStaffEmail(em)}
                                className="text-blue-500 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="shiftActive"
                    checked={shiftForm.is_active}
                    onChange={(e) => setShiftForm({ ...shiftForm, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-[#58051E] focus:ring-[#58051E]"
                  />
                  <label htmlFor="shiftActive" className="text-xs font-semibold text-slate-700">
                    Shift is Active and Available for Clock-In
                  </label>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                  >
                    {editingShiftId ? 'Save Changes' : 'Create Shift'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* LEAVE POLICY MODAL (PORTAL) */}
      {showPolicyModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center border border-[#58051E]/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Configure Leave Policy</h2>
                  <p className="text-xs text-slate-500">
                    Configure quotas, hourly permissions, and monetization (Paid vs Loss of Pay)
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePolicy} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Name*</label>
                    <input
                      type="text"
                      required
                      value={policyForm.name}
                      onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                      placeholder="e.g. Casual Leave"
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Code*</label>
                    <input
                      type="text"
                      required
                      value={policyForm.code}
                      onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. CL"
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Quota (Days)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={policyForm.annual_quota_days}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, annual_quota_days: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max Perm Hours / Mo</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={policyForm.monthly_max_permission_hours}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, monthly_max_permission_hours: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="policyMonetizable"
                      checked={policyForm.is_monetizable}
                      onChange={(e) => setPolicyForm({ ...policyForm, is_monetizable: e.target.checked })}
                      className="rounded text-[#58051E]"
                    />
                    <label htmlFor="policyMonetizable" className="text-xs font-bold text-slate-800">
                      Paid / Monetizable (No salary deduction during payroll)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Description</label>
                  <textarea
                    rows={2}
                    value={policyForm.description}
                    onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                    placeholder="Terms and conditions for this leave category..."
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPolicyModal(false)}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Save Policy
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* SALARY MODAL (PORTAL) */}
      {showSalaryModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setShowSalaryModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center border border-[#58051E]/20">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Set Staff Salary Scale</h2>
                  <p className="text-xs text-slate-500">
                    Configure monthly base salary and hourly billing rate for payroll calculation
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSalary} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email*</label>
                  <input
                    type="email"
                    required
                    value={salaryForm.user_email}
                    onChange={(e) => setSalaryForm({ ...salaryForm, user_email: e.target.value })}
                    placeholder="e.g. counselor@ferex.com"
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Full Name*</label>
                  <input
                    type="text"
                    required
                    value={salaryForm.user_name}
                    onChange={(e) => setSalaryForm({ ...salaryForm, user_name: e.target.value })}
                    placeholder="e.g. Admissions Counselor"
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Division</label>
                    <select
                      value={salaryForm.division}
                      onChange={(e) => setSalaryForm({ ...salaryForm, division: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="education">Education</option>
                      <option value="rimi">Rimi Logistics</option>
                      <option value="trade">Global Trade</option>
                      <option value="digital">Digital Tech</option>
                      <option value="central">Central Platform</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                    <select
                      value={salaryForm.currency}
                      onChange={(e) => setSalaryForm({ ...salaryForm, currency: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Base Salary / Month</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={salaryForm.monthly_base_salary}
                      onChange={(e) =>
                        setSalaryForm({ ...salaryForm, monthly_base_salary: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Rate</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={salaryForm.hourly_rate}
                      onChange={(e) =>
                        setSalaryForm({ ...salaryForm, hourly_rate: Number(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSalaryModal(false)}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Save Salary Scale
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
