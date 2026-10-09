import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getActiveClockIn,
  clockIn,
  clockOut,
  getShifts,
  type Shift,
  type AttendanceTimesheet,
} from '../lib/api/attendance';

interface ClockInOutWidgetProps {
  divisionOverride?: string;
  compact?: boolean;
}

export const ClockInOutWidget: React.FC<ClockInOutWidgetProps> = ({
  divisionOverride,
  compact = false,
}) => {
  const { user, profile } = useAuth();
  const [activeSession, setActiveSession] = useState<AttendanceTimesheet | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
  const [workSummary, setWorkSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const currentDivision =
    divisionOverride ||
    (profile?.role === 'superadmin' ? 'central' : (profile as any)?.division || 'general');

  const userEmail = user?.email || profile?.email || 'staff@ferex.com';
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Team Member';
  const userRole = profile?.role || 'staff';
  const userId = user?.id || profile?.id || 'usr-temp';

  const loadStatus = async () => {
    if (!userEmail) return;
    try {
      const active = await getActiveClockIn(userEmail);
      setActiveSession(active);
      const availableShifts = await getShifts(currentDivision);
      setShifts(availableShifts);
      if (availableShifts.length > 0 && !selectedShiftId) {
        setSelectedShiftId(availableShifts[0].id);
      }
    } catch (err) {
      console.error('Error loading attendance status:', err);
    }
  };

  useEffect(() => {
    loadStatus();
    const handleUpdate = () => loadStatus();
    window.addEventListener('ferex-attendance-updated', handleUpdate);
    return () => window.removeEventListener('ferex-attendance-updated', handleUpdate);
  }, [userEmail, currentDivision]);

  // Timer loop when active
  useEffect(() => {
    if (!activeSession || !activeSession.clock_in) return;

    const interval = setInterval(() => {
      const start = new Date(activeSession.clock_in).getTime();
      const now = Date.now();
      const diff = Math.max(0, now - start);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setElapsedTime(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleClockIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const selectedShift = shifts.find((s) => s.id === selectedShiftId);
      const result = await clockIn({
        userId,
        userEmail,
        userName,
        userRole,
        division: currentDivision,
        shiftId: selectedShift?.id,
        shiftName: selectedShift?.name || 'Standard Shift',
      });
      setActiveSession(result);
      setIsClockInModalOpen(false);
      showToast('🎉 Clocked in successfully! Have a productive shift.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    if (!workSummary.trim()) {
      setErrorMsg('Please provide a brief summary of what you achieved today.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await clockOut(activeSession.id, workSummary.trim());
      setActiveSession(null);
      setIsClockOutModalOpen(false);
      setWorkSummary('');
      showToast('✅ Shift completed & work summary logged. Great job!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Toast */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl animate-bounce text-sm font-medium">
          <CheckCircle className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {activeSession ? (
        // ACTIVE SESSION VIEW (Clocked in)
        <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 rounded-full px-3 py-1.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
              Clocked In
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{elapsedTime}</span>
          </div>

          <button
            onClick={() => setIsClockOutModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md hover:shadow-red-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            title="Clock out and submit shift activity"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Clock Out</span>
          </button>
        </div>
      ) : (
        // INACTIVE VIEW (Clock In Button)
        <button
          onClick={() => setIsClockInModalOpen(true)}
          className={`flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-full shadow-lg hover:shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Clock In</span>
        </button>
      )}

      {/* CLOCK IN MODAL */}
      {isClockInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Daily Shift Clock-In</h3>
                <p className="text-xs text-slate-400">
                  Track your working hours and daily productivity
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Employee:</span>
                  <span className="font-semibold text-white">{userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Division / Role:</span>
                  <span className="font-semibold text-emerald-400 uppercase">
                    {currentDivision} • {userRole}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Timestamp:</span>
                  <span className="font-mono text-slate-200">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Shift Timing
                </label>
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsClockInModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClockIn}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? 'Starting...' : 'Confirm Clock-In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOCK OUT MODAL WITH WORK SUMMARY */}
      {isClockOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={handleClockOut}
            className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 max-w-lg w-full shadow-2xl relative"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Shift Clock-Out & Summary</h3>
                <p className="text-xs text-slate-400">
                  Please report your completed tasks for payroll verification
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Shift Duration</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {elapsedTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Started At</span>
                  <span className="font-mono text-slate-200">
                    {activeSession?.clock_in
                      ? new Date(activeSession.clock_in).toLocaleTimeString()
                      : '--'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-red-400" />
                  <span>Work Activities & Achievements Today (Required)*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  placeholder="e.g. Counseled 8 prospective students for UK visa processing, reviewed financial docs, resolved 2 pending portal tickets..."
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-red-500 resize-none leading-relaxed placeholder-slate-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 This activity log will be reviewed and verified by your division admin for payroll approval.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsClockOutModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl text-xs transition-all"
              >
                Back to Shift
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? 'Submitting...' : 'Submit & Clock Out'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
