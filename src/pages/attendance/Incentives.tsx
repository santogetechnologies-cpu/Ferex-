import React, { useCallback, useEffect, useState } from 'react';
import { addIncentive, decideIncentive, getIncentives, getTeam, monthOf, platformName, removeIncentive, type Incentive, type TeamMember } from '../../lib/api/attendance';
import { Btn, Chip, Empty, Panel, inputCls, labelCls, money, monthLabel, type Shared } from './ui';

const KINDS = ['Student closing', 'Commission', 'Performance', 'Bonus', 'Other'];

export const Incentives: React.FC<Shared> = ({ ctx, toast, scope }) => {
  const [month, setMonth] = useState(monthOf(ctx.today));
  const [rows, setRows] = useState<Incentive[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [error, setError] = useState('');
  const [f, setF] = useState({ user: '', kind: KINDS[0], amount: '', reference: '', notes: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const [r, t] = await Promise.all([getIncentives(month), getTeam()]); setRows(r.filter(x => !scope || x.division === scope)); setTeam(t.filter(x => !scope || x.division === scope)); setError(''); } catch (e: any) { setError(e.message); }
  }, [month, scope]);
  useEffect(() => { void load(); const h = () => void load(); window.addEventListener('ferex-attendance-updated', h); return () => window.removeEventListener('ferex-attendance-updated', h); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const amount = Number(f.amount);
      if (!f.user) throw new Error('Choose the person');
      if (!(amount > 0)) throw new Error('Enter an amount above zero');
      const r = await addIncentive({ user: f.user, month, kind: f.kind, amount, reference: f.reference, notes: f.notes });
      toast(r.status === 'Pending' ? 'Logged. The superadmin must approve it before it counts' : 'Logged and approved');
      setF({ ...f, amount: '', reference: '', notes: '' }); await load();
    } catch (x: any) { toast(x.message); } finally { setBusy(false); }
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); await load(); } catch (x: any) { toast(x.message); } };
  const total = rows.filter(r => r.status === 'Approved').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{error}</p>}
      <Panel title="Log an incentive or commission" right={<input type="month" className={inputCls} value={month} onChange={e => e.target.value && setMonth(e.target.value)} aria-label="Month" />}>
        <form onSubmit={add} className="grid sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2"><label className={labelCls}>Person</label><select className={`${inputCls} w-full`} value={f.user} onChange={e => setF({ ...f, user: e.target.value })}><option value="">Choose…</option>{team.map(m => <option key={m.user_id} value={m.user_id}>{m.name}{m.is_me ? ' (you)' : ''}{ctx.level === 'superadmin' ? ` · ${platformName(m.division)}` : ''}</option>)}</select></div>
          <div><label className={labelCls}>Type</label><select className={`${inputCls} w-full`} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></div>
          <div><label className={labelCls}>Amount</label><input type="number" min="0" step="0.01" className={`${inputCls} w-full`} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
          <div><label className={labelCls}>Reference</label><input className={`${inputCls} w-full`} placeholder="Student / order / lead" value={f.reference} onChange={e => setF({ ...f, reference: e.target.value })} /></div>
          <button type="submit" disabled={busy} className="h-9 px-3 rounded-lg text-xs font-bold bg-[#58051E] text-white cursor-pointer disabled:opacity-50">Log</button>
          <div className="sm:col-span-6"><input className={`${inputCls} w-full`} placeholder="Notes (optional)" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} aria-label="Notes" /></div>
        </form>
        <p className="text-[11px] font-semibold text-slate-500 mt-2">Entries for your team count towards that month's pay as soon as you log them. Your own entries need the superadmin's approval.</p>
      </Panel>
      <Panel title={`${monthLabel(month)} · approved total ${money(total)}`}>
        {rows.length === 0 ? <Empty>Nothing logged for this month.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Person</th><th>Type</th><th>Reference</th><th className="text-right">Amount</th><th>Status</th><th>Logged by</th><th /></tr></thead><tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-slate-100"><td className="py-2 font-bold">{r.user_name}</td><td>{r.kind}</td><td>{r.reference || '—'}{r.notes && <div className="text-[10px] text-slate-500">{r.notes}</div>}</td><td className="text-right font-bold">{money(r.amount, r.currency)}</td><td><Chip value={r.status} /></td><td>{r.logged_by_name}</td>
                <td><div className="flex gap-1">
                  {r.status === 'Pending' && r.user_id !== ctx.user_id && <><Btn tone="good" onClick={() => void run(() => decideIncentive(r.id, true), 'Approved')}>Approve</Btn><Btn tone="danger" onClick={() => void run(() => decideIncentive(r.id, false), 'Rejected')}>Reject</Btn></>}
                  {(r.status !== 'Approved' || ctx.level === 'superadmin' || r.user_id !== ctx.user_id) && <Btn onClick={() => { if (confirm('Remove this entry?')) void run(() => removeIncentive(r.id), 'Removed'); }}>Remove</Btn>}
                </div></td></tr>))}
          </tbody></table></div>)}
      </Panel>
    </div>
  );
};
