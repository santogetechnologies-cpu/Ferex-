import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, getDays, getTeam, markDay, platformName, reopenDay, verifyRange, weekStart, type AttendanceDay, type TeamMember } from '../../lib/api/attendance';
import { Btn, Chip, Empty, Modal, Panel, dateLabel, hoursText, inputCls, labelCls, offReason, timeOf, statusOptions, type Shared } from './ui';

type Mode = 'day' | 'week';

export const TeamAttendance: React.FC<Shared> = ({ ctx, rules, holidays, toast }) => {
  const [mode, setMode] = useState<Mode>('day');
  const [anchor, setAnchor] = useState(addDays(ctx.today, ctx.level === 'superadmin' ? 0 : 0));
  const [platform, setPlatform] = useState('all');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ member: TeamMember; date: string; day?: AttendanceDay } | null>(null);

  const from = mode === 'week' ? weekStart(anchor) : anchor;
  const to = mode === 'week' ? addDays(from, 6) : anchor;
  const dates = useMemo(() => Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) => addDays(from, i)), [from, mode]);

  const load = useCallback(async () => {
    try { const [t, d] = await Promise.all([getTeam(), getDays(from, to)]); setTeam(t); setDays(d); setError(''); } catch (e: any) { setError(e.message); }
  }, [from, to]);
  useEffect(() => { void load(); const h = () => void load(); window.addEventListener('ferex-attendance-updated', h); return () => window.removeEventListener('ferex-attendance-updated', h); }, [load]);

  const members = team.filter(m => platform === 'all' || m.division === platform);
  const dayOf = (uid: string, date: string) => days.find(d => d.user_id === uid && d.work_date === date);
  const platforms = Array.from(new Set(team.map(m => m.division)));

  const outstanding = useMemo(() => {
    let n = 0;
    for (const m of members) for (const date of dates) {
      if (date > ctx.today || offReason({ rules, holidays }, m.division, date)) continue;
      const d = dayOf(m.user_id, date);
      if (!d || d.review === 'Pending') n++;
    }
    return n;
  }, [members, dates, days, rules, holidays, ctx.today]);

  const run = async (fn: () => Promise<unknown>, ok: string | ((r: any) => string)) => {
    setBusy(true);
    try { const r = await fn(); toast(typeof ok === 'function' ? ok(r) : ok); await load(); } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };

  const verifyAll = () => run(() => verifyRange(from, to), (r: any) =>
    `Verified ${r.verified} day(s), ${r.marked_absent} marked absent${r.still_open ? `, ${r.still_open} still clocked in (mark or wait)` : ''}${r.own_days_left_for_superadmin ? '. Your own days wait for the superadmin' : ''}`);

  const quick = (m: TeamMember, date: string, status: 'Present' | 'Half Day' | 'Absent') => run(() => markDay({ user: m.user_id, date, status }), `${m.name}: ${status}`);

  const step = mode === 'week' ? 7 : 1;
  return (
    <div className="space-y-4">
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{error}</p>}
      <Panel title="Verify attendance" right={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">{(['day', 'week'] as Mode[]).map(m => <button key={m} type="button" onClick={() => setMode(m)} className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${mode === m ? 'bg-[#58051E] text-white' : 'bg-white text-slate-600'}`}>{m === 'day' ? 'Daily' : 'Weekly'}</button>)}</div>
          <Btn onClick={() => setAnchor(addDays(anchor, -step))} aria-label="Previous">←</Btn>
          <input type="date" className={inputCls} value={anchor} max={ctx.today} onChange={e => e.target.value && setAnchor(e.target.value)} aria-label="Date" />
          <Btn onClick={() => setAnchor(addDays(anchor, step))} disabled={addDays(anchor, step) > addDays(ctx.today, mode === 'week' ? 6 : 0)} aria-label="Next">→</Btn>
          {ctx.level === 'superadmin' && <select className={inputCls} value={platform} onChange={e => setPlatform(e.target.value)} aria-label="Platform"><option value="all">All platforms</option>{platforms.map(p => <option key={p} value={p}>{platformName(p)}</option>)}</select>}
          <Btn tone="brand" disabled={busy || members.length === 0} onClick={() => void verifyAll()}>Verify {mode === 'week' ? 'week' : 'day'}{outstanding ? ` (${outstanding} to check)` : ''}</Btn>
        </div>}>
        <p className="text-[11px] font-semibold text-slate-500 mb-3">
          Everyone is expected to clock in and out. Anyone who did not is marked absent when you verify, unless leave covers the day. Marking a day yourself also verifies it.
          {ctx.level === 'admin' && ' Your own days are verified by the superadmin.'}
        </p>
        {members.length === 0 ? <Empty>No team members to show.</Empty> : mode === 'day' ? (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Person</th><th>Status</th><th>In</th><th>Out</th><th>Hours</th><th>Review</th><th>Mark</th></tr></thead><tbody>
            {members.map(m => {
              const d = dayOf(m.user_id, anchor); const off = offReason({ rules, holidays }, m.division, anchor);
              return (
                <tr key={m.user_id} className="border-t border-slate-100">
                  <td className="py-2"><div className="font-bold">{m.name}{m.is_me && ' (you)'}</div><div className="text-[10px] text-slate-500">{m.role.replace(/_/g, ' ')}{ctx.level === 'superadmin' ? ` · ${platformName(m.division)}` : ''}</div></td>
                  <td>{off && !d ? <span className="text-slate-500 font-semibold">{off}</span> : d ? <><Chip value={d.status} />{d.late && <span className="ml-1 text-[10px] font-bold text-amber-700">late</span>}</> : <span className="text-slate-400">No record</span>}</td>
                  <td>{d ? timeOf(d.clock_in, ctx.rules.timezone) : '—'}</td><td>{d ? timeOf(d.clock_out, ctx.rules.timezone) : '—'}</td><td>{d ? hoursText(Number(d.hours)) : '—'}</td>
                  <td>{d ? <Chip value={d.review} /> : '—'}{d?.source === 'auto' && <div className="text-[10px] text-amber-700">auto-closed</div>}</td>
                  <td><div className="flex flex-wrap gap-1">
                    {(['Present', 'Half Day', 'Absent'] as const).map(s => <Btn key={s} disabled={busy || d?.review === 'Verified' && ctx.level !== 'superadmin' && m.is_me} onClick={() => void quick(m, anchor, s)}>{s === 'Half Day' ? '½' : s[0]}</Btn>)}
                    <Btn onClick={() => setEdit({ member: m, date: anchor, day: d })}>Edit</Btn>
                  </div></td>
                </tr>);
            })}
          </tbody></table></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Person</th>{dates.map(d => <th key={d} className="text-center">{dateLabel(d)}</th>)}<th className="text-right">Hours</th></tr></thead><tbody>
            {members.map(m => {
              const total = dates.reduce((s, d) => s + Number(dayOf(m.user_id, d)?.hours || 0), 0);
              return (
                <tr key={m.user_id} className="border-t border-slate-100">
                  <td className="py-2 font-bold whitespace-nowrap">{m.name}{m.is_me && ' (you)'}</td>
                  {dates.map(date => {
                    const d = dayOf(m.user_id, date); const off = offReason({ rules, holidays }, m.division, date);
                    return (
                      <td key={date} className="text-center">
                        <button type="button" disabled={date > ctx.today} onClick={() => setEdit({ member: m, date, day: d })} className="w-full min-w-[64px] py-1 rounded-md hover:bg-slate-50 cursor-pointer disabled:cursor-default disabled:opacity-40">
                          {d ? <><Chip value={d.status} />{d.review === 'Verified' ? <span className="ml-0.5 text-emerald-600 font-black">✓</span> : <span className="ml-0.5 text-amber-600 font-black">•</span>}</> : off ? <span className="text-slate-400">{off === 'Weekly off' ? 'Off' : 'Holiday'}</span> : date > ctx.today ? '' : <span className="text-slate-400">—</span>}
                        </button>
                      </td>);
                  })}
                  <td className="text-right font-semibold">{hoursText(total)}</td>
                </tr>);
            })}
          </tbody></table><p className="text-[10px] font-semibold text-slate-500 mt-2">✓ verified · • waiting for verification · — nothing recorded (becomes absent when verified)</p></div>
        )}
      </Panel>
      {edit && <MarkModal {...edit} tz={ctx.rules.timezone} level={ctx.level} onClose={() => setEdit(null)} toast={toast} onDone={() => { setEdit(null); void load(); }} />}
    </div>
  );
};

const MarkModal: React.FC<{ member: TeamMember; date: string; day?: AttendanceDay; tz: string; level: string; onClose: () => void; onDone: () => void; toast: (m: string) => void }> = ({ member, date, day, tz, level, onClose, onDone, toast }) => {
  const [status, setStatus] = useState<'Present' | 'Half Day' | 'Absent' | 'Leave'>((day && day.status !== 'Open' ? day.status : 'Present') as any);
  const [from, setFrom] = useState(day?.clock_in ? timeOf(day.clock_in, tz) : '');
  const [to, setTo] = useState(day?.clock_out ? timeOf(day.clock_out, tz) : '');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const verifiedLocked = day?.review === 'Verified';

  const save = async () => {
    setBusy(true); setErr('');
    try { await markDay({ user: member.user_id, date, status, from: from && to ? from : undefined, to: from && to ? to : undefined, note }); toast('Attendance saved'); onDone(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const reopen = async () => {
    setBusy(true); setErr('');
    try { await reopenDay(day!.id, reason); toast('Day reopened'); onDone(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={`${member.name} · ${dateLabel(date)}`} onClose={onClose}>
      {day && <p className="text-xs font-semibold text-slate-600">{day.clock_in ? `Clocked ${timeOf(day.clock_in, tz)} – ${timeOf(day.clock_out, tz)} (${hoursText(Number(day.hours))}).` : 'No clock record.'} {day.work_summary && `“${day.work_summary}”`} {day.review === 'Verified' ? `Verified by ${day.reviewed_by_name || 'an administrator'}.` : 'Not verified yet.'}</p>}
      <div><label className={labelCls}>Status</label><select className={`${inputCls} w-full`} value={status} onChange={e => setStatus(e.target.value as any)}>{statusOptions.map(s => <option key={s}>{s}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>In (optional)</label><input type="time" className={`${inputCls} w-full`} value={from} onChange={e => setFrom(e.target.value)} /></div><div><label className={labelCls}>Out (optional)</label><input type="time" className={`${inputCls} w-full`} value={to} onChange={e => setTo(e.target.value)} /></div></div>
      <div><label className={labelCls}>Note</label><input className={`${inputCls} w-full`} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. forgot to clock in, worked on site" /></div>
      {member.is_me && level === 'admin' && <p className="text-[11px] font-semibold text-amber-700">Your own day will wait for the superadmin to verify it.</p>}
      {verifiedLocked && <div className="border-t border-slate-100 pt-3 space-y-2"><label className={labelCls}>Reopen this verified day</label><input className={`${inputCls} w-full`} placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} /><Btn onClick={() => void reopen()} disabled={busy}>Reopen</Btn></div>}
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
      <div className="flex justify-end gap-2"><Btn onClick={onClose}>Close</Btn><Btn tone="brand" disabled={busy} onClick={() => void save()}>{member.is_me && level === 'admin' ? 'Save' : 'Save & verify'}</Btn></div>
    </Modal>
  );
};
