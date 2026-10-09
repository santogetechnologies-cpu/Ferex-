import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  CheckCircle,
  Calendar,
  Filter,
  RefreshCw,
  Users,
  Search,
  Check,
  X,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ClockInOutWidget } from '../../components/ClockInOutWidget';
import { LeavePermissionModal } from '../../components/LeavePermissionModal';
import {
  getTimesheets,
  verifyTimesheetByAdmin,
  getLeaveRequests,
  updateLeaveRequestStatus,
  type AttendanceTimesheet,
  type LeavePermissionRequest,
} from '../../lib/api/attendance';

export const AdminAttendance: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'timesheets' | 'leaves'>('timesheets');
  const [timesheets, setTimesheets] = useState<AttendanceTimesheet[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeavePermissionRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const adminId = user?.id || profile?.id || 'edu-admin';
  const adminName = profile?.full_name || 'Education Admin';

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'timesheets') {
        const data = await getTimesheets({ division: 'education' });
        setTimesheets(data);
      } else {
        const leaves = await getLeaveRequests({ division: 'education' });
        setLeaveRequests(leaves);
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
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const handleVerify = async (id: string, counselorName: string) => {
    setLoading(true);
    try {
      await verifyTimesheetByAdmin(id, adminId, adminName, 'Verified by Education Division Admin');
      showToast(`✅ Timesheet for ${counselorName} verified successfully.`);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        `Reviewed by Education Admin`
      );
      showToast(`Leave request for ${employeeName} has been ${status}.`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTimesheets = timesheets.filter((t) => {
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
        : t.status === 'completed' && !t.is_admin_verified;

    return matchesQuery && matchesStatus;
  });

  const totalHoursLogged = timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);
  const verifiedCount = timesheets.filter((t) => t.is_admin_verified).length;
  const pendingCount = timesheets.filter((t) => t.status === 'completed' && !t.is_admin_verified).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-100">
      {actionMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl animate-bounce text-sm font-medium">
          <CheckCircle className="w-5 h-5" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-500/20 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Clock className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Education Staff Attendance, Leaves & Hours
            </h1>
          </div>
          <p className="text-xs text-sky-200/70 max-w-xl">
            Track daily counselor hours, review task achievements, approve half-day/hourly permissions, and clock in for your administrative duties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowApplyLeaveModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-full transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Apply Leave / Perm</span>
          </button>
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-sky-500/30 backdrop-blur-md">
            <ClockInOutWidget divisionOverride="education" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('timesheets')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'timesheets'
              ? 'bg-sky-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Timesheet Verification</span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'bg-sky-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Leave & Permission Approvals</span>
        </button>
      </div>

      {activeTab === 'timesheets' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Total Hours Tracked</span>
                <div className="text-xl font-bold font-mono text-white">
                  {totalHoursLogged.toFixed(1)} hrs
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Pending Review</span>
                <div className="text-xl font-bold font-mono text-amber-400">
                  {pendingCount} shifts
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Admin Verified</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {verifiedCount} shifts
                </div>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search counselor or task..."
                  className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2 w-60 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">All Shifts</option>
                <option value="pending">Pending Verification</option>
                <option value="verified">Verified</option>
                <option value="active">Active (Currently Clocked In)</option>
              </select>
            </div>

            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Timesheets List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Counselor / Staff</th>
                    <th className="p-3.5">Shift Date</th>
                    <th className="p-3.5">Clock In / Out</th>
                    <th className="p-3.5">Total Hours</th>
                    <th className="p-3.5">Task Achievement Summary</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTimesheets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No attendance records found for Education staff.
                      </td>
                    </tr>
                  ) : (
                    filteredTimesheets.map((sheet) => (
                      <tr key={sheet.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          <div>{sheet.user_name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {sheet.user_email} • <span className="text-sky-400 capitalize">{sheet.user_role}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-200">
                          {sheet.date}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          <div>In: {new Date(sheet.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          {sheet.clock_out && (
                            <div className="text-slate-400">
                              Out: {new Date(sheet.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {sheet.total_hours?.toFixed(1) || '0.0'} hrs
                        </td>
                        <td className="p-3.5 max-w-sm">
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {sheet.work_summary || (
                              <span className="italic text-slate-500">Shift currently running</span>
                            )}
                          </p>
                        </td>
                        <td className="p-3.5">
                          {sheet.is_superadmin_locked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                              🔒 Locked for Payroll
                            </span>
                          ) : sheet.is_admin_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                              <ShieldCheck className="w-3 h-3" /> Verified
                            </span>
                          ) : sheet.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                              Active In Shift
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                              Needs Review
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {!sheet.is_admin_verified && sheet.status === 'completed' && (
                            <button
                              onClick={() => handleVerify(sheet.id, sheet.user_name)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-md shadow-emerald-600/30 transition-all transform hover:scale-105 cursor-pointer"
                            >
                              Verify Day
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
        </>
      )}

      {/* LEAVE APPROVALS TAB */}
      {activeTab === 'leaves' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-700">
                <tr>
                  <th className="p-3.5">Counselor</th>
                  <th className="p-3.5">Type & Policy</th>
                  <th className="p-3.5">Dates / Schedule</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Payroll Type</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No counselor leave requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        <div>{req.user_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{req.user_email}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-200 block">{req.policy_name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{req.request_type.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium">
                        <div>{req.start_date} {req.end_date !== req.start_date ? `to ${req.end_date}` : ''}</div>
                        {req.permission_start_time && (
                          <div className="text-[11px] text-sky-400 font-mono">
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
                      <td className="p-3.5 max-w-xs text-slate-300 text-[11px]">
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
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition-all cursor-pointer"
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReviewLeave(req.id, 'rejected', req.user_name)}
                              className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-md transition-all cursor-pointer"
                              title="Reject"
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
      )}

      {/* Apply Leave Modal */}
      <LeavePermissionModal
        isOpen={showApplyLeaveModal}
        onClose={() => setShowApplyLeaveModal(false)}
        divisionOverride="education"
        onSuccess={loadData}
      />
    </div>
  );
};
