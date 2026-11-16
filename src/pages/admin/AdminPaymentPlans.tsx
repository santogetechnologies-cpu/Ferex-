import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Layers, Package, AlertCircle, CheckCircle2, BadgePercent, Trash2, Wallet, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { supabase } from '../../lib/supabase';
import { getStudents } from '../../lib/api/students';
import { getApplications, isRealApplication } from '../../lib/api/applications';
import { listEducationPayments } from '../../lib/api/educationBilling';
import { getCountryFeePackages, getBillingAssignments, getStudentFeeCountry, type CountryFeePackage, type StudentBillingAssignment } from '../../lib/api/feePackages';
import { saveStudentFeeOverride, deleteStudentFeeOverride, type StudentFeeOverride } from '../../lib/api/payments';
import { studentFees, feeBalance, resolveStudentPackage, isDirectFee, money } from '../../lib/educationBilling';
import type { Payment, UserProfile, Application } from '../../lib/types';
import { PaymentPlanPicker } from '../../components/PaymentPlanPicker';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { ALL_TIME, inRange, type DateRange } from '../../lib/dateRange';
import { PageHeader, EmptyState } from '../../components/Kit';
import { BlockCap } from '../../components/CapLoader';

type PlanFilter = 'all' | 'pending' | 'normal' | 'package';
const SETTLED = ['Paid', 'Verified', 'Partial'];
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const field = 'h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20';

/**
 * Where education admin decides how each student pays and gives discounts. Payments (the other page) is only for
 * recording what students have paid. Both read the same plan and discounts, and so does the student's own screen.
 */
export const AdminPaymentPlans: React.FC = () => {
  const { profile } = useAuth();
  const { config, ready } = useFeeConfig();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('student') || '';

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Record<string, StudentBillingAssignment>>({});
  const [packages, setPackages] = useState<CountryFeePackage[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Record<string, StudentFeeOverride>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [range, setRange] = useState<DateRange>(ALL_TIME);

  const load = useCallback(async () => {
    try {
      const [s, a, p, pl, pk, ov] = await Promise.all([
        getStudents(), getApplications(), listEducationPayments(), getBillingAssignments(), getCountryFeePackages(),
        supabase.from('education_student_fee_overrides').select('*'),
      ]);
      setStudents(s.filter(x => (x.role || 'student') === 'student')); setApps(a.filter(isRealApplication)); setPayments(p); setPlans(pl); setPackages(pk);
      const map: Record<string, Record<string, StudentFeeOverride>> = {};
      for (const row of (ov.data || []) as StudentFeeOverride[]) (map[row.student_id] ||= {})[row.fee_id] = row;
      setOverrides(map); setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeTable('payments', () => { void load(); });
  useRealtimeTable('education_student_fee_overrides', () => { void load(); });
  useRealtimeTable('education_student_preferences', () => { void load(); });
  useEffect(() => { const h = () => { void load(); }; window.addEventListener('ferex_student_billing_flow_change', h); window.addEventListener('ferex_payment_change', h); return () => { window.removeEventListener('ferex_student_billing_flow_change', h); window.removeEventListener('ferex_payment_change', h); }; }, [load]);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 4000); };
  const countryOf = useCallback((s: UserProfile) => {
    const app: any = apps.find(a => a.student_id === s.id && (a as any).universities?.country);
    return app?.universities?.country || (s as any).target_country || '';
  }, [apps]);

  const rows = useMemo(() => {
    if (!ready) return [];
    return students.map(s => {
      const plan = plans[s.id]; const flow = plan?.flow_mode ?? 'pending';
      const country = countryOf(s);
      const pkg = resolveStudentPackage(plan, packages, country);
      const mine = payments.filter(p => p.student_id === s.id);
      const fees = studentFees(config, country, { flow, pkg, overrides: overrides[s.id] }).filter(f => !isDirectFee(f));
      let total = 0, left = 0, discounted = 0;
      fees.forEach(f => { if (f.currency !== 'INR') return; total += f.amount; left += feeBalance(f, mine).remaining; if (f.original_amount !== undefined) discounted += f.original_amount - f.amount; });
      const paid = mine.filter(p => SETTLED.includes(p.status) && (p.currency || 'INR') === 'INR').reduce((x, p) => x + Number(p.status === 'Partial' ? p.partial_amount ?? 0 : p.amount), 0);
      return { s, flow, pkg, country, total, left, paid, discounted, since: plan?.assigned_at || '' };
    });
  }, [students, plans, packages, payments, overrides, config, ready, countryOf]);

  const counts = useMemo(() => ({ all: rows.length, pending: rows.filter(r => r.flow === 'pending').length, normal: rows.filter(r => r.flow === 'normal').length, package: rows.filter(r => r.flow === 'package').length }), [rows]);
  const shown = rows.filter(r => {
    const q = query.trim().toLowerCase();
    // The date filter applies to when the plan was confirmed; students with no plan yet are listed under "All time" only.
    return (!q || `${r.s.full_name} ${r.s.email} ${r.country}`.toLowerCase().includes(q)) && (planFilter === 'all' || r.flow === planFilter) && inRange(r.since, range);
  });
  const selected = rows.find(r => r.s.id === selectedId);
  const select = (id: string) => setParams(id ? { student: id } : {});
  const actorName = profile?.full_name || profile?.email || 'Education admin';

  const planLabel = (r: typeof rows[number]) => r.flow === 'pending' ? 'Not confirmed' : r.flow === 'normal' ? 'Normal flow' : r.pkg?.name || 'Country package';
  const chip = (active: boolean) => `h-8 px-3 rounded-full text-xs font-bold border cursor-pointer whitespace-nowrap ${active ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#58051E]/40'}`;

  return (
    <div className="space-y-6 text-left">
      <PageHeader eyebrow="Ferex Education" title="Payment plans" subtitle="Choose how each student pays and give discounts. Record what they have paid under Payments." />
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">{notice}</p>}

      {loading || !ready ? <BlockCap /> : (
        <div className="grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-6 items-start">
          <aside className={`space-y-3 ${selected ? 'hidden lg:block' : ''}`}>
            <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search students" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search student or country" className="w-full h-10 pl-9 pr-3" /></div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Plan filter">
              {([['all', 'All'], ['pending', 'Not confirmed'], ['normal', 'Normal'], ['package', 'Package']] as const).map(([k, t]) => <button key={k} type="button" aria-pressed={planFilter === k} className={chip(planFilter === k)} onClick={() => setPlanFilter(k)}>{t} · {counts[k]}</button>)}
            </div>
            <DateRangeFilter value={range} onChange={setRange} label="Plan set" />
            {shown.length === 0 ? <EmptyState icon={Layers} title="No students match" hint="Clear a filter to see more." /> : (
              <ul className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                {shown.map(r => (
                  <li key={r.s.id}>
                    <button type="button" onClick={() => select(r.s.id)} aria-current={r.s.id === selectedId} className={`w-full text-left p-3.5 cursor-pointer hover:bg-slate-50 ${r.s.id === selectedId ? 'bg-[#58051E]/[0.04]' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{r.s.full_name || r.s.email}</p><p className="text-[11px] text-slate-500 truncate">{r.country || 'No destination'}</p></div>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${r.flow === 'pending' ? 'bg-amber-50 text-amber-800 ring-amber-600/20' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'}`}>{r.flow === 'pending' ? <AlertCircle className="w-3 h-3" /> : r.flow === 'package' ? <Package className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}{planLabel(r)}</span>
                      </div>
                      {r.flow !== 'pending' && <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums">Total {money(r.total, 'INR')}{r.discounted > 0 ? ` (−${money(r.discounted, 'INR')} discount)` : ''} · Left {money(r.left, 'INR')}{r.since ? ` · set ${date(r.since)}` : ''}</p>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <main className="min-w-0">
            {!selected ? (
              <div className="hidden lg:block"><EmptyState icon={Layers} title="Choose a student" hint="Pick someone on the left to set their plan or give a discount." /></div>
            ) : (
              <PlanWorkspace
                key={selected.s.id} row={selected} payments={payments.filter(p => p.student_id === selected.s.id)} overrides={overrides[selected.s.id] || {}}
                config={config} actorName={actorName} onBack={() => select('')} onChanged={m => { flash(m); void load(); }}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
};

function PlanWorkspace({ row, payments, overrides, config, actorName, onBack, onChanged }: {
  row: { s: UserProfile; flow: 'pending' | 'normal' | 'package'; pkg: CountryFeePackage | null; country: string };
  payments: Payment[]; overrides: Record<string, StudentFeeOverride>; config: ReturnType<typeof useFeeConfig>['config']; actorName: string; onBack: () => void; onChanged: (m: string) => void;
}) {
  const { s, flow, pkg } = row;
  const [country, setCountry] = useState(row.country);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [wholePct, setWholePct] = useState('');
  const [wholeReason, setWholeReason] = useState('');
  const [feePct, setFeePct] = useState<Record<string, string>>({});
  useEffect(() => { getStudentFeeCountry(s.id).then(c => c && setCountry(c)).catch(() => {}); }, [s.id]);

  // Base fees (before any discount) and what the student actually pays now.
  const base = useMemo(() => studentFees(config, country, { flow, pkg }).filter(f => !isDirectFee(f)), [config, country, flow, pkg]);
  const current = useMemo(() => studentFees(config, country, { flow, pkg, overrides }).filter(f => !isDirectFee(f)), [config, country, flow, pkg, overrides]);
  const totals = current.reduce((a, f) => { const b = feeBalance(f, payments); return { total: a.total + f.amount, paid: a.paid + b.paid, left: a.left + b.remaining }; }, { total: 0, paid: 0, left: 0 });
  const hasDiscount = Object.values(overrides).some(o => (o.discount_percent ?? 0) > 0 || o.discount_amount > 0);

  const run = async (fn: () => Promise<void>, ok: string) => { setBusy(true); setErr(''); try { await fn(); onChanged(ok); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const pct = (v: string) => Number(v);
  const valid = (v: string) => pct(v) > 0 && pct(v) <= 100;
  const apply = (f: typeof base[number], p: number, reason: string) => {
    const after = Math.round(f.amount * (100 - p)) / 100;
    return saveStudentFeeOverride({ student_id: s.id, fee_id: f.id, currency: f.currency, custom_amount: after, discount_amount: Math.round((f.amount - after) * 100) / 100, discount_percent: p, discount_reason: reason.trim() || 'Admin discount' }).then(() => undefined);
  };

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="lg:hidden text-xs font-bold text-slate-500 inline-flex items-center gap-1 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" />All students</button>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><h2 className="text-lg font-bold text-slate-900 truncate">{s.full_name || s.email}</h2><p className="text-sm text-slate-500 truncate">{s.email}{country ? ` · ${country}` : ' · No destination yet'}</p></div>
        <Link to={`/admin/payment-control?student=${s.id}`} className="h-9 px-4 rounded-xl bg-[#58051E] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#430316]"><Wallet className="w-3.5 h-3.5" />Record payments</Link>
      </section>

      <PaymentPlanPicker studentId={s.id} country={country} actorName={actorName} onChanged={onChanged} onSaved={() => window.dispatchEvent(new Event('ferex_student_billing_flow_change'))} />
      {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{err}</p>}

      {flow === 'pending' ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">Confirm a plan above to see this student's fees and give discounts. Until then they see only the registration fee.</p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4" aria-label="Discounts">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><BadgePercent className="w-4 h-4 text-[#58051E]" />Discounts</h3><p className="text-xs text-slate-500 mt-0.5">A discount lowers what the student pays. They see the lower amount, and Payments uses it too.</p></div>
              {hasDiscount && <button type="button" disabled={busy} onClick={() => run(async () => { for (const id of Object.keys(overrides)) await deleteStudentFeeOverride(s.id, id); }, 'All discounts removed.')} className="h-8 px-3 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 cursor-pointer disabled:opacity-50">Remove all discounts</button>}
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
              <p className="text-xs font-bold text-slate-700">{flow === 'package' ? `Discount the whole package${pkg ? ` (${pkg.name})` : ''}` : 'Discount every fee'}</p>
              <div className="grid sm:grid-cols-[7rem_1fr_auto] gap-2">
                <input aria-label="Discount percent for all fees" type="number" min="0" max="100" step="0.01" placeholder="Discount %" className={field} value={wholePct} onChange={e => setWholePct(e.target.value)} />
                <input aria-label="Reason for the discount" placeholder="Reason (optional)" className={field} value={wholeReason} onChange={e => setWholeReason(e.target.value)} />
                <button type="button" disabled={busy || !valid(wholePct)} onClick={() => run(async () => { for (const f of base) await apply(f, pct(wholePct), wholeReason); setWholePct(''); setWholeReason(''); }, `${wholePct}% discount applied to every fee.`)} className="h-9 px-4 rounded-xl bg-[#58051E] text-white text-xs font-bold hover:bg-[#430316] disabled:opacity-40 cursor-pointer">Apply to all</button>
              </div>
            </div>

            <ul className="divide-y divide-slate-100">
              {base.map(f => {
                const now = current.find(c => c.id === f.id)!; const o = overrides[f.id];
                const has = (o?.discount_percent ?? 0) > 0 || (o?.discount_amount ?? 0) > 0;
                return (
                  <li key={f.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{f.title}</p>
                      <p className="text-xs tabular-nums text-slate-500">{has ? <><span className="line-through">{money(f.amount, f.currency)}</span> → <b className="text-emerald-700">{money(now.amount, f.currency)}</b>{o?.discount_percent ? ` (${o.discount_percent}% off)` : ''}{o?.discount_reason ? ` · ${o.discount_reason}` : ''}</> : money(f.amount, f.currency)}</p></div>
                    <div className="flex items-center gap-2">
                      <input aria-label={`Discount percent for ${f.title}`} type="number" min="0" max="100" step="0.01" placeholder="%" className={`${field} w-20`} value={feePct[f.id] || ''} onChange={e => setFeePct({ ...feePct, [f.id]: e.target.value })} />
                      <button type="button" disabled={busy || !valid(feePct[f.id] || '')} onClick={() => run(async () => { await apply(f, pct(feePct[f.id]), o?.discount_reason && o.discount_reason !== 'Admin discount' ? o.discount_reason : ''); setFeePct({ ...feePct, [f.id]: '' }); }, `${feePct[f.id]}% discount applied to ${f.title}.`)} className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer">Apply</button>
                      {has && <button type="button" aria-label={`Remove discount on ${f.title}`} disabled={busy} onClick={() => run(() => deleteStudentFeeOverride(s.id, f.id), `Discount removed from ${f.title}.`)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-slate-500">Discounts on a fee that is already part-paid only change what is left to pay; money already received is not changed.</p>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3" aria-label="What the student pays">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">What the student pays</h3><span className="text-xs font-semibold text-slate-600 tabular-nums">Total {money(totals.total, 'INR')} · Paid {money(totals.paid, 'INR')} · Left {money(totals.left, 'INR')}</span></div>
            <ul className="divide-y divide-slate-100">
              {current.map(f => { const b = feeBalance(f, payments); const done = b.remaining === 0; return (
                <li key={f.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800">{f.title}</span>
                  <span className="flex items-center gap-3"><span className="text-xs text-slate-500 tabular-nums">{money(f.amount, f.currency)}</span><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${done ? 'bg-emerald-50 text-emerald-700' : b.paid > 0 ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{done ? 'Paid' : b.paid > 0 ? `Part paid · ${money(b.remaining, f.currency)} left` : 'Not paid'}</span></span>
                </li>
              ); })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

export default AdminPaymentPlans;
