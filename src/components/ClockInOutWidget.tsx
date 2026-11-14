import React, { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clockIn, clockOut, getContext, getOpenSession, type AttendanceDay } from '../lib/api/attendance';

interface ClockInOutWidgetProps {
  // Kept so every layout can render the same widget; the platform now comes from the signed-in person's account.
  divisionOverride?: string;
  compact?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

// The clock in / clock out control shown in every platform's header. Superadmins do not clock; clients and students never see it.
export const ClockInOutWidget: React.FC<ClockInOutWidgetProps> = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState<AttendanceDay | null>(null);
  const [eligible, setEligible] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [asking, setAsking] = useState(false);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const ctx = await getContext();
      if (ctx.level === 'superadmin') { setEligible(false); return; }
      setEligible(true);
      setOpen(await getOpenSession(ctx.user_id));
    } catch { setEligible(false); }
  }, [user?.id]);

  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener('ferex-attendance-updated', h);
    return () => window.removeEventListener('ferex-attendance-updated', h);
  }, [load]);

  useEffect(() => {
    if (!open?.clock_in) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.floor((Date.now() - new Date(open.clock_in!).getTime()) / 1000));
      setElapsed(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    }, 1000);
    return () => clearInterval(t);
  }, [open]);

  if (!eligible) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setMessage('');
    try { await fn(); setAsking(false); setSummary(''); await load(); } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      {open ? (
        asking ? (
          <>
            <input value={summary} onChange={e => setSummary(e.target.value)} placeholder="Work summary (optional)" aria-label="Work summary" className="h-8 px-2 rounded-lg border border-slate-200 text-xs w-44" />
            <button type="button" disabled={busy} onClick={() => void run(() => clockOut(summary))} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white cursor-pointer disabled:opacity-50">Confirm</button>
            <button type="button" onClick={() => setAsking(false)} className="px-2 py-1.5 text-xs font-bold text-slate-500 cursor-pointer">Cancel</button>
          </>
        ) : (
          <>
            <span className="text-xs font-black tabular-nums text-emerald-700">{elapsed}</span>
            <button type="button" onClick={() => setAsking(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-pointer inline-flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clock out</span></button>
          </>
        )
      ) : (
        <button type="button" disabled={busy} onClick={() => void run(() => clockIn())} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#58051E] text-white cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"><LogIn className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clock in</span></button>
      )}
      {message && <span role="alert" className="text-[11px] font-semibold text-rose-700">{message}</span>}
    </div>
  );
};
