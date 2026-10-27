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
  UserCheck,
  Unlock,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LeavePermissionModal } from '../../components/LeavePermissionModal';
import {
  getTimesheets,
  verifyTimesheetByAdmin,
  lockTimesheetsBySuperAdmin,
  unlockTimesheetsBySuperAdmin,
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
  isAdminUser,
  getEnterpriseStaff,
  getDateRangeForPeriod,
  isTimesheetForAdmin,
  closeTimesheetForDay,
  updatePayrollItem,
  type AttendanceTimesheet,
  type Shift,
  type EmployeeSalary,
  type MonthlyPayroll,
  type LeavePolicyConfig,
  type LeavePermissionRequest,
  type StaffMember,
  type PayrollDeductionInput,
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

  // Period, Search, and Role Scope for Timesheets (Requirement C & B)
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleScope, setRoleScope] = useState<'admins' | 'employees' | 'all'>('admins');

  // Verify modal state
  const [verifyModal, setVerifyModal] = useState<{
    isOpen: boolean;
    timesheet: AttendanceTimesheet | null;
    mode: 'full_day' | 'actual' | 'custom';
    customHours: number;
  }>({
    isOpen: false,
    timesheet: null,
    mode: 'full_day',
    customHours: 8.0,
  });

  // Payroll Run Modal with Deductions (Requirement D)
  const [showRunPayrollModal, setShowRunPayrollModal] = useState(false);
  const [payrollDraftDeductions, setPayrollDraftDeductions] = useState<
    Record<string, { lossOfPayDeduction: number; customDeductions: number; deductionReason: string; allowances: number }>
  >({});
  const [payrollDraftPreview, setPayrollDraftPreview] = useState<any[]>([]);

  // Single Item Deductions Adjust Modal
  const [editingPayrollItem, setEditingPayrollItem] = useState<MonthlyPayroll | null>(null);
  const [editPayrollForm, setEditPayrollForm] = useState<{
    lossOfPayDeduction: number;
    customDeductions: number;
    deductionReason: string;
    allowances: number;
    status: 'draft' | 'approved' | 'paid' | 'locked';
  }>({
    lossOfPayDeduction: 0,
    customDeductions: 0,
    deductionReason: '',
    allowances: 150,
    status: 'approved',
  });

  // Shifts state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftFilterDivision, setShiftFilterDivision] = useState<string>('all');
  const [shiftSearchQuery, setShiftSearchQuery] = useState<string>('');
  const [enterpriseStaff, setEnterpriseStaff] = useState<StaffMember[]>([]);
  const [staffModalSearch, setStaffModalSearch] = useState<string>('');
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftError, setShiftError] = useState<string>('');
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
    target_type: 'all',
    assigned_staff_emails: [],
    assigned_roles: [],
    is_active: true,
  });
  const [customEmailInput, setCustomEmailInput] = useState('');

  // Leave Policies & Requests state
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicyConfig[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeavePermissionRequest[]>([]);
  const [leaveRoleFilter, setLeaveRoleFilter] = useState<'all' | 'admins_only' | 'staff_only'>('all');
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
    salary_type: 'both',
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
        const [data, staffList] = await Promise.all([
          getShifts(),
          getEnterpriseStaff(),
        ]);
        setShifts(data || []);
        if (staffList && staffList.length > 0) {
          setEnterpriseStaff(staffList);
        }
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
    window.addEventListener('ferex-payroll-updated', handleUpdate);
    return () => {
      window.removeEventListener('ferex-attendance-updated', handleUpdate);
      window.removeEventListener('ferex-leave-updated', handleUpdate);
      window.removeEventListener('ferex-shifts-updated', handleUpdate);
      window.removeEventListener('ferex-payroll-updated', handleUpdate);
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
    setShiftError('');
    setStaffModalSearch('');
    setShiftForm({
      name: '',
      division: 'all',
      start_time: '09:00:00',
      end_time: '18:00:00',
      grace_period_mins: 15,
      half_day_threshold_hours: 4.0,
      full_day_threshold_hours: 8.0,
      target_type: 'all',
      assigned_staff_emails: [],
      assigned_roles: [],
      is_active: true,
    });
    if (enterpriseStaff.length === 0) {
      getEnterpriseStaff().then((st) => setEnterpriseStaff(st));
    }
    setShowShiftModal(true);
  };

  const handleOpenEditShift = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setShiftError('');
    setStaffModalSearch('');
    const rawTarget = shift.target_type;
    const resolvedTarget = rawTarget === 'roles' ? 'roles' : rawTarget === 'specific_staff' ? 'specific_staff' : 'all';
    setShiftForm({
      name: shift.name,
      division: shift.division || 'all',
      start_time: shift.start_time || '09:00:00',
      end_time: shift.end_time || '18:00:00',
      grace_period_mins: shift.grace_period_mins ?? 15,
      half_day_threshold_hours: shift.half_day_threshold_hours ?? (shift.half_day_hours ?? 4.0),
      full_day_threshold_hours: shift.full_day_threshold_hours ?? (shift.full_day_hours ?? 8.0),
      target_type: resolvedTarget,
      assigned_staff_emails: shift.assigned_staff_emails || [],
      assigned_roles: shift.assigned_roles || [],
      is_active: shift.is_active ?? true,
    });
    if (enterpriseStaff.length === 0) {
      getEnterpriseStaff().then((st) => setEnterpriseStaff(st));
    }
    setShowShiftModal(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim()) {
      setShiftError('Shift name is required.');
      return;
    }
    setShiftSaving(true);
    setShiftError('');
    try {
      if (editingShiftId) {
        const res = await updateShift(editingShiftId, shiftForm);
        if (!res) throw new Error('Could not update shift');
        showToast('Shift timing updated successfully.');
      } else {
        const res = await createShift(shiftForm);
        if (!res) throw new Error('Could not create shift');
        showToast(`New shift "${res.name}" created and activated.`);
      }
      setShowShiftModal(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setShiftError(err.message || 'Error saving shift. Please try again.');
    } finally {
      setShiftSaving(false);
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

  const handlePrevPeriod = () => {
    if (periodFilter === 'daily') {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (periodFilter === 'weekly') {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (periodFilter === 'monthly') {
      const parts = selectedMonth.split('-').map(Number);
      const prev = new Date(parts[0], parts[1] - 2, 1);
      setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleNextPeriod = () => {
    if (periodFilter === 'daily') {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (periodFilter === 'weekly') {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (periodFilter === 'monthly') {
      const parts = selectedMonth.split('-').map(Number);
      const next = new Date(parts[0], parts[1], 1);
      setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setSelectedMonth(today.slice(0, 7));
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModal.timesheet) return;
    const t = verifyModal.timesheet;
    const hours =
      verifyModal.mode === 'full_day'
        ? 8.0
        : verifyModal.mode === 'actual'
        ? Math.max(0.1, t.total_hours || 8.0)
        : Number(verifyModal.customHours) || 8.0;

    try {
      await verifyTimesheetByAdmin(
        t.id,
        superAdminId,
        superAdminName,
        `Verified as ${hours} hrs by Central Super Admin`,
        hours
      );
      showToast(`Timesheet for ${t.user_name} verified as ${hours} hrs.`);
      setVerifyModal({ isOpen: false, timesheet: null, mode: 'full_day', customHours: 8.0 });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseSheet = async (t: AttendanceTimesheet) => {
    try {
      await closeTimesheetForDay(t.id, superAdminId, superAdminName, t.total_hours || 8.0);
      showToast(`Timesheet for ${t.user_name} closed and locked for payroll.`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Open interactive payroll modal with draft deduction inputs
  const openRunPayrollModal = async () => {
    setIsGeneratingPayroll(true);
    try {
      const [salariesList, allTimesheets, allLeaveRequests] = await Promise.all([
        getEmployeeSalaries(),
        getTimesheets({ startDate: `${selectedMonth}-01`, endDate: `${selectedMonth}-31` }),
        getLeaveRequests(),
      ]);

      const draftMap: Record<string, { lossOfPayDeduction: number; customDeductions: number; deductionReason: string; allowances: number }> = {};
      const previews: any[] = [];

      for (const salary of salariesList) {
        const userTimesheets = allTimesheets.filter((t) => t.user_email === salary.user_email);
        const verifiedTimesheets = userTimesheets.filter((t) => t.is_admin_verified || t.is_superadmin_locked);
        const userLeaves = allLeaveRequests.filter(
          (l) => l.user_email === salary.user_email && l.status === 'approved' && l.start_date.startsWith(selectedMonth)
        );
        const paidLeaveDays = userLeaves.filter((l) => l.is_monetizable).reduce((sum, l) => sum + (l.total_days || 0), 0);
        const unpaidLeaveDays = userLeaves.filter((l) => !l.is_monetizable).reduce((sum, l) => sum + (l.total_days || 0), 0);

        const attendedDays = verifiedTimesheets.length + paidLeaveDays;
        const verifiedHours = verifiedTimesheets.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
        const totalWorkingDays = 22;

        const salaryType = salary.salary_type || 'both';
        let calculatedGross = 0;

        if (salaryType === 'hourly') {
          calculatedGross = Number((verifiedHours * (salary.hourly_rate || 0)).toFixed(2));
        } else if (salaryType === 'monthly') {
          if (attendedDays >= totalWorkingDays) {
            calculatedGross = salary.monthly_base_salary;
          } else if (attendedDays > 0) {
            calculatedGross = Number(((salary.monthly_base_salary / totalWorkingDays) * attendedDays).toFixed(2));
          }
        } else {
          let basePart = salary.monthly_base_salary;
          if (attendedDays < totalWorkingDays && attendedDays > 0) {
            basePart = Number(((salary.monthly_base_salary / totalWorkingDays) * attendedDays).toFixed(2));
          } else if (attendedDays === 0) {
            basePart = 0;
          }
          const standardHoursThreshold = totalWorkingDays * 8;
          const overtimeHours = Math.max(0, verifiedHours - standardHoursThreshold);
          const overtimePay = Number((overtimeHours * (salary.hourly_rate || 0)).toFixed(2));
          calculatedGross = Number((basePart + overtimePay).toFixed(2));
        }

        let defaultLop = 0;
        if (salaryType !== 'hourly' && unpaidLeaveDays > 0) {
          defaultLop = Number(((salary.monthly_base_salary / totalWorkingDays) * unpaidLeaveDays).toFixed(2));
        }

        draftMap[salary.user_email] = {
          lossOfPayDeduction: defaultLop,
          customDeductions: 0,
          deductionReason: defaultLop > 0 ? `${unpaidLeaveDays} unpaid leave day(s)` : '',
          allowances: 150,
        };

        previews.push({
          salary,
          attendedDays,
          verifiedHours,
          calculatedGross,
          unpaidLeaveDays,
        });
      }

      setPayrollDraftDeductions(draftMap);
      setPayrollDraftPreview(previews);
      setShowRunPayrollModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPayroll(false);
    }
  };

  const handleConfirmRunPayroll = async () => {
    setIsGeneratingPayroll(true);
    try {
      const generated = await generateMonthlyPayroll(
        selectedMonth,
        superAdminId,
        superAdminName,
        payrollDraftDeductions
      );
      setPayrolls(generated || []);
      setShowRunPayrollModal(false);
      showToast(`Processed payroll for ${(generated || []).length} employees for ${selectedMonth} with custom deductions.`);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPayroll(false);
    }
  };

  const handleOpenEditPayroll = (p: MonthlyPayroll) => {
    setEditingPayrollItem(p);
    setEditPayrollForm({
      lossOfPayDeduction: p.loss_of_pay_deduction || 0,
      customDeductions: p.custom_deductions || 0,
      deductionReason: p.deduction_reason || '',
      allowances: p.allowances || 150,
      status: p.status || 'approved',
    });
  };

  const handleSaveEditPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayrollItem) return;
    try {
      await updatePayrollItem(editingPayrollItem.id, {
        loss_of_pay_deduction: Number(editPayrollForm.lossOfPayDeduction),
        custom_deductions: Number(editPayrollForm.customDeductions),
        deduction_reason: editPayrollForm.deductionReason,
        allowances: Number(editPayrollForm.allowances),
        status: editPayrollForm.status,
      });
      showToast(`Updated payroll & deductions for ${editingPayrollItem.user_name}.`);
      setEditingPayrollItem(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const dateRange = getDateRangeForPeriod(periodFilter, selectedDate, selectedMonth);

  const filteredTimesheets = timesheets.filter((t) => {
    // 1. Role Scope Filter (Requirement B: Oversee Admins vs Employees)
    const isAdmin = isTimesheetForAdmin(t);
    if (roleScope === 'admins' && !isAdmin) return false;
    if (roleScope === 'employees' && isAdmin) return false;

    // 2. Division Filter
    if (divisionFilter !== 'all' && t.division !== divisionFilter) return false;

    // 3. Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && t.status !== 'active') return false;
      if (statusFilter === 'completed' && (t.status !== 'completed' || t.is_admin_verified || t.is_superadmin_locked)) return false;
      if (statusFilter === 'verified' && (!t.is_admin_verified || t.is_superadmin_locked)) return false;
      if (statusFilter === 'locked' && !t.is_superadmin_locked) return false;
    }

    // 4. Date Range Filter (Requirement C: Daily, Weekly, Monthly)
    if (dateRange.startDate && dateRange.endDate) {
      const tDate = t.date || (t.clock_in ? t.clock_in.split('T')[0] : '');
      if (tDate < dateRange.startDate || tDate > dateRange.endDate) return false;
    }

    // 5. Search Query Filter (Requirement C: Searchable)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        (t.user_name && t.user_name.toLowerCase().includes(q)) ||
        (t.user_email && t.user_email.toLowerCase().includes(q)) ||
        (t.user_role && t.user_role.toLowerCase().includes(q)) ||
        (t.shift_name && t.shift_name.toLowerCase().includes(q)) ||
        (t.division && t.division.toLowerCase().includes(q)) ||
        (t.work_summary && t.work_summary.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const totalPeriodHours = filteredTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);
  const periodActiveCount = filteredTimesheets.filter((t) => t.status === 'active').length;
  const periodPendingCount = filteredTimesheets.filter((t) => t.status === 'completed' && !t.is_admin_verified && !t.is_superadmin_locked).length;
  const periodVerifiedCount = filteredTimesheets.filter((t) => t.is_admin_verified && !t.is_superadmin_locked).length;
  const periodLockedCount = filteredTimesheets.filter((t) => t.is_superadmin_locked).length;

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

      {/* TAB 1: TIMESHEETS & DAY CLOSING */}
      {activeTab === 'timesheets' && (
        <div className="space-y-4">
          {/* Top Scope & Bulk Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            {/* Role Scope Selector (Requirement B: Overseeing Portal Admins vs Employees) */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setRoleScope('admins')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleScope === 'admins'
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Portal Division Admins (Direct Reports)</span>
              </button>

              <button
                onClick={() => setRoleScope('employees')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleScope === 'employees'
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Division Employees & Staff</span>
              </button>

              <button
                onClick={() => setRoleScope('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleScope === 'all'
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>All Personnel ({timesheets.length})</span>
              </button>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkLock}
                className="flex items-center gap-1.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close & Lock Selected Sheets ({selectedIds.length})</span>
              </button>
            )}
          </div>

          {/* Period Filter (Daily, Weekly, Monthly) & Date Switcher (Requirement C) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Period Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodFilter(p)}
                    className={`px-3 py-1 rounded text-xs font-bold capitalize transition-all cursor-pointer ${
                      periodFilter === p
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p === 'all' ? 'All Time' : p}
                  </button>
                ))}
              </div>

              {/* Date Switcher Controls */}
              <div className="flex items-center gap-2">
                {periodFilter !== 'all' && (
                  <button
                    onClick={handlePrevPeriod}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {periodFilter === 'daily' && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#58051E]"
                  />
                )}

                {periodFilter === 'weekly' && (
                  <span className="text-xs font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                    {dateRange.label}
                  </span>
                )}

                {periodFilter === 'monthly' && (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#58051E]"
                  />
                )}

                {periodFilter !== 'all' && (
                  <button
                    onClick={handleNextPeriod}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {periodFilter !== 'all' && (
                  <button
                    onClick={handleToday}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Today / Current
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns & Live Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, task summary..."
                    className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg pl-8 pr-7 py-1.5 w-64 focus:outline-none focus:border-[#58051E]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                  <option value="central">Central HQ</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58051E]"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active (Currently Clocked In)</option>
                  <option value="completed">Completed (Pending Review)</option>
                  <option value="verified">Verified Shifts</option>
                  <option value="locked">Locked for Payroll</option>
                </select>
              </div>

              {/* Quick Period Summary KPI */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500">
                  Showing <strong className="text-slate-800 font-mono">{filteredTimesheets.length}</strong> records
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">
                  Total Logged: <strong className="text-[#58051E] font-mono">{totalPeriodHours.toFixed(1)} hrs</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Timesheets Data Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredTimesheets.length > 0 && selectedIds.length === filteredTimesheets.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(filteredTimesheets.map((t) => t.id));
                          else setSelectedIds([]);
                        }}
                        className="rounded border-slate-300 text-[#58051E] focus:ring-[#58051E]"
                      />
                    </th>
                    <th className="p-3">Personnel & Reporting Role</th>
                    <th className="p-3">Division</th>
                    <th className="p-3">Shift Date & Timestamps</th>
                    <th className="p-3">Logged Hours</th>
                    <th className="p-3">Daily Tasks & Achievements</th>
                    <th className="p-3">Audit Status</th>
                    <th className="p-3 text-right">SuperAdmin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTimesheets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No timesheet records found for {dateRange.label}.
                      </td>
                    </tr>
                  ) : (
                    filteredTimesheets.map((t) => {
                      const isAdmin = isTimesheetForAdmin(t);
                      return (
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
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{t.user_name}</span>
                              {isAdmin && (
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-purple-200">
                                  PORTAL ADMIN
                                </span>
                              )}
                            </div>
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
                              {t.clock_out ? (
                                ` | Out: ${new Date(t.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              ) : (
                                <span className="text-blue-600 font-bold ml-1">• Currently Clocked In</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 text-sm">
                            {Number(t.total_hours || 0).toFixed(1)} hrs
                          </td>
                          <td className="p-3 max-w-xs">
                            {t.work_summary ? (
                              <p className="line-clamp-2 text-slate-600 italic">"{t.work_summary}"</p>
                            ) : (
                              <span className="text-slate-400 italic">No daily summary submitted yet</span>
                            )}
                          </td>
                          <td className="p-3">
                            {t.is_superadmin_locked ? (
                              <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                <Lock className="w-3 h-3" /> Locked for Payroll
                              </span>
                            ) : t.is_admin_verified ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Verified ({t.total_hours}h)
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
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Quick Verify */}
                              {!t.is_admin_verified && !t.is_superadmin_locked && (
                                <button
                                  onClick={() =>
                                    setVerifyModal({
                                      isOpen: true,
                                      timesheet: t,
                                      mode: 'full_day',
                                      customHours: 8.0,
                                    })
                                  }
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2 py-1 rounded shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Verify shift duration"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Verify Shift</span>
                                </button>
                              )}

                              {/* Close Sheet (Requirement D: Superadmin closes sheet for admins & employees) */}
                              {!t.is_superadmin_locked && (
                                <button
                                  onClick={() => handleCloseSheet(t)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Close and lock shift for monthly payroll"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>{isAdmin ? 'Close Sheet for Admin' : 'Close Sheet'}</span>
                                </button>
                              )}

                              {/* Unlock Action */}
                              {t.is_superadmin_locked && (
                                <button
                                  onClick={() => {
                                    unlockTimesheetsBySuperAdmin([t.id], superAdminId, superAdminName).then(() => {
                                      showToast(`Timesheet unlocked for ${t.user_name}.`);
                                      loadData();
                                    });
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-300 shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Unlock timesheet for corrections"
                                >
                                  <Unlock className="w-3 h-3 text-amber-600" />
                                  <span>Unlock</span>
                                </button>
                              )}
                            </div>
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

      {/* TAB 2: SHIFT TIMINGS & TARGET STAFF */}
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

          {/* Shift Filter & Search Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-slate-500 font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Division:</span>
              </div>
              <select
                value={shiftFilterDivision}
                onChange={(e) => setShiftFilterDivision(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58051E]"
              >
                <option value="all">All Divisions ({shifts.length})</option>
                <option value="education">Education Counselors ({shifts.filter(s => s.division === 'education' || s.division === 'all').length})</option>
                <option value="rimi">Rimi Frozen Logistics ({shifts.filter(s => s.division === 'rimi' || s.division === 'all').length})</option>
                <option value="trade">Global Trade Floor ({shifts.filter(s => s.division === 'trade' || s.division === 'all').length})</option>
                <option value="digital">Ferex Digital Tech ({shifts.filter(s => s.division === 'digital' || s.division === 'all').length})</option>
                <option value="central">Central Platform ({shifts.filter(s => s.division === 'central' || s.division === 'all').length})</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search shifts or assigned staff..."
                  value={shiftSearchQuery}
                  onChange={(e) => setShiftSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg focus:outline-none focus:bg-white focus:border-[#58051E]"
                />
              </div>
              {shiftSearchQuery && (
                <button
                  onClick={() => setShiftSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Shifts Grid */}
          {(() => {
            const filteredShifts = shifts.filter((s) => {
              const matchesDiv =
                shiftFilterDivision === 'all' ||
                s.division === shiftFilterDivision ||
                s.division === 'all';
              const query = shiftSearchQuery.trim().toLowerCase();
              const matchesSearch =
                !query ||
                s.name.toLowerCase().includes(query) ||
                (s.division && s.division.toLowerCase().includes(query)) ||
                (s.assigned_staff_emails &&
                  s.assigned_staff_emails.some((em) => em.toLowerCase().includes(query))) ||
                (s.assigned_roles &&
                  s.assigned_roles.some((r) => r.toLowerCase().includes(query)));
              return matchesDiv && matchesSearch;
            });

            if (filteredShifts.length === 0) {
              return (
                <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">No Shifts Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                    {shiftSearchQuery || shiftFilterDivision !== 'all'
                      ? 'No shift timings match your current search or division filter.'
                      : 'No shift timings configured yet. Click below to create your first shift.'}
                  </p>
                  <button
                    onClick={handleOpenAddShift}
                    className="inline-flex items-center gap-1.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Shift Timing</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredShifts.map((shift) => (
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
                          <span className="font-medium text-slate-700">{shift.full_day_threshold_hours ?? shift.full_day_hours ?? 8.0} hrs</span>
                        </div>
                      </div>

                      {/* Targeted Staff or Roles Display */}
                      <div className="space-y-1 mb-3 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Target Audience ({shift.target_type || 'division'}):
                        </span>
                        {shift.assigned_staff_emails && shift.assigned_staff_emails.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
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
            );
          })()}
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
                Review and approve leave requests for division administrators, counselors, and staff across all enterprises.
              </p>
            </div>

            {/* LEAVE ROLE SCOPE FILTER PILLS */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setLeaveRoleFilter('all')}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  leaveRoleFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Requests ({leaveRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setLeaveRoleFilter('admins_only')}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  leaveRoleFilter === 'admins_only'
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Division Admins</span>
                {leaveRequests.filter(r => r.is_admin_request === true || isAdminUser(r.user_role, r.user_email)).filter(r => r.status === 'pending').length > 0 && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {leaveRequests.filter(r => r.is_admin_request === true || isAdminUser(r.user_role, r.user_email)).filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setLeaveRoleFilter('staff_only')}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  leaveRoleFilter === 'staff_only'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Counselors & Staff ({leaveRequests.filter(r => !r.is_admin_request && !isAdminUser(r.user_role, r.user_email)).length})</span>
              </button>
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
                  {leaveRequests.filter((r) => {
                    const isAdmin = r.is_admin_request === true || isAdminUser(r.user_role, r.user_email);
                    if (leaveRoleFilter === 'admins_only') return isAdmin;
                    if (leaveRoleFilter === 'staff_only') return !isAdmin;
                    return true;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        {leaveRoleFilter === 'admins_only'
                          ? 'No division administrator leave requests pending.'
                          : 'No pending leave or permission requests.'}
                      </td>
                    </tr>
                  ) : (
                    leaveRequests
                      .filter((r) => {
                        const isAdmin = r.is_admin_request === true || isAdminUser(r.user_role, r.user_email);
                        if (leaveRoleFilter === 'admins_only') return isAdmin;
                        if (leaveRoleFilter === 'staff_only') return !isAdmin;
                        return true;
                      })
                      .map((req) => {
                        const isAdmin = req.is_admin_request === true || isAdminUser(req.user_role, req.user_email);
                        return (
                          <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">{req.user_name}</div>
                              <div className="text-[11px] text-slate-400">{req.user_email}</div>
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 tracking-wider">
                                  <ShieldCheck className="w-3 h-3 text-purple-700" /> Division Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full mt-1">
                                  Staff / Counselor
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="uppercase font-bold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {req.division}
                              </span>
                            </td>
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
                                  Pending Review
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {req.status === 'pending' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleReviewLeave(req.id, 'approved', req.user_name)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-xs cursor-pointer transition-all"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleReviewLeave(req.id, 'rejected', req.user_name)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-xs cursor-pointer transition-all"
                                  >
                                    Reject
                                  </button>
                                </div>
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

      {/* TAB 5: SALARY SCALE CONFIG */}
      {activeTab === 'salaries' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Employee Salary Scales & Base Rates</h2>
              <p className="text-xs text-slate-500">
                Configure staff compensation on a monthly base, hourly wage rate, or both for automated payroll calculation.
              </p>
            </div>
            <button
              onClick={() => {
                setSalaryForm({
                  user_email: '',
                  user_name: '',
                  user_role: 'staff',
                  division: 'education',
                  salary_type: 'both',
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
                    <th className="p-3">Scale Configuration</th>
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
                      <td className="p-3">
                        {s.salary_type === 'hourly' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                            <Clock className="w-3 h-3 text-blue-600" /> Hourly Rate
                          </span>
                        ) : s.salary_type === 'monthly' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <Calendar className="w-3 h-3 text-emerald-600" /> Monthly Base
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
                            <Layers className="w-3 h-3 text-purple-600" /> Both (Hybrid)
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {s.salary_type === 'hourly' ? (
                          <span className="text-slate-400 font-normal italic text-[11px]">— (Hourly scale)</span>
                        ) : (
                          `${s.currency} ${Number(s.monthly_base_salary || 0).toLocaleString()}`
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        {s.salary_type === 'monthly' ? (
                          <span className="text-slate-400 font-normal italic text-[11px]">— (Monthly scale)</span>
                        ) : (
                          `${s.currency} ${Number(s.hourly_rate || 0)} / hr`
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-600">{s.currency}</td>
                      <td className="p-3 text-slate-500">{s.effective_from}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSalaryForm({
                              ...s,
                              salary_type: s.salary_type || 'both'
                            });
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

      {/* TAB 6: MONTHLY PAYROLL GENERATOR WITH DEDUCTIONS (Requirement D) */}
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
              onClick={openRunPayrollModal}
              disabled={isGeneratingPayroll}
              className="flex items-center gap-1.5 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>{isGeneratingPayroll ? 'Preparing Review...' : 'Run Enterprise Payroll with Deductions'}</span>
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
                    <th className="p-3">Payment Deductions</th>
                    <th className="p-3">Net Payable</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No payroll processed yet for {selectedMonth}. Click "Run Enterprise Payroll with Deductions" above.
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
                        <td className="p-3 font-mono text-slate-700">
                          {p.salary_type === 'hourly' ? (
                            <div>
                              <span className="font-bold text-blue-700">${Number(p.hourly_rate || 0)}/hr</span>
                              <div className="text-[10px] text-slate-400 font-sans">Hourly Scale</div>
                            </div>
                          ) : p.salary_type === 'monthly' ? (
                            <div>
                              <span className="font-bold text-emerald-700">${Number(p.base_salary || 0).toLocaleString()}</span>
                              <div className="text-[10px] text-slate-400 font-sans">Monthly Base</div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-purple-700">${Number(p.base_salary || 0).toLocaleString()}</span>
                              <div className="text-[10px] text-purple-600 font-sans font-medium">+${p.hourly_rate}/hr OT</div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-700">${Number(p.calculated_gross_pay || 0).toLocaleString()}</td>
                        <td className="p-3 font-mono">
                          <div className="text-rose-600 font-bold">-${Number(p.deductions || 0).toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            {p.loss_of_pay_deduction ? `LOP: $${p.loss_of_pay_deduction}` : ''}
                            {p.custom_deductions ? ` | Extra: $${p.custom_deductions}` : ''}
                            {p.deduction_reason ? ` (${p.deduction_reason})` : ''}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-700 text-sm">
                          ${Number(p.net_payable || 0).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleOpenEditPayroll(p)}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Adjust deductions for this employee"
                          >
                            <TrendingDown className="w-3 h-3 text-rose-500" />
                            <span>Adjust Deductions</span>
                          </button>
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shift Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                    placeholder="e.g. Regular Working Shift"
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
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

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'All Staff' },
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
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700">
                          Select Staff Members ({shiftForm.assigned_staff_emails.length} selected):
                        </span>
                        {shiftForm.assigned_staff_emails.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setShiftForm((prev) => ({ ...prev, assigned_staff_emails: [] }))
                            }
                            className="text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      {/* Filter/Search staff in modal */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search staff by name, email, or division..."
                          value={staffModalSearch}
                          onChange={(e) => setStaffModalSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg focus:outline-none focus:border-[#58051E]"
                        />
                      </div>

                      {/* Staff Chips list */}
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 border border-slate-200/80 rounded-xl bg-white">
                        {(() => {
                          const staffList =
                            enterpriseStaff.length > 0 ? enterpriseStaff : KNOWN_STAFF;
                          const q = staffModalSearch.trim().toLowerCase();
                          const filtered = staffList.filter(
                            (st) =>
                              !q ||
                              st.name.toLowerCase().includes(q) ||
                              st.email.toLowerCase().includes(q) ||
                              (st.role && st.role.toLowerCase().includes(q)) ||
                              (st.division && st.division.toLowerCase().includes(q))
                          );

                          if (filtered.length === 0) {
                            return (
                              <p className="text-xs text-slate-400 p-2 text-center w-full">
                                No staff members match "{staffModalSearch}".
                              </p>
                            );
                          }

                          return filtered.map((st) => {
                            const isAssigned = shiftForm.assigned_staff_emails.includes(
                              st.email.toLowerCase()
                            );
                            return (
                              <button
                                key={st.email}
                                type="button"
                                onClick={() => toggleStaffEmail(st.email.toLowerCase())}
                                className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                  isAssigned
                                    ? 'bg-[#58051E] text-white border-[#58051E] font-bold shadow-xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                <UserCheck className={`w-3 h-3 ${isAssigned ? 'text-white' : 'text-slate-400'}`} />
                                <span>{st.name}</span>
                                <span className={`text-[10px] ${isAssigned ? 'text-white/80' : 'text-slate-400'}`}>
                                  ({st.division || 'staff'})
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          type="email"
                          placeholder="Or type custom staff email..."
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
                        <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
                          <span className="text-[11px] text-slate-500 mr-1 self-center">Assigned ({shiftForm.assigned_staff_emails.length}):</span>
                          {shiftForm.assigned_staff_emails.map((em) => (
                            <span
                              key={em}
                              className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
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
                  <label htmlFor="shiftActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Shift is Active and Available for Clock-In
                  </label>
                </div>

                {shiftError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{shiftError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    disabled={shiftSaving}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={shiftSaving}
                    className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {shiftSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{shiftSaving ? 'Saving...' : editingShiftId ? 'Save Changes' : 'Create Shift'}</span>
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
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
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
                    Configure monthly salary, hourly rate, or both for automated payroll calculation
                  </p>
                </div>
              </div>

              {/* QUICK PRE-FILL STAFF CHIPS */}
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Quick Select Staff Member
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {KNOWN_STAFF.map((staff) => {
                    const isSelected = salaryForm.user_email === staff.email;
                    return (
                      <button
                        key={staff.email}
                        type="button"
                        onClick={() => {
                          setSalaryForm({
                            ...salaryForm,
                            user_email: staff.email,
                            user_name: staff.name,
                            user_role: staff.role,
                            division: staff.division,
                          });
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                          isSelected
                            ? 'bg-[#58051E] text-white border-[#58051E] shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {staff.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSaveSalary} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email*</label>
                  <input
                    type="email"
                    required
                    list="known-staff-emails"
                    value={salaryForm.user_email}
                    onChange={(e) => {
                      const email = e.target.value;
                      const matched = KNOWN_STAFF.find(st => st.email.toLowerCase() === email.toLowerCase());
                      if (matched) {
                        setSalaryForm({
                          ...salaryForm,
                          user_email: email,
                          user_name: matched.name,
                          user_role: matched.role,
                          division: matched.division,
                        });
                      } else {
                        setSalaryForm({ ...salaryForm, user_email: email });
                      }
                    }}
                    placeholder="e.g. counselor@ferex.com"
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                  <datalist id="known-staff-emails">
                    {KNOWN_STAFF.map((st) => (
                      <option key={st.email} value={st.email}>
                        {st.name} ({st.division})
                      </option>
                    ))}
                  </datalist>
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
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                </div>

                {/* SALARY SCALE TYPE SELECTOR */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Salary Configuration Basis
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSalaryForm({ ...salaryForm, salary_type: 'monthly' })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                        salaryForm.salary_type === 'monthly'
                          ? 'bg-white text-emerald-800 shadow-sm border border-emerald-300 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                      }`}
                    >
                      <Calendar className="w-4 h-4 mb-1 text-emerald-600" />
                      <span>Monthly Base</span>
                      <span className="text-[10px] text-slate-400 font-normal">Fixed salary</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalaryForm({ ...salaryForm, salary_type: 'hourly' })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                        salaryForm.salary_type === 'hourly'
                          ? 'bg-white text-blue-800 shadow-sm border border-blue-300 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                      }`}
                    >
                      <Clock className="w-4 h-4 mb-1 text-blue-600" />
                      <span>Hourly Rate</span>
                      <span className="text-[10px] text-slate-400 font-normal">Pay per hour</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalaryForm({ ...salaryForm, salary_type: 'both' })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                        (salaryForm.salary_type || 'both') === 'both'
                          ? 'bg-white text-purple-800 shadow-sm border border-purple-300 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                      }`}
                    >
                      <Layers className="w-4 h-4 mb-1 text-purple-600" />
                      <span>Both</span>
                      <span className="text-[10px] text-slate-400 font-normal">Monthly + Hourly</span>
                    </button>
                  </div>
                </div>

                {/* DYNAMIC SALARY INPUT FIELDS BASED ON CONFIGURATION */}
                {salaryForm.salary_type === 'monthly' && (
                  <div className="space-y-3 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 animate-fade-in">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-800">Base Salary / Month*</label>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                          Monthly Scale Active
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">
                          {salaryForm.currency}
                        </span>
                        <input
                          type="number"
                          required
                          min="0"
                          value={salaryForm.monthly_base_salary}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSalaryForm({
                              ...salaryForm,
                              monthly_base_salary: val,
                              // Auto calculate equivalent hourly rate for reference
                              hourly_rate: Number((val / 176).toFixed(2)),
                            });
                          }}
                          placeholder="e.g. 4500"
                          className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg pl-12 pr-3 py-2.5 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-1 border-t border-emerald-200/60">
                      <span>Equivalent hourly calculation (176 hrs):</span>
                      <span className="font-mono font-bold">
                        ~{salaryForm.currency} {((salaryForm.monthly_base_salary || 0) / 176).toFixed(2)} / hr
                      </span>
                    </div>
                  </div>
                )}

                {salaryForm.salary_type === 'hourly' && (
                  <div className="space-y-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/80 animate-fade-in">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-800">Hourly Wage Rate*</label>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          Hourly Scale Active
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">
                          {salaryForm.currency}
                        </span>
                        <input
                          type="number"
                          required
                          min="0"
                          value={salaryForm.hourly_rate}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSalaryForm({
                              ...salaryForm,
                              hourly_rate: val,
                              // Auto calculate equivalent monthly base for reference
                              monthly_base_salary: Number((val * 176).toFixed(0)),
                            });
                          }}
                          placeholder="e.g. 28"
                          className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg pl-12 pr-3 py-2.5 focus:outline-none focus:border-blue-600 font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div className="text-[11px] text-blue-800 flex items-center justify-between pt-1 border-t border-blue-200/60">
                      <span>Est. standard monthly gross (176 hrs):</span>
                      <span className="font-mono font-bold">
                        ~{salaryForm.currency} {((salaryForm.hourly_rate || 0) * 176).toLocaleString()} / month
                      </span>
                    </div>
                  </div>
                )}

                {(salaryForm.salary_type === 'both' || !salaryForm.salary_type) && (
                  <div className="space-y-3 bg-purple-50/50 p-3.5 rounded-xl border border-purple-200/80 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900">Configure Both Monthly & Hourly</span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded">
                        Dual Hybrid Scale
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Base Salary / Month*</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">
                            {salaryForm.currency}
                          </span>
                          <input
                            type="number"
                            required
                            min="0"
                            value={salaryForm.monthly_base_salary}
                            onChange={(e) =>
                              setSalaryForm({ ...salaryForm, monthly_base_salary: Number(e.target.value) })
                            }
                            className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg pl-12 pr-2.5 py-2.5 focus:outline-none focus:border-purple-600 font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Hourly Rate*</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">
                            {salaryForm.currency}
                          </span>
                          <input
                            type="number"
                            required
                            min="0"
                            value={salaryForm.hourly_rate}
                            onChange={(e) =>
                              setSalaryForm({ ...salaryForm, hourly_rate: Number(e.target.value) })
                            }
                            className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg pl-12 pr-2.5 py-2.5 focus:outline-none focus:border-purple-600 font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-purple-700 leading-relaxed">
                      Staff receives monthly base pay. Verified logged hours exceeding the standard monthly quota (176 hrs) are compensated at the hourly rate.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={salaryForm.effective_from || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
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

      {/* VERIFY SHIFT MODAL (PORTAL) */}
      {verifyModal.isOpen && verifyModal.timesheet &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setVerifyModal({ isOpen: false, timesheet: null, mode: 'full_day', customHours: 8.0 })}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Verify Shift Attendance</h2>
                  <p className="text-xs text-slate-500">{verifyModal.timesheet.user_name} ({verifyModal.timesheet.division})</p>
                </div>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    onClick={() => setVerifyModal({ ...verifyModal, mode: 'full_day' })}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      verifyModal.mode === 'full_day'
                        ? 'border-[#58051E] bg-[#58051E]/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="verify_mode"
                      checked={verifyModal.mode === 'full_day'}
                      onChange={() => setVerifyModal({ ...verifyModal, mode: 'full_day' })}
                      className="mt-0.5 text-[#58051E]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">1 Full Day (8.0 Hours)</div>
                      <div className="text-[11px] text-slate-500">Standard 8h day quota; completes and clocks out shift.</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setVerifyModal({ ...verifyModal, mode: 'actual' })}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      verifyModal.mode === 'actual'
                        ? 'border-[#58051E] bg-[#58051E]/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="verify_mode"
                      checked={verifyModal.mode === 'actual'}
                      onChange={() => setVerifyModal({ ...verifyModal, mode: 'actual' })}
                      className="mt-0.5 text-[#58051E]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Actual Logged Duration ({Number(verifyModal.timesheet.total_hours || 0).toFixed(1)} hrs)
                      </div>
                      <div className="text-[11px] text-slate-500">Verify duration based on logged clock-in / clock-out timestamps.</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setVerifyModal({ ...verifyModal, mode: 'custom' })}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      verifyModal.mode === 'custom'
                        ? 'border-[#58051E] bg-[#58051E]/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="verify_mode"
                      checked={verifyModal.mode === 'custom'}
                      onChange={() => setVerifyModal({ ...verifyModal, mode: 'custom' })}
                      className="mt-0.5 text-[#58051E]"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 mb-1">Custom Hours Override</div>
                      {verifyModal.mode === 'custom' && (
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={verifyModal.customHours}
                          onChange={(e) => setVerifyModal({ ...verifyModal, customHours: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2 focus:outline-none focus:border-[#58051E]"
                        />
                      )}
                    </div>
                  </label>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setVerifyModal({ isOpen: false, timesheet: null, mode: 'full_day', customHours: 8.0 })}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Confirm Verification
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* RUN PAYROLL WITH DEDUCTIONS REVIEW MODAL (Requirement D) */}
      {showRunPayrollModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowRunPayrollModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center border border-[#58051E]/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Review Enterprise Payroll & Payment Deductions ({selectedMonth})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Audit gross earnings, input loss-of-pay or custom advance/penalty deductions, and confirm final payouts.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl mb-5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Staff / Admin</th>
                      <th className="p-3">Scale & Days</th>
                      <th className="p-3">Gross Pay</th>
                      <th className="p-3">LOP Deduction ($)</th>
                      <th className="p-3">Custom Deduction ($)</th>
                      <th className="p-3">Deduction Reason</th>
                      <th className="p-3 text-right">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollDraftPreview.map((item) => {
                      const email = item.salary.user_email;
                      const draft = payrollDraftDeductions[email] || {
                        lossOfPayDeduction: 0,
                        customDeductions: 0,
                        deductionReason: '',
                        allowances: 150,
                      };
                      const totalDed = (draft.lossOfPayDeduction || 0) + (draft.customDeductions || 0);
                      const net = Math.max(0, Number((item.calculatedGross + (draft.allowances || 150) - totalDed).toFixed(2)));

                      return (
                        <tr key={email} className="hover:bg-slate-50/70">
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{item.salary.user_name}</div>
                            <div className="text-[11px] text-slate-400">{email}</div>
                            <span className="uppercase font-bold text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                              {item.salary.division} • {item.salary.user_role}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{item.attendedDays} / 22 days</div>
                            <div className="text-[10px] text-slate-400">{item.verifiedHours} hrs logged</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">
                            ${Number(item.calculatedGross).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={draft.lossOfPayDeduction}
                              onChange={(e) =>
                                setPayrollDraftDeductions({
                                  ...payrollDraftDeductions,
                                  [email]: {
                                    ...draft,
                                    lossOfPayDeduction: Number(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-24 bg-white border border-slate-200 text-slate-800 text-xs font-mono font-semibold rounded p-1.5 focus:outline-none focus:border-[#58051E]"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              placeholder="0"
                              value={draft.customDeductions}
                              onChange={(e) =>
                                setPayrollDraftDeductions({
                                  ...payrollDraftDeductions,
                                  [email]: {
                                    ...draft,
                                    customDeductions: Number(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-24 bg-white border border-slate-200 text-slate-800 text-xs font-mono font-semibold rounded p-1.5 focus:outline-none focus:border-[#58051E]"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="e.g. Advance repayment"
                              value={draft.deductionReason}
                              onChange={(e) =>
                                setPayrollDraftDeductions({
                                  ...payrollDraftDeductions,
                                  [email]: {
                                    ...draft,
                                    deductionReason: e.target.value,
                                  },
                                })
                              }
                              className="w-36 bg-white border border-slate-200 text-slate-800 text-xs rounded p-1.5 focus:outline-none focus:border-[#58051E]"
                            />
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                            ${net.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRunPayrollModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRunPayroll}
                  disabled={isGeneratingPayroll}
                  className="px-5 py-2.5 bg-[#58051E] hover:bg-[#430316] text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  <span>{isGeneratingPayroll ? 'Committing Payroll...' : 'Finalize & Save Payroll'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ADJUST DEDUCTIONS FOR INDIVIDUAL EMPLOYEE (PORTAL) */}
      {editingPayrollItem &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setEditingPayrollItem(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Adjust Payment Deductions</h2>
                  <p className="text-xs text-slate-500">
                    {editingPayrollItem.user_name} ({editingPayrollItem.payroll_month})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveEditPayroll} className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Earnings:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ${Number(editingPayrollItem.calculated_gross_pay || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Base Allowances:</span>
                    <span className="font-mono font-bold text-slate-900">${editPayrollForm.allowances}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                    <span>Total Deductions:</span>
                    <span className="font-mono">
                      -${(Number(editPayrollForm.lossOfPayDeduction) + Number(editPayrollForm.customDeductions)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-black text-sm border-t border-slate-200 pt-1">
                    <span>Net Payable:</span>
                    <span className="font-mono">
                      $
                      {Math.max(
                        0,
                        Number(editingPayrollItem.calculated_gross_pay || 0) +
                          Number(editPayrollForm.allowances) -
                          (Number(editPayrollForm.lossOfPayDeduction) + Number(editPayrollForm.customDeductions))
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loss of Pay (LOP) Deduction ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editPayrollForm.lossOfPayDeduction}
                    onChange={(e) =>
                      setEditPayrollForm({ ...editPayrollForm, lossOfPayDeduction: Number(e.target.value) })
                    }
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Deduction ($) (Advance, Penalty, Fines)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editPayrollForm.customDeductions}
                    onChange={(e) =>
                      setEditPayrollForm({ ...editPayrollForm, customDeductions: Number(e.target.value) })
                    }
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deduction Reason / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Repayment of salary advance #04"
                    value={editPayrollForm.deductionReason}
                    onChange={(e) => setEditPayrollForm({ ...editPayrollForm, deductionReason: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPayrollItem(null)}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold py-2.5 rounded-lg text-xs shadow-xs cursor-pointer"
                  >
                    Save Adjustments
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
