import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  CheckCircle,
  Code2,
  Search,
  RefreshCw,
  Calendar,
  Check,
  X,
  Plus,
  Lock,
  Unlock,
  Sliders,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ClockInOutWidget } from '../../components/ClockInOutWidget';
import { LeavePermissionModal } from '../../components/LeavePermissionModal';
import { ShiftDetailsView } from '../../components/ShiftDetailsView';
import {
  getTimesheets,
  verifyTimesheetByAdmin,
  lockTimesheetsBySuperAdmin,
  unlockTimesheetsBySuperAdmin,
  closeTimesheetForDay,
  getDateRangeForPeriod,
  isTimesheetForAdmin,
  getLeaveRequests,
  updateLeaveRequestStatus,
  isAdminUser,
  type AttendanceTimesheet,
  type LeavePermissionRequest,
} from '../../lib/api/attendance';

export const DigitalAttendance: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'shifts' ? 'shifts' : searchParams.get('tab') === 'leaves' ? 'leaves' : 'timesheets';
  const [activeTab, setActiveTab] = useState<'timesheets' | 'leaves' | 'shifts'>(initialTab);
  const [timesheets, setTimesheets] = useState<AttendanceTimesheet[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeavePermissionRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Verify Modal state
  const [verifyModalTimesheet, setVerifyModalTimesheet] = useState<AttendanceTimesheet | null>(null);
  const [customHours, setCustomHours] = useState<string>('8.0');
  const [verifyOption, setVerifyOption] = useState<'1day' | 'actual' | 'custom'>('1day');
  const [verifyNotes, setVerifyNotes] = useState<string>('');

  const adminId = user?.id || profile?.id || 'digital-admin';
  const adminName = profile?.full_name || 'Digital Agency Admin';

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'timesheets') {
        const data = await getTimesheets({ division: 'digital' });
        setTimesheets(data);
      } else {
        const leaves = await getLeaveRequests({ division: 'digital' });
        const currentAdminEmail = (user?.email || profile?.email || '').toLowerCase().trim();
        const staffLeaves = (leaves || []).filter(
          (r) => !r.is_admin_request && !isAdminUser(r.user_role, r.user_email) && r.user_email.toLowerCase() !== currentAdminEmail
        );
        setLeaveRequests(staffLeaves);
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
  }, [activeTab]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleVerify = async (id: string, staffName: string, hours?: number, notes?: string) => {
    try {
      await verifyTimesheetByAdmin(
        id,
        adminId,
        adminName,
        notes || (hours ? `Verified as ${hours} hrs by Digital Admin` : 'Verified by Digital Tech Admin'),
        hours
      );
      showToast(`Timesheet for ${staffName} verified (${hours ? `${hours} hrs` : 'Actual'} successfully).`);
      setVerifyModalTimesheet(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLock = async (t: AttendanceTimesheet) => {
    try {
      if (t.is_superadmin_locked) {
        await unlockTimesheetsBySuperAdmin([t.id], adminId, adminName);
        showToast(`Timesheet unlocked for ${t.user_name}.`);
      } else {
        await lockTimesheetsBySuperAdmin([t.id], adminId, adminName);
        showToast(`Timesheet locked for ${t.user_name}.`);
      }
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
        adminId,
        adminName,
        `Reviewed by Digital Tech Admin`
      );
      showToast(`Leave request for ${employeeName} has been ${status}.`);
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

  const handleCloseSheetForEmployee = async (t: AttendanceTimesheet) => {
    try {
      await closeTimesheetForDay(t.id, adminId, adminName, t.total_hours || 8.0);
      showToast(`Timesheet for ${t.user_name} closed and locked for payroll.`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const dateRange = getDateRangeForPeriod(periodFilter, selectedDate, selectedMonth);

  const filtered = timesheets.filter((t) => {
    const matchesQuery =
      t.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.work_summary && t.work_summary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'verified'
        ? t.is_admin_verified
        : statusFilter === 'active'
        ? t.status === 'active'
        : statusFilter === 'locked'
        ? t.is_superadmin_locked
        : t.status === 'completed' && !t.is_admin_verified;

    let matchesDate = true;
    if (dateRange.startDate && dateRange.endDate) {
      const tDate = t.date || (t.clock_in ? t.clock_in.split('T')[0] : '');
      matchesDate = tDate >= dateRange.startDate && tDate <= dateRange.endDate;
    }

    return matchesQuery && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6 relative text-left pb-8 text-slate-900">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Ferex Digital Developers & PM Attendance
            </h1>
            <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2.5 py-0.5 rounded border border-indigo-200">
              Digital Division
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Track software engineers, PM sprint hours, design commits, review sprint work summaries, and verify timesheets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Apply Leave / Perm</span>
          </button>
          <ClockInOutWidget divisionOverride="digital" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('timesheets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'timesheets'
              ? 'bg-[#58051E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Engineer Timesheets</span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'bg-[#58051E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Leave & Permission Requests</span>
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'shifts'
              ? 'bg-[#58051E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Assigned Shifts / Shift Details</span>
        </button>
      </div>

      {activeTab === 'timesheets' && (
        <>
          {/* Period Filter (Daily, Weekly, Monthly) & Search Bar (Requirement C) */}
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

            {/* Live Search & Status Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search engineer or sprint task..."
                    className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg pl-8 pr-7 py-1.5 w-60 focus:outline-none focus:border-[#58051E]"
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58051E]"
                >
                  <option value="all">All Shifts</option>
                  <option value="pending">Pending Verification</option>
                  <option value="verified">Verified Shifts</option>
                  <option value="active">Active (Currently Clocked In)</option>
                  <option value="locked">Locked for Payroll</option>
                </select>
              </div>

              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Engineer / PM</th>
                    <th className="p-3">Shift Date</th>
                    <th className="p-3">Clock In / Out</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Sprint Tasks & Code Shipped</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No timesheet records found for Digital Agency.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{t.user_name}</div>
                          <div className="text-[11px] text-slate-400">{t.user_email}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-800">{t.date}</td>
                        <td className="p-3 text-slate-600">
                          <div>In: <span className="font-semibold">{new Date(t.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                          {t.clock_out && (
                            <div>Out: <span className="font-semibold">{new Date(t.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 text-sm">
                          {t.total_hours?.toFixed(1) || '0.0'} hrs
                        </td>
                        <td className="p-3 max-w-sm text-slate-600 italic">
                          {t.work_summary ? `"${t.work_summary}"` : '--'}
                        </td>
                        <td className="p-3">
                          {t.is_superadmin_locked ? (
                            <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : t.is_admin_verified ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Verified
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
                            {isAdminUser(t.user_role, t.user_email) ? (
                              <span className="text-[10px] text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md font-bold border border-purple-200 inline-flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                {t.is_superadmin_locked ? 'Locked by SuperAdmin' : 'Audited by SuperAdmin'}
                              </span>
                            ) : (
                              <>
                                {!t.is_superadmin_locked && (
                                  <>
                                    {!t.is_admin_verified ? (
                                      <button
                                        onClick={() => {
                                          setVerifyModalTimesheet(t);
                                          setCustomHours(t.total_hours > 0 ? String(t.total_hours) : '8.0');
                                          setVerifyOption('1day');
                                          setVerifyNotes('');
                                        }}
                                        className="bg-[#58051E] hover:bg-[#430316] text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                        title="Verify shift as 1 day, actual or custom hours"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>Verify Shift</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setVerifyModalTimesheet(t);
                                          setCustomHours(String(t.total_hours || 8));
                                          setVerifyOption('custom');
                                          setVerifyNotes(t.admin_notes || '');
                                        }}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer"
                                        title="Re-adjust verified hours"
                                      >
                                        Adjust Hours
                                      </button>
                                    )}
                                  </>
                                )}

                                {!t.is_superadmin_locked ? (
                                  <button
                                    onClick={() => handleCloseSheetForEmployee(t)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                    title="Close and lock shift for payroll"
                                  >
                                    <Lock className="w-3 h-3" />
                                    <span>Close Sheet</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleLock(t)}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-semibold px-2 py-1 rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                    title="Unlock timesheet for corrections"
                                  >
                                    <Unlock className="w-3 h-3" />
                                    <span>Unlock</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal for Verifying as 1 Day / Actual / Custom Hours */}
          {verifyModalTimesheet && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#58051E]" />
                      <span>Verify Attendance Shift</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {verifyModalTimesheet.user_name} ({verifyModalTimesheet.date})
                    </p>
                  </div>
                  <button
                    onClick={() => setVerifyModalTimesheet(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-700">Choose Verification Standard:</div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyOption('1day');
                        setCustomHours('8.0');
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        verifyOption === '1day'
                          ? 'border-[#58051E] bg-[#58051E]/5 text-[#58051E] font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">1 Full Day</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">8.0 hrs credit</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVerifyOption('actual');
                        setCustomHours(String(verifyModalTimesheet.total_hours || 0));
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        verifyOption === 'actual'
                          ? 'border-[#58051E] bg-[#58051E]/5 text-[#58051E] font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Actual Clocked</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {verifyModalTimesheet.total_hours?.toFixed(1) || '0.0'} hrs
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVerifyOption('custom')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        verifyOption === 'custom'
                          ? 'border-[#58051E] bg-[#58051E]/5 text-[#58051E] font-bold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Custom Hours</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Manual input</div>
                    </button>
                  </div>

                  {verifyOption === 'custom' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Specified Working Hours:</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        value={customHours}
                        onChange={(e) => setCustomHours(e.target.value)}
                        placeholder="e.g. 4.0 or 6.5"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#58051E]"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Admin Approval Notes (Optional):</label>
                    <input
                      type="text"
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="e.g. Verified by Digital Admin for full sprint commitment"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setVerifyModalTimesheet(null)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const finalHours =
                        verifyOption === '1day'
                          ? 8.0
                          : verifyOption === 'actual'
                          ? verifyModalTimesheet.total_hours || 8.0
                          : parseFloat(customHours) || 8.0;

                      handleVerify(
                        verifyModalTimesheet.id,
                        verifyModalTimesheet.user_name,
                        finalHours,
                        verifyNotes
                      );
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#58051E] hover:bg-[#430316] rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Verify Shift</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'leaves' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Engineer</th>
                  <th className="p-3">Type & Policy</th>
                  <th className="p-3">Duration / Time</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No pending leave requests for digital engineering team.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{req.user_name}</td>
                      <td className="p-3 capitalize">{req.request_type.replace(/_/g, ' ')}</td>
                      <td className="p-3">{req.start_date} ({req.total_days} days)</td>
                      <td className="p-3 max-w-xs text-slate-600 line-clamp-2">{req.reason}</td>
                      <td className="p-3">
                        <span className="text-[11px] font-bold uppercase">{req.status}</span>
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
      )}

      {/* ASSIGNED SHIFTS TAB */}
      {activeTab === 'shifts' && (
        <ShiftDetailsView
          division="digital"
          userEmail={user?.email || profile?.email || 'digital@ferex.com'}
          userRole={profile?.role || 'digital_manager'}
          userName={profile?.full_name || 'Digital Team Member'}
        />
      )}

      {/* APPLY MODAL */}
      <LeavePermissionModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        divisionOverride="digital"
        onSuccess={() => loadData()}
      />
    </div>
  );
};
