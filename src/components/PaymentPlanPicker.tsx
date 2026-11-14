import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  getCountryFeePackages, getStudentBillingAssignment, setStudentBillingFlow, money,
  type CountryFeePackage, type StudentBillingAssignment, type StudentBillingFlowMode,
} from '../lib/api/feePackages';

interface Props {
  studentId: string;
  country?: string;
  actorName: string;
  onChanged?: (message: string) => void;
  onSaved?: () => void;
}

// Where education admin decides how a student pays: the common (normal) flow or a country package.
// Until a plan is confirmed the student only sees the registration fee.
export const PaymentPlanPicker: React.FC<Props> = ({ studentId, country, actorName, onChanged, onSaved }) => {
  const [assignment, setAssignment] = useState<StudentBillingAssignment | null>(null);
  const [packages, setPackages] = useState<CountryFeePackage[]>([]);
  const [choice, setChoice] = useState<StudentBillingFlowMode>('pending');
  const [pkgId, setPkgId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    Promise.all([getStudentBillingAssignment(studentId), getCountryFeePackages()]).then(([a, p]) => {
      if (!live) return;
      setAssignment(a); setPackages(p.filter(x => x.is_active));
      setChoice(a?.flow_mode ?? 'pending'); setPkgId(a?.package_id || '');
    }).catch(e => live && setError(e.message));
    return () => { live = false; };
  }, [studentId]);

  const sorted = useMemo(() => {
    const c = (country || '').trim().toLowerCase();
    return [...packages].sort((a, b) => Number(b.country.trim().toLowerCase() === c) - Number(a.country.trim().toLowerCase() === c));
  }, [packages, country]);

  const current: StudentBillingFlowMode = assignment?.flow_mode ?? 'pending';
  const currentPkg = packages.find(p => p.id === assignment?.package_id);
  const selectedPkg = packages.find(p => p.id === pkgId);
  const changed = choice !== current || (choice === 'package' && pkgId !== (assignment?.package_id || ''));
  const canSave = choice === 'normal' || (choice === 'package' && !!pkgId);

  const save = async () => {
    setBusy(true); setError('');
    try {
      await setStudentBillingFlow(studentId, choice, choice === 'package' ? pkgId : null, actorName);
      setAssignment({ student_id: studentId, flow_mode: choice, package_id: choice === 'package' ? pkgId : undefined, assigned_by: actorName, assigned_at: new Date().toISOString() });
      onChanged?.(choice === 'package' ? `Payment plan confirmed: ${selectedPkg?.name}` : 'Payment plan confirmed: normal flow');
      onSaved?.();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const tile = (active: boolean) => `text-left rounded-xl border p-3.5 transition cursor-pointer ${active ? 'border-[#58051E] bg-[#58051E]/[0.04] ring-1 ring-[#58051E]/20' : 'border-slate-200 bg-white hover:border-slate-300'}`;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Payment plan</h3>
          <p className="text-xs text-slate-500 mt-0.5">Choose how this student pays. They only see the registration fee until you confirm.</p>
        </div>
        {current === 'pending'
          ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold ring-1 ring-inset ring-amber-600/20"><AlertCircle className="w-3.5 h-3.5" /> Not confirmed</span>
          : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold ring-1 ring-inset ring-emerald-600/15"><CheckCircle2 className="w-3.5 h-3.5" /> {current === 'normal' ? 'Normal flow' : currentPkg?.name || 'Country package'}</span>}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <button type="button" className={tile(choice === 'normal')} onClick={() => setChoice('normal')} aria-pressed={choice === 'normal'}>
          <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><Layers className="w-4 h-4 text-[#58051E]" /> Normal flow</span>
          <span className="block text-xs text-slate-500 mt-1">The common fees you set up under Fees: legalization, visa support, agency and any others, step by step.</span>
        </button>
        <button type="button" className={tile(choice === 'package')} onClick={() => { setChoice('package'); if (!pkgId && sorted[0]) setPkgId(sorted[0].id); }} aria-pressed={choice === 'package'} disabled={sorted.length === 0}>
          <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><Package className="w-4 h-4 text-[#58051E]" /> Country package</span>
          <span className="block text-xs text-slate-500 mt-1">{sorted.length ? 'One bundle for a country, with its own instalments and covered services.' : 'No active packages yet. Create one under Fees.'}</span>
        </button>
      </div>

      {choice === 'package' && sorted.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600" htmlFor="pkg-pick">Package</label>
          <select id="pkg-pick" value={pkgId} onChange={e => setPkgId(e.target.value)} className="w-full h-10 px-3">
            {sorted.map(p => <option key={p.id} value={p.id}>{p.name} · {p.country} · {money(p.total_amount, p.currency)}</option>)}
          </select>
          {selectedPkg && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-2">
              <p className="text-slate-600">{selectedPkg.description}</p>
              <ul className="divide-y divide-slate-200">
                {selectedPkg.installments.map(i => <li key={i.id} className="py-1.5 flex justify-between gap-3"><span className="font-medium text-slate-700">{i.title}</span><span className="font-semibold text-slate-900">{money(i.amount, selectedPkg.currency)}</span></li>)}
              </ul>
              {selectedPkg.country.trim().toLowerCase() !== (country || '').trim().toLowerCase() && country && <p className="text-amber-700 font-medium">This package is for {selectedPkg.country}; the student's country is {country}.</p>}
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">{assignment?.assigned_by && current !== 'pending' ? `Confirmed by ${assignment.assigned_by}${assignment.assigned_at ? ` on ${new Date(assignment.assigned_at).toLocaleDateString('en-GB')}` : ''}` : ' '}</p>
        <button type="button" onClick={save} disabled={busy || !changed || !canSave}
          className="h-10 px-5 rounded-xl bg-[#58051E] text-white text-sm font-semibold hover:bg-[#430316] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          {busy ? 'Saving…' : current === 'pending' ? 'Confirm plan' : 'Change plan'}
        </button>
      </div>
    </section>
  );
};
