import React, { useCallback, useEffect, useState } from 'react';
import {
  adjustPayroll, advancePayroll, generatePayroll, getPayroll, getSalaries, getTeam, previousMonth, setSalary, platformName,
  type Payroll, type Salary, type TeamMember,
} from '../../lib/api/attendance';
import { Btn, Chip, Empty, Modal, Panel, inputCls, labelCls, money, monthLabel, type Shared } from './ui';

export const PayrollTab: React.FC<Shared> = ({ ctx, toast, scope }) => {
  const [month, setMonth] = useState(previousMonth(ctx.today));
  const [rows, setRows] = useState<Payroll[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [adjust, setAdjust] = useState<Payroll | null>(null);
  const [pay, setPay] = useState<Payroll | null>(null);
  const [sal, setSal] = useState<TeamMember | null>(null);

  const load = useCallback(async () => {
    try { const [p, s, t] = await Promise.all([getPayroll(month), getSalaries(), getTeam()]); setRows(p.filter(x => !scope || x.division === scope)); setSalaries(s); setTeam(t.filter(m => !m.is_me && (!scope || m.division === scope))); setError(''); } catch (e: any) { setError(e.message); }
  }, [month, scope]);
  useEffect(() => { void load(); const h = () => void load(); window.addEventListener('ferex-attendance-updated', h); return () => window.removeEventListener('ferex-attendance-updated', h); }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string | ((r: any) => string)) => {
    setBusy(true);
    try { const r = await fn(); toast(typeof ok === 'function' ? ok(r) : ok); await load(); } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  const isSuper = ctx.level === 'superadmin';
  const noSalary = team.filter(m => !salaries.some(s => s.user_id === m.user_id));

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{error}</p>}
      <Panel title="Monthly payroll" right={
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" className={inputCls} value={month} max={previousMonth(ctx.today)} onChange={e => e.target.value && setMonth(e.target.value)} aria-label="Month" />
          <Btn tone="brand" disabled={busy} onClick={() => void run(() => generatePayroll(month, scope), (r: any) => `Prepared ${r.prepared} payslip(s)${r.no_salary_set ? `, ${r.no_salary_set} skipped (no salary set)` : ''}${r.already_verified_or_paid ? `, ${r.already_verified_or_paid} already verified` : ''}`)}>Prepare / refresh {monthLabel(month)}</Btn>
        </div>}>
        <p className="text-[11px] font-semibold text-slate-500 mb-3">
          Monthly salary + approved incentives − loss of pay (absences and unpaid leave) − other deductions. Flow: prepared → verified by {isSuper ? 'the platform administrator (or you, for administrators)' : 'you'} → approved and paid by the superadmin.
          Every day of the month must be verified before payroll can be verified.
        </p>
        {rows.length === 0 ? <Empty>No payroll prepared for {monthLabel(month)} yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Person</th><th className="text-right">Salary</th><th className="text-right">Days (pres/leave/LOP)</th><th className="text-right">LOP −</th><th className="text-right">Other −</th><th className="text-right">Incentives +</th><th className="text-right">Net</th><th>Status</th><th /></tr></thead><tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-t border-slate-100 align-top">
                <td className="py-2"><div className="font-bold">{p.user_name}</div><div className="text-[10px] text-slate-500">{p.user_role.replace(/_/g, ' ')}{isSuper ? ` · ${platformName(p.division)}` : ''}</div></td>
                <td className="text-right">{money(p.base_salary, p.currency)}</td>
                <td className="text-right">{p.present_days} / {p.paid_leave_days} / {p.lop_days}<div className="text-[10px] text-slate-500">of {p.working_days}</div>{p.unverified_days > 0 && <div className="text-[10px] font-bold text-amber-700">{p.unverified_days} unverified</div>}</td>
                <td className="text-right">{money(p.lop_deduction, p.currency)}</td>
                <td className="text-right">{money(p.other_deductions, p.currency)}{p.deduction_note && <div className="text-[10px] text-slate-500">{p.deduction_note}</div>}</td>
                <td className="text-right">{money(p.incentives, p.currency)}</td>
                <td className="text-right font-black">{money(p.net, p.currency)}</td>
                <td><Chip value={p.status} />{p.paid_reference && <div className="text-[10px] text-slate-500">{p.paid_reference}</div>}</td>
                <td><div className="flex flex-wrap gap-1 justify-end">
                  {p.status === 'Draft' && <><Btn onClick={() => setAdjust(p)}>Deduct</Btn><Btn tone="brand" disabled={busy} onClick={() => void run(() => advancePayroll(p.id, 'Verified'), 'Payroll verified')}>Verify</Btn></>}
                  {p.status === 'Verified' && <>{isSuper && <Btn tone="good" disabled={busy} onClick={() => void run(() => advancePayroll(p.id, 'Approved'), 'Payroll approved')}>Approve</Btn>}<Btn disabled={busy} onClick={() => void run(() => advancePayroll(p.id, 'Draft'), 'Sent back to draft')}>Reopen</Btn></>}
                  {p.status === 'Approved' && isSuper && <><Btn tone="good" onClick={() => setPay(p)}>Mark paid</Btn><Btn disabled={busy} onClick={() => void run(() => advancePayroll(p.id, 'Draft'), 'Reopened')}>Reopen</Btn></>}
                </div></td>
              </tr>))}
          </tbody></table></div>)}
      </Panel>

      <Panel title="Monthly salaries" right={noSalary.length ? <span className="text-[11px] font-bold text-amber-700">{noSalary.length} without a salary</span> : undefined}>
        {team.length === 0 ? <Empty>No team members.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="py-1.5">Person</th><th>Role</th><th className="text-right">Monthly salary</th><th /></tr></thead><tbody>
            {team.map(m => { const s = salaries.find(x => x.user_id === m.user_id); return (
              <tr key={m.user_id} className="border-t border-slate-100"><td className="py-2 font-bold">{m.name}{isSuper ? <span className="font-normal text-slate-500"> · {platformName(m.division)}</span> : null}</td><td>{m.role.replace(/_/g, ' ')}</td><td className="text-right">{s ? money(s.monthly_salary, s.currency) : <span className="text-amber-700 font-bold">Not set</span>}</td><td className="text-right"><Btn onClick={() => setSal(m)}>{s ? 'Edit' : 'Set salary'}</Btn></td></tr>); })}
          </tbody></table></div>)}
      </Panel>

      {adjust && <AdjustModal p={adjust} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); toast('Deduction saved'); void load(); }} />}
      {pay && <PayModal p={pay} onClose={() => setPay(null)} onDone={() => { setPay(null); toast('Marked as paid'); void load(); }} />}
      {sal && <SalaryModal m={sal} existing={salaries.find(s => s.user_id === sal.user_id)} onClose={() => setSal(null)} onDone={() => { setSal(null); toast('Salary saved'); void load(); }} />}
    </div>
  );
};

const AdjustModal: React.FC<{ p: Payroll; onClose: () => void; onDone: () => void }> = ({ p, onClose, onDone }) => {
  const [amt, setAmt] = useState(String(p.other_deductions || ''));
  const [note, setNote] = useState(p.deduction_note);
  const [err, setErr] = useState('');
  const save = async () => { try { await adjustPayroll(p.id, Number(amt) || 0, note); onDone(); } catch (e: any) { setErr(e.message); } };
  return (
    <Modal title={`Other deduction · ${p.user_name}`} onClose={onClose}>
      <div><label className={labelCls}>Amount ({p.currency})</label><input type="number" min="0" className={`${inputCls} w-full`} value={amt} onChange={e => setAmt(e.target.value)} /></div>
      <div><label className={labelCls}>Reason</label><input className={`${inputCls} w-full`} value={note} onChange={e => setNote(e.target.value)} /></div>
      <p className="text-[11px] font-semibold text-slate-500">Loss of pay for absences is already calculated; use this only for extra deductions such as advances.</p>
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
      <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn tone="brand" onClick={() => void save()}>Save</Btn></div>
    </Modal>
  );
};

const PayModal: React.FC<{ p: Payroll; onClose: () => void; onDone: () => void }> = ({ p, onClose, onDone }) => {
  const [ref, setRef] = useState('');
  const [err, setErr] = useState('');
  const save = async () => { try { await advancePayroll(p.id, 'Paid', ref); onDone(); } catch (e: any) { setErr(e.message); } };
  return (
    <Modal title={`Mark paid · ${p.user_name} · ${money(p.net, p.currency)}`} onClose={onClose}>
      <div><label className={labelCls}>Payment reference (UTR / cheque no.)</label><input className={`${inputCls} w-full`} value={ref} onChange={e => setRef(e.target.value)} /></div>
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
      <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn tone="good" onClick={() => void save()}>Confirm payment</Btn></div>
    </Modal>
  );
};

const SalaryModal: React.FC<{ m: TeamMember; existing?: Salary; onClose: () => void; onDone: () => void }> = ({ m, existing, onClose, onDone }) => {
  const [f, setF] = useState({ amount: String(existing?.monthly_salary ?? ''), currency: existing?.currency || 'INR', bank_name: existing?.bank_name || '', account_name: existing?.account_name || '', account_number: existing?.account_number || '', ifsc: existing?.ifsc || '' });
  const [err, setErr] = useState('');
  const save = async () => { try { if (!(Number(f.amount) >= 0) || f.amount === '') throw new Error('Enter the monthly salary'); await setSalary({ user: m.user_id, amount: Number(f.amount), currency: f.currency, bank_name: f.bank_name, account_name: f.account_name, account_number: f.account_number, ifsc: f.ifsc }); onDone(); } catch (e: any) { setErr(e.message); } };
  return (
    <Modal title={`Salary · ${m.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Monthly salary</label><input type="number" min="0" className={`${inputCls} w-full`} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
        <div><label className={labelCls}>Currency</label><select className={`${inputCls} w-full`} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })}>{['INR', 'USD', 'EUR', 'GBP', 'AED', 'PLN'].map(c => <option key={c}>{c}</option>)}</select></div>
        <div><label className={labelCls}>Bank</label><input className={`${inputCls} w-full`} value={f.bank_name} onChange={e => setF({ ...f, bank_name: e.target.value })} /></div>
        <div><label className={labelCls}>Account name</label><input className={`${inputCls} w-full`} value={f.account_name} onChange={e => setF({ ...f, account_name: e.target.value })} /></div>
        <div><label className={labelCls}>Account number</label><input className={`${inputCls} w-full`} value={f.account_number} onChange={e => setF({ ...f, account_number: e.target.value })} /></div>
        <div><label className={labelCls}>IFSC / SWIFT</label><input className={`${inputCls} w-full`} value={f.ifsc} onChange={e => setF({ ...f, ifsc: e.target.value })} /></div>
      </div>
      {err && <p role="alert" className="text-xs font-semibold text-rose-700">{err}</p>}
      <div className="flex justify-end gap-2"><Btn onClick={onClose}>Cancel</Btn><Btn tone="brand" onClick={() => void save()}>Save</Btn></div>
    </Modal>
  );
};
