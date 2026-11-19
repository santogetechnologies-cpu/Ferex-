import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, Search, Wallet, Clock, AlertCircle, Receipt, Percent, BadgePercent } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { supabase } from '../../lib/supabase';
import { getStudents } from '../../lib/api/students';
import { getApplications, isRealApplication } from '../../lib/api/applications';
import { listEducationPayments } from '../../lib/api/educationBilling';
import { getCountryFeePackages, getBillingAssignments, type CountryFeePackage, type StudentBillingAssignment } from '../../lib/api/feePackages';
import { studentFees, feeBalance, resolveStudentPackage, isDirectFee, money } from '../../lib/educationBilling';
import { gstBreakdown } from '../../lib/gst';
import type { Payment, UserProfile, Application } from '../../lib/types';
import { PageHeader, EmptyState } from '../../components/Kit';
import { BlockCap } from '../../components/CapLoader';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { ALL_TIME, inRange, type DateRange } from '../../lib/dateRange';
import { DivisionExpenses } from '../../components/finance/DivisionExpenses';

type Tab = 'overview' | 'collections' | 'receivables' | 'documents' | 'expenses';
// The address uses the Finance names (billing, invoices, payments, expenses); the old addresses still open the same pages.
const TABS: { id: Tab; slug: string; label: string }[] = [
  { id: 'overview', slug: '', label: 'Overview' }, { id: 'receivables', slug: 'billing', label: 'Billing' }, { id: 'documents', slug: 'invoices', label: 'Invoices' },
  { id: 'collections', slug: 'payments', label: 'Payments' }, { id: 'expenses', slug: 'expenses', label: 'Expenses' },
];
const SETTLED = ['Paid', 'Verified'];
const toInr = (p: Payment) => Number(p.amount || 0) * (p.currency && p.currency !== 'INR' ? Number(p.exchange_rate_to_inr || 0) || 0 : 1);
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const monthKey = (iso: string) => iso.slice(0, 7);

function exportCsv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([[header, ...rows].map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

interface DocRow { id: string; kind: 'Invoice' | 'Receipt'; no: string; student_id: string; description: string; amount: number; currency: string; tax: number; at: string }

export const AdminFinance: React.FC = () => {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const tab: Tab = (TABS.find(t => t.slug === tabParam || t.id === tabParam)?.id) || 'overview';
  const { config, ready } = useFeeConfig();
  const { profile } = useAuth();

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Record<string, StudentBillingAssignment>>({});
  const [packages, setPackages] = useState<CountryFeePackage[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [range, setRange] = useState<DateRange>(ALL_TIME);

  const load = useCallback(async () => {
    try {
      const [s, a, p, pl, pk, inv, rec] = await Promise.all([
        getStudents(), getApplications(), listEducationPayments(), getBillingAssignments(), getCountryFeePackages(),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(2000),
        supabase.from('receipts').select('*').order('created_at', { ascending: false }).limit(2000),
      ]);
      setStudents(s.filter(x => (x.role || 'student') === 'student')); setApps(a.filter(isRealApplication)); setPayments(p); setPlans(pl); setPackages(pk);
      setDocs([
        ...((inv.data || []) as any[]).map(i => ({ id: i.id, kind: 'Invoice' as const, no: i.invoice_no, student_id: i.student_id, description: i.description, amount: Number(i.amount), currency: i.currency || 'INR', tax: Number(i.tax_rate_percent || 0), at: i.issued_at || i.created_at })),
        ...((rec.data || []) as any[]).map(r => ({ id: r.id, kind: 'Receipt' as const, no: r.receipt_no, student_id: r.student_id, description: r.description, amount: Number(r.amount), currency: r.currency || 'INR', tax: Number(r.tax_rate_percent || 0), at: r.issued_at || r.created_at })),
      ].sort((x, y) => y.at.localeCompare(x.at)));
      setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeTable('payments', () => { void load(); });
  useRealtimeTable('invoices', () => { void load(); });
  useRealtimeTable('receipts', () => { void load(); });

  const nameOf = useMemo(() => { const m = new Map(students.map(s => [s.id, s.full_name || s.email])); return (id: string) => m.get(id) || 'Student'; }, [students]);
  const countryOf = useCallback((s: UserProfile) => {
    const app: any = apps.find(a => a.student_id === s.id && (a as any).universities?.country);
    return app?.universities?.country || (s as any).target_country || '';
  }, [apps]);

  const settledAll = useMemo(() => payments.filter(p => SETTLED.includes(p.status)), [payments]);
  // Every figure and list on this page follows the date filter above it (payments by paid date, receivables by the date the plan started).
  const settled = useMemo(() => settledAll.filter(p => inRange(p.paid_at || p.created_at, range)), [settledAll, range]);
  const thisMonth = monthKey(new Date().toISOString());
  const collectedAll = settledAll.reduce((s, p) => s + toInr(p), 0);
  const collectedMonth = settledAll.filter(p => monthKey(p.paid_at || p.created_at) === thisMonth).reduce((s, p) => s + toInr(p), 0);
  const collectedRange = settled.reduce((s, p) => s + toInr(p), 0);
  const waiting = payments.filter(p => p.status === 'Pending Verification');
  const gst = settled.reduce((s, p) => s + (Number(p.tax_rate_percent) > 0 ? gstBreakdown(toInr(p), Number(p.tax_rate_percent)).tax : 0), 0);
  const discounts = payments.filter(p => inRange(p.paid_at || p.created_at, range)).reduce((s, p) => s + Number(p.discount_amount || 0), 0);

  // Who still owes what, from each student's confirmed plan.
  const receivables = useMemo(() => {
    if (!ready) return [];
    return students.map(s => {
      const plan = plans[s.id]; const flow = plan?.flow_mode ?? 'pending';
      const mine = payments.filter(p => p.student_id === s.id);
      const country = countryOf(s);
      const pkg = resolveStudentPackage(plan, packages, country);
      const fees = studentFees(config, country, { flow, pkg }).filter(f => !isDirectFee(f));
      const left: Record<string, number> = {}; let leftInr = 0;
      fees.forEach(f => { const r = feeBalance(f, mine).remaining; if (r > 0) { left[f.currency] = (left[f.currency] || 0) + r; leftInr += f.currency === 'INR' ? r : 0; } });
      return { s, flow, pkg, country, left, leftInr, since: plan?.assigned_at || (s as any).created_at || '', paid: mine.filter(p => SETTLED.includes(p.status)).reduce((x, p) => x + toInr(p), 0) };
    }).filter(r => Object.keys(r.left).length > 0 && inRange(r.since, range)).sort((a, b) => b.leftInr - a.leftInr);
  }, [students, plans, payments, packages, config, ready, countryOf, range]);
  const outstandingInr = receivables.reduce((s, r) => s + r.leftInr, 0);

  const trend = useMemo(() => {
    const out: { key: string; label: string; v: number }[] = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); const key = d.toISOString().slice(0, 7); out.push({ key, label: d.toLocaleDateString('en-GB', { month: 'short' }), v: settled.filter(p => monthKey(p.paid_at || p.created_at) === key).reduce((s, p) => s + toInr(p), 0) }); }
    return out;
  }, [settled]);
  const byMethod = useMemo(() => { const m = new Map<string, number>(); settled.forEach(p => m.set(p.payment_method || 'Other', (m.get(p.payment_method || 'Other') || 0) + toInr(p))); return Array.from(m.entries()).sort((a, b) => b[1] - a[1]); }, [settled]);
  const byFee = useMemo(() => { const m = new Map<string, number>(); settled.forEach(p => m.set(p.title || 'Payment', (m.get(p.title || 'Payment') || 0) + toInr(p))); return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6); }, [settled]);

  const ledger = payments.filter(p => {
    const q = query.trim().toLowerCase();
    return (!q || `${nameOf(p.student_id)} ${p.title} ${p.utr_number || ''} ${p.ref_no || ''}`.toLowerCase().includes(q))
      && (status === 'all' || p.status === status) && (method === 'all' || p.payment_method === method)
      && inRange(p.paid_at || p.created_at, range);
  });
  const shownDocs = docs.filter(d => { const q = query.trim().toLowerCase(); return (!q || `${nameOf(d.student_id)} ${d.no} ${d.description}`.toLowerCase().includes(q)) && inRange(d.at, range); });

  const card = (icon: React.ReactNode, label: string, value: string, hint: string, tone = 'text-slate-900') => (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <div className="flex items-center justify-between text-slate-500"><span className="text-xs font-semibold">{label}</span>{icon}</div>
      <p className={`mt-2 text-2xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
    </div>
  );
  const maxTrend = Math.max(1, ...trend.map(t => t.v));
  const maxMethod = Math.max(1, ...byMethod.map(m => m[1]));
  const sel = 'h-10 px-3 text-sm';

  return (
    <div className="space-y-6 text-left">
      {tab !== 'expenses' && <PageHeader eyebrow="Ferex Education" title={TABS.find(t => t.id === tab)?.label === 'Overview' ? 'Finance' : `Finance · ${TABS.find(t => t.id === tab)?.label}`} subtitle={`Money in, money owed, and every invoice and receipt${profile?.full_name ? '' : ''}.`} />}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(t => <button key={t.id} type="button" onClick={() => navigate(t.slug ? `/admin/finance/${t.slug}` : '/admin/finance')} className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px cursor-pointer ${tab === t.id ? 'border-[#5A0122] text-[#5A0122]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.label}</button>)}
      </div>

      {tab === 'expenses' && <DivisionExpenses division="education" eyebrow="Ferex Education" />}
      {tab !== 'expenses' && <DateRangeFilter value={range} onChange={setRange} label={tab === 'receivables' ? 'Plan started' : tab === 'documents' ? 'Issued' : 'Paid'} />}

      {tab === 'expenses' ? null : loading ? <BlockCap /> : tab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {range.key === 'all' ? card(<Wallet className="w-4 h-4" />, 'Collected this month', inr(collectedMonth), `${inr(collectedAll)} all time`, 'text-emerald-700') : card(<Wallet className="w-4 h-4" />, 'Collected in this period', inr(collectedRange), `${inr(collectedAll)} all time`, 'text-emerald-700')}
            {card(<Clock className="w-4 h-4" />, 'Waiting for verification', String(waiting.length), `${inr(waiting.reduce((s, p) => s + toInr(p), 0))} to confirm`, waiting.length ? 'text-amber-700' : 'text-slate-900')}
            {card(<AlertCircle className="w-4 h-4" />, 'Still to collect', inr(outstandingInr), `${receivables.length} students (₹ fees)`, 'text-rose-700')}
            {card(<Percent className="w-4 h-4" />, 'GST in collections', inr(gst), 'CGST + SGST included in amounts')}
            {card(<BadgePercent className="w-4 h-4" />, 'Discounts given', inr(discounts), 'Across all payments')}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900">Collected, last 6 months</h3>
              <div className="mt-4 flex items-end gap-3 h-40">
                {trend.map(t => (
                  <div key={t.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-semibold text-slate-500 tabular-nums">{t.v ? inr(t.v) : ''}</span>
                    <div className="w-full rounded-t-lg bg-[#5A0122]/80" style={{ height: `${Math.max(4, (t.v / maxTrend) * 100)}%`, opacity: t.v ? 1 : 0.2 }} />
                    <span className="text-[11px] font-semibold text-slate-600">{t.label}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">How students pay</h3>
              {byMethod.length === 0 ? <p className="text-sm text-slate-500">No settled payments yet.</p> : byMethod.map(([m, v]) => (
                <div key={m}><div className="flex justify-between text-xs font-semibold text-slate-700"><span>{m}</span><span className="tabular-nums">{inr(v)}</span></div><div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(v / maxMethod) * 100}%` }} /></div></div>
              ))}
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Waiting for verification</h3><Link to="/admin/payment-control" className="text-xs font-bold text-[#5A0122]">Open Payments →</Link></div>
              {waiting.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nothing is waiting.</p> : <ul className="mt-3 divide-y divide-slate-100">{waiting.slice(0, 6).map(p => <li key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm"><span className="min-w-0"><b className="text-slate-900">{nameOf(p.student_id)}</b><span className="block text-xs text-slate-500 truncate">{p.title} · {p.payment_method} · {date(p.created_at)}</span></span><span className="font-semibold tabular-nums">{money(Number(p.amount), p.currency || 'INR')}</span></li>)}</ul>}
            </section>
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900">Biggest fees collected</h3>
              {byFee.length === 0 ? <p className="mt-3 text-sm text-slate-500">No settled payments yet.</p> : <ul className="mt-3 divide-y divide-slate-100">{byFee.map(([t, v]) => <li key={t} className="py-2.5 flex justify-between text-sm"><span className="text-slate-700 truncate pr-3">{t}</span><span className="font-semibold tabular-nums">{inr(v)}</span></li>)}</ul>}
            </section>
          </div>
        </div>
      ) : tab === 'collections' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[12rem]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search student, fee or reference" aria-label="Search" className="w-full h-10 pl-9 pr-3" /></div>
            <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)} className={sel}><option value="all">All statuses</option>{['Paid', 'Verified', 'Pending Verification', 'Rejected', 'Failed'].map(x => <option key={x}>{x}</option>)}</select>
            <select aria-label="Method" value={method} onChange={e => setMethod(e.target.value)} className={sel}><option value="all">All methods</option>{Array.from(new Set(payments.map(p => p.payment_method).filter(Boolean))).map(x => <option key={x}>{x}</option>)}</select>
            <button type="button" onClick={() => exportCsv('collections', ['Date', 'Student', 'Fee', 'Method', 'Reference', 'Amount', 'Currency', 'Status'], ledger.map(p => [date(p.paid_at || p.created_at), nameOf(p.student_id), p.title || '', p.payment_method || '', p.utr_number || p.ref_no || '', Number(p.amount), p.currency || 'INR', p.status]))} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Export CSV</button>
          </div>
          {ledger.length === 0 ? <EmptyState icon={Wallet} title="No payments match" hint="Clear a filter to see more." /> : (
            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="p-3 text-left w-[14%]">Date</th><th className="p-3 text-left">Student · Fee</th><th className="p-3 text-left w-[18%] hidden md:table-cell">Method · Reference</th><th className="p-3 text-right w-[16%]">Amount</th><th className="p-3 text-right w-[14%]">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.slice(0, 300).map(p => (
                    <tr key={p.id} className="align-top">
                      <td className="p-3 text-xs text-slate-500">{date(p.paid_at || p.created_at)}</td>
                      <td className="p-3 min-w-0"><Link to={`/admin/payment-control?student=${p.student_id}`} className="font-bold text-slate-900 hover:text-[#5A0122] truncate block">{nameOf(p.student_id)}</Link><span className="block text-xs text-slate-500 truncate">{p.title}</span></td>
                      <td className="p-3 hidden md:table-cell min-w-0"><span className="block truncate">{p.payment_method}</span><span className="block text-xs text-slate-500 truncate">{p.utr_number || p.ref_no}</span></td>
                      <td className="p-3 text-right font-semibold tabular-nums">{money(Number(p.amount), p.currency || 'INR')}</td>
                      <td className="p-3 text-right"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${SETTLED.includes(p.status) ? 'bg-emerald-50 text-emerald-700' : p.status === 'Pending Verification' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>{p.status === 'Pending Verification' ? 'To verify' : p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ledger.length > 300 && <p className="p-3 text-xs text-slate-500 border-t border-slate-100">Showing the latest 300 of {ledger.length}. Export the CSV for everything.</p>}
            </div>
          )}
        </div>
      ) : tab === 'receivables' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{receivables.length} students still have fees to pay under a confirmed plan or the registration fee.</p>
            <button type="button" onClick={() => exportCsv('receivables', ['Student', 'Email', 'Country', 'Plan', 'Left to pay'], receivables.map(r => [r.s.full_name, r.s.email, r.country, r.flow === 'pending' ? 'Not confirmed' : r.flow === 'normal' ? 'Normal flow' : r.pkg?.name || 'Package', Object.entries(r.left).map(([c, v]) => money(v, c)).join(' + ')]))} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Export CSV</button>
          </div>
          {receivables.length === 0 ? <EmptyState icon={Wallet} title="Nothing outstanding" hint={range.key === 'all' ? 'Every student is paid up.' : 'Nothing is outstanding for this period. Change the date filter to see more.'} /> : (
            <ul className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100">
              {receivables.map(r => (
                <li key={r.s.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{r.s.full_name || r.s.email}</p><p className="text-xs text-slate-500 truncate">{r.country || 'No destination'}{r.since ? ` · since ${date(r.since)}` : ''} · {r.flow === 'pending' ? 'Plan not confirmed' : r.flow === 'normal' ? 'Normal flow' : r.pkg?.name || 'Package'} · paid {inr(r.paid)}</p></div>
                  <div className="flex items-center gap-4"><span className="text-sm font-extrabold text-rose-700 tabular-nums">{Object.entries(r.left).map(([c, v]) => money(v, c)).join(' + ')} left</span><Link to={`/admin/payment-control?student=${r.s.id}`} className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center">Open</Link></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[12rem]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search student or number" aria-label="Search" className="w-full h-10 pl-9 pr-3" /></div>
            <button type="button" onClick={() => exportCsv('invoices-receipts', ['Type', 'Number', 'Date', 'Student', 'Description', 'Amount', 'Currency', 'GST %'], shownDocs.map(d => [d.kind, d.no, date(d.at), nameOf(d.student_id), d.description, d.amount, d.currency, d.tax]))} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Export CSV</button>
          </div>
          {shownDocs.length === 0 ? <EmptyState icon={Receipt} title="No invoices or receipts yet" hint="They are created automatically when a payment is paid or verified." /> : (
            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="p-3 text-left w-[14%]">Type</th><th className="p-3 text-left w-[20%]">Number</th><th className="p-3 text-left">Student · Description</th><th className="p-3 text-right w-[16%]">Amount</th><th className="p-3 text-right w-[12%] hidden md:table-cell">GST</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {shownDocs.slice(0, 300).map(d => (
                    <tr key={d.kind + d.id} className="align-top">
                      <td className="p-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${d.kind === 'Invoice' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{d.kind}</span></td>
                      <td className="p-3 font-mono text-xs text-slate-700 truncate">{d.no}<span className="block text-[11px] text-slate-400 font-sans">{date(d.at)}</span></td>
                      <td className="p-3 min-w-0"><b className="text-slate-900 truncate block">{nameOf(d.student_id)}</b><span className="block text-xs text-slate-500 truncate">{d.description}</span></td>
                      <td className="p-3 text-right font-semibold tabular-nums">{money(d.amount, d.currency)}</td>
                      <td className="p-3 text-right text-xs text-slate-500 hidden md:table-cell">{d.tax > 0 ? `${d.tax}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminFinance;
