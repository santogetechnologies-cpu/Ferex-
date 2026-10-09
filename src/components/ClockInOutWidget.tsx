import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogIn, LogOut, Clock, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
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

  const userRole = profile?.role || 'staff';
  const userEmail = user?.email || profile?.email || 'staff@ferex.com';
  const isSuper = userRole === 'superadmin' || userEmail.toLowerCase().includes('centraladmin') || divisionOverride === 'central';

  // Central Super Admin does not clock in
  if (isSuper) {
    return null;
  }

  const currentDivision =
    divisionOverride || (profile as any)?.division || 'education';
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Team Member';
  const userId = user?.id || profile?.id || 'usr-temp';

  const loadStatus = async () => {
    if (!userEmail) return;
    try {
      const active = await getActiveClockIn(userEmail);
      setActiveSession(active);
      const availableShifts = await getShifts(currentDivision, userEmail, userRole);
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
    window.addEventListener('ferex-shifts-updated', handleUpdate);
    return () => {
      window.removeEventListener('ferex-attendance-updated', handleUpdate);
      window.removeEventListener('ferex-shifts-updated', handleUpdate);
    };
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
      showToast('Shift started. Clock-in logged successfully.');
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
      setErrorMsg('Please enter a brief summary of completed tasks.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await clockOut(activeSession.id, workSummary.trim());
      setActiveSession(null);
      setIsClockOutModalOpen(false);
      setWorkSummary('');
      showToast('Shift completed and work summary submitted.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Toast Portal */}
      {successToast &&
        createPortal(
          <div className="fixed bottom-5 right-5 z-[99999] flex items-center gap-2 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-2xl animate-fade-in text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-white shrink-0" />
            <span>{successToast}</span>
          </div>,
          document.body
        )}

      {activeSession ? (
        // ACTIVE SESSION VIEW (Clocked in)
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
              Clocked In
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
            <Clock className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span>{elapsedTime}</span>
          </div>

          <button
            onClick={() => setIsClockOutModalOpen(true)}
            className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-xs transition-all cursor-pointer"
            title="Clock out and submit shift activity"
          >
            <LogOut className="w-3 h-3" />
            <span>Clock Out</span>
          </button>
        </div>
      ) : (
        // INACTIVE VIEW (Clock In Button)
        <button
          onClick={() => setIsClockInModalOpen(true)}
          className={`flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg shadow-xs transition-all cursor-pointer ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Clock In</span>
        </button>
      )}

      {/* CLOCK IN MODAL (PORTAL TO DOCUMENT BODY FOR PERFECT CENTER ALIGNMENT) */}
      {isClockInModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
            <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
              <button
                onClick={() => setIsClockInModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Daily Shift Clock-In</h3>
                  <p className="text-xs text-slate-500">
                    Track working hours and log daily attendance
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3.5 mb-6">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employee:</span>
                    <span className="font-semibold text-slate-800">{userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Division & Role:</span>
                    <span className="font-semibold text-emerald-700 uppercase">
                      {currentDivision} • {userRole}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time:</span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Shift Timing
                  </label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsClockInModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClockIn}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Starting...' : 'Confirm Clock-In'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* CLOCK OUT MODAL WITH WORK SUMMARY (PORTAL TO BODY) */}
      {isClockOutModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
            <form
              onSubmit={handleClockOut}
              className="bg-white border border-slate-200 text-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsClockOutModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Shift Clock-Out & Summary</h3>
                  <p className="text-xs text-slate-500">
                    Report completed tasks for administrative verification
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3.5 mb-6">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Shift Duration</span>
                    <span className="font-mono text-emerald-700 font-bold text-sm">
                      {elapsedTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Started At</span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {activeSession?.clock_in
                        ? new Date(activeSession.clock_in).toLocaleTimeString()
                        : '--'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>Work Summary & Task Achievements (Required)*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    placeholder="Describe key duties and tasks completed during this shift..."
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none leading-relaxed placeholder-slate-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This activity summary is reviewed by division management for monthly payroll verification.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsClockOutModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Back to Shift
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Submitting...' : 'Submit & Clock Out'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
};
