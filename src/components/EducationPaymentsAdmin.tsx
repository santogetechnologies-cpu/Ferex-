import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Check, Plus, X, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { getStudents } from '../lib/api/students';
import { getApplications, isRealApplication } from '../lib/api/applications';
import { listEducationPayments, recordEducationPayment, reviewEducationPayment } from '../lib/api/educationBilling';
import { getCountryFeePackages, getBillingAssignments, getStudentFeeCountry, type CountryFeePackage, type StudentBillingAssignment } from '../lib/api/feePackages';
import { getStudentFeeOverrides, type StudentFeeOverride } from '../lib/api/payments';
import { studentFees, feeBalance, resolveStudentPackage, isDirectFee, directFeeMessage, educationStages, money, type EducationFee, type PaymentPart } from '../lib/educationBilling';
import type { Application, Payment, UserProfile } from '../lib/types';
import { PageHeader, EmptyState, Skeleton } from './Kit';
import { supabase } from '../lib/supabase';

type Filter = 'all' | 'unconfirmed' | 'verify' | 'due';
const METHODS: PaymentPart['method'][] = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Card'];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const feeOrder = (f: EducationFee) => (f.timing === 'before' ? f.stage - 0.5 : f.stage);

// Education admin's payment screen: pick a student, see where they stand, confirm how they pay, record what they paid.
export function EducationPaymentsAdmin() {
  const { user, profile } = useAuth();
  const { config, ready } = useFeeConfig();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Record<string, StudentBillingAssignment>>({});
  const [packages, setPackages] = useState<CountryFeePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [params] = useSearchParams();
  const [selected, setSelected] = useState(params.get('student') || '');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, a, p, pl, pk] = await Promise.all([getStudents(), getApplications(), listEducationPayments(), getBillingAssignments(), getCountryFeePackages()]);
      setStudents(s.filter(x => (x.role || 'student') === 'student')); setApps(a.filter(isRealApplication)); setPayments(p); setPlans(pl); setPackages(pk); setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => void load();
    ['ferex_payment_change', 'ferex_student_billing_flow_change', 'ferex_fee_config_change'].forEach(e => window.addEventListener(e, refresh));
    const ch = supabase.channel('edu-payments-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refresh).subscribe();
    return () => { ['ferex_payment_change', 'ferex_student_billing_flow_change', 'ferex_fee_config_change'].forEach(e => window.removeEventListener(e, refresh)); void supabase.removeChannel(ch); };
  }, [load]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000); };

  const countryOf = useCallback((s: UserProfile) => {
    const app = apps.find(a => a.student_id === s.id && (a as any).universities?.country);
    return (app as any)?.universities?.country || (s as any).target_country || (s as any).destination_country || '';
  }, [apps]);

  // One row per student: the plan, the registration fee and what is waiting for verification.
  const rows = useMemo(() => students.map(s => {
    const plan = plans[s.id];
    const flow = plan?.flow_mode ?? 'pending';
    const mine = payments.filter(p => p.student_id === s.id);
    const pkg = resolveStudentPackage(plan, packages, countryOf(s));
    const fees = studentFees(config, countryOf(s), { flow, pkg }).filter(f => !isDirectFee(f));
    const left = fees.reduce<Record<string, number>>((m, f) => { const r = feeBalance(f, mine).remaining; if (r > 0) m[f.currency] = (m[f.currency] || 0) + r; return m; }, {});
    const reg = fees.find(f => f.id === 'registration');
    const regPaid = reg ? feeBalance(reg, mine).remaining === 0 : true;
    const toVerify = mine.filter(p => p.status === 'Pending Verification').length;
    return { s, flow, pkg, country: countryOf(s), left, regPaid, toVerify, hasDue: Object.keys(left).length > 0 };
  }), [students, plans, payments, packages, config, countryOf]);

  const counts = useMemo(() => ({ all: rows.length, unconfirmed: rows.filter(r => r.flow === 'pending').length, verify: rows.filter(r => r.toVerify > 0).length, due: rows.filter(r => r.hasDue).length }), [rows]);
  const shown = rows.filter(r => {
    const q = query.trim().toLowerCase();
    if (q && !`${r.s.full_name} ${r.s.email} ${r.country}`.toLowerCase().includes(q)) return false;
    return filter === 'all' || (filter === 'unconfirmed' && r.flow === 'pending') || (filter === 'verify' && r.toVerify > 0) || (filter === 'due' && r.hasDue);
  }).sort((a, b) => b.toVerify - a.toVerify || a.s.full_name.localeCompare(b.s.full_name));
  const current = rows.find(r => r.s.id === selected);

  const chip = (id: Filter, label: string) => (
    <button key={id} type="button" onClick={() => setFilter(id)} className={`h-8 px-3 rounded-full text-xs font-semibold border cursor-pointer ${filter === id ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
      {label} <span className="opacity-70 tabular-nums">{counts[id]}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Pick a student to see where they stand, confirm how they pay and record what they have paid." />
      {toast && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">{toast}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        <aside className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 lg:sticky lg:top-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search students" aria-label="Search students" className="w-full h-10 pl-9 pr-3" />
          </div>
          <div className="flex flex-wrap gap-1.5">{chip('all', 'All')}{chip('unconfirmed', 'Plan not confirmed')}{chip('verify', 'To verify')}{chip('due', 'Balance due')}</div>
          <ul className="divide-y divide-slate-100 max-h-[62vh] overflow-y-auto -mx-1" aria-label="Students">
            {loading && [0, 1, 2, 3].map(i => <li key={i} className="p-3"><Skeleton className="h-10" /></li>)}
            {!loading && shown.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No students match.</li>}
            {shown.map(r => (
              <li key={r.s.id}>
                <button type="button" onClick={() => setSelected(r.s.id)} aria-current={selected === r.s.id} className={`w-full text-left px-3 py-3 rounded-xl cursor-pointer ${selected === r.s.id ? 'bg-[#58051E]/[0.06]' : 'hover:bg-slate-50'}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">{r.s.full_name || r.s.email}</span>
                    {r.toVerify > 0 && <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{r.toVerify} to verify</span>}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span className="truncate">{r.country || 'No country'}</span>
                    <span aria-hidden>·</span>
                    <span className={r.flow === 'pending' ? 'text-amber-700 font-medium' : ''}>{r.flow === 'pending' ? 'Plan not confirmed' : r.flow === 'normal' ? 'Normal flow' : r.pkg?.name || 'Package'}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {r.regPaid ? 'Registration paid' : 'Registration not paid'}{Object.entries(r.left).map(([c, v]) => ` · ${money(v, c)} left`).join('')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main>
          {!current ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white"><EmptyState title="Select a student" hint="Their payment plan, fees and payments appear here." /></div>
          ) : (
            <StudentPanel
              key={current.s.id}
              student={current.s} country={current.country} flow={current.flow} pkg={current.pkg}
              payments={payments.filter(p => p.student_id === current.s.id)}
              application={apps.find(a => a.student_id === current.s.id)}
              config={config} ready={ready}
              actorName={profile?.full_name || user?.email || 'Admin'}
              onChanged={flash} onReload={load}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function StudentPanel({ student, country, flow, pkg, payments, application, config, ready, actorName, onChanged, onReload }: {
  student: UserProfile; country: string; flow: 'pending' | 'normal' | 'package'; pkg: CountryFeePackage | null; payments: Payment[]; application?: Application;
  config: ReturnType<typeof useFeeConfig>['config']; ready: boolean; actorName: string; onChanged: (m: string) => void; onReload: () => Promise<void>;
}) {
  const [overrides, setOverrides] = useState<Record<string, StudentFeeOverride>>({});
  const [destination, setDestination] = useState(country);
  const [recording, setRecording] = useState<EducationFee | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    getStudentFeeOverrides(student.id).then(setOverrides).catch(() => {});
    getStudentFeeCountry(student.id).then(c => c && setDestination(c)).catch(() => {});
  }, [student.id, payments.length]);

  const all = ready ? studentFees(config, destination, { flow, pkg, overrides }).sort((a, b) => feeOrder(a) - feeOrder(b)) : [];
  const collected = all.filter(f => !isDirectFee(f));
  const direct = all.filter(isDirectFee);
  const toVerify = payments.filter(p => p.status === 'Pending Verification');
  const history = payments.filter(p => p.status !== 'Pending Verification');

  const review = async (p: Payment, approve: boolean) => {
    let notes = '';
    if (!approve) { notes = window.prompt('Why is this payment being rejected? The student will see this.') || ''; if (!notes.trim()) return; }
    setBusy(p.id); setErr('');
    try { await reviewEducationPayment(p.id, approve, notes); onChanged(approve ? 'Payment verified' : 'Payment rejected'); await onReload(); } catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{student.full_name || student.email}</h2>
          <p className="text-sm text-slate-500">{student.email}{destination ? ` · ${destination}` : ' · No destination yet'}{application?.university_name ? ` · ${application.university_name}` : ''}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3" aria-label="Payment plan">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{flow === 'pending' ? 'Payment plan not confirmed' : flow === 'normal' ? 'Normal flow' : pkg?.name || 'Country package'}</p>
          <p className="text-[11px] text-slate-500">{flow === 'pending' ? 'The student sees only the registration fee. Confirm a plan under Payment plans.' : `Discounts: ${Object.values(overrides).filter(o => (o.discount_percent ?? 0) > 0 || o.discount_amount > 0).length ? 'applied, already included in the amounts below' : 'none'}.`}</p>
        </div>
        <Link to={`/admin/payment-plans?student=${student.id}`} className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center">Manage plan and discounts</Link>
      </section>

      {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{err}</p>}

      {toVerify.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-3" aria-label="Waiting for verification">
          <h3 className="text-sm font-bold text-slate-900">Waiting for your verification</h3>
          <ul className="divide-y divide-amber-200/70">
            {toVerify.map(p => (
              <li key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm"><span className="font-semibold text-slate-900">{p.title}</span> · {money(Number(p.amount), p.currency || 'INR')}<div className="text-xs text-slate-600">{p.payment_method} · ref {p.utr_number} · {new Date(p.created_at).toLocaleDateString('en-GB')}</div></div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy === p.id} onClick={() => review(p, true)} className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">Verify</button>
                  <button type="button" disabled={busy === p.id} onClick={() => review(p, false)} className="h-9 px-4 rounded-xl border border-rose-200 bg-white text-rose-700 text-xs font-semibold hover:bg-rose-50 disabled:opacity-50 cursor-pointer">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-label="Fees">
        <div>
          <h3 className="text-base font-bold text-slate-900">{flow === 'pending' ? 'Registration fee' : 'Fees, in order'}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{flow === 'pending' ? 'Only this fee is shown to the student until you confirm a plan above.' : 'This is what the student sees. Fees they pay to the university or embassy are not collected here.'}</p>
        </div>
        {!destination && flow !== 'pending' && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> This student has no destination country yet, so country-specific amounts may not apply.</p>}
        {!ready ? <Skeleton className="h-24 rounded-2xl" /> : collected.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No fees are set up. Add them under Fees.</p> : (
          <ol className="space-y-3">
            {collected.map((fee, i) => {
              const b = feeBalance(fee, payments);
              const done = b.remaining === 0;
              const pct = fee.amount > 0 ? Math.min(100, Math.round((b.paid / fee.amount) * 100)) : 100;
              const state = done ? ['Paid in full', 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'] : b.pending > 0 && b.payable === 0 ? ['Awaiting verification', 'bg-amber-50 text-amber-800 ring-amber-600/20'] : b.paid > 0 || b.pending > 0 ? ['Partly paid', 'bg-sky-50 text-sky-700 ring-sky-600/15'] : ['Not paid', 'bg-slate-100 text-slate-600 ring-slate-500/15'];
              return (
                <li key={fee.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 flex gap-4">
                  <span className={`grid place-items-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{done ? <Check className="w-4 h-4" /> : i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{fee.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Due {fee.timing} {educationStages[fee.stage - 1]?.toLowerCase()}</p>
                      </div>
                      <div className="text-right">
                        {fee.original_amount !== undefined && <span className="block text-xs text-slate-400 line-through">{money(fee.original_amount, fee.currency)}</span>}
                        <span className="text-lg font-bold text-slate-900 tabular-nums">{money(fee.amount, fee.currency)}</span>
                                      {(fee.tax_rate_percent ?? 0) > 0 && <span className="block text-[11px] text-slate-500">incl. {fee.tax_rate_percent}% GST (CGST {(fee.tax_rate_percent ?? 0) / 2}% + SGST {(fee.tax_rate_percent ?? 0) / 2}%)</span>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${state[1]}`}>{state[0]}</span>
                      <span className="text-xs text-slate-500">Paid {money(b.paid, fee.currency)} · Left {money(b.remaining, fee.currency)}{b.pending > 0 ? ` · In review ${money(b.pending, fee.currency)}` : ''}</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} /></div>
                    {b.payable > 0 && <button type="button" onClick={() => setRecording(fee)} className="mt-4 h-9 px-4 rounded-xl bg-[#58051E] text-white text-xs font-semibold hover:bg-[#430316] inline-flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Record payment</button>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {direct.length > 0 && (
        <section className="space-y-3" aria-label="Paid directly">
          <h3 className="text-base font-bold text-slate-900">Paid directly by the student</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {direct.map(f => (
              <li key={f.id} className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 flex gap-3">
                <Building2 className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                <div><h4 className="text-sm font-bold text-slate-900">{f.title}</h4><p className="text-sm text-slate-700 mt-0.5">{directFeeMessage(f)}</p></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white">
        <button type="button" onClick={() => setShowHistory(v => !v)} aria-expanded={showHistory} className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer">
          <span className="text-sm font-bold text-slate-900">Payments received ({history.length})</span>
          <span className="text-xs font-semibold text-slate-500">{showHistory ? 'Hide' : 'Show'}</span>
        </button>
        {showHistory && (history.length === 0 ? <p className="px-5 pb-5 text-sm text-slate-500">Nothing recorded yet.</p> : (
          <ul className="divide-y divide-slate-100 px-5 pb-2">
            {history.map(p => (
              <li key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div><span className="font-semibold text-slate-900">{p.title}</span><div className="text-xs text-slate-500">{p.payment_method} · ref {p.utr_number} · {new Date(p.created_at).toLocaleDateString('en-GB')}</div></div>
                <div className="text-right"><div className="font-semibold tabular-nums">{money(Number(p.amount), p.currency || 'INR')}</div><div className={`text-xs font-medium ${['Paid', 'Verified'].includes(p.status) ? 'text-emerald-700' : 'text-rose-700'}`}>{p.status}</div></div>
              </li>
            ))}
          </ul>
        ))}
      </section>

      {recording && <RecordModal student={student} fee={recording} payments={payments} application={application} onClose={() => setRecording(null)} onDone={async () => { setRecording(null); onChanged('Payment recorded'); await onReload(); }} />}
    </div>
  );
}

function RecordModal({ student, fee, payments, application, onClose, onDone }: { student: UserProfile; fee: EducationFee; payments: Payment[]; application?: Application; onClose: () => void; onDone: () => Promise<void> }) {
  const max = feeBalance(fee, payments).payable;
  const [parts, setParts] = useState<PaymentPart[]>([{ method: 'Bank Transfer', amount: max, reference: '', date: today() }]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const batchId = useMemo(() => crypto.randomUUID(), []);
  const total = Math.round(parts.reduce((s, p) => s + (Number(p.amount) || 0) * 100, 0)) / 100;
  const set = (i: number, patch: Partial<PaymentPart>) => setParts(ps => ps.map((p, j) => j === i ? { ...p, ...patch } : p));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      if (total > max) throw new Error(`The most that can be recorded is ${money(max, fee.currency)}.`);
      await recordEducationPayment({ studentId: student.id, studentName: student.full_name || student.email, fee, total, parts: parts.map(p => ({ ...p, amount: Number(p.amount) })), notes, batchId, applicationId: application?.id });
      await onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40" role="dialog" aria-label={`Record payment for ${fee.title}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-white rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="text-base font-bold text-slate-900">Record payment</h3><p className="text-sm text-slate-500">{student.full_name} · {fee.title} · up to {money(max, fee.currency)}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {parts.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-3">
              <label className="text-xs font-semibold text-slate-600">Method
                <select value={p.method} onChange={e => set(i, { method: e.target.value as PaymentPart['method'] })} className="mt-1 w-full h-10 px-3">{METHODS.map(m => <option key={m} value={m}>{m === 'Bank Transfer' ? 'Direct bank transfer' : m}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-600">Amount ({fee.currency})
                <input type="number" min="0" step="0.01" value={p.amount} onChange={e => set(i, { amount: e.target.value as unknown as number })} className="mt-1 w-full h-10 px-3" /></label>
              <label className="text-xs font-semibold text-slate-600">Reference or receipt number
                <input value={p.reference} onChange={e => set(i, { reference: e.target.value })} className="mt-1 w-full h-10 px-3" /></label>
              <label className="text-xs font-semibold text-slate-600">Date received
                <input type="date" value={p.date} max={today()} onChange={e => set(i, { date: e.target.value })} className="mt-1 w-full h-10 px-3" /></label>
              {parts.length > 1 && <button type="button" onClick={() => setParts(ps => ps.filter((_, j) => j !== i))} className="col-span-2 text-xs font-semibold text-rose-700 text-left cursor-pointer">Remove this entry</button>}
            </div>
          ))}
          <button type="button" onClick={() => setParts(ps => [...ps, { method: 'Cash', amount: 0, reference: '', date: today() }])} className="text-xs font-semibold text-[#58051E] cursor-pointer">+ Add another entry (split payment)</button>
        </div>
        <label className="block text-xs font-semibold text-slate-600">Note (optional)
          <input value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full h-10 px-3" /></label>
        <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-bold tabular-nums">{money(total, fee.currency)}</span></div>
        {err && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="h-10 px-5 rounded-xl bg-[#58051E] text-white text-sm font-semibold hover:bg-[#430316] disabled:opacity-50 cursor-pointer">{busy ? 'Saving…' : 'Save payment'}</button>
        </div>
      </div>
    </div>
  );
}

