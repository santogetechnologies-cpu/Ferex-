import React, { useCallback, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react';
import { PageHeader } from '../Kit';
import { Button } from '../Button';
import { BlockCap } from '../CapLoader';
import { DateRangeFilter } from '../DateRangeFilter';
import { ToastNotification } from '../ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { ALL_TIME, inRange, type DateRange } from '../../lib/dateRange';
import { deleteDivisionExpense, EXPENSE_CATEGORIES, EXPENSE_METHODS, getDivisionExpenses, saveDivisionExpense, type DivisionExpense, type ExpenseDivision } from '../../lib/api/divisionExpenses';

const SYMBOL: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };
const money = (n: number, c: string) => `${SYMBOL[c] ?? `${c} `}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);

/** Money going out, for the Education, Rimi or Trade admin: add, edit, filter, total and export. */
export const DivisionExpenses: React.FC<{ division: ExpenseDivision; eyebrow: string; defaultCurrency?: string }> = ({ division, eyebrow, defaultCurrency = 'INR' }) => {
  const { profile } = useAuth();
  const cats = EXPENSE_CATEGORIES[division];
  const [rows, setRows] = useState<DivisionExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [cat, setCat] = useState('All');
  const [status, setStatus] = useState('All');
  const [q, setQ] = useState('');
  const blank = { expense_date: today(), category: cats[0], vendor: '', description: '', amount: '' as string | number, currency: defaultCurrency, payment_method: 'Bank Transfer', reference_no: '', status: 'Paid' as DivisionExpense['status'] };
  const [form, setForm] = useState<(typeof blank & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => { try { setRows(await getDivisionExpenses(division)); } catch (e: any) { say(e.message); } finally { setLoading(false); } }, [division]);
  React.useEffect(() => { void load(); }, [load]);
  useRealtimeTable('division_expenses', load);

  const shown = useMemo(() => rows.filter(r => inRange(r.expense_date, range) && (cat === 'All' || r.category === cat) && (status === 'All' || r.status === status) &&
    (!q.trim() || `${r.vendor} ${r.description} ${r.category} ${r.reference_no}`.toLowerCase().includes(q.trim().toLowerCase()))), [rows, range, cat, status, q]);
  const live = shown.filter(r => r.status !== 'Cancelled');
  const totalsBy = (key: (r: DivisionExpense) => string, list: DivisionExpense[]) => { const m = new Map<string, number>(); list.forEach(r => m.set(key(r), (m.get(key(r)) || 0) + r.amount)); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const paid = totalsBy(r => r.currency, live.filter(r => r.status === 'Paid'));
  const pending = totalsBy(r => r.currency, live.filter(r => r.status === 'Pending'));
  const byCategory = totalsBy(r => `${r.category}|${r.currency}`, live).slice(0, 6);
  const topMax = Math.max(1, ...byCategory.map(([, v]) => v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form) return; setSaving(true);
    try { await saveDivisionExpense(division, { ...form, amount: Number(form.amount) }, profile?.full_name || ''); say(form.id ? 'Expense updated' : 'Expense added'); setForm(null); await load(); }
    catch (err: any) { say(err.message); } finally { setSaving(false); }
  };
  const remove = async (r: DivisionExpense) => {
    if (!window.confirm(`Delete this ${r.category} expense of ${money(r.amount, r.currency)}? This cannot be undone.`)) return;
    try { await deleteDivisionExpense(r.id); say('Expense deleted'); await load(); } catch (err: any) { say(err.message); }
  };
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Currency', 'Method', 'Reference', 'Status', 'Added by'];
    const lines = shown.map(r => [r.expense_date, r.category, r.vendor, r.description, r.amount.toFixed(2), r.currency, r.payment_method, r.reference_no, r.status, r.created_by_name].map(esc).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = `${division}-expenses-${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const inputCls = 'w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900';

  return (
    <div className="space-y-5 text-left">
      <ToastNotification message={toast} onClose={() => setToast('')} />
      <PageHeader eyebrow={eyebrow} title="Expenses" subtitle="Everything the business spends: record it, categorise it and see where the money goes."
        actions={<><Button size="md" variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button><Button size="md" onClick={() => setForm(blank)}><Plus className="w-4 h-4 mr-1.5" /> Add expense</Button></>} />

      <div className="grid sm:grid-cols-3 gap-3">
        {[['Paid out', paid, 'text-slate-900'], ['Still to pay', pending, 'text-amber-700']].map(([label, list, tone]: any) => (
          <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            {list.length ? list.map(([c, v]: [string, number]) => <p key={c} className={`text-xl font-extrabold tabular-nums ${tone}`}>{money(v, c)}</p>) : <p className="text-xl font-extrabold text-slate-300">—</p>}</div>))}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Biggest categories</p>
          {byCategory.length === 0 ? <p className="text-xl font-extrabold text-slate-300">—</p> : <ul className="mt-1 space-y-1.5">{byCategory.map(([k, v]) => { const [c, cur] = k.split('|'); return (<li key={k} className="text-[11px] font-semibold text-slate-700"><div className="flex justify-between"><span className="truncate">{c}</span><span className="tabular-nums">{money(v, cur)}</span></div><div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-[#5A0122]" style={{ width: `${Math.max(6, (v / topMax) * 100)}%` }} /></div></li>); })}</ul>}</div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DateRangeFilter value={range} onChange={setRange} label="Date" />
        <select aria-label="Category" value={cat} onChange={e => setCat(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold"><option value="All">All categories</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold">{['All', 'Paid', 'Pending', 'Cancelled'].map(s => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}</select>
        <input aria-label="Search expenses" value={q} onChange={e => setQ(e.target.value)} placeholder="Search vendor, note, reference…" className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold min-w-[220px]" />
      </div>

      {loading ? <BlockCap /> : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"><Receipt className="w-6 h-6 mx-auto mb-2 text-slate-400" />No expenses match. Use “Add expense” to record one.</div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50"><th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Vendor / note</th><th className="p-3">Method</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {shown.map(r => (
                <tr key={r.id} className={r.status === 'Cancelled' ? 'opacity-50' : ''}>
                  <td className="p-3 whitespace-nowrap">{day(r.expense_date)}</td><td className="p-3">{r.category}</td>
                  <td className="p-3"><span className="block font-bold text-slate-900">{r.vendor || '—'}</span><span className="block text-slate-500 truncate max-w-[22rem]">{r.description}{r.reference_no ? ` · ${r.reference_no}` : ''}</span></td>
                  <td className="p-3">{r.payment_method}</td><td className="p-3 text-right font-black tabular-nums text-slate-900">{money(r.amount, r.currency)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${r.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : r.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{r.status}</span></td>
                  <td className="p-3 text-right whitespace-nowrap"><button type="button" aria-label="Edit expense" onClick={() => setForm({ ...r, amount: r.amount })} className="p-1.5 text-slate-400 hover:text-slate-800 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button><button type="button" aria-label="Delete expense" onClick={() => void remove(r)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-label={form.id ? 'Edit expense' : 'Add expense'}>
          <form onSubmit={submit} className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-3 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="text-base font-black text-slate-900">{form.id ? 'Edit expense' : 'Add expense'}</h3><button type="button" aria-label="Close" onClick={() => setForm(null)} className="p-1 text-slate-400 cursor-pointer"><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Date *</span><input type="date" max={today()} required value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} className={inputCls} /></label>
              <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Category *</span><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
              <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Amount *</span><input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputCls} /></label>
              <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Currency</span><select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className={inputCls}>{['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Vendor / paid to</span><input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} className={inputCls} /></label>
              <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Payment method</span><select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className={inputCls}>{EXPENSE_METHODS.map(m => <option key={m}>{m}</option>)}</select></label>
              <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Reference / bill no.</span><input value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} className={inputCls} /></label>
              <label className="block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Status</span><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as DivisionExpense['status'] })} className={inputCls}>{['Paid', 'Pending', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select></label>
              <label className="col-span-2 block"><span className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Note</span><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold" /></label>
            </div>
            <div className="flex gap-2 pt-1"><Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" size="sm" disabled={saving} className="flex-1 text-xs font-bold">{saving ? 'Saving…' : 'Save expense'}</Button></div>
          </form>
        </div>
      )}
    </div>
  );
};
