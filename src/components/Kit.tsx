import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Inbox } from 'lucide-react';
import { cn } from '../utils/cn';

// The shared building blocks for every page in every app, so headers, tiles and empty states look and read the same everywhere.

export const PageHeader: React.FC<{ title: string; subtitle?: string; eyebrow?: string; actions?: React.ReactNode; className?: string }> = ({ title, subtitle, eyebrow, actions, className }) => (
  <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
    <div className="min-w-0">
      {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#58051E] mb-1.5">{eyebrow}</p>}
      <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

type Tone = 'brand' | 'blue' | 'green' | 'amber' | 'violet' | 'slate' | 'rose';
const TONES: Record<Tone, string> = {
  brand: 'bg-[#58051E]/8 text-[#58051E]', blue: 'bg-sky-50 text-sky-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700', slate: 'bg-slate-100 text-slate-600', rose: 'bg-rose-50 text-rose-700',
};

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: string; icon?: React.ElementType; tone?: Tone; to?: string }> = ({ label, value, hint, icon: Icon, tone = 'brand', to }) => {
  const body = (
    <div className={cn('group relative h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 transition-all duration-200', to && 'hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(88,5,30,0.25)] hover:border-[#58051E]/25')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <span className={cn('grid place-items-center w-9 h-9 rounded-xl shrink-0', TONES[tone])}><Icon className="w-[18px] h-[18px]" /></span>}
      </div>
      <div className="mt-3 text-[26px] leading-none font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">{value}</div>
      {hint && <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{hint}</p>}
      {to && <ArrowUpRight className="absolute right-4 bottom-4 w-4 h-4 text-slate-300 group-hover:text-[#58051E] transition-colors" />}
    </div>
  );
  return to ? <Link to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58051E]/40 rounded-2xl">{body}</Link> : body;
};

export const Section: React.FC<{ title: string; hint?: string; action?: { label: string; to: string } | React.ReactElement; children: React.ReactNode; className?: string; padded?: boolean }> = ({ title, hint, action, children, className, padded = true }) => (
  <section className={cn('rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900', className)}>
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div><h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>{hint && <p className="text-xs font-medium text-slate-500 mt-0.5">{hint}</p>}</div>
      {action && (React.isValidElement(action) ? action
        : <Link to={(action as { label: string; to: string }).to} className="text-xs font-bold text-[#58051E] hover:underline shrink-0">{(action as { label: string; to: string }).label} →</Link>)}
    </div>
    <div className={cn(padded && 'px-5 pb-5')}>{children}</div>
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

export const PageSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading">
    <div className="space-y-2"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
    <Skeleton className="h-64 rounded-2xl" />
  </div>
);

export const StatusPill: React.FC<{ tone?: 'green' | 'amber' | 'rose' | 'blue' | 'slate'; children: React.ReactNode }> = ({ tone = 'slate', children }) => {
  const t = { green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', amber: 'bg-amber-50 text-amber-800 ring-amber-600/20', rose: 'bg-rose-50 text-rose-700 ring-rose-600/15', blue: 'bg-sky-50 text-sky-700 ring-sky-600/15', slate: 'bg-slate-100 text-slate-600 ring-slate-500/15' }[tone];
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset', t)}>{children}</span>;
};
