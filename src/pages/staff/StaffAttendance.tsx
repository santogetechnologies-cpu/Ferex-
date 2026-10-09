import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  Calendar,
  FileText,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ClockInOutWidget } from '../../components/ClockInOutWidget';
import { LeavePermissionModal } from '../../components/LeavePermissionModal';
import {
  getTimesheets,
  getLeaveRequests,
  type AttendanceTimesheet,
  type LeavePermissionRequest,
} from '../../lib/api/attendance';

export const StaffAttendance: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'timesheets' | 'leaves'>('timesheets');
  const [myTimesheets, setMyTimesheets] = useState<AttendanceTimesheet[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeavePermissionRequest[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const userEmail = user?.email || profile?.email || 'counselor@ferex.com';

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'timesheets') {
        const data = await getTimesheets({ userEmail });
        setMyTimesheets(data);
      } else {
        const leaves = await getLeaveRequests({ userEmail });
        setMyLeaves(leaves);
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
  }, [userEmail, activeTab]);

  const totalLoggedHours = myTimesheets.reduce((acc, t) => acc + (t.total_hours || 0), 0);
  const verifiedTimesheets = myTimesheets.filter((t) => t.is_admin_verified || t.is_superadmin_locked);
  const verifiedHours = verifiedTimesheets.reduce((acc, t) => acc + (t.total_hours || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-500/20 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <Clock className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              My Daily Work Timesheets & Leaves
            </h1>
          </div>
          <p className="text-xs text-teal-200/70 max-w-xl">
            Clock in every working day, track live hours, apply for permissions & leaves, and summarize completed counseling tasks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-full transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-teal-400" />
            <span>Apply Leave / Perm</span>
          </button>
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-teal-500/30 backdrop-blur-md">
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
              ? 'bg-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Timesheets</span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'bg-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>My Leave & Permissions</span>
        </button>
      </div>

      {activeTab === 'timesheets' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Total Shifts Logged</span>
                <div className="text-xl font-bold font-mono text-white">
                  {myTimesheets.length} Days
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Total Hours Tracked</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {totalLoggedHours.toFixed(1)} hrs
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Payroll Verified Hours</span>
                <div className="text-xl font-bold font-mono text-indigo-400">
                  {verifiedHours.toFixed(1)} hrs
                </div>
              </div>
            </div>
          </div>

          {/* Timesheet Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                <span>Shift History & Task Logs</span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Shift Name</th>
                    <th className="p-3.5">Clock In</th>
                    <th className="p-3.5">Clock Out</th>
                    <th className="p-3.5">Total Hours</th>
                    <th className="p-3.5">Work Activities Summary</th>
                    <th className="p-3.5">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {myTimesheets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No timesheet records yet. Click "Clock In" to begin your first shift!
                      </td>
                    </tr>
                  ) : (
                    myTimesheets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white">{t.date}</td>
                        <td className="p-3.5 text-slate-300">{t.shift_name || 'General Shift'}</td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {new Date(t.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {t.clock_out
                            ? new Date(t.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '--'}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {t.total_hours?.toFixed(1) || '0.0'} hrs
                        </td>
                        <td className="p-3.5 max-w-md">
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {t.work_summary || <span className="italic text-slate-500">In Progress</span>}
                          </p>
                        </td>
                        <td className="p-3.5">
                          {t.is_superadmin_locked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                              🔒 Locked for Payroll
                            </span>
                          ) : t.is_admin_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                              <ShieldCheck className="w-3 h-3" /> Admin Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                              {t.status}
                            </span>
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

      {/* Leaves Tab */}
      {activeTab === 'leaves' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>My Leave & Permission Applications</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-700">
                <tr>
                  <th className="p-3.5">Policy & Type</th>
                  <th className="p-3.5">Schedule</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Payroll Type</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Review Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {myLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No leave or permission requests applied yet. Click "Apply Leave / Perm" to submit one!
                    </td>
                  </tr>
                ) : (
                  myLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        <div>{l.policy_name}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-normal">{l.request_type.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        <div>{l.start_date} {l.end_date !== l.start_date ? `to ${l.end_date}` : ''}</div>
                        {l.permission_start_time && (
                          <div className="text-[11px] text-teal-400 font-mono">
                            {l.permission_start_time} - {l.permission_end_time}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">
                        {l.permission_hours ? `${l.permission_hours} hrs` : `${l.total_days} days`}
                      </td>
                      <td className="p-3.5">
                        {l.is_monetizable ? (
                          <span className="text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-bold">
                            Paid
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-950/50 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full font-bold">
                            Loss of Pay
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 max-w-xs text-slate-300 text-[11px]">{l.reason}</td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize ${
                          l.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : l.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <LeavePermissionModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        divisionOverride="education"
        onSuccess={loadData}
      />
    </div>
  );
};
