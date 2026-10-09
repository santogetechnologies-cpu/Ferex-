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
      showToast(`Timesheet for ${counselorName} verified successfully.`);
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
    <div className="space-y-6 relative text-left pb-8 text-slate-900">
      {actionMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl animate-fade-in text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Header Banner (Matching Ferex light design system) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/10 text-[#58051E] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Education Staff Attendance, Leaves & Hours
            </h1>
            <span className="bg-[#58051E]/10 text-[#58051E] text-[11px] font-bold px-2.5 py-0.5 rounded border border-[#58051E]/20">
              Education Division
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Track daily counselor hours, review task achievements, approve half-day/hourly permissions, and clock in for administrative duties.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowApplyLeaveModal(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Apply Leave / Perm</span>
          </button>
          <ClockInOutWidget divisionOverride="education" />
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
          <span>Timesheet Verification</span>
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
          <span>Leave & Permission Approvals</span>
        </button>
      </div>

      {activeTab === 'timesheets' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Hours Tracked</span>
                <div className="text-xl font-bold font-mono text-slate-900">
                  {totalHoursLogged.toFixed(1)} hrs
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pending Review</span>
                <div className="text-xl font-bold font-mono text-amber-700">
                  {pendingCount} shifts
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Admin Verified</span>
                <div className="text-xl font-bold font-mono text-emerald-700">
                  {verifiedCount} shifts
                </div>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search counselor or task..."
                  className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg pl-8 pr-3 py-1.5 w-60 focus:outline-none focus:border-[#58051E]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#58051E]"
              >
                <option value="all">All Shifts</option>
                <option value="pending">Pending Verification</option>
                <option value="verified">Verified</option>
                <option value="active">Active (Currently Clocked In)</option>
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

          {/* Timesheets List */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Counselor / Staff</th>
                    <th className="p-3">Shift Date</th>
                    <th className="p-3">Clock In / Out</th>
                    <th className="p-3">Total Hours</th>
                    <th className="p-3">Shift Achievements / Tasks</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTimesheets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No counselor timesheet records found.
                      </td>
                    </tr>
                  ) : (
                    filteredTimesheets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{t.user_name}</div>
                          <div className="text-[11px] text-slate-400">{t.user_email}</div>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {t.shift_name || 'Standard Shift'}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-800">{t.date}</td>
                        <td className="p-3 text-slate-600">
                          <div>
                            In: <span className="font-semibold">{new Date(t.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {t.clock_out ? (
                            <div>
                              Out: <span className="font-semibold">{new Date(t.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-bold">Currently Active</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 text-sm">
                          {t.total_hours?.toFixed(1) || '0.0'} hrs
                        </td>
                        <td className="p-3 max-w-sm">
                          {t.work_summary ? (
                            <div className="text-slate-700 italic line-clamp-2">
                              "{t.work_summary}"
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No summary logged</span>
                          )}
                        </td>
                        <td className="p-3">
                          {t.is_superadmin_locked ? (
                            <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              Locked
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
                          {!t.is_admin_verified && t.status === 'completed' ? (
                            <button
                              onClick={() => handleVerify(t.id, t.user_name)}
                              className="bg-[#58051E] hover:bg-[#430316] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                            >
                              Verify Shift
                            </button>
                          ) : t.is_admin_verified ? (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Verified by {t.verified_by_admin_name || 'Admin'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">--</span>
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

      {/* LEAVES TAB */}
      {activeTab === 'leaves' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Counselor Leave & Permission Requests</h2>
              <p className="text-xs text-slate-500">Approve hourly permissions (1-3 hrs), half-day leaves, and emergency requests</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Counselor</th>
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
                      No counselor leave requests pending.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{req.user_name}</div>
                        <div className="text-[11px] text-slate-400">{req.user_email}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 capitalize block">
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
                      <td className="p-3 max-w-xs text-slate-600 line-clamp-2">{req.reason}</td>
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
      )}

      {/* APPLY LEAVE MODAL */}
      <LeavePermissionModal
        isOpen={showApplyLeaveModal}
        onClose={() => setShowApplyLeaveModal(false)}
        divisionOverride="education"
        onSuccess={() => loadData()}
      />
    </div>
  );
};
