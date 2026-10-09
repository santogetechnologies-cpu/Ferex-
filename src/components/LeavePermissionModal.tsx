import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Sparkles,
  DollarSign,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getLeavePolicies,
  createLeaveRequest,
  type LeavePolicyConfig,
  type LeavePermissionRequest,
} from '../lib/api/attendance';

interface LeavePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  divisionOverride?: string;
  onSuccess?: () => void;
}

export const LeavePermissionModal: React.FC<LeavePermissionModalProps> = ({
  isOpen,
  onClose,
  divisionOverride,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [policies, setPolicies] = useState<LeavePolicyConfig[]>([]);
  const [requestType, setRequestType] = useState<
    'full_day_leave' | 'half_day_leave' | 'hourly_permission' | 'unplanned_emergency'
  >('full_day_leave');

  const [selectedPolicyCode, setSelectedPolicyCode] = useState<string>('CL');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [halfDaySession, setHalfDaySession] = useState<'first_half' | 'second_half'>('first_half');
  const [permissionStartTime, setPermissionStartTime] = useState<string>('14:00');
  const [permissionEndTime, setPermissionEndTime] = useState<string>('16:00');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const currentDivision =
    divisionOverride ||
    (profile?.role === 'superadmin' ? 'central' : (profile as any)?.division || 'education');

  const userEmail = user?.email || profile?.email || 'staff@ferex.com';
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Team Member';
  const userRole = profile?.role || 'staff';
  const userId = user?.id || profile?.id || null;

  useEffect(() => {
    const loadPolicies = async () => {
      try {
        const data = await getLeavePolicies(currentDivision);
        setPolicies(data);
      } catch (err) {
        console.error('Error loading leave policies:', err);
      }
    };
    if (isOpen) {
      loadPolicies();
    }
  }, [isOpen, currentDivision]);

  if (!isOpen) return null;

  const currentPolicy = policies.find((p) => p.code === selectedPolicyCode) || policies[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Please specify a detailed reason for your leave/permission request.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let totalDays = 1;
      let permissionHours = 0;

      if (requestType === 'full_day_leave' || requestType === 'unplanned_emergency') {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        totalDays = diffDays;
      } else if (requestType === 'half_day_leave') {
        totalDays = 0.5;
      } else if (requestType === 'hourly_permission') {
        totalDays = 0.0;
        const [startH, startM] = permissionStartTime.split(':').map(Number);
        const [endH, endM] = permissionEndTime.split(':').map(Number);
        permissionHours = Math.max(0.5, Number(((endH * 60 + endM - (startH * 60 + startM)) / 60).toFixed(1)));
      }

      await createLeaveRequest({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        user_role: userRole,
        division: currentDivision,
        request_type: requestType,
        policy_code: currentPolicy?.code || 'CL',
        policy_name: currentPolicy?.name || 'Casual Leave',
        start_date: startDate,
        end_date: requestType === 'full_day_leave' ? endDate : startDate,
        half_day_session: requestType === 'half_day_leave' ? halfDaySession : null,
        permission_start_time: requestType === 'hourly_permission' ? permissionStartTime : null,
        permission_end_time: requestType === 'hourly_permission' ? permissionEndTime : null,
        permission_hours: permissionHours,
        total_days: totalDays,
        is_monetizable: currentPolicy ? currentPolicy.is_monetizable : true,
        reason: reason.trim(),
      });

      setSuccessMsg('🎉 Leave / Permission application submitted for admin review!');
      setTimeout(() => {
        setSuccessMsg('');
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in text-slate-100">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Apply Leave / Hourly Permission</h3>
            <p className="text-xs text-slate-400">
              Submit planned, emergency, half-day leaves or hourly permissions
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-xl font-semibold">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Request Type Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'full_day_leave', label: 'Full Day' },
              { id: 'half_day_leave', label: 'Half Day' },
              { id: 'hourly_permission', label: 'Hourly Perm' },
              { id: 'unplanned_emergency', label: 'Emergency' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setRequestType(t.id as any);
                  if (t.id === 'half_day_leave') setSelectedPolicyCode('HALF_DAY');
                  else if (t.id === 'hourly_permission') setSelectedPolicyCode('HOURLY_PERM');
                  else if (t.id === 'unplanned_emergency') setSelectedPolicyCode('UNPLANNED');
                  else setSelectedPolicyCode('CL');
                }}
                className={`py-2 px-2.5 rounded-xl font-bold transition-all text-center ${
                  requestType === t.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Policy Type Selection & Monetizable Indicator */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">
              Select Leave Policy / Quota
            </label>
            <select
              value={selectedPolicyCode}
              onChange={(e) => setSelectedPolicyCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
            >
              {policies.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name} {p.is_monetizable ? '(Paid)' : '(Loss of Pay)'}
                </option>
              ))}
            </select>
          </div>

          {/* Monetizable Status Pill */}
          {currentPolicy && (
            <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-slate-400">Payroll Treatment:</span>
              {currentPolicy.is_monetizable ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5" /> Monetizable (Full Salary Paid)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5" /> Unpaid / Loss of Pay (Deducted)
                </span>
              )}
            </div>
          )}

          {/* DATE & TIME CONTROLS */}
          {requestType === 'full_day_leave' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">From Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">To Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>
          )}

          {requestType === 'half_day_leave' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Session</label>
                <select
                  value={halfDaySession}
                  onChange={(e) => setHalfDaySession(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="first_half">First Half (Morning Shift)</option>
                  <option value="second_half">Second Half (Afternoon Shift)</option>
                </select>
              </div>
            </div>
          )}

          {requestType === 'hourly_permission' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Permission Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">From Time</label>
                  <input
                    type="time"
                    required
                    value={permissionStartTime}
                    onChange={(e) => setPermissionStartTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">To Time</label>
                  <input
                    type="time"
                    required
                    value={permissionEndTime}
                    onChange={(e) => setPermissionEndTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {requestType === 'unplanned_emergency' && (
            <div>
              <label className="block text-slate-400 mb-1">Emergency Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Reason & Handover Details*
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Urgent family medical appointment / pending client tickets handed over to counselor..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
