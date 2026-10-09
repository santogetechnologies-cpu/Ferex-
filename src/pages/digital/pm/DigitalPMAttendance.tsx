import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  FileText,
  Calendar,
  Plus,
  Check
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { ClockInOutWidget } from '../../../components/ClockInOutWidget';
import { LeavePermissionModal } from '../../../components/LeavePermissionModal';
import {
  getTimesheets,
  getLeaveRequests,
  type AttendanceTimesheet,
  type LeavePermissionRequest,
} from '../../../lib/api/attendance';

export const DigitalPMAttendance: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'timesheets' | 'leaves'>('timesheets');
  const [myTimesheets, setMyTimesheets] = useState<AttendanceTimesheet[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeavePermissionRequest[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const userEmail = user?.email || profile?.email || 'digimanager@ferex.com';

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
  const verifiedCount = myTimesheets.filter((t) => t.is_admin_verified || t.is_superadmin_locked).length;

  return (
    <div className="space-y-6 relative text-left pb-8 text-slate-900">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              My Project Manager Shift & Timesheets
            </h1>
            <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2.5 py-0.5 rounded border border-indigo-200">
              Digital PM
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Clock in daily, log engineering sprint management and delivery hours, and file leaves & permissions.
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
          <span>My Timesheets ({myTimesheets.length})</span>
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
          <span>My Leave Applications ({myLeaves.length})</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Logged PM Hours</span>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {totalLoggedHours.toFixed(1)} hrs
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Verified Shifts</span>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {verifiedCount} shifts
          </div>
        </div>
      </div>

      {activeTab === 'timesheets' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Shift Date</th>
                  <th className="p-3">Clock In / Out</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Sprint Management Summary</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTimesheets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No timesheet records logged yet.
                    </td>
                  </tr>
                ) : (
                  myTimesheets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{t.date}</td>
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
                            Active Shift
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            Pending Review
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
      )}

      {activeTab === 'leaves' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Application Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No leave applications submitted.
                    </td>
                  </tr>
                ) : (
                  myLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-medium text-slate-800">{l.start_date}</td>
                      <td className="p-3 capitalize">{l.request_type.replace(/_/g, ' ')}</td>
                      <td className="p-3">{l.total_days} Day(s)</td>
                      <td className="p-3 max-w-xs text-slate-600 line-clamp-2">{l.reason}</td>
                      <td className="p-3">
                        <span className="text-[11px] font-bold uppercase">{l.status}</span>
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
        divisionOverride="digital"
        onSuccess={() => loadData()}
      />
    </div>
  );
};
