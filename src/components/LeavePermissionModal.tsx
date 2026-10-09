import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
      setErrorMsg('Please specify a reason for your leave/permission request.');
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

      setSuccessMsg('Leave and permission application submitted.');
      setTimeout(() => {
        setSuccessMsg('');
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-slate-900 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center border border-[#58051E]/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Apply Leave / Permission</h2>
            <p className="text-xs text-slate-500">
              Submit daily permissions, half-day leaves, or planned leaves for verification
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-lg">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Request Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Request Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRequestType('full_day_leave')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  requestType === 'full_day_leave'
                    ? 'bg-[#58051E]/10 border-[#58051E] text-[#58051E] font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Full-Day Leave</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('half_day_leave')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  requestType === 'half_day_leave'
                    ? 'bg-[#58051E]/10 border-[#58051E] text-[#58051E] font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Half-Day Leave</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('hourly_permission')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  requestType === 'hourly_permission'
                    ? 'bg-[#58051E]/10 border-[#58051E] text-[#58051E] font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Hourly Permission (1-3 hrs)</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('unplanned_emergency')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  requestType === 'unplanned_emergency'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>Emergency / Unplanned</span>
              </button>
            </div>
          </div>

          {/* Leave Category Policy Selection */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Leave Policy Category
              </label>
              {currentPolicy && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {currentPolicy.is_monetizable ? 'Paid / Monetizable' : 'Loss of Pay (LOP)'}
                </span>
              )}
            </div>

            <select
              value={selectedPolicyCode}
              onChange={(e) => setSelectedPolicyCode(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E]"
            >
              {policies.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code}) — {p.annual_quota_days} days/yr — {p.is_monetizable ? 'Paid' : 'Unpaid'}
                </option>
              ))}
            </select>
            {currentPolicy?.description && (
              <p className="text-[11px] text-slate-500">{currentPolicy.description}</p>
            )}
          </div>

          {/* Conditional Fields based on Request Type */}
          {requestType === 'full_day_leave' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                />
              </div>
            </div>
          )}

          {requestType === 'half_day_leave' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Leave Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Half-Day Session
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfDaySession('first_half')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      halfDaySession === 'first_half'
                        ? 'bg-[#58051E]/10 border-[#58051E] text-[#58051E] font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Morning (First Half)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalfDaySession('second_half')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      halfDaySession === 'second_half'
                        ? 'bg-[#58051E]/10 border-[#58051E] text-[#58051E] font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Afternoon (Second Half)
                  </button>
                </div>
              </div>
            </div>
          )}

          {requestType === 'hourly_permission' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permission Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    From Time
                  </label>
                  <input
                    type="time"
                    required
                    value={permissionStartTime}
                    onChange={(e) => setPermissionStartTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    To Time
                  </label>
                  <input
                    type="time"
                    required
                    value={permissionEndTime}
                    onChange={(e) => setPermissionEndTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                  />
                </div>
              </div>
            </div>
          )}

          {requestType === 'unplanned_emergency' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-[#58051E]"
                />
              </div>
            </div>
          )}

          {/* Detailed Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Explanation (Required)*
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for admin review..."
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E] resize-none leading-relaxed placeholder-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#58051E] hover:bg-[#430316] text-white font-bold py-2.5 rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
