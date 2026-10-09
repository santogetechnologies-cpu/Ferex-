import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  CheckCircle,
  Truck,
  Search,
  RefreshCw,
  Calendar,
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

export const RimiAttendance: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'timesheets' | 'leaves'>('timesheets');
  const [timesheets, setTimesheets] = useState<AttendanceTimesheet[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeavePermissionRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const adminId = user?.id || profile?.id || 'rimi-admin';
  const adminName = profile?.full_name || 'Rimi Logistics Admin';

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'timesheets') {
        const data = await getTimesheets({ division: 'rimi' });
        setTimesheets(data);
      } else {
        const leaves = await getLeaveRequests({ division: 'rimi' });
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
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleVerify = async (id: string, staffName: string) => {
    try {
      await verifyTimesheetByAdmin(id, adminId, adminName, 'Verified by Rimi Operations Admin');
      showToast(`Timesheet for ${staffName} verified.`);
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
        `Reviewed by Rimi Admin`
      );
      showToast(`Leave request for ${employeeName} has been ${status}.`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = timesheets.filter(
    (t) =>
      t.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.work_summary && t.work_summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Rimi Logistics & Warehouse Attendance
            </h1>
            <span className="bg-sky-50 text-sky-700 text-[11px] font-bold px-2.5 py-0.5 rounded border border-sky-200">
              Rimi Frozen Foods
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Track cold-chain staff shifts, dispatch hours, loading logs, verify timesheets, and approve leave requests.
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
          <ClockInOutWidget divisionOverride="rimi" />
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
          <span>Warehouse Timesheets</span>
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
      </div>

      {activeTab === 'timesheets' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff or shift summary..."
                className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg pl-8 pr-3 py-1.5 w-60 focus:outline-none focus:border-[#58051E]"
              />
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Logistics Staff</th>
                    <th className="p-3">Shift Date</th>
                    <th className="p-3">Clock In / Out</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Shift Log & Loading Summary</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No timesheet records found for Rimi Logistics.
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
                          {t.is_admin_verified ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Verified
                            </span>
                          ) : t.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!t.is_admin_verified && t.status === 'completed' && (
                            <button
                              onClick={() => handleVerify(t.id, t.user_name)}
                              className="bg-[#58051E] hover:bg-[#430316] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                            >
                              Verify Shift
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
                      No pending leave requests for Rimi logistics.
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

      {/* APPLY MODAL */}
      <LeavePermissionModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        divisionOverride="rimi"
        onSuccess={() => loadData()}
      />
    </div>
  );
};
