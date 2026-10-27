import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  CheckCircle,
  Globe,
  Search,
  RefreshCw,
  Calendar,
  Check,
  X,
  Plus,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Filter
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

export const TradeAttendance: React.FC = () => {
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

  const adminId = user?.id || profile?.id || 'trade-admin';
  const adminName = profile?.full_name || 'Global Trade Admin';

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'timesheets') {
        const data = await getTimesheets({ division: 'trade' });
        setTimesheets(data);
      } else {
        const leaves = await getLeaveRequests({ division: 'trade' });
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

  const handleVerify = async (id: string, staffName: string, hours?: number) => {
    try {
      await verifyTimesheetByAdmin(
        id,
        adminId,
        adminName,
        hours ? `Verified as ${hours} hrs by Trade Admin` : 'Verified by Trade Operations Admin',
        hours
      );
      showToast(`Timesheet for ${staffName} verified (${hours ? `${hours} hrs` : 'Actual'}).`);
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

  const handleCloseSheetForEmployee = async (t: AttendanceTimesheet) => {
    try {
      await closeTimesheetForDay(t.id, adminId, adminName, t.total_hours || 8.0);
      showToast(`Timesheet for ${t.user_name} closed and locked for payroll.`);
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
        `Reviewed by Trade Admin`
      );
      showToast(`Leave request for ${employeeName} has been ${status}.`);
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
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Global Trade Desk Attendance & Shifts
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded border border-emerald-200">
              Global Trade Floor
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Monitor trading floor counselor & officer working hours, trade desk executions, verify daily summaries, and manage permissions.
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
          <ClockInOutWidget divisionOverride="trade" />
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
          <span>Trading Floor Timesheets</span>
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
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Period selector */}
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPeriodFilter('daily')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    periodFilter === 'daily'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter('weekly')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    periodFilter === 'weekly'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter('monthly')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    periodFilter === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    periodFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Time
                </button>
              </div>

              {/* Date navigator for Daily/Weekly/Monthly */}
              {periodFilter !== 'all' && (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={handlePrevPeriod}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                    title="Previous"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPeriod}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                    title="Next"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="border-l border-slate-200 pl-1.5 ml-1">
                    {periodFilter === 'monthly' ? (
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-slate-800 text-xs font-medium focus:outline-none cursor-pointer"
                      />
                    ) : (
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent text-slate-800 text-xs font-medium focus:outline-none cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trade staff or deal log..."
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg pl-8 pr-7 py-1.5 w-56 focus:outline-none focus:border-[#58051E]"
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
                <option value="active">Active (Clocked In)</option>
                <option value="locked">Locked for Payroll</option>
              </select>

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
                    <th className="p-3">Trade Staff Member</th>
                    <th className="p-3">Shift Date</th>
                    <th className="p-3">Clock In / Out</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Trading Floor Achievements</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No trade floor timesheet records found.
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
                                {!t.is_superadmin_locked && !t.is_admin_verified && (
                                  <button
                                    onClick={() => handleVerify(t.id, t.user_name, 8.0)}
                                    className="bg-[#58051E] hover:bg-[#430316] text-white text-[11px] font-semibold px-2 py-1 rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                    title="Verify as 1 Full Day (8 hrs)"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Verify (1 Day)</span>
                                  </button>
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
        </>
      )}

      {activeTab === 'leaves' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Staff</th>
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
                      No pending leave requests for trade staff.
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
          division="trade"
          userEmail={user?.email || profile?.email || 'trade@ferex.com'}
          userRole={profile?.role || 'logistics_officer'}
          userName={profile?.full_name || 'Trade Team Member'}
        />
      )}

      {/* APPLY MODAL */}
      <LeavePermissionModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        divisionOverride="trade"
        onSuccess={() => loadData()}
      />
    </div>
  );
};
