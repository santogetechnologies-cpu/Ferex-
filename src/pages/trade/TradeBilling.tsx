import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { PageHeader } from '../../components/Kit';
import { BlockCap } from '../../components/CapLoader';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { ToastNotification } from '../../components/ToastNotification';
import { getTradeOrders, type TradeOrder } from '../../lib/api/trade';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { ALL_TIME, inRange, type DateRange } from '../../lib/dateRange';

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
const money = (n: number, c: string) => `${SYMBOL[c] ?? `${c} `}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const state = (o: TradeOrder) => { const paid = Number(o.advance_paid) + Number(o.balance_paid); return paid >= Number(o.total_amount) - 0.005 && Number(o.total_amount) > 0 ? 'Settled' : paid > 0 ? 'Part paid' : 'Unpaid'; };
const tone = (s: string) => s === 'Settled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s === 'Part paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

/** Billing: for every trade order, what was billed, the advance and balance, and what is still owed. */
export const TradeBilling: React.FC = () => {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [status, setStatus] = useState('All');
  const [q, setQ] = useState('');
  const load = useCallback(async () => { try { setOrders(await getTradeOrders()); } catch (e: any) { setToast(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeTable('trade_orders', load); useRealtimeTable('trade_payments', load);

  const shown = useMemo(() => orders.filter(o => inRange(o.created_at, range) && (status === 'All' || state(o) === status) && (!q.trim() || `${o.order_no} ${o.client_name}`.toLowerCase().includes(q.trim().toLowerCase()))), [orders, range, status, q]);
  const totals = useMemo(() => { const m = new Map<string, { billed: number; paid: number }>(); shown.forEach(o => { const t = m.get(o.currency) || { billed: 0, paid: 0 }; t.billed += Number(o.total_amount); t.paid += Number(o.advance_paid) + Number(o.balance_paid); m.set(o.currency, t); }); return [...m.entries()]; }, [shown]);

  return (
    <div className="space-y-5 text-left">
      <ToastNotification message={toast} onClose={() => setToast('')} />
      <PageHeader eyebrow="Global Trade" title="Billing" subtitle="What each order was billed, the advance and balance, and what is still owed." />
      <div className="grid sm:grid-cols-3 gap-3">
        {[['Billed', (t: any) => t.billed, 'text-slate-900'], ['Collected', (t: any) => t.paid, 'text-emerald-700'], ['Still due', (t: any) => t.billed - t.paid, 'text-rose-700']].map(([l, f, tn]: any) => (
          <div key={l} className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{l}</p>{totals.length ? totals.map(([c, t]) => <p key={c} className={`text-xl font-extrabold tabular-nums ${tn}`}>{money(f(t), c)}</p>) : <p className="text-xl font-extrabold text-slate-300">—</p>}</div>))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <DateRangeFilter value={range} onChange={setRange} label="Booked" />
        <select aria-label="Billing status" value={status} onChange={e => setStatus(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold">{['All', 'Settled', 'Part paid', 'Unpaid'].map(s => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}</select>
        <input aria-label="Search orders" value={q} onChange={e => setQ(e.target.value)} placeholder="Search order or partner…" className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold min-w-[220px]" />
      </div>
      {loading ? <BlockCap /> : shown.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"><Receipt className="w-6 h-6 mx-auto mb-2 text-slate-400" />No orders match.</div> : (
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50"><th className="p-3">Order</th><th className="p-3">Partner</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Advance (paid / due)</th><th className="p-3 text-right">Balance (paid / due)</th><th className="p-3 text-right">Still owed</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {shown.map(o => { const s = state(o); const owed = Math.max(0, Number(o.total_amount) - Number(o.advance_paid) - Number(o.balance_paid)); return (
                <tr key={o.id}><td className="p-3 font-mono font-bold text-slate-900">{o.order_no}</td><td className="p-3">{o.client_name}</td>
                  <td className="p-3 text-right tabular-nums">{money(o.total_amount, o.currency)}</td>
                  <td className="p-3 text-right tabular-nums">{money(o.advance_paid, o.currency)} / {money(o.advance_amount, o.currency)}</td>
                  <td className="p-3 text-right tabular-nums">{money(o.balance_paid, o.currency)} / {money(o.balance_amount, o.currency)}</td>
                  <td className="p-3 text-right tabular-nums font-black text-slate-900">{money(owed, o.currency)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${tone(s)}`}>{s}</span>{!!o.overpaid_by && <span title="More was recorded than the order value. Review the duplicate payment entries under Payments." className="ml-1.5 px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-extrabold">Over-recorded {money(o.overpaid_by, o.currency)}</span>}</td>
                  <td className="p-3 text-right whitespace-nowrap"><Link to="/trade/invoices" className="text-[11px] font-bold text-[#5A0122] hover:underline mr-3">Invoices</Link>{owed > 0 && <Link to="/trade/payments" className="text-[11px] font-bold text-[#5A0122] hover:underline">Record payment</Link>}</td></tr>); })}
            </tbody>
          </table>
        </div>)}
    </div>
  );
};
