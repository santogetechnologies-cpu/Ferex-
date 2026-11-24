import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, Download, Search, X, AlertTriangle, TrendingUp, Clock, Users } from 'lucide-react';
import { PageHeader } from '../../components/Kit';
import { BlockCap } from '../../components/CapLoader';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { ToastNotification } from '../../components/ToastNotification';
import { getTradeOrders, getTradePayments, type TradeOrder, type TradePaymentRecord } from '../../lib/api/trade';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { ALL_TIME, inRange, type DateRange } from '../../lib/dateRange';

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
const money = (n: number, c: string) => `${SYMBOL[c] ?? `${c} `}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const OVERDUE_AFTER_DAYS = 30;

type BillingStatus = 'Pending' | 'In Process' | 'Delivered' | 'Settled' | 'Overdue';
const TABS: ('All' | BillingStatus)[] = ['All', 'Pending', 'In Process', 'Delivered', 'Settled', 'Overdue'];
const owedOf = (o: TradeOrder) => Math.max(0, Number(o.total_amount) - Number(o.advance_paid) - Number(o.balance_paid));
const paidOf = (o: TradeOrder) => Number(o.advance_paid) + Number(o.balance_paid);
const dueSince = (o: TradeOrder) => new Date(String(o.eta || o.created_at).slice(0, 10)).getTime() + OVERDUE_AFTER_DAYS * 86400000;

/**
 * Settled: fully paid. Overdue: still owed more than 30 days after the delivery date (ETA, else the booking date).
 * Delivered: delivered and waiting for payment. In Process: confirmed, shipping or part paid. Pending: nothing done yet.
 */
export const billingStatus = (o: TradeOrder, now = Date.now()): BillingStatus => {
  if (Number(o.total_amount) > 0 && owedOf(o) <= 0.005) return 'Settled';
  if (dueSince(o) < now && owedOf(o) > 0.005 && (o.stage === 'Delivered' || o.stage === 'Customs Clearance' || o.stage === 'Shipped')) return 'Overdue';
  if (o.stage === 'Delivered') return 'Delivered';
  if (paidOf(o) > 0 || ['Order Confirmed', 'Production/Sourcing', 'Shipped', 'Customs Clearance'].includes(o.stage)) return 'In Process';
  return 'Pending';
};
const TONE: Record<BillingStatus, string> = {
  Pending: 'bg-slate-50 text-slate-700 border-slate-200', 'In Process': 'bg-blue-50 text-blue-700 border-blue-200', Delivered: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Settled: 'bg-emerald-50 text-emerald-700 border-emerald-200', Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
};
const sel = 'h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold';

/** Billing: what every order was billed, what has been collected, what is still due and what is overdue. */
export const TradeBilling: React.FC = () => {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [tab, setTab] = useState<'All' | BillingStatus>('All');
  const [partner, setPartner] = useState('All');
  const [currency, setCurrency] = useState('All');
  const [q, setQ] = useState('');
  const [view, setView] = useState<TradeOrder | null>(null);
  const [history, setHistory] = useState<TradePaymentRecord[]>([]);

  const load = useCallback(async () => { try { setOrders(await getTradeOrders()); } catch (e: any) { setToast(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeTable('trade_orders', load); useRealtimeTable('trade_payments', load);
  useEffect(() => { if (view) getTradePayments(view.order_no).then(setHistory).catch(() => setHistory([])); else setHistory([]); }, [view]);

  const now = Date.now();
  const partners = useMemo(() => [...new Set(orders.map(o => o.client_name).filter(Boolean))].sort(), [orders]);
  const currencies = useMemo(() => [...new Set(orders.map(o => o.currency).filter(Boolean))].sort(), [orders]);

  // Everything except the status tab, so the tab counts stay meaningful.
  const base = useMemo(() => orders.filter(o => inRange(o.created_at, range) && (partner === 'All' || o.client_name === partner) && (currency === 'All' || o.currency === currency)
    && (!q.trim() || `${o.order_no} ${o.client_name}`.toLowerCase().includes(q.trim().toLowerCase()))), [orders, range, partner, currency, q]);
  const counts = useMemo(() => { const c: Record<string, number> = { All: base.length }; base.forEach(o => { const s = billingStatus(o, now); c[s] = (c[s] || 0) + 1; }); return c; }, [base, now]);
  const shown = useMemo(() => base.filter(o => tab === 'All' || billingStatus(o, now) === tab), [base, tab, now]);

  const totals = useMemo(() => {
    const m = new Map<string, { billed: number; paid: number; due: number; overdue: number }>();
    shown.forEach(o => { const t = m.get(o.currency) || { billed: 0, paid: 0, due: 0, overdue: 0 }; t.billed += Number(o.total_amount); t.paid += paidOf(o); t.due += owedOf(o); if (billingStatus(o, now) === 'Overdue') t.overdue += owedOf(o); m.set(o.currency, t); });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [shown, now]);

  const insights = useMemo(() => {
    const out: { icon: React.ReactNode; tone: string; text: string }[] = [];
    const overdue = shown.filter(o => billingStatus(o, now) === 'Overdue');
    if (overdue.length) out.push({ icon: <AlertTriangle className="w-4 h-4" />, tone: 'text-rose-700 bg-rose-50 border-rose-200', text: `${overdue.length} overdue order${overdue.length > 1 ? 's' : ''}: ${[...new Set(overdue.map(o => o.currency))].map(c => money(overdue.filter(o => o.currency === c).reduce((s, o) => s + owedOf(o), 0), c)).join(' + ')} past ${OVERDUE_AFTER_DAYS} days.` });
    const over = shown.filter(o => o.overpaid_by);
    if (over.length) out.push({ icon: <AlertTriangle className="w-4 h-4" />, tone: 'text-rose-700 bg-rose-50 border-rose-200', text: `${over.map(o => `${o.order_no} has ${money(o.overpaid_by!, o.currency)} recorded beyond its value`).join('; ')}. Remove the duplicate entries under Payments.` });
    const unpaid = shown.filter(o => paidOf(o) <= 0 && owedOf(o) > 0);
    if (unpaid.length) out.push({ icon: <Clock className="w-4 h-4" />, tone: 'text-amber-800 bg-amber-50 border-amber-200', text: `${unpaid.length} order${unpaid.length > 1 ? 's have' : ' has'} no payment yet: ${unpaid.slice(0, 3).map(o => o.order_no).join(', ')}${unpaid.length > 3 ? '…' : ''}.` });
    const byPartner = new Map<string, Map<string, number>>();
    shown.forEach(o => { if (owedOf(o) > 0) { const m = byPartner.get(o.client_name) || new Map<string, number>(); m.set(o.currency, (m.get(o.currency) || 0) + owedOf(o)); byPartner.set(o.client_name, m); } });
    const top = [...byPartner.entries()].sort((a, b) => [...b[1].values()].reduce((x, y) => x + y, 0) - [...a[1].values()].reduce((x, y) => x + y, 0))[0];
    if (top) out.push({ icon: <Users className="w-4 h-4" />, tone: 'text-slate-800 bg-slate-50 border-slate-200', text: `Largest balance: ${top[0]}, ${[...top[1].entries()].map(([c, v]) => money(v, c)).join(' + ')}.` });
    totals.forEach(([c, t]) => { if (t.billed > 0) out.push({ icon: <TrendingUp className="w-4 h-4" />, tone: 'text-emerald-800 bg-emerald-50 border-emerald-200', text: `${c}: ${Math.round((t.paid / t.billed) * 100)}% of ${money(t.billed, c)} collected.` }); });
    if (!out.length) out.push({ icon: <Receipt className="w-4 h-4" />, tone: 'text-slate-700 bg-slate-50 border-slate-200', text: 'Nothing needs attention.' });
    return out;
  }, [shown, totals, now]);

  const exportCsv = () => {
    const rows = [['Order', 'Partner', 'Currency', 'Total', 'Advance paid', 'Advance due', 'Balance paid', 'Balance due', 'Still owed', 'Status'],
      ...shown.map(o => [o.order_no, o.client_name, o.currency, o.total_amount, o.advance_paid, o.advance_amount, o.balance_paid, o.balance_amount, owedOf(o), billingStatus(o, now)])];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `trade-billing-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const cards: [string, keyof NonNullable<ReturnType<typeof totals.at>>[1], string][] = [['Billed', 'billed', 'text-slate-900'], ['Collected', 'paid', 'text-emerald-700'], ['Still due', 'due', 'text-amber-700'], ['Overdue', 'overdue', 'text-rose-700']];

  return (
    <div className="space-y-5 text-left">
      <ToastNotification message={toast} onClose={() => setToast('')} />
      <PageHeader eyebrow="Global Trade" title="Billing" subtitle="What each order was billed, the advance and balance, and what is still owed." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(([label, key, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            {totals.length ? totals.map(([c, t]) => <p key={c} className={`text-xl font-extrabold tabular-nums ${tone}`}>{money((t as any)[key], c)}</p>) : <p className="text-xl font-extrabold text-slate-300">—</p>}
          </div>))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DateRangeFilter value={range} onChange={setRange} label="Booked" />
        <select aria-label="Partner" value={partner} onChange={e => setPartner(e.target.value)} className={sel}><option value="All">All partners</option>{partners.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <select aria-label="Currency" value={currency} onChange={e => setCurrency(e.target.value)} className={sel}><option value="All">All currencies</option>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <div className="relative"><Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search orders" value={q} onChange={e => setQ(e.target.value)} placeholder="Search order or partner…" className={`${sel} pl-8 min-w-[220px]`} /></div>
        <button type="button" onClick={exportCsv} disabled={!shown.length} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"><Download className="w-3.5 h-3.5" />Export</button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Billing status">
        {TABS.map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-3.5 h-8 rounded-full text-xs font-bold border cursor-pointer ${tab === t ? 'bg-[#5A0122] text-white border-[#5A0122]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t} <span className={tab === t ? 'text-white/80' : 'text-slate-400'}>{counts[t] || 0}</span></button>))}
      </div>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-5 items-start">
        {loading ? <BlockCap /> : shown.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"><Receipt className="w-6 h-6 mx-auto mb-2 text-slate-400" />No orders match.</div> : (
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50"><th className="p-3">Order</th><th className="p-3">Partner</th><th className="p-3">Currency</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Advance (paid / due)</th><th className="p-3 text-right">Balance (paid / due)</th><th className="p-3 text-right">Still owed</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {shown.map(o => { const s = billingStatus(o, now); const owed = owedOf(o); return (
                  <tr key={o.id}>
                    <td className="p-3 font-mono font-bold text-slate-900">{o.order_no}</td><td className="p-3">{o.client_name}</td><td className="p-3">{o.currency}</td>
                    <td className="p-3 text-right tabular-nums">{money(o.total_amount, o.currency)}</td>
                    <td className="p-3 text-right tabular-nums">{money(o.advance_paid, o.currency)} / {money(o.advance_amount, o.currency)}</td>
                    <td className="p-3 text-right tabular-nums">{money(o.balance_paid, o.currency)} / {money(o.balance_amount, o.currency)}</td>
                    <td className="p-3 text-right tabular-nums font-black text-slate-900">{money(owed, o.currency)}</td>
                    <td className="p-3 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${TONE[s]}`}>{s}</span>{!!o.overpaid_by && <span title="More was recorded than the order value. Review the duplicate payment entries under Payments." className="ml-1.5 px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-extrabold">Over-recorded {money(o.overpaid_by, o.currency)}</span>}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Link to={`/trade/invoices?order=${encodeURIComponent(o.order_no)}`} className="text-[11px] font-bold text-[#5A0122] hover:underline mr-3">Invoice</Link>
                      <button type="button" onClick={() => setView(o)} className="text-[11px] font-bold text-[#5A0122] hover:underline mr-3 cursor-pointer">View</button>
                      {owed > 0.005 && <Link to={`/trade/payments?order=${encodeURIComponent(o.order_no)}`} className="text-[11px] font-bold text-[#5A0122] hover:underline">Record payment</Link>}
                    </td></tr>); })}
              </tbody>
            </table>
          </div>)}

        <aside className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5" aria-label="Quick insights">
          <h3 className="text-sm font-black text-slate-900">Quick insights</h3>
          {insights.map((i, k) => <div key={k} className={`flex gap-2 rounded-xl border p-2.5 text-xs font-semibold ${i.tone}`}><span className="shrink-0 mt-0.5">{i.icon}</span><span>{i.text}</span></div>)}
          <p className="text-[11px] text-slate-400">Overdue means money is still owed {OVERDUE_AFTER_DAYS} days after the delivery date (ETA, or the booking date when there is none).</p>
        </aside>
      </div>

      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setView(null)} />
          <div role="dialog" aria-label={`Order ${view.order_no}`} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-bold text-[#5A0122]">{view.order_no}</p><h3 className="text-base font-black text-slate-900">{view.client_name}</h3><p className="text-xs text-slate-500">{view.commodity} · {view.incoterm} · {view.stage}</p></div><button type="button" aria-label="Close" onClick={() => setView(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[['Total', Number(view.total_amount), 'text-slate-900'], ['Collected', paidOf(view), 'text-emerald-700'], ['Still owed', owedOf(view), 'text-rose-700']].map(([l, v, t]: any) => <div key={l} className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold uppercase text-slate-500">{l}</p><p className={`font-extrabold tabular-nums ${t}`}>{money(v, view.currency)}</p></div>)}
            </div>
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Payments</h4>
            {history.length === 0 ? <p className="text-xs text-slate-500">No payments recorded yet.</p> : <ul className="divide-y divide-slate-100 text-xs">{history.map(p => <li key={p.id} className="py-2 flex items-center justify-between gap-3"><span><b className="text-slate-900">{p.type}</b><span className="block text-slate-500">{p.payment_method} · {String(p.payment_date || '').slice(0, 10)}{p.receipt_no ? ` · ${p.receipt_no}` : ''}</span></span><span className="font-bold tabular-nums">{money(p.amount, p.currency || view.currency)}</span></li>)}</ul>}
            <div className="flex gap-2 pt-1">
              <Link to={`/trade/invoices?order=${encodeURIComponent(view.order_no)}`} className="flex-1 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Invoice</Link>
              {owedOf(view) > 0.005 && <Link to={`/trade/payments?order=${encodeURIComponent(view.order_no)}`} className="flex-1 h-9 inline-flex items-center justify-center rounded-lg bg-[#5A0122] text-xs font-bold text-white hover:bg-[#68092A]">Record payment</Link>}
            </div>
          </div>
        </div>)}
    </div>
  );
};
