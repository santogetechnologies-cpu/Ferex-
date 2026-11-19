import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Receipt } from 'lucide-react';
import { PageHeader } from '../../components/Kit';
import { Button } from '../../components/Button';
import { BlockCap } from '../../components/CapLoader';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { ToastNotification } from '../../components/ToastNotification';
import { getRimiSalesOrders, type RimiSalesOrderRecord } from '../../lib/api/rimi';
import { orderPaymentLabel, printInvoice } from '../../lib/rimiReceipts';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { ALL_TIME, inRange, type DateRange } from '../../lib/dateRange';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const tone = (s: string) => s === 'Paid in full' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s === 'Partially paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

/** Billing: what has been billed on sales orders and what is still owed. Invoices: the printable invoice for each order. */
export const RimiFinance: React.FC<{ view: 'billing' | 'invoices' }> = ({ view }) => {
  const [orders, setOrders] = useState<RimiSalesOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [status, setStatus] = useState('All');
  const [q, setQ] = useState('');
  const load = useCallback(async () => { try { setOrders((await getRimiSalesOrders()).filter(o => o.order_status !== 'Cancelled')); } catch (e: any) { setToast(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  useRealtimeTable('rimi_sales_orders', load); useRealtimeTable('rimi_payments', load);

  const shown = useMemo(() => orders.filter(o => inRange(o.created_at, range) && (status === 'All' || orderPaymentLabel(o) === status) &&
    (!q.trim() || `${o.order_no} ${o.customer_name}`.toLowerCase().includes(q.trim().toLowerCase()))), [orders, range, status, q]);
  const billed = shown.reduce((a, o) => a + Number(o.total_amount), 0), paid = shown.reduce((a, o) => a + Number(o.paid_amount), 0), due = shown.reduce((a, o) => a + Number(o.balance_amount), 0);

  return (
    <div className="space-y-5 text-left">
      <ToastNotification message={toast} onClose={() => setToast('')} />
      <PageHeader eyebrow="Rimi Frozen" title={view === 'billing' ? 'Billing' : 'Invoices'} subtitle={view === 'billing' ? 'What each order was billed, what has been collected and what is still due.' : 'One invoice for every sales order. Open it to print or save as PDF.'} />
      <div className="grid sm:grid-cols-3 gap-3">
        {[['Billed', billed, 'text-slate-900'], ['Collected', paid, 'text-emerald-700'], ['Still due', due, 'text-rose-700']].map(([l, v, t]: any) => <div key={l} className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{l}</p><p className={`text-2xl font-extrabold tabular-nums ${t}`}>{inr(v)}</p></div>)}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <DateRangeFilter value={range} onChange={setRange} label="Order date" />
        <select aria-label="Payment status" value={status} onChange={e => setStatus(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold">{['All', 'Paid in full', 'Partially paid', 'Unpaid'].map(s => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}</select>
        <input aria-label="Search orders" value={q} onChange={e => setQ(e.target.value)} placeholder="Search order or customer…" className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold min-w-[220px]" />
      </div>
      {loading ? <BlockCap /> : shown.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"><Receipt className="w-6 h-6 mx-auto mb-2 text-slate-400" />No orders match.</div> : (
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50"><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Date</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Balance</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {shown.map(o => { const s = orderPaymentLabel(o); return (
                <tr key={o.id}><td className="p-3 font-mono font-bold text-slate-900">{o.order_no}</td><td className="p-3">{o.customer_name}</td><td className="p-3 whitespace-nowrap">{String(o.created_at).slice(0, 10)}</td>
                  <td className="p-3 text-right tabular-nums">{inr(o.total_amount)}</td><td className="p-3 text-right tabular-nums text-emerald-700">{inr(o.paid_amount)}</td><td className="p-3 text-right tabular-nums font-black text-slate-900">{inr(o.balance_amount)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${tone(s)}`}>{s}</span></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold mr-1.5" onClick={() => { if (!printInvoice(o)) setToast('Allow pop-ups to print the invoice.'); }}><Printer className="w-3 h-3 mr-1" /> Invoice</Button>
                    {Number(o.balance_amount) > 0 && <Link to="/rimi/collections" className="text-[11px] font-bold text-[#5A0122] hover:underline">Collect</Link>}</td></tr>); })}
            </tbody>
          </table>
        </div>)}
    </div>
  );
};
