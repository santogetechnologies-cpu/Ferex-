import React, { useCallback, useEffect, useState } from 'react';
import { getLeaveTypes, saveHoliday, saveLeaveType, saveRules, platformName, type AttendanceRules, type LeaveType } from '../../lib/api/attendance';
import { Btn, Empty, Panel, inputCls, labelCls, type Shared } from './ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLATFORMS = ['all', 'education', 'rimi', 'trade', 'digital'];

export const RulesTab: React.FC<Shared & { reload: () => void }> = ({ ctx, rules, holidays, toast, reload }) => {
  const isSuper = ctx.level === 'superadmin';
  const [platform, setPlatform] = useState(isSuper ? 'all' : ctx.division);
  const current = rules.find(r => r.division === platform) || rules.find(r => r.division === 'all')!;
  const [f, setF] = useState<AttendanceRules>(current);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [hol, setHol] = useState({ date: '', name: '' });
  const [error, setError] = useState('');
  useEffect(() => setF(current), [platform, rules]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadTypes = useCallback(async () => { try { setTypes(await getLeaveTypes()); } catch (e: any) { setError(e.message); } }, []);
  useEffect(() => { void loadTypes(); }, [loadTypes]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); reload(); await loadTypes(); } catch (e: any) { toast(e.message); } };
  const holidaysFor = holidays.filter(h => h.division === 'all' || h.division === (isSuper ? platform : ctx.division));
  const num = (k: keyof AttendanceRules) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) } as AttendanceRules);

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{error}</p>}
      <Panel title="Attendance & loss-of-pay rules" right={isSuper ? <select className={inputCls} value={platform} onChange={e => setPlatform(e.target.value)} aria-label="Platform">{PLATFORMS.map(p => <option key={p} value={p}>{p === 'all' ? 'Default for all platforms' : platformName(p)}</option>)}</select> : <span className="text-[11px] font-semibold text-slate-500">Set by the superadmin</span>}>
        <fieldset disabled={!isSuper} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className={labelCls}>Work starts</label><input type="time" className={`${inputCls} w-full`} value={f.work_start.slice(0, 5)} onChange={e => setF({ ...f, work_start: e.target.value })} /></div>
          <div><label className={labelCls}>Work ends</label><input type="time" className={`${inputCls} w-full`} value={f.work_end.slice(0, 5)} onChange={e => setF({ ...f, work_end: e.target.value })} /></div>
          <div><label className={labelCls}>Late after (min grace)</label><input type="number" min="0" className={`${inputCls} w-full`} value={f.grace_minutes} onChange={num('grace_minutes')} /></div>
          <div><label className={labelCls}>Full day from (hours)</label><input type="number" min="1" step="0.5" className={`${inputCls} w-full`} value={f.full_day_hours} onChange={num('full_day_hours')} /></div>
          <div><label className={labelCls}>Half day from (hours)</label><input type="number" min="0" step="0.5" className={`${inputCls} w-full`} value={f.half_day_hours} onChange={num('half_day_hours')} /></div>
          <div><label className={labelCls}>Loss of pay multiplier</label><input type="number" min="0" step="0.25" className={`${inputCls} w-full`} value={f.lop_factor} onChange={num('lop_factor')} /></div>
          <div><label className={labelCls}>Late marks = ½ day LOP (0 = off)</label><input type="number" min="0" className={`${inputCls} w-full`} value={f.late_to_half_day} onChange={num('late_to_half_day')} /></div>
          <div><label className={labelCls}>Daily pay is salary ÷</label><select className={`${inputCls} w-full`} value={f.pay_basis} onChange={e => setF({ ...f, pay_basis: e.target.value as any })}><option value="working_days">working days in the month</option><option value="calendar_30">30 days</option></select></div>
          <div className="col-span-2 sm:col-span-4"><label className={labelCls}>Weekly off</label><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1 text-xs font-semibold"><input type="checkbox" checked={f.weekly_off.includes(i)} onChange={e => setF({ ...f, weekly_off: e.target.checked ? [...f.weekly_off, i].sort() : f.weekly_off.filter(x => x !== i) })} />{d}</label>)}</div></div>
        </fieldset>
        {isSuper && <div className="mt-3 flex justify-end"><Btn tone="brand" onClick={() => void run(() => saveRules(platform, f), 'Rules saved')}>Save rules for {platform === 'all' ? 'all platforms' : platformName(platform)}</Btn></div>}
      </Panel>

      <Panel title="Leave types & limits">
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Leave</th><th>Kind</th><th>Yearly days</th><th>Monthly hours</th><th>Paid</th><th>Beyond limit</th><th>Active</th>{isSuper && <th />}</tr></thead><tbody>
          {types.map(t => <TypeRow key={t.code} t={t} editable={isSuper} onSave={x => void run(() => saveLeaveType(x), `${x.name} saved`)} />)}
        </tbody></table></div>
        {isSuper && <NewType onSave={x => void run(() => saveLeaveType(x), 'Leave type added')} />}
      </Panel>

      <Panel title="Holidays">
        {holidaysFor.length === 0 ? <Empty>No holidays set.</Empty> : <ul className="text-xs divide-y divide-slate-100">{holidaysFor.map(h => <li key={h.id} className="py-1.5 flex justify-between items-center"><span><b>{h.holiday_date}</b> · {h.name} <span className="text-slate-500">({h.division === 'all' ? 'everyone' : platformName(h.division)})</span></span>{(isSuper || h.division !== 'all') && <Btn tone="danger" onClick={() => void run(() => saveHoliday(h.division, h.holiday_date, h.name, true), 'Holiday removed')}>Remove</Btn>}</li>)}</ul>}
        <div className="flex flex-wrap items-end gap-2 mt-3">
          <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={hol.date} onChange={e => setHol({ ...hol, date: e.target.value })} /></div>
          <div className="flex-1 min-w-[160px]"><label className={labelCls}>Name</label><input className={`${inputCls} w-full`} value={hol.name} onChange={e => setHol({ ...hol, name: e.target.value })} /></div>
          <Btn tone="brand" onClick={() => { if (!hol.date) { toast('Choose the date'); return; } void run(() => saveHoliday(isSuper ? platform : ctx.division, hol.date, hol.name), 'Holiday saved').then(() => setHol({ date: '', name: '' })); }}>Add holiday{isSuper ? ` for ${platform === 'all' ? 'everyone' : platformName(platform)}` : ''}</Btn>
        </div>
      </Panel>
    </div>
  );
};

const TypeRow: React.FC<{ t: LeaveType; editable: boolean; onSave: (t: LeaveType) => void }> = ({ t, editable, onSave }) => {
  const [x, setX] = useState(t);
  useEffect(() => setX(t), [t]);
  const dirty = JSON.stringify(x) !== JSON.stringify(t);
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2"><input disabled={!editable} className={`${inputCls} w-40`} value={x.name} onChange={e => setX({ ...x, name: e.target.value })} aria-label={`${t.code} name`} /> <span className="text-[10px] text-slate-500">{t.code}</span></td>
      <td>{t.kind.replace('_', ' ')}</td>
      <td><input disabled={!editable || t.kind === 'hourly'} type="number" min="0" className={`${inputCls} w-20`} value={x.annual_quota} onChange={e => setX({ ...x, annual_quota: Number(e.target.value) })} aria-label={`${t.code} yearly days`} /></td>
      <td><input disabled={!editable || t.kind !== 'hourly'} type="number" min="0" className={`${inputCls} w-20`} value={x.monthly_max_hours} onChange={e => setX({ ...x, monthly_max_hours: Number(e.target.value) })} aria-label={`${t.code} monthly hours`} /></td>
      <td><input disabled={!editable} type="checkbox" checked={x.is_paid} onChange={e => setX({ ...x, is_paid: e.target.checked })} aria-label={`${t.code} paid`} /></td>
      <td><select disabled={!editable} className={inputCls} value={x.on_exceed} onChange={e => setX({ ...x, on_exceed: e.target.value as any })} aria-label={`${t.code} beyond limit`}><option value="lop">becomes loss of pay</option><option value="block">is blocked</option></select></td>
      <td><input disabled={!editable} type="checkbox" checked={x.is_active} onChange={e => setX({ ...x, is_active: e.target.checked })} aria-label={`${t.code} active`} /></td>
      {editable && <td>{dirty && <Btn tone="brand" onClick={() => onSave(x)}>Save</Btn>}</td>}
    </tr>);
};

const NewType: React.FC<{ onSave: (t: Partial<LeaveType>) => void }> = ({ onSave }) => {
  const [x, setX] = useState({ code: '', name: '', kind: 'full_day' as LeaveType['kind'], annual_quota: 0, is_paid: true });
  return (
    <div className="flex flex-wrap items-end gap-2 mt-3 border-t border-slate-100 pt-3">
      <div><label className={labelCls}>Code</label><input className={`${inputCls} w-24`} value={x.code} onChange={e => setX({ ...x, code: e.target.value.toUpperCase() })} placeholder="e.g. ML" /></div>
      <div><label className={labelCls}>Name</label><input className={`${inputCls} w-44`} value={x.name} onChange={e => setX({ ...x, name: e.target.value })} /></div>
      <div><label className={labelCls}>Kind</label><select className={inputCls} value={x.kind} onChange={e => setX({ ...x, kind: e.target.value as any })}><option value="full_day">Full day(s)</option><option value="half_day">Half day</option><option value="hourly">Hourly</option></select></div>
      <div><label className={labelCls}>Yearly days</label><input type="number" min="0" className={`${inputCls} w-20`} value={x.annual_quota} onChange={e => setX({ ...x, annual_quota: Number(e.target.value) })} /></div>
      <label className="flex items-center gap-1 text-xs font-semibold h-9"><input type="checkbox" checked={x.is_paid} onChange={e => setX({ ...x, is_paid: e.target.checked })} />Paid</label>
      <Btn tone="brand" onClick={() => { onSave(x); setX({ ...x, code: '', name: '' }); }}>Add leave type</Btn>
    </div>);
};
