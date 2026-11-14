import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getContext, getHolidays, getRules, platformName, type AttendanceContext, type AttendanceRules, type Holiday } from '../../lib/api/attendance';
import { supabase } from '../../lib/supabase';
import { ToastNotification } from '../../components/ToastNotification';
import { MyAttendance } from './MyAttendance';
import { TeamAttendance } from './TeamAttendance';
import { LeaveApprovals } from './LeaveApprovals';
import { Incentives } from './Incentives';
import { PayrollTab } from './PayrollTab';
import { RulesTab } from './RulesTab';

type TabId = 'mine' | 'team' | 'leave' | 'incentives' | 'payroll' | 'rules';

// The same Attendance screen for every platform (Education, Rimi, Trade, Digital, Central). What a person sees depends only on their level:
// team members clock in/out and apply for leave; platform administrators also verify their team and run pay; the superadmin approves.
export const AttendancePage: React.FC = () => {
  const [ctx, setCtx] = useState<AttendanceContext | null>(null);
  const [rules, setRules] = useState<AttendanceRules[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    try {
      const [c, r, h] = await Promise.all([getContext(), getRules(), getHolidays()]);
      setCtx(c); setRules(r); setHolidays(h); setError('');
    } catch (e: any) { setError(e.message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel('attendance_live');
    ['attendance_days', 'attendance_leaves', 'attendance_incentives', 'attendance_payroll'].forEach(table =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => window.dispatchEvent(new Event('ferex-attendance-updated'))));
    ch.subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const toast = useCallback((m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 4000); }, []);

  const tabs = useMemo(() => {
    if (!ctx) return [] as { id: TabId; label: string }[];
    const t: { id: TabId; label: string }[] = [];
    if (ctx.level !== 'superadmin') t.push({ id: 'mine', label: 'My attendance' });
    if (ctx.level !== 'staff') t.push({ id: 'team', label: 'Verify attendance' }, { id: 'leave', label: 'Leave' }, { id: 'incentives', label: 'Incentives & commission' }, { id: 'payroll', label: 'Payroll' });
    t.push({ id: 'rules', label: 'Rules & leave limits' });
    return t;
  }, [ctx]);

  const requested = params.get('tab') as TabId | null;
  const active: TabId = tabs.find(t => t.id === requested)?.id || tabs[0]?.id || 'mine';

  if (error) return <div className="p-6"><p role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-700">{error}</p></div>;
  if (!ctx) return <div className="p-6 text-sm font-semibold text-slate-500">Loading attendance…</div>;

  const shared = { ctx, rules, holidays, toast };
  return (
    <div className="space-y-4 text-slate-900">
      <ToastNotification message={toastMsg} onClose={() => setToastMsg('')} />
      <header>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight">Attendance</h1>
        <p className="text-xs font-semibold text-slate-500">{ctx.level === 'superadmin' ? 'All platforms' : platformName(ctx.division)} · {ctx.level === 'superadmin' ? 'Superadmin' : ctx.level === 'admin' ? 'Platform administrator' : 'Team member'}</p>
      </header>
      <nav className="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Attendance sections">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`px-3 py-2 text-xs font-bold border-b-2 -mb-px cursor-pointer ${active === t.id ? 'border-[#58051E] text-[#58051E]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.label}</button>))}
      </nav>
      {active === 'mine' && <MyAttendance {...shared} />}
      {active === 'team' && <TeamAttendance {...shared} />}
      {active === 'leave' && <LeaveApprovals {...shared} />}
      {active === 'incentives' && <Incentives {...shared} />}
      {active === 'payroll' && <PayrollTab {...shared} />}
      {active === 'rules' && <RulesTab {...shared} reload={() => void load()} />}
    </div>
  );
};

export default AttendancePage;
