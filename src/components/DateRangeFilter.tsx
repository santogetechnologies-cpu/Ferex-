import React from 'react';
import { CalendarDays } from 'lucide-react';
import { ALL_TIME, RANGE_LABELS, describeRange, type DateRange, type RangeKey } from '../lib/dateRange';

const PRESETS: Exclude<RangeKey, 'custom'>[] = ['all', 'today', 'week', 'month'];

/**
 * The same date filter everywhere: All time, Today, This week, This month, or a custom From / To.
 * Pair it with `inRange(row.date, range)` from lib/dateRange.
 */
export const DateRangeFilter: React.FC<{ value: DateRange; onChange: (r: DateRange) => void; label?: string; className?: string; compact?: boolean }> = ({ value, onChange, label = 'Date', className = '', compact = false }) => {
  const chip = (active: boolean) => `h-8 px-3 rounded-full text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${active ? 'bg-[#5A0122] text-white border-[#5A0122]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#5A0122]/40'}`;
  const input = 'h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#5A0122]';
  if (compact) {
    // One dropdown that fits in a crowded toolbar; the From / To dates appear only for Custom.
    return (
      <div role="group" aria-label={`${label} filter`} className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
        <span className="inline-flex items-center gap-1 h-10 sm:h-9 px-3 bg-white border border-slate-200 rounded-xl">
          <CalendarDays className="w-3.5 h-3.5 text-[#5A0122] shrink-0" />
          <select aria-label={label} value={value.key} onChange={e => { const k = e.target.value as RangeKey; onChange(k === 'all' ? ALL_TIME : k === 'custom' ? { key: 'custom', from: value.from, to: value.to } : { key: k }); }} className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1">
            {PRESETS.map(k => <option key={k} value={k}>{k === 'all' ? `${label}: ${RANGE_LABELS[k]}` : RANGE_LABELS[k]}</option>)}
            <option value="custom">Custom range…</option>
          </select>
        </span>
        {value.key === 'custom' && (
          <span className="inline-flex items-center gap-1.5">
            <input type="date" aria-label={`${label} from`} className={input} value={value.from || ''} max={value.to || undefined} onChange={e => onChange({ key: 'custom', from: e.target.value || undefined, to: value.to })} />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" aria-label={`${label} to`} className={input} value={value.to || ''} min={value.from || undefined} onChange={e => onChange({ key: 'custom', from: value.from, to: e.target.value || undefined })} />
          </span>
        )}
      </div>
    );
  }
  return (
    <div role="group" aria-label={`${label} filter`} className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mr-0.5"><CalendarDays className="w-3.5 h-3.5" />{label}</span>
      {PRESETS.map(k => <button key={k} type="button" aria-pressed={value.key === k} className={chip(value.key === k)} onClick={() => onChange(k === 'all' ? ALL_TIME : { key: k })}>{RANGE_LABELS[k]}</button>)}
      <button type="button" aria-pressed={value.key === 'custom'} className={chip(value.key === 'custom')} onClick={() => onChange({ key: 'custom', from: value.from, to: value.to })}>Custom</button>
      {value.key === 'custom' && (
        <span className="inline-flex items-center gap-1.5">
          <input type="date" aria-label={`${label} from`} className={input} value={value.from || ''} max={value.to || undefined} onChange={e => onChange({ key: 'custom', from: e.target.value || undefined, to: value.to })} />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" aria-label={`${label} to`} className={input} value={value.to || ''} min={value.from || undefined} onChange={e => onChange({ key: 'custom', from: value.from, to: e.target.value || undefined })} />
        </span>
      )}
      {value.key !== 'all' && <span className="text-[11px] font-semibold text-slate-500 ml-1">{describeRange(value)}</span>}
    </div>
  );
};
