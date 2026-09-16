import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Plus, CheckCircle2, Clock, Send,
  Download, Building2, AlertCircle, RefreshCw, X,
  FileCheck2, DollarSign, ArrowUpRight, ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradePayments,
  recordTradePayment,
  sendPaymentReminder,
  getTradeOrders,
  TRADE_CURRENCIES,
  type TradePaymentRecord,
  type TradeOrder
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TradePayments: React.FC = () => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<TradePaymentRecord[]>([]);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [sendingReminderOrderNo, setSendingReminderOrderNo] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const initialRecordForm = {
    order_no: '',
    client_name: '',
    type: 'Advance Payment' as 'Advance Payment' | 'Balance Settlement' | 'Full Payment' | 'LC Drawdown',
    amount: 100000,
    currency: 'USD',
    payment_method: 'SWIFT Wire Transfer (MT103)',
    transaction_ref: '',
    lc_reference: '',
    notes: '',
  };

  const [recordForm, setRecordForm] = useState(initialRecordForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allPayments, allOrders] = await Promise.all([
        getTradePayments(),
        getTradeOrders()
      ]);
      setPayments(Array.isArray(allPayments) ? allPayments : []);
      setOrders(Array.isArray(allOrders) ? allOrders : []);
      if (allOrders.length > 0 && !recordForm.order_no) {
        setRecordForm(prev => ({
          ...prev,
          order_no: allOrders[0].order_no,
          client_name: allOrders[0].client_name,
          amount: allOrders[0].advance_amount,
          currency: allOrders[0].currency
        }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_payments_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_payments' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_payments_change', handleLocalChange);
    window.addEventListener('ferex_trade_orders_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_payments_change', handleLocalChange);
      window.removeEventListener('ferex_trade_orders_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleOrderSelect = (orderNo: string) => {
    const ord = orders.find(o => o.order_no === orderNo);
    if (ord) {
      const isAdvPending = ord.advance_status === 'Pending';
      setRecordForm(prev => ({
        ...prev,
        order_no: orderNo,
        client_name: ord.client_name,
        type: isAdvPending ? 'Advance Payment' : 'Balance Settlement',
        amount: isAdvPending ? ord.advance_amount : Math.max(0, ord.balance_amount - (ord.balance_paid || 0)),
        currency: ord.currency,
        lc_reference: ord.lc_reference || ''
      }));
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.order_no || !recordForm.amount) {
      showToastMsg('Please enter valid payment details.');
      return;
    }

    try {
      const created = await recordTradePayment(recordForm);
      setShowRecordModal(false);
      showToastMsg(`Recorded ${created.currency} ${Number(created.amount).toLocaleString()} & issued receipt ${created.receipt_no}!`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to record payment: ${err.message}`);
    }
  };

  const handleSendReminder = async (orderNo: string) => {
    setSendingReminderOrderNo(orderNo);
    try {
      const ok = await sendPaymentReminder(orderNo);
      if (ok) {
        showToastMsg(`Automated payment balance reminder dispatched for ${orderNo}!`);
      }
    } finally {
      setSendingReminderOrderNo(null);
    }
  };

  const downloadReceipt = (p: TradePaymentRecord) => {
    const rows = [
      ['FEREX GLOBAL TRADE PAYMENT RECEIPT'],
      ['Receipt Number', p.receipt_no],
      ['Order Reference', p.order_no],
      ['Payer / Client', p.client_name],
      ['Payment Type', p.type],
      ['Amount Paid', `${p.currency} ${Number(p.amount).toLocaleString()}`],
      ['Payment Method', p.payment_method],
      ['Transaction Reference', p.transaction_ref || 'N/A'],
      ['Letter of Credit Reference', p.lc_reference || 'N/A'],
      ['Payment Date', p.payment_date],
      ['Treasury Status', 'Verified & Cleared'],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${p.receipt_no}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg(`Exported ${p.receipt_no}`);
  };

  const totalCollectedUSD = payments.reduce((sum, p) => {
    const rate = p.currency === 'EUR' ? 1.08 : p.currency === 'INR' ? 0.012 : p.currency === 'GBP' ? 1.30 : 1;
    return sum + (p.amount * rate);
  }, 0);

  const filteredPayments = payments.filter(p =>
    p.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.receipt_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#58051E]" />
            Trade Payment & Advance/Balance Ledger
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Advance + Balance structure, Multi-currency settlements, Letter of Credit drawdowns, and automated receipts.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowRecordModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Record Payment & Issue Receipt
        </Button>
      </div>

      {/* Advance / Balance Schedule by Active Order */}
      <Card className="p-4 border border-slate-200/80 shadow-xs">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
          <span>Active Orders Payment Schedule & Reminders</span>
          <span className="text-emerald-700 font-bold">Total Settled: ~${Math.round(totalCollectedUSD).toLocaleString()} USD</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {orders.map((o) => {
            const isAdvPaid = o.advance_status === 'Paid';
            const balDue = Math.max(0, o.balance_amount - (o.balance_paid || 0));
            const isBalPaid = balDue === 0;

            return (
              <div key={o.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-xs text-slate-900">{o.order_no}</span>
                    <div className="text-[11px] font-bold text-slate-700 truncate max-w-[170px]">{o.client_name}</div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                    {o.currency} {Number(o.total_amount).toLocaleString()}
                  </span>
                </div>

                <div className="text-[10.5px] space-y-1 pt-1 border-t border-slate-200/60 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Advance ({o.advance_percentage}%):</span>
                    <span className={isAdvPaid ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {o.currency} {Number(o.advance_amount).toLocaleString()} ({isAdvPaid ? '✓ Paid' : '⏳ Due'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Balance Remainder:</span>
                    <span className={isBalPaid ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {o.currency} {Number(balDue).toLocaleString()} ({isBalPaid ? '✓ Paid' : '⏳ Due'})
                    </span>
                  </div>
                  {o.lc_reference && (
                    <div className="text-[10px] text-blue-600 font-mono truncate">
                      🏦 LC: {o.lc_reference}
                    </div>
                  )}
                </div>

                {!isBalPaid && (
                  <button
                    disabled={sendingReminderOrderNo === o.order_no}
                    onClick={() => handleSendReminder(o.order_no)}
                    className="w-full mt-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10.5px] font-black text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 text-[#58051E]" />
                    Send Payment Reminder Email
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Search Bar */}
      <Card className="p-3 border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipts, orders, clients..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
      </Card>

      {/* Receipts Ledger Table */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" /> Loading payment receipts...
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No payment receipts logged</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Record advance deposits or balance wires to generate official treasury receipts.
          </p>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-xs overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Linked Order & Client</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Settlement Amount</th>
                  <th className="py-3 px-4">Method & Transaction Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Receipt Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      {p.receipt_no}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{p.client_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.order_no}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      {p.currency} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-bold">{p.payment_method}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.transaction_ref}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {p.payment_date}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => downloadReceipt(p)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Export CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── RECORD PAYMENT MODAL ── */}
      <AnimatePresence>
        {showRecordModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowRecordModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#58051E]" /> Record Trade Payment
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Issues an official receipt and auto-sends client confirmation.
                  </p>
                </div>
                <button onClick={() => setShowRecordModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleRecordSubmit} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Select Order *</label>
                  <select
                    required
                    value={recordForm.order_no}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="">-- Choose order --</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.order_no}>
                        {o.order_no} — {o.client_name} ({o.currency} {o.total_amount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Payment Type</label>
                    <select
                      value={recordForm.type}
                      onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="Advance Payment">Advance Payment</option>
                      <option value="Balance Settlement">Balance Settlement</option>
                      <option value="Full Payment">Full Payment</option>
                      <option value="LC Drawdown">LC Drawdown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Currency</label>
                    <select
                      value={recordForm.currency}
                      onChange={(e) => setRecordForm({ ...recordForm, currency: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {TRADE_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Amount Received *</label>
                  <input
                    type="number"
                    required
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm({ ...recordForm, amount: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Payment Method</label>
                  <input
                    type="text"
                    value={recordForm.payment_method}
                    onChange={(e) => setRecordForm({ ...recordForm, payment_method: e.target.value })}
                    placeholder="e.g. SWIFT Wire MT103 / SEPA / LC Drawdown"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Transaction Ref #</label>
                    <input
                      type="text"
                      value={recordForm.transaction_ref}
                      onChange={(e) => setRecordForm({ ...recordForm, transaction_ref: e.target.value })}
                      placeholder="e.g. SWIFT-WAW-9910"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">LC Reference (If LC)</label>
                    <input
                      type="text"
                      value={recordForm.lc_reference}
                      onChange={(e) => setRecordForm({ ...recordForm, lc_reference: e.target.value })}
                      placeholder="e.g. LC-BNP-9021"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowRecordModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Record & Issue Receipt</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradePayments;
