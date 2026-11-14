import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clockIn, clockOut, getDays, getOpenSession, getLeaveBalance, getLeaves, getLeaveTypes, submitLeave, cancelLeave, getPayroll, getIncentives, monthBounds, monthOf, addDays,
  type AttendanceDay, type LeaveBalance, type LeaveRequest, type LeaveType, type Payroll, type Incentive,
} from '../../lib/api/attendance';
import { Btn, Chip, Empty, Modal, Panel, hoursText, inputCls, labelCls, money, monthLabel, offReason, timeOf, dateLabel, type Shared } from './ui';

export const MyAttendance: React.FC<Shared> = ({ ctx, rules, holidays, toast }) => {
  const [open, setOpen] = useState<AttendanceDay | null>(null);
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [balance, setBalance] = useState<LeaveBalance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [pay, setPay] = useState<Payroll[]>([]);
  const [inc, setInc] = useState<Incentive[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const [asking, setAsking] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const month = monthOf(ctx.today);
  const { from, to } = monthBounds(month);

  const load = useCallback(async () => {
    try {
      const [o, d, b, l, t, p, i] = await Promise.all([
        getOpenSession(ctx.user_id), getDays(from, to, ctx.user_id), getLeaveBalance(), getLeaves(ctx.user_id), getLeaveTypes(), getPayroll(), getIncentives(),
      ]);
      setOpen(o); setDays(d); setBalance(b); setLeaves(l); setTypes(t); setPay(p.filter(x => x.user_id === ctx.user_id)); setInc(i.filter(x => x.user_id === ctx.user_id)); setError('');
    } catch (e: any) { setError(e.message); }
  }, [ctx.user_id, from, to]);
  useEffect(() => { void load(); const h = () => void load(); window.addEventListener('ferex-attendance-updated', h); return () => window.removeEventListener('ferex-attendance-updated', h); }, [load]);
  useEffect(() => { if (!open) return; const t = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(t); }, [open]);

  const today = days.find(d => d.work_date === ctx.today);
  const todayOff = offReason({ rules, holidays }, ctx.division, ctx.today);
  const elapsed = useMemo(() => open?.clock_in ? (Date.now() - new Date(open.clock_in).getTime()) / 3600000 + (open as any).banked_minutes / 60 : 0, [open, tick]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok); setAsking(false); setSummary(''); await load(); } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };

  const totals = useMemo(() => days.reduce((a, d) => { if (d.status === 'Present') a.p++; else if (d.status === 'Half Day') a.h++; else if (d.status === 'Absent') a.a++; else if (d.status === 'Leave') a.l++; a.hours += Number(d.hours) || 0; return a; }, { p: 0, h: 0, a: 0, l: 0, hours: 0 }), [days]);

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{error}</p>}

      <Panel title="Today" right={<span className="text-xs font-semibold text-slate-500">{dateLabel(ctx.today)}</span>}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] space-y-1">
            {open ? (
              <>
                <div className="text-2xl font-black tabular-nums">{hoursText(elapsed)}</div>
                <p className="text-xs font-semibold text-slate-500">Clocked in at {timeOf(open.clock_in, ctx.rules.timezone)}{open.late ? ' · late' : ''}. You are on the clock.</p>
              </>
            ) : today ? (
              <>
                <div className="flex items-center gap-2"><Chip value={today.status} /><Chip value={today.review} /></div>
                <p className="text-xs font-semibold text-slate-500">{today.clock_in ? `${timeOf(today.clock_in, ctx.rules.timezone)} – ${timeOf(today.clock_out, ctx.rules.timezone)} · ${hoursText(Number(today.hours))}` : today.note || 'Recorded by your administrator'}</p>
                {today.review === 'Pending' && ctx.level === 'admin' && <p className="text-[11px] font-semibold text-amber-700">Waiting for the superadmin to verify your day.</p>}
              </>
            ) : <p className="text-sm font-semibold text-slate-600">{todayOff ? `${todayOff} today — no attendance needed.` : 'You have not clocked in yet.'}</p>}
          </div>
          {!open ? (
            <Btn tone="brand" disabled={busy || today?.review === 'Verified'} onClick={() => void act(() => clockIn(), 'Clocked in')}>{today?.clock_out ? 'Clock in again' : 'Clock in'}</Btn>
          ) : asking ? (
            <div className="flex flex-wrap items-center gap-2">
              <input className={`${inputCls} w-64`} placeholder="What did you work on? (optional)" value={summary} onChange={e => setSummary(e.target.value)} aria-label="Work summary" />
              <Btn tone="brand" disabled={busy} onClick={() => void act(() => clockOut(summary), 'Clocked out')}>Confirm clock out</Btn>
              <Btn onClick={() => setAsking(false)}>Cancel</Btn>
            </div>
          ) : <Btn tone="danger" onClick={() => setAsking(true)}>Clock out</Btn>}
        </div>
      </Panel>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[['Present', totals.p], ['Half days', totals.h], ['Absent', totals.a], ['On leave', totals.l], ['Hours', hoursText(totals.hours)]].map(([k, v]) => (
          <div key={String(k)} className="bg-white border border-slate-200/80 rounded-xl p-3"><div className="text-[10px] font-extrabold uppercase text-slate-500">{k} · {monthLabel(month)}</div><div className="text-lg font-black">{v}</div></div>
        ))}
      </div>

      <Panel title="Leave balance" right={<Btn tone="brand" onClick={() => setLeaveOpen(true)}>Apply for leave</Btn>}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {balance.map(b => (
            <div key={b.code} className="border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-extrabold text-slate-700">{b.name}</div>
              {b.kind === 'hourly'
                ? <div className="text-xs font-semibold text-slate-500 mt-1">Up to {b.monthly_max_hours}h a month</div>
                : b.is_paid ? <div className="mt-1"><span className="text-lg font-black">{b.remaining}</span><span className="text-[11px] font-semibold text-slate-500"> of {b.quota} left</span></div>
                  : <div className="text-xs font-semibold text-rose-600 mt-1">Unpaid · {b.used} taken</div>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="My leave">
        {leaves.length === 0 ? <Empty>No leave requests yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Type</th><th>Dates</th><th>Days</th><th>Paid / LOP</th><th>Status</th><th /></tr></thead><tbody>
            {leaves.map(l => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="py-2 font-bold">{l.type_name}</td>
                <td>{l.start_date}{l.end_date !== l.start_date ? ` → ${l.end_date}` : ''}{l.kind === 'half_day' ? ` (${l.half_session === 'first_half' ? 'morning' : 'afternoon'})` : ''}{l.kind === 'hourly' ? ` ${l.from_time?.slice(0, 5)}–${l.to_time?.slice(0, 5)}` : ''}</td>
                <td>{l.kind === 'hourly' ? `${l.hours}h` : l.total_days}</td>
                <td>{l.kind === 'hourly' ? '—' : `${l.paid_days} / ${l.lop_days}`}</td>
                <td><Chip value={l.status} />{l.decision_note && <div className="text-[10px] text-slate-500">{l.decision_note}</div>}</td>
                <td>{l.status === 'pending' && <Btn tone="danger" onClick={() => void act(() => cancelLeave(l.id), 'Request cancelled')}>Cancel</Btn>}</td>
              </tr>))}
          </tbody></table></div>)}
      </Panel>

      <Panel title={`${monthLabel(month)} days`}>
        {days.length === 0 ? <Empty>No attendance recorded this month yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Date</th><th>Status</th><th>In</th><th>Out</th><th>Hours</th><th>Review</th></tr></thead><tbody>
            {days.map(d => (
              <tr key={d.id} className="border-t border-slate-100"><td className="py-2 font-semibold">{dateLabel(d.work_date)}</td><td><Chip value={d.status} />{d.late && <span className="ml-1 text-[10px] font-bold text-amber-700">late</span>}</td>
                <td>{timeOf(d.clock_in, ctx.rules.timezone)}</td><td>{timeOf(d.clock_out, ctx.rules.timezone)}</td><td>{hoursText(Number(d.hours))}</td><td><Chip value={d.review} /></td></tr>))}
          </tbody></table></div>)}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="My payslips">
          {pay.length === 0 ? <Empty>Payslips appear here once the superadmin approves the month.</Empty> : pay.map(p => (
            <div key={p.id} className="border border-slate-200 rounded-xl p-3 mb-2 text-xs space-y-0.5">
              <div className="flex justify-between"><b>{monthLabel(p.month)}</b><Chip value={p.status} /></div>
              <div className="flex justify-between"><span>Monthly salary</span><span>{money(p.base_salary, p.currency)}</span></div>
              <div className="flex justify-between"><span>Incentives & commission</span><span>+ {money(p.incentives, p.currency)}</span></div>
              <div className="flex justify-between"><span>Loss of pay ({p.lop_days} day{p.lop_days === 1 ? '' : 's'})</span><span>− {money(p.lop_deduction, p.currency)}</span></div>
              {p.other_deductions > 0 && <div className="flex justify-between"><span>Other deductions {p.deduction_note && `(${p.deduction_note})`}</span><span>− {money(p.other_deductions, p.currency)}</span></div>}
              <div className="flex justify-between border-t border-slate-100 pt-1 font-black text-sm"><span>Net pay</span><span>{money(p.net, p.currency)}</span></div>
              <div className="text-[10px] text-slate-500">{p.present_days} present · {p.paid_leave_days} paid leave · {p.working_days} working days{p.paid_reference ? ` · ref ${p.paid_reference}` : ''}</div>
            </div>))}
        </Panel>
        <Panel title="My incentives & commission">
          {inc.length === 0 ? <Empty>Nothing logged for you yet.</Empty> : (
            <table className="w-full text-xs"><tbody>{inc.map(i => (
              <tr key={i.id} className="border-t border-slate-100 first:border-0"><td className="py-2"><b>{i.kind}</b><div className="text-[10px] text-slate-500">{i.month}{i.reference ? ` · ${i.reference}` : ''}</div></td><td className="text-right font-bold">{money(i.amount, i.currency)}</td><td className="text-right"><Chip value={i.status} /></td></tr>))}</tbody></table>)}
        </Panel>
      </div>

      {leaveOpen && <LeaveForm types={types} onClose={() => setLeaveOpen(false)} onDone={() => { setLeaveOpen(false); toast('Leave request sent for approval'); void load(); }} today={ctx.today} level={ctx.level} />}
    </div>
  );
};

const LeaveForm: React.FC<{ types: LeaveType[]; today: string; level: string; onClose: () => void; onDone: () => void }> = ({ types, today, level, onClose, onDone }) => {
  const active = types.filter(t => t.is_active);
  const [code, setCode] = useState(active[0]?.code || '');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [session, setSession] = useState('first_half');
  const [from, setFrom] = useState('10:00');
  const [to, setTo] = useState('12:00');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const t = active.find(x => x.code === code);
  const single = t?.kind !== 'full_day';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await submitLeave({ type: code, start, end: single ? start : end, session: t?.kind === 'half_day' ? session : undefined, from: t?.kind === 'hourly' ? from : undefined, to: t?.kind === 'hourly' ? to : undefined, reason }); onDone(); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Apply for leave" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelCls}>Type</label><select className={`${inputCls} w-full`} value={code} onChange={e => setCode(e.target.value)}>{active.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>{single ? 'Date' : 'From'}</label><input type="date" className={`${inputCls} w-full`} value={start} onChange={e => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} /></div>
          {!single && <div><label className={labelCls}>To</label><input type="date" className={`${inputCls} w-full`} value={end} min={start} onChange={e => setEnd(e.target.value)} /></div>}
          {t?.kind === 'half_day' && <div><label className={labelCls}>Which half</label><select className={`${inputCls} w-full`} value={session} onChange={e => setSession(e.target.value)}><option value="first_half">Morning</option><option value="second_half">Afternoon</option></select></div>}
          {t?.kind === 'hourly' && <><div><label className={labelCls}>From</label><input type="time" className={`${inputCls} w-full`} value={from} onChange={e => setFrom(e.target.value)} /></div><div><label className={labelCls}>To</label><input type="time" className={`${inputCls} w-full`} value={to} onChange={e => setTo(e.target.value)} /></div></>}
        </div>
        <div><label className={labelCls}>Reason</label><textarea className={`${inputCls} w-full h-20 py-2`} value={reason} onChange={e => setReason(e.target.value)} /></div>
        {t && !t.is_paid && <p className="text-[11px] font-semibold text-rose-700">This leave is unpaid: the days are deducted from your salary.</p>}
        {t && t.is_paid && t.kind !== 'hourly' && <p className="text-[11px] font-semibold text-slate-500">Days beyond your yearly limit of {t.annual_quota} are treated as loss of pay.</p>}
        <p className="text-[11px] font-semibold text-slate-500">{level === 'admin' ? 'The superadmin approves your leave.' : 'Your platform administrator approves your leave.'}</p>
        {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
        <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><button type="submit" disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#58051E] text-white cursor-pointer disabled:opacity-50">{busy ? 'Sending…' : 'Send request'}</button></div>
      </form>
    </Modal>
  );
};
void addDays;
