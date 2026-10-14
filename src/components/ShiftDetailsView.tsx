import React, { useEffect, useState } from 'react';
import {
  Clock,
  ShieldCheck,
  Calendar,
  Globe,
  CheckCircle2,
  AlertCircle,
  Users,
  Building,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  Info
} from 'lucide-react';
import { getShifts, type Shift } from '../lib/api/attendance';
import { ClockInOutWidget } from './ClockInOutWidget';

interface ShiftDetailsViewProps {
  division: string;
  userEmail: string;
  userRole: string;
  userName?: string;
}

export const ShiftDetailsView: React.FC<ShiftDetailsViewProps> = ({
  division,
  userEmail,
  userRole,
  userName = 'Team Member',
}) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await getShifts(division, userEmail, userRole);
      setShifts(data || []);
    } catch (err) {
      console.error('Error fetching assigned shifts:', err);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
    const handleUpdate = () => loadShifts();
    window.addEventListener('ferex-shifts-updated', handleUpdate);
    return () => {
      window.removeEventListener('ferex-shifts-updated', handleUpdate);
    };
  }, [division, userEmail, userRole]);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const mins = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins} ${ampm}`;
  };

  const getShiftIcon = (name: string, startTime: string) => {
    const lower = (name || '').toLowerCase();
    const hour = parseInt(startTime?.split(':')[0] || '9', 10);
    if (lower.includes('night') || hour >= 18 || hour < 6) {
      return <Moon className="w-5 h-5 text-indigo-600" />;
    }
    return <Sun className="w-5 h-5 text-amber-500" />;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center shadow-xs">
        <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading your assigned enterprise shift details...</p>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center shadow-xs space-y-3">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Custom Shift Assigned</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You are currently following the standard enterprise working schedule (09:00 AM – 06:00 PM).
          Contact your division admin if you need a specific shift assignment.
        </p>
      </div>
    );
  }

  const primaryShift = shifts[0];

  return (
    <div className="space-y-6">
      {/* Primary Assigned Shift Highlight Card */}
      {primaryShift && (
        <div className="bg-gradient-to-br from-white to-slate-50/70 border-2 border-[#58051E]/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#58051E]/5 rounded-bl-full pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                {getShiftIcon(primaryShift.name, primaryShift.start_time)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 capitalize tracking-tight">
                    {primaryShift.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Active Shift
                  </span>
                  {primaryShift.division === 'all' && (
                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      <Globe className="w-3 h-3" /> All Enterprises (Enterprise-Wide)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned working schedule for <span className="font-semibold text-slate-700">{userName}</span> ({userEmail})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ClockInOutWidget divisionOverride={division} compact={false} />
            </div>
          </div>

          {/* Shift Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-5">
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Shift Timings</span>
              <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                {formatTime(primaryShift.start_time)} – {formatTime(primaryShift.end_time)}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {primaryShift.start_time.slice(0, 5)} to {primaryShift.end_time.slice(0, 5)} hrs
              </span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Grace Period</span>
              <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                {primaryShift.grace_period_mins} Mins
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Allowed late clock-in</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Half-Day Threshold</span>
              <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                {primaryShift.half_day_threshold_hours ?? primaryShift.half_day_hours ?? 4.0} Hours
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Minimum for 0.5 day pay</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Full-Day Requirement</span>
              <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                {primaryShift.full_day_threshold_hours ?? primaryShift.full_day_hours ?? 8.0} Hours
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Standard full-day credit</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-100/70 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Assignment Rule:</strong>{' '}
                {primaryShift.division === 'all'
                  ? 'Configured for All Enterprises by Super Admin — applicable to all enterprise accounts.'
                  : `Configured for ${primaryShift.division.toUpperCase()} division staff.`}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0 font-mono">
              ID: {primaryShift.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      )}

      {/* Complete List of Assigned Shifts Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">All Available & Assigned Enterprise Shifts</h3>
            <p className="text-xs text-slate-500">
              Shifts configured by Super Admin matching your enterprise division ({division}) or global assignment
            </p>
          </div>
          <span className="text-xs font-bold text-[#58051E] bg-[#58051E]/10 px-2.5 py-1 rounded-lg">
            {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'} Configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Shift Name</th>
                <th className="p-3">Working Hours</th>
                <th className="p-3">Enterprise Scope</th>
                <th className="p-3">Grace Period</th>
                <th className="p-3">Min Hours (Half / Full)</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {getShiftIcon(s.name, s.start_time)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 capitalize">{s.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {idx === 0 ? 'Primary Active Assignment' : 'Alternate Shift'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-800">
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    <span className="text-[10px] text-slate-400 font-normal block">
                      ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                    </span>
                  </td>
                  <td className="p-3">
                    {s.division === 'all' ? (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded">
                        <Globe className="w-2.5 h-2.5" /> All Enterprises
                      </span>
                    ) : (
                      <span className="uppercase font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {s.division}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-700 font-medium">
                    {s.grace_period_mins} mins
                  </td>
                  <td className="p-3 font-medium text-slate-700">
                    {s.half_day_threshold_hours ?? s.half_day_hours ?? 4.0}h / {s.full_day_threshold_hours ?? s.full_day_hours ?? 8.0}h
                  </td>
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Eligible
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
