import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Inbox } from 'lucide-react';
import { cn } from '../utils/cn';
import { CapLoader } from './CapLoader';

// The shared building blocks for every page in every app, so headers, tiles and empty states look and read the same everywhere.

export const PageHeader: React.FC<{ title: string; subtitle?: string; eyebrow?: string; actions?: React.ReactNode; className?: string }> = ({ title, subtitle, eyebrow, actions, className }) => {
  const welcome = /^Welcome back/i.test(title);
  return (
    <header className={cn('fx-ph flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="fx-ph-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-extrabold text-slate-900 dark:text-white">{title}{welcome && <> <span className="fx-hand" aria-hidden>👋</span></>}</h1>
        {subtitle && <p className="fx-ph-sub font-medium">{subtitle}</p>}
        <div className="fx-ph-bar" aria-hidden />
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
};

type Tone = 'brand' | 'blue' | 'green' | 'amber' | 'violet' | 'slate' | 'rose';
const TONES: Record<Tone, { chip: string; line: string }> = {
  brand: { chip: 'bg-gradient-to-br from-[#F6DDE8] to-[#EBCBDC] text-[#8A1148]', line: '#B03A74' },
  blue: { chip: 'bg-gradient-to-br from-[#DCEBFA] to-[#C9DDF6] text-[#2563A8]', line: '#3B82C4' },
  green: { chip: 'bg-gradient-to-br from-[#D9F3E6] to-[#C2E9D4] text-[#157A4B]', line: '#22A06B' },
  amber: { chip: 'bg-gradient-to-br from-[#FBEBCF] to-[#F6DBAE] text-[#B26A06]', line: '#E59A1F' },
  violet: { chip: 'bg-gradient-to-br from-[#E8E0F8] to-[#D8CCF2] text-[#5B3AA8]', line: '#7A5BD0' },
  slate: { chip: 'bg-gradient-to-br from-[#ECEFF4] to-[#DEE3EC] text-[#475569]', line: '#64748B' },
  rose: { chip: 'bg-gradient-to-br from-[#FAE0E3] to-[#F4CBD0] text-[#BE1E3C]', line: '#E0455F' },
};

/** A small trend line. Only drawn when real numbers are given. */
const Spark: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (values.length < 2 || values.every(v => v === 0)) return null;
  const w = 84, h = 34, max = Math.max(...values, 1), min = Math.min(...values, 0);
  const pts = values.map((v, i) => [ (i / (values.length - 1)) * w, h - 4 - ((v - min) / (max - min || 1)) * (h - 10) ]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `C${(pts[i - 1][0] + p[0]) / 2},${pts[i - 1][1]} ${(pts[i - 1][0] + p[0]) / 2},${p[1]} ${p[0]},${p[1]}`)).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="fx-spark shrink-0" aria-hidden>
      <defs><linearGradient id={`spk${color.slice(1)}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={color} stopOpacity="0.35" /><stop offset="1" stopColor={color} /></linearGradient></defs>
      <path className="line" d={d} fill="none" stroke={`url(#spk${color.slice(1)})`} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: string; icon?: React.ElementType; tone?: Tone; to?: string; trend?: number[] }> = ({ label, value, hint, icon: Icon, tone = 'brand', to, trend }) => {
  const t = TONES[tone];
  const body = (
    <div data-link={Boolean(to)} className="fx-tile group relative h-full p-4 sm:p-5">
      <div className="flex items-center gap-3">
        {Icon && <span className={cn('fx-tile-chip shrink-0', t.chip)}><Icon className="w-5 h-5" /></span>}
        <p className="text-[0.8rem] font-semibold leading-tight text-slate-700 dark:text-slate-200">{label}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[1.9rem] leading-none font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">{value}</div>
          {hint && <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{hint}</p>}
        </div>
        {trend && <Spark values={trend} color={t.line} />}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58051E]/40 rounded-[1.5rem]">{body}</Link> : body;
};

export const Section: React.FC<{ title: string; hint?: string; action?: { label: string; to: string } | React.ReactElement; children: React.ReactNode; className?: string; padded?: boolean }> = ({ title, hint, action, children, className, padded = true }) => (
  <section className={cn('fx-section', className)}>
    <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
      <div><h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>{hint && <p className="text-xs font-medium text-slate-500 mt-1">{hint}</p>}</div>
      {action && (React.isValidElement(action) ? action
        : <Link to={(action as { label: string; to: string }).to} className="text-xs font-bold text-[#58051E] dark:text-rose-300 hover:underline shrink-0">{(action as { label: string; to: string }).label} →</Link>)}
    </div>
    <div className={cn(padded && 'px-6 pb-6')}>{children}</div>
  </section>
);

export const EmptyState: React.FC<{ title: string; hint?: string; icon?: React.ElementType; action?: React.ReactNode }> = ({ title, hint, icon: Icon = Inbox, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-4">
    <span className="grid place-items-center w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3"><Icon className="w-6 h-6" /></span>
    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</p>
    {hint && <p className="text-xs font-medium text-slate-500 mt-1 max-w-xs">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => <div className={cn('animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800', className)} />;

export const PageSkeleton: React.FC = () => <div className="py-24 flex justify-center" aria-busy="true"><CapLoader size="lg" /></div>;

export const StatusPill: React.FC<{ tone?: 'green' | 'amber' | 'rose' | 'blue' | 'slate'; children: React.ReactNode }> = ({ tone = 'slate', children }) => {
  const t = { green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', amber: 'bg-amber-50 text-amber-800 ring-amber-600/20', rose: 'bg-rose-50 text-rose-700 ring-rose-600/15', blue: 'bg-sky-50 text-sky-700 ring-sky-600/15', slate: 'bg-slate-100 text-slate-600 ring-slate-500/15' }[tone];
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset', t)}>{children}</span>;
};
