import React from 'react';
import type { AttendanceContext, AttendanceRules, Holiday, DayStatus } from '../../lib/api/attendance';

export const BRAND = '#58051E';

export interface Shared {
  ctx: AttendanceContext;
  rules: AttendanceRules[];
  holidays: Holiday[];
  toast: (message: string) => void;
  // When Attendance is opened inside one platform's app, only that platform's people are shown (even to a superadmin).
  scope?: string;
}

export const inputCls = 'h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 hover:border-slate-300 focus:outline-none focus:border-[#58051E] focus:ring-2 focus:ring-[#58051E]/10 transition';
export const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5';

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'brand' | 'light' | 'danger' | 'good' }> = ({ tone = 'light', className = '', ...p }) => {
  const tones = {
    brand: 'bg-[#58051E] text-white hover:bg-[#430316] border-transparent',
    light: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
    danger: 'bg-white text-rose-700 hover:bg-rose-50 border-rose-200',
    good: 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent',
  } as const;
  return <button type="button" {...p} className={`h-9 px-3.5 rounded-xl text-xs font-semibold border cursor-pointer transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${tones[tone]} ${className}`} />;
};

export const Panel: React.FC<{ title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, right, children, className = '' }) => (
  <section className={`bg-white border border-slate-200/80 rounded-2xl p-5 ${className}`}>
    {(title || right) && <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 className="text-sm font-bold text-slate-900">{title}</h2>{right}</div>}
    {children}
  </section>
);

const CHIP: Record<string, string> = {
  Present: 'bg-emerald-50 text-emerald-700 border-emerald-200', 'Half Day': 'bg-amber-50 text-amber-700 border-amber-200', Absent: 'bg-rose-50 text-rose-700 border-rose-200',
  Leave: 'bg-sky-50 text-sky-700 border-sky-200', Open: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Draft: 'bg-slate-50 text-slate-600 border-slate-200', Verified: 'bg-blue-50 text-blue-700 border-blue-200', Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', Paid: 'bg-emerald-600 text-white border-emerald-600',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200', Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', rejected: 'bg-rose-50 text-rose-700 border-rose-200', cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
};
export const Chip: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${CHIP[value] || CHIP.Draft} ${className}`}>{value}</span>
);

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="py-8 text-center text-sm font-medium text-slate-500">{children}</p>;

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" role="dialog" aria-label={title} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between"><h3 className="text-sm font-black">{title}</h3><button className="text-slate-500 text-lg cursor-pointer" aria-label="Close" onClick={onClose}>×</button></div>
      {children}
    </div>
  </div>
);

export const timeOf = (iso: string | null, tz: string) => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }) : '—';
export const hoursText = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`;
export const money = (n: number, cur = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(Number(n) || 0);
export const dateLabel = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
export const monthLabel = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// Is this a weekly off or a holiday for that platform?
export function offReason(s: Pick<Shared, 'rules' | 'holidays'>, division: string, iso: string): string | null {
  const r = s.rules.find(x => x.division === division) || s.rules.find(x => x.division === 'all');
  const dow = new Date(iso + 'T00:00:00Z').getUTCDay();
  const h = s.holidays.find(x => x.holiday_date === iso && (x.division === 'all' || x.division === division));
  if (h) return h.name;
  if (r && r.weekly_off.includes(dow)) return 'Weekly off';
  return null;
}

export const statusOptions: DayStatus[] = ['Present', 'Half Day', 'Absent', 'Leave'];
