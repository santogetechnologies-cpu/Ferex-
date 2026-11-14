import React, { useCallback, useEffect, useState } from 'react';
import { decideLeave, getLeaves, platformName, type LeaveRequest } from '../../lib/api/attendance';
import { Btn, Chip, Empty, Panel, inputCls, type Shared } from './ui';

export const LeaveApprovals: React.FC<Shared> = ({ ctx, toast }) => {
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => { try { setRows(await getLeaves()); setError(''); } catch (e: any) { setError(e.message); } }, []);
  useEffect(() => { void load(); const h = () => void load(); window.addEventListener('ferex-attendance-updated', h); return () => window.removeEventListener('ferex-attendance-updated', h); }, [load]);

  const decide = async (l: LeaveRequest, approve: boolean) => {
    setBusy(l.id);
    try { await decideLeave(l.id, approve, notes[l.id] || ''); toast(approve ? 'Leave approved' : 'Leave rejected'); await load(); } catch (e: any) { toast(e.message); } finally { setBusy(''); }
  };
  const mine = (l: LeaveRequest) => l.user_id === ctx.user_id;
  const pending = rows.filter(l => l.status === 'pending');
  const history = rows.filter(l => l.status !== 'pending');
  return (
    <div className="space-y-4">
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{error}</p>}
      <Panel title={`Waiting for a decision (${pending.length})`}>
        {pending.length === 0 ? <Empty>No leave waiting.</Empty> : pending.map(l => (
          <div key={l.id} className="border border-slate-200 rounded-xl p-3 mb-2 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><b>{l.user_name}</b> <span className="text-slate-500">· {l.user_role.replace(/_/g, ' ')}{ctx.level === 'superadmin' ? ` · ${platformName(l.division)}` : ''}</span></div><Chip value={l.type_name} /></div>
            <div className="font-semibold">{l.start_date}{l.end_date !== l.start_date ? ` → ${l.end_date}` : ''} · {l.kind === 'hourly' ? `${l.hours}h` : `${l.total_days} day(s)`}{l.kind !== 'hourly' && l.lop_days > 0 ? <span className="text-rose-700"> · {l.paid_days} paid, {l.lop_days} loss of pay</span> : null}</div>
            <p className="text-slate-600">{l.reason}</p>
            {mine(l) ? <p className="text-[11px] font-semibold text-amber-700">Your own request is decided by the superadmin.</p> : (
              <div className="flex flex-wrap items-center gap-2"><input className={`${inputCls} flex-1 min-w-[160px]`} placeholder="Note (optional)" value={notes[l.id] || ''} onChange={e => setNotes({ ...notes, [l.id]: e.target.value })} />
                <Btn tone="good" disabled={busy === l.id} onClick={() => void decide(l, true)}>Approve</Btn><Btn tone="danger" disabled={busy === l.id} onClick={() => void decide(l, false)}>Reject</Btn></div>)}
          </div>))}
      </Panel>
      <Panel title="History">
        {history.length === 0 ? <Empty>No decided requests.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Person</th><th>Type</th><th>Dates</th><th>Paid / LOP</th><th>Status</th><th>By</th></tr></thead><tbody>
            {history.map(l => <tr key={l.id} className="border-t border-slate-100"><td className="py-2 font-bold">{l.user_name}</td><td>{l.type_name}</td><td>{l.start_date}{l.end_date !== l.start_date ? ` → ${l.end_date}` : ''}</td><td>{l.kind === 'hourly' ? `${l.hours}h` : `${l.paid_days} / ${l.lop_days}`}</td><td><Chip value={l.status} /></td><td>{l.decided_by_name || '—'}</td></tr>)}
          </tbody></table></div>)}
      </Panel>
    </div>
  );
};
